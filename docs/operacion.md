# Operación

## Uso frente a los límites del plan gratuito de Cloudflare

Los límites cambian: confirmarlos en la documentación de Cloudflare antes de fiarse de estas cifras (referencia: octubre de 2026).

| Recurso | Límite gratuito (orientativo) | Qué lo gasta aquí | Dónde verlo |
|---|---|---|---|
| Worker, peticiones | 100.000 al día | Cada `/api/*`, cada `/t/:id` y **cada petición de rangos del mapa** (`/mapa/madrid.pmtiles`). Las páginas y los ficheros estáticos no cuentan | Panel → Workers y Pages → `a-su-precio` → Metrics |
| Worker, CPU | 10 ms por petición | El geocodificador es lo más pesado | Misma pantalla, «CPU time» |
| D1, lecturas | 5 millones de filas al día | Cada búsqueda de dirección lee unas decenas o centenares de filas | Panel → D1 → base → Metrics |
| D1, escrituras | 100.000 filas al día | El límite por IP y el registro (los eventos de uso ya no pasan por D1: van a PostHog) | Ídem |
| D1, tamaño | 5 GB por cuenta | El callejero ocupa 13 MB | `npx wrangler d1 info a-su-precio-callejero` |
| R2, almacenamiento | 10 GB | Mapa (36 MB) y tarjetas (~60 KB cada una) | Panel → R2 → bucket → Metrics |
| R2, operaciones | 1 M de escrituras y 10 M de lecturas al mes | Una lectura por petición del mapa y por vista previa | Ídem |

**El punto débil es el mapa.** Un mapa abierto en el móvil pide decenas de rangos y cada uno cuenta como una petición del Worker. Con unos 50 por uso del mapa, 2.000 usos al día agotarían las 100.000 peticiones. Si hace falta: poner el archivo detrás de la caché de Cloudflare (Cache API en la ruta del mapa) o servirlo desde un dominio propio con R2 público y relajar el `connect-src` de la CSP solo para ese origen. Hoy el mapa solo se abre en el modo «En el mapa» del formulario.

**Qué se hace cuando algo se acerca al límite**
- Peticiones del Worker: revisar si es el mapa o el geocodificador y, si hace falta, bajar `LIMITE_GEOCODIFICACIONES_DIA` en `src/lib/server/registro.ts`.
- D1: `npm run metricas` enseña cuántos análisis y aportaciones hay.
- Worker: cada tanda de eventos de analítica pasa por el proxy `/r7k` y cuenta como una petición (unas 4-6 por visita; ver «Analítica»).
- Pasarse del límite gratuito no cobra solo: el servicio devuelve errores hasta el día siguiente. El plan de pago de Workers cuesta unos 5 $ al mes.

**Alerta en el panel:** Notificaciones → Añadir → «Usage-based billing» o, en Workers, una notificación de errores para `a-su-precio`.

## Límite del geocodificador

`POST /api/geocode` admite 200 búsquedas por IP y día (`LIMITE_GEOCODIFICACIONES_DIA`). Pasado el límite responde 429. La IP no se guarda: la clave es un HMAC con una sal que cambia cada día, y se borra con la primera búsqueda del día siguiente. Cubierto por `tests/registro.test.ts`.

## Prueba de humo

De solo lectura (`e2e/humo.spec.ts`): geocodifica, abre la portada, `/como-calculamos` y `/cuanto-pagas`, pide el mapa con Range y lee la tarjeta fija `pruebahumo` (`/t/pruebahumo` y su `og.jpg`). Corre cada hora (`humo.yml`, abre un issue si falla) y tras cada despliegue (job `humo` de `ci.yml`, con 3 reintentos). No tiene endpoint de borrado ni escribe nada.

- **La tarjeta `pruebahumo` se creó una vez a mano** (`POST /api/tarjeta` con `id=pruebahumo`). Si se borra por error, hay que volver a crearla; sin ella la tercera prueba falla.
- **La ruta de escritura no la cubre el humo:** antes del lanzamiento, probarla a mano (compartir una tarjeta de verdad, marcar la casilla del registro y enviar una aportación) y borrar después esos restos.

