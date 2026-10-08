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

**Campaña en todos los eventos:** al cargar se leen `utm_source`, `utm_medium`, `utm_campaign` y `utm_content` de la URL (con el formato de abajo; `utm_term` ya no) y se registran en memoria (`posthog.register`) como propiedades de todos los eventos de esa carga, incluidos `completa` y `comparte`; sin ninguna campaña, solo `ref_domain` (el dominio del referrer, nunca la URL, y nunca el propio sitio). Nada en cookies ni en el almacenamiento del navegador. El proxy `/r7k` reenvía el cuerpo tal cual y, en cabeceras, el user agent y la IP.

**Formato de los parámetros de URL (08/10/2026):** la query de una URL que sale hacia PostHog (`$current_url`, `$referrer`, `$initial_current_url`…) solo conserva estos parámetros, y **un parámetro que no cumple su formato se elimina entero** (nunca se envía recortado ni cambiado a minúsculas):

| Parámetro | Formato |
|---|---|
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` | hasta 40 caracteres; solo letras minúsculas, cifras, `-` y `_`; empieza por letra y no lleva tres cifras seguidas. Así no puede ser un precio (`2500`), una sección censal (`2807904033`) ni una cifra suelta; tampoco `oct-2026` ni `Instagram`: se escribe `oct-26` o `instagram` |
| `t` | exactamente 10 caracteres de base 36 (`0-9a-z`, el id de tarjeta) y no solo cifras (parecería una sección censal; un id aleatorio de solo cifras sale una vez entre unos 370.000) |
| `internal` | solo `1` |

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