## Métricas del producto

```sh
npm run metricas                       # lee D1 de producción (hace falta wrangler login)
npm run metricas -- --desde=2026-10-20 # solo desde una fecha (la evaluación es a las 6 semanas)
```

Escribe en `informe-metricas/`: `barrios.csv` (análisis por barrio, solo desde 10) y `aportaciones.csv` (residentes, aparte). **El embudo de uso (llegadas, empieza, completa, comparte…) ya no está aquí: se mira en PostHog** (ver «Analítica»). Notas para leerlo:

- «Tarjetas creadas» son tarjetas compartidas: desde el PR de compartir, una tarjeta solo se guarda cuando la persona elige WhatsApp, X, copiar el enlace o la hoja del móvil (descargar la imagen no guarda nada). La tarjeta fija de la prueba de humo (`pruebahumo`) se excluye del recuento.
- Los datos de prueba hechos en producción antes del lanzamiento deben borrarse (ver «Antes del lanzamiento»).

## Analítica (PostHog, UE, sin cookies)

Los eventos de uso van a PostHog (`eu.i.posthog.com`) a través de un proxy del propio dominio. Código: `src/lib/cliente/analitica.ts` (SDK), `analitica-filtro.ts` (lista blanca), `analitica-datos.ts` (categorías) y `src/routes/r7k/[...ruta]/+server.ts` (proxy). Tests: `tests/analitica.test.ts`, `tests/proxy.test.ts`, `e2e/analitica.spec.ts`.

**Qué hay y qué no**
- Solo se activa en la compilación que se despliega a producción (`PUBLIC_POSTHOG_ENABLED=true` en el job `desplegar` de `ci.yml`); la clave es la variable del repositorio `PUBLIC_POSTHOG_KEY` (un token público de proyecto, no un secreto). En desarrollo, en las pruebas y en local no sale nada. Solo en `vite dev`, `?ph_prueba=1` la activa con una clave falsa para el e2e.
- `posthog-js` 1.438.1, variante `module.slim.no-external` (sin extensiones y sin cargar scripts remotos). `cookieless_mode: 'always'`, `person_profiles: 'never'`, sin autocapture, sin grabación de sesiones, sin encuestas, sin mapas de calor, sin `/flags` (`advanced_disable_flags`) y sin dependencias externas (`disable_external_dependency_loading`). Nunca `identify()` ni `$set`.
- La CSP no cambia (`connect-src 'self'`): el SDK habla solo con `/r7k`.
- El SDK se baja con `import()` dinámico cuando la página ya ha cargado y el navegador está libre (`load` + `requestIdleCallback` con tope de 2 s; `+layout.svelte`). La primera petición a `/r7k` sale unos 3 s después (el SDK agrupa los eventos). El informe de lanzamiento mide el bundle al llegar a `networkidle` (0,88 s en local), y el SDK ya se ha bajado para entonces: 161,9 KB gz (sin PostHog, 111,6 KB), dentro del presupuesto de 165 KB.
- La variante slim no trae la extensión de cambios de ruta: el `$pageview` inicial y los de las navegaciones internas los lanza `paginaVista()` (`+layout.svelte`); el `$pageleave` de cierre o recarga lo manda el SDK, y el de navegación interna, `paginaSalida()`. Cambiar solo parámetros (p. ej. `?capa=` en `/mapa`) no cuenta como página.
- El filtro de robots del SDK sigue activo en producción (solo se relaja en `vite dev`): los navegadores automatizados no cuentan.

**Eventos** (todo lo demás lo descarta `before_send`): `$pageview`, `$pageleave`, `empieza`, `usar_ubicacion`, `error_geocodificador`, `confirma_precio`, `completa`, `sin_dato`, `que_haras`, `comparte`, `aporta`, `mapa_capa`. Propiedades globales: `v`, `navegador_app`, `tarjeta_origen`, `interno` (`?internal=1`). `empieza` sale con la primera de estas acciones: escribir en el formulario o pulsar «Usar mi ubicación» (elegir un modo u otra opción no cuenta), una sola vez por análisis y con el modo ya elegido; un resultado (`completa` o `sin_dato`) cierra el análisis y el siguiente vuelve a empezar. `usar_ubicacion.resultado`: `ok`, `imprecisa`, `fuera`, `denegada` (solo si la persona rechaza el permiso) y `no_disponible` (sin GPS, tiempo agotado o posición no disponible). `empieza` y el índice de análisis viven en memoria: una recarga los reinicia. **`mapa_capa`** (08/10/2026): una sola propiedad, `capa` (`referencia`, `presupuesto` o `evolucion`); sale al cargar `/mapa` (con la capa inicial, ya leída de `?capa=`) y cada vez que se cambia de capa (pulsar la que ya está activa no repite). Nunca la zona, el barrio, el presupuesto, los metros ni coordenadas: la capa **no** llegaba a PostHog antes, porque `/mapa` la guarda en la URL (`?capa=&m2=&barrio=`, con `m2` = los metros de la persona en «Mi presupuesto») y el filtro quita esa query; el cambio de capa tampoco genera `$pageview` (la ruta no cambia).

**Propiedades `$…` y URL (08/10/2026):** el modo sin cookies de PostHog calcula el identificador diario en el servidor a partir de `$raw_user_agent`, `$host` y la IP de la petición; sin `$raw_user_agent` el evento se descarta con el aviso `cookieless_missing_user_agent`. Por eso `before_send` (`analitica-filtro.ts`) deja pasar **todas** las propiedades `$…` que añade el SDK (comprobado con la 1.438.1: `$raw_user_agent`, `$host`, `$lib`, `$lib_version`, `$cookieless_mode`, `$device_id`, `$time`, `$pathname`, `$browser`, `$os`, `$device_type`, `$screen_width/height`, `$viewport_width/height`, idioma, zona horaria…) y quita solo las de IP y geolocalización (`$ip`, `$geoip_*`, país, ciudad, latitud…) y las de perfil (`$set`, `$set_once`), además de los valores que no sean texto, número o booleano. Siguen quitándose las que no empiezan por `$`: `title`, los identificadores de clic (`gclid`, `fbclid`…) y `utm_term`; `token` y `distinct_id` (siempre `$posthog_cookieless`) los exige PostHog. **Toda URL** (`$current_url`, `$referrer`, `$initial_current_url`, `$session_entry_url`… y cualquier texto que empiece por `http`) sale con su ruta (`/t/<id>` pasa a `/t/:id`), sin hash y con la query reducida a `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `t` e `internal`, cada uno con un formato cerrado (ver «Formato de los parámetros de URL»): `/mapa?m2=70` sale como `/mapa`. Si se actualiza `posthog-js`, repetir `e2e/analitica.spec.ts` y revisar si aparecen propiedades nuevas (el test de `tests/analitica.test.ts` comprueba que un evento de ejemplo conserva `$raw_user_agent` y los UTM y no lleva m², precio, dirección ni coordenadas).

**Campaña en todos los eventos:** al cargar se leen `utm_source`, `utm_medium`, `utm_campaign` y `utm_content` de la URL (con el formato de abajo; `utm_term` ya no) y se registran en memoria (`posthog.register`) como propiedades de todos los eventos de esa carga, incluidos `completa` y `comparte`; sin ninguna campaña, solo `ref_domain` (el dominio del referrer, nunca la URL, y nunca el propio sitio). La analítica no usa cookies ni almacenamiento del navegador; el historial de la sesión sí usa `sessionStorage` (clave `asp:historial`: el formulario, con la dirección, y el resultado de cada comprobación, hasta 20; no sale del dispositivo y se borra al cerrar la pestaña) y SvelteKit guarda claves `sveltekit:*`. «Tus datos» (Cómo calculamos) lo cuenta así, y aclara que al comprobar la dirección sí se envía al servidor para calcular el resultado (no se guarda). El proxy `/r7k` reenvía el cuerpo tal cual y, en cabeceras, el user agent y la IP.

**Formato de los parámetros de URL (08/10/2026):** la query de una URL que sale hacia PostHog (`$current_url`, `$referrer`, `$initial_current_url`…) solo conserva estos parámetros, y **un parámetro que no cumple su formato se elimina entero** (nunca se envía recortado ni cambiado a minúsculas):

| Parámetro | Formato |
|---|---|
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` | hasta 40 caracteres; solo letras minúsculas, cifras, `-` y `_`; empieza por letra y no lleva tres cifras seguidas. Así no puede ser un precio (`2500`), una sección censal (`2807904033`) ni una cifra suelta; tampoco `oct-2026` ni `Instagram`: se escribe `oct-26` o `instagram` |
| `t` | exactamente 10 caracteres de base 36 (`0-9a-z`, el id de tarjeta) y no solo cifras (parecería una sección censal; un id aleatorio de solo cifras sale una vez entre unos 370.000) |
| `internal` | solo `1` |

**Ejemplo de enlace de campaña que funciona:**

```
https://asuprecio.com/?utm_source=instagram&utm_medium=bio&utm_campaign=soft-oct&utm_content=mensaje-a
```

**Lo que lo rompe** (el parámetro entero deja de salir hacia PostHog, y el enlace sigue funcionando):
- **Mayúsculas:** `utm_source=Instagram` → escribir `instagram`.
- **Años y números largos:** `utm_campaign=oct-2026` → `oct-26`; nunca cifras sueltas ni precios (`2500`) ni números de 10 cifras (`2807904033`). No puede haber tres cifras seguidas.
- **Espacios, acentos, `ñ`, puntos y símbolos:** `mensaje a` → `mensaje-a`; solo valen letras sin acento, cifras, `-` y `_`.
- **Empezar por cifra o guion** (`1bio`, `-bio`) o **pasar de 40 caracteres.**
- `utm_term` y `c` no se envían nunca.

El mismo formato de campaña se exige a las propiedades `utm_*` de los eventos (`posthog.register` al cargar). `c` ya no se deja pasar: ningún código de la app lo escribe ni lo lee. Todo lo demás (`m2`, `precio`, `barrio`, `capa`, `gclid`…) se quita. La definición está en `analitica-filtro.ts` (`PARAMETROS_URL`, `campanaValida`) y la comprueban `tests/analitica.test.ts` y `e2e/analitica.spec.ts`.

**Antes de activarlo (una vez, en PostHog):** Project settings › Web analytics › activar «Cookieless server hash mode». Sin ello, el SDK no envía eventos útiles. Opcionalmente, descartar la IP del cliente en la configuración del proyecto si la opción existe (no verificado).

**Verificar en PostHog tras el despliegue**
1. Abre la web de producción en el móvil (mejor desde un enlace con `?internal=1` y `utm_source=prueba`) y haz un análisis completo: escribe, comprueba, contesta «¿Qué vas a hacer…?» y descarga la imagen.
2. En PostHog › Activity (Live events), en 1-2 minutos: `$pageview`, `empieza`, `completa`, `que_haras` y `comparte`. Abre uno: `distinct_id` debe ser un identificador distinto cada día (no `$posthog_cookieless`: es el valor que manda el navegador y el servidor lo sustituye por el hash diario) y no debe haber ninguna propiedad fuera de la lista de arriba.
3. Comprueba que `$current_url` no lleva `gclid` ni nada salvo `utm_*` válidos, `t` e `internal`, que `$pathname` de una tarjeta es `/t/:id` y que `$referrer` es solo un dominio.
4. Con otro dispositivo (o desde el ordenador) repite: los identificadores de persona deben ser distintos. Si salen iguales, el proxy no está reenviando el user agent o la IP (no verificado: la documentación no lo detalla).
5. Filtra los eventos de prueba con la propiedad `interno = true`.
6. Dashboards: embudo `$pageview` → `empieza` → `completa` → `comparte`; `completa` por `resultado`, `distrito` y `navegador_app`; `que_haras` por `modo`.

**Limitación de frecuencia (Cloudflare, no en el código):** el proxy no escribe nada para limitar. Regla sugerida sobre `/r7k/*`: **20 peticiones por IP cada 10 s, bloqueo 10 s** (el plan gratuito, hasta donde sé, solo admite un periodo de 10 s: confirmarlo en el panel). Cálculo: una visita normal manda 1 petición de arranque (la página vista), 1 o 2 de eventos (se agrupan cada ~3 s) y 1 al salir: unas 4-6 en toda la visita y 2-3 en cualquier ventana de 10 s. 20 deja margen para varias personas tras una misma IP (redes móviles, oficinas) y corta un script. El proxy además solo acepta POST a `/e/`, `/i/v0/e/` y `/batch/`, hasta 200 kB. Atiende `/r7k/e/` y `/r7k/e` sin redirigir (`trailingSlash = 'ignore'`): con la redirección 308 por defecto de SvelteKit, cada evento habría costado dos peticiones al Worker.

**Orden de despliegue de la baja de `eventos`:** 1) fusionar y desplegar el código (ya no escribe en `eventos`); 2) con la web ya desplegada, enseñar el recuento y, con el OK, aplicar `migrations/0004_quitar_eventos.sql` (`npx wrangler d1 migrations apply a-su-precio-registro --remote`). Si se aplicara antes, los navegadores con la versión vieja fallarían al enviar eventos (en silencio). Antes de borrar, el export de los 23 eventos actuales: `wrangler d1 execute a-su-precio-registro --remote --command "SELECT * FROM eventos" --json`.

**Registros del Worker:** `wrangler.jsonc` pone `observability.logs.invocation_logs: false`. Los registros de invocación guardaban método y URL de cada petición (con `?barrio=` o el id de `/t/…`) durante 3 días (plan gratuito) o 7 (de pago); la documentación de Cloudflare no detalla si incluyen la IP o las cabeceras (no verificado). El código no escribe `console.*` en el servidor.

## «Lo que se pide» (anuncios recientes del Ayuntamiento)

Segundo punto de referencia junto a los contratos SERPAVI: el €/m² de los anuncios recientes por barrio o distrito, × los m² de la persona. **Está ACTIVO por defecto** (decisión del 09/10/2026, ver `docs/decisiones.md`): no hay que configurar nada en Cloudflare. Las dos flags de compilación se conservan como **interruptor de emergencia**: solo el valor exacto `false` apaga (ausente o vacío = activo); apagar exige un redeploy. Se construye en tres PR apiladas (motor y resultado → mapa → textos de portada y «Cómo calculamos»); la primera (resultado) y la segunda (mapa) están hechas; la tercera (textos) también, y **no va tras flag**: portada, «Cómo calculamos» y pie hablan de los anuncios recientes aunque se apague la oferta; si se apagara, habría que revisar esos textos.

**Cómo se apaga (y se vuelve a encender)**
- **Local:** `PUBLIC_OFERTA_ENABLED=false npm run dev` (PowerShell: `$env:PUBLIC_OFERTA_ENABLED='false'; npm run dev`). Sin la variable, activo. Es una variable pública de compilación (`src/env.ts`, estática): se lee al construir, no al ejecutar.
- **Producción:** el paso de build del job `desplegar` (`ci.yml`) pasa `PUBLIC_OFERTA_ENABLED: ${{ vars.PUBLIC_OFERTA_ENABLED }}` y `PUBLIC_OFERTA_MAPA_ENABLED: ${{ vars.PUBLIC_OFERTA_MAPA_ENABLED }}`; ausente o vacía = activa. Si algún día se crean, van en el entorno `produccion` (Settings → Environments → produccion → Environment variables), no en el repositorio.
  - **Apagar todo (emergencia):** variable `PUBLIC_OFERTA_ENABLED` = `false` en el entorno `produccion` y relanzar el CI del último commit de `main` (Actions → CI → «Re-run all jobs»). Basta con ella: la del mapa depende de la principal.
  - **Apagar solo el mapa:** `PUBLIC_OFERTA_MAPA_ENABLED` = `false` y relanzar; el resultado conserva la línea de oferta.
  - **Volver a encender:** borrar la variable (o ponerla a `true`) y relanzar.
  - **Duración del redeploy:** el relanzamiento repite `pruebas`, `desplegar` y `humo`. **No la he medido** (`gh` no está en este equipo): anotar aquí la duración real (Actions → CI → «Total duration»).
  - **Más rápido aún (por verificar):** `npx wrangler rollback` vuelve a la versión anterior del Worker sin reconstruir, pero solo sirve si esa versión no llevaba la oferta.
- **Vista previa:** no existe (no se activan URLs de vista previa por rama). El job `pruebas` compila sin variables, es decir, con la oferta activa.
- La prueba de humo no cambia: es de solo lectura y no depende de las flags.

**Las dos flags (`PUBLIC_OFERTA_ENABLED`, `PUBLIC_OFERTA_MAPA_ENABLED`)**

La del mapa añade a `/mapa` el selector Contratos | Anuncios en «Referencia» y «Mi presupuesto», y **solo tiene efecto si la principal está activa**. Con el mapa apagado y la principal activa, el mapa queda como antes (sin selector, sin rótulo, y `/mapa` no pide `oferta_madrid.json`).

| `PUBLIC_OFERTA_ENABLED` | `PUBLIC_OFERTA_MAPA_ENABLED` | Resultado | Mapa |
|---|---|---|---|
| ausente, vacía o `true` (**por defecto**) | ausente, vacía o `true` (**por defecto**) | línea de oferta en el resultado | selector, rótulo, violeta y punteado |
| ausente, vacía o `true` | `false` | línea de oferta en el resultado | como antes |
| `false` | (cualquiera) | como antes | como antes |

- **Probar las tres combinaciones en local:** los valores estáticos se escriben al arrancar en `.svelte-kit/`, así que **dos servidores de desarrollo con flags distintas a la vez se pisan** (todos leen las del último): una combinación detrás de otra, parando el servidor entre medias.
- La analítica de `/mapa` añade `fuente_mapa` (`contratos` o `anuncios`) a `mapa_capa` con el selector y solo en las capas que lo tienen; con el mapa apagado, el evento es el de siempre.

**Datos: proceso mensual, a mano**
1. Descargar del Banco de Datos del Ayuntamiento la serie «4.3.21.D. Evolución del precio de oferta de alquiler de la vivienda (€/m²) por Distrito, Barrio y Mes» (en el nombre del fichero descargado aparece `0504030000214`) y dejarla en `data/raw/` (no se sube a git) como `oferta_AAAA-MM.csv` o `.xlsx`, con el mes del último dato en el nombre. La URL estable de descarga no está verificada: el Banco de Datos necesita navegador.
2. `.venv/bin/python scripts/10_oferta.py` (sin argumentos usa el fichero más reciente) → `data/processed/oferta_madrid.json`; después `npm run datos`; subir el JSON en un PR.
3. Reglas del script: el mes es el último con dato en algún distrito; «..» = sin dato; distrito = su último mes con dato; **barrio solo si tiene dato en el último mes y en el anterior** (con el valor del último); si no, el producto usa el distrito, nunca otro barrio. El script se detiene (nunca adivina) si un valor no se lee, está fuera de 5-60 €/m², faltan barrios oficiales o el mes del nombre no coincide con el último con dato. Las equivalencias de barrios de Idealista con los del BOAM (pie de la serie) ya vienen aplicadas en los códigos.
4. Resultado de junio de 2026: 21 de 21 distritos con dato y 92 de 131 barrios con dato en mayo y junio (37 sin dato; Marroquina y Timón solo tienen junio y no se usan; Casco Histórico de Vallecas solo tiene mayo).

**Reglas del producto**
- Estimada = €/m² × m² de la persona, con m² ≥ 30 y zona con dato; si no, no hay línea y tampoco error. Sin línea en las pantallas «sin dato».
- Banda de «en línea»: ±10 % de la estimada (`config/oferta.json`); límites incluidos. Se recalibra con `resultado_oferta` tras el soft launch.
- Con varias zonas posibles (calle sin número): el barrio solo si es uno; si no, el distrito si es uno; si son de distritos distintos, no hay línea.
- **Nunca** se muestra ni se calcula la diferencia entre las dos referencias: cada una se compara solo con el precio de la persona.
- La línea de oferta no lleva el nombre del barrio («en el barrio» o «en el distrito»); las tarjetas de compartir no llevan la línea, pero su titular dice «frente a los contratos vigentes de la zona». El índice sigue siendo el IPC del alquiler (nacional), también para los contratos.

**Licencia y atribución (riesgo aceptado, 09/10/2026)**
- Aviso legal del Ayuntamiento (datos.madrid.es/pages/aviso-legal): «Las informaciones que contiene son de titularidad del Ayuntamiento de Madrid […] pueden ser utilizadas libremente, indicando la fuente y el nombre del autor. Este criterio de reutilización no se aplica, salvo que expresamente se establezca lo contrario, ni a imágenes, vídeos u otros contenidos multimedia, ni tampoco a las informaciones […] publicadas por el Ayuntamiento de Madrid procedentes de terceros que vayan firmados.»
- **Riesgo aceptado:** la serie dice «elaboración propia a partir de los datos facilitados por Idealista» y no hay confirmación escrita de que caiga en la reutilización libre y no en la excepción de terceros. El dato es público y se cita la fuente. Si el Ayuntamiento lo discute, el interruptor de arriba apaga la oferta con un redeploy. Confirmarlo (portal de datos abiertos, CC BY 4.0, o el trámite «Procedimiento para la reutilización de documentos») sigue siendo recomendable.
- Atribución en pantalla: «Fuente: Ayuntamiento de Madrid, Banco de Datos, serie 4.3.21.D (elaboración del Ayuntamiento a partir de datos de Idealista), {mes año}.» Idealista no se usa directamente en el producto.

**Analítica:** `completa` lleva además `resultado_oferta` (`por_debajo`, `en_linea`, `por_encima`) y `nivel_oferta` (`barrio`, `distrito`), solo cuando hay línea de oferta (si no, las propiedades no salen). Nunca importes, €/m², m², barrio ni la zona. Con `resultado` (contratos) y `modo` salen los cinco casos. Ojo: `completa` ya llevaba `distrito` y `brecha_tramo`; el distrito viaja ahora también junto a `resultado_oferta` (decisión pendiente, ver la PR).

## Antes del lanzamiento

1. Quitar el `noindex`: `config/indexacion.json` → `"noindex": false`, y desplegar.
2. Borrar los datos de prueba de producción:
   ```sh
   npx wrangler d1 execute a-su-precio-registro --remote --command "DELETE FROM tarjetas; DELETE FROM analisis; DELETE FROM aportaciones; DELETE FROM habitaciones; DELETE FROM limites; DELETE FROM dedupe;"
   ```
   Las imágenes de las tarjetas viejas quedan en R2 sin referencia; se pueden dejar o borrar desde el panel.
3. Probar la vista previa de `/t/:id` en WhatsApp y X desde un móvil.
4. `npm run informe:lanzamiento` sin fallos (bloquea `/r7k` para no contar como visitas). El presupuesto «Bundle inicial» es de **165 KB gz** (era 150 KB; subido el 07/10/2026 al añadir PostHog, variante slim, +50 KB: se mide 161,9 KB).
5. Quitar los eventos de prueba en PostHog (filtro `interno = true`) o empezar el análisis desde la fecha del lanzamiento.
6. «Lo que se pide»: decidir si se enciende. Antes, la licencia de la serie confirmada, la variable en el entorno `produccion` y la duración real del redeploy anotada.
