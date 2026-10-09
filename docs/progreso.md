# Progreso de la implementación

Qué está hecho, con qué cifras y qué se desvió del plan. El plan está en `docs/plan.md`; el porqué de las decisiones de producto, en `docs/decisiones.md`. Se actualiza al cerrar cada hito o cuando cambia algo relevante.

## Estado

| Hito | Estado | Fecha |
|---|---|---|
| 1. Datos | ✅ Hecho | 05/10/2026 |
| 2. Motor | ✅ Hecho | 05/10/2026 |
| 3. Ubicación | ✅ Hecho (endpoint `/api/geocode` → Hito 4) | 05/10/2026 |
| 4. Interfaz | Paso 1 hecho (falta «Tu zona») | 05/10/2026 |
| 5. Registro, aportaciones y eventos | Hecho salvo la interfaz de consentimiento del registro de análisis (R7) | 05/10/2026 |
| 6. Metodología | Pendiente (antes: nombre, dominio, quiénes somos, financiación) | |
| 7. Despliegue | Pendiente | |

## Hito 5 — Registro, aportaciones y eventos (05/10/2026)

**Hecho**
- `migrations/0001_registro.sql` (tablas `analisis`, `aportaciones`, `eventos`, `limites`, `dedupe`, `tarjetas`) y `src/lib/server/registro.ts` con el antiabuso: €/m² entre 5 y 60, duplicado a 30 días con HMAC con secreto, 20 registros por IP y día con HMAC de sal diaria (la IP no se guarda).
- Endpoints `/api/analisis`, `/api/aportacion`, `/api/evento` y `/api/contadores`. Fallo de antiabuso = 202 sin guardar (el resultado se ve igual); límite = 429.
- Eventos del embudo (llegada, empieza, completa, servido, comparte, desde_tarjeta, segundo, aporta, habitación) con id de visita en sessionStorage y `?t=<id>` desde `/t/:id`. Las pantallas sin dato no emiten «completa».
- Contadores reales: total de pisos comprobados (eventos «completa») en la portada; recuento del barrio solo desde 10.
- «¿Cuánto pagas tú?» en `/cuanto-pagas`: botón desactivado sin casilla, sin ninguna petición hasta marcarla; del servidor solo se lleva el barrio.
- Tests: esquema sin columnas `ip/direccion/cusec/seccion/fecha/ts`, 30 días con reloj simulado, 21.º registro → 429, rotación de sal, ninguna consulta cruza `analisis` y `aportaciones` (grep sobre el código), atribución de análisis desde tarjeta. 263 unitarios y 106 e2e.

**Desviaciones y pendientes**
- **Diseño vs privacidad:** la pantalla 5q dice que se guarda «la sección censal» y «la fecha». Se guarda el **barrio** y el **mes** (CLAUDE.md); el texto de la pantalla lo dice así. Añadí la columna `incluye` (garaje, trastero, comunidad, amueblado) a `aportaciones`, que el plan no tenía.
- **R7 sin interfaz:** el endpoint `/api/analisis` está listo y probado, pero no hay pantalla para pedir el consentimiento al registrar un análisis (el diseño no la trae). Hoy no se registra ninguno desde la web.
- Calle en varios barrios: se elige el barrio con chips; si la calle cruza más de 6 secciones se pide el número del portal.
- Producción: hace falta aplicar la migración en D1 (`wrangler d1 migrations apply`) y definir el secreto `SECRETO`. En desarrollo todo va a SQLite en memoria.
- El recuento de aportaciones por barrio existe en `/api/contadores` pero no se muestra aún (R11, «se muestra por barrio con n≥10»).

## Hito 4 — Interfaz (05/10/2026) · paso 1 hecho: formulario, resultado, sin dato, tarjeta y /t/:id

Nombre del producto: **A su precio**. Diseño en `docs/design` (README del handoff como notas de desarrollo). Verificación visual: `npx playwright test` genera capturas en `e2e/capturas/` (390, 360 y 1280 px) y `node scripts/comparar_diseno.mjs` las pone junto al diseño (`e2e/capturas/index.html`).

**Hecho**
- SvelteKit 3 (config en `vite.config.ts`; `$lib` ya no existe: se usa `#lib/...` vía `imports` de package.json). Sofia Sans (3 anchos, OFL) en `static/fonts`; CSP sin orígenes externos.
- View-models nuevos/ajustados: `barra.ts` (escala del diseño: 0 → 1,15·máx(precio, techo), tramos con horquilla), `vista.ts` (lugar, cifra, frase, etiquetas de la barra, meses), `tarjeta.ts` (datos serializables sin precio; la barra va en fracciones), `contadores.ts`, `negociar.ts`, `historial.ts`. Formato con espacio duro en todo.
- Componentes en `src/lib/componentes`; cliente en `src/lib/cliente` (datos, geocodificación, canvas de la tarjeta y la vista previa OG, compartir, mapa del pin, historial en sessionStorage).
- Servidor: `/api/geocode` (sin logs ni escrituras; test), `/api/tarjeta` (valida y descarta todo salvo la tarjeta), `/t/:id` y `/t/:id/og.jpg`. Almacén D1 + R2 implementado y probado con SQLite; en dev, memoria.
- Tests: 240 (Vitest) y 91 (Playwright, 3 tamaños). Bundle inicial ≈ 66 KB gz.

**Pendiente / decisiones a revisar**
- «Cómo calculamos» y «¿Cuánto pagas tú?»: no hay página, así que no hay enlaces (Hitos 6 y 5/R11). «Tu zona» llegará con su diseño.
- Contadores: sin servidor no se muestran (home ni barrio); lógica y umbral de 10 listos.
- «¿Te ha servido?» responde en pantalla pero no envía nada (eventos: Hito 5).
- Pie con la atribución larga del INE (CLAUDE.md), no la corta del diseño; fecha del IPC añadida a la línea de fuente.
- Titular del nivel b («Cerca del techo» / «Sobre la parte alta») y textos de «sin datos aquí» y «fuera de Madrid» son míos: el diseño no los trae.
- Compartir tarjeta también en nivel c con horquilla (README), aunque la captura 3h muestra «Comprobar otro piso».
- Mapa del pin: secciones en canvas, sin callejero (Hito 7). Sin autocompletado de calles.
- tabular-nums no existe en canvas: cifras de la tarjeta con numerales por defecto.
- `/t/:id` sin límite por IP ni registro de eventos (Hito 5). TypeScript se comprueba con `npm run check` (svelte-check; `tsc` no entiende `$app/tsconfig`).

## Hito 3 — Ubicación (05/10/2026)

**Código** en `src/lib/ubicacion/` (TypeScript puro) y `src/lib/server/`:

| Fichero | Contenido |
|---|---|
| `normalizar.ts` | Misma normalización que el ETL en Python (un test lo comprueba en los 8.901 viales) y abreviaturas de tipo de vía (C/, Avda., Pº, Pza.…) |
| `parser.ts` | Texto libre → interpretaciones (tipo, nombre, número, extensión). Descarta piso, puerta, código postal y «Madrid» |
| `indice.ts` | Índice en memoria de viales: similitud de Dice por trigramas (tolera erratas); el tipo de vía desempata (±0,1) |
| `geocodificar.ts` | Resultados: exacta · aproximada (número inexistente → portal más cercano de la misma paridad; portal en varias secciones) · calle (≤6 secciones) · demasiadas_secciones · no_encontrada con sugerencias |
| `pin.ts` | Pin en el mapa, en el navegador: sección del punto + secciones a ≤150 m del punto, tope de 6 |
| `server/callejero-d1.ts` | Adaptador de D1 para el Worker (índice cacheado por instancia) |

**Datos de prueba** (generados con semilla fija):
- `scripts/06_direcciones_prueba.py` → `tests/fixtures/direcciones_100.csv`: 55 exactas, 10 con errata, 10 conocidas escritas a mano, 10 calles sin número, 10 números inexistentes y 5 calles largas.
- `scripts/07_puntos_prueba.py` → `tests/fixtures/puntos_pip.csv`: 1.000 puntos con su sección y sus vecinas calculadas en Python a precisión completa.
- `scripts/08_direcciones_gate.py` → `tests/fixtures/direcciones_gate.csv`: las 50 direcciones del gate. Por cada una, la que se tecleó en la app oficial y la sección que dio (30 casos). Lee `data/raw/gate/gate_50_anuncios_madrid_relleno.xlsx`, que no va a git. El fixture lleva solo direcciones y secciones, sin precios.

**Resultados:**
- **Direcciones:** 99 de 100 resueltas (criterio: ≥95), con un p95 de 6,9 ms (criterio: <300 ms). El fallo es «santa lucercia», errata que se va a otra calle parecida.
- **Pin:** la sección del punto coincide con Python en los 1.000 puntos. Las distancias difieren 0,74 m como mucho, y la horquilla es igual en todos los puntos (salvo las secciones a 150 ± 3 m). Tarda 0,2 ms por pin.
- **Gate frente a la app oficial:** coinciden las 60 consultas, que son las 30 direcciones escritas como en el anuncio y como se teclearon en la app. Es la validación independiente de nuestro callejero.
- **Resto del gate (20 sin consulta en la app):** coinciden 19. El fallo, A12 (Pradillo 26), no es del geocodificador. El gate calculó la sección con las coordenadas del anuncio, que caen en la acera de enfrente (impares, 2807905038), y el portal 26 está en la 2807905046.
- 136 tests en total.

**Desviaciones del plan:**
- **Las 50 direcciones del gate van en un test aparte**, no dentro de las 100, porque el CSV del motor no trae las direcciones. Las 100 salen de portales reales con variantes de escritura, más 10 direcciones conocidas. Solo 9 de las 50 del gate son exactas en el anuncio; el resto son el portal más cercano a sus coordenadas.
- **El endpoint `/api/geocode` y el test de «no registra la dirección»** pasan al Hito 4, con el esqueleto de SvelteKit y el Worker. La lógica y el adaptador de D1 ya están probados.
- **Interpretaciones del parser:** se prueban todas y gana la que da un portal exacto. Hay 184 calles con dígitos en el nombre («PROV AHIJONES 18»).
- **Números de portal en dos secciones (112 en Madrid):** se tratan como horquilla.

## Hito 2 — Motor (05/10/2026)

**Código** en `src/lib/motor/` (TypeScript puro, sin dependencias):

| Fichero | Contenido |
|---|---|
| `rango.ts` | §5.3: k, V_inf/V_sup en €/m², R_inf/R_sup en €/mes × f |
| `correccion.ts` | §5.4: x desde la puntuación, corrección general y `referencia()` con R_max (x = 1) |
| `niveles.ts` | Dentro (baja, media o alta por tercios), explicable, por encima; brecha sobre R_sup; orden de prudencia |
| `elegibilidad.ts` | Motivos sin dato y su precedencia: unifamiliar > temporal > obra nueva > superficie > sección sin dato > testigos |
| `analizar.ts` | Punto de entrada: anuncio + secciones candidatas → resultado (con horquilla) o motivo |

**Tests** (`tests/motor.test.ts`, 106; `npm run coverage`):
- Los 30 casos `validacion_app` reproducen la app oficial con un error máximo de **0,62 céntimos**.
- Las 45 filas con rango inicial (§5.3) dan un error de ≤0,5 céntimos.
- Los 8 casos sin dato dan su motivo esperado.
- Agregado del gate: 9/4/29 con IPC (mediana +19%) y 6/3/33 sin IPC (+26%).
- En los 3 pares C, la referencia cambia un 4-8% y el nivel no cambia.
- Propiedades: R_max, linealidad del factor IPC, límites de k, de los niveles, de los tercios y de la superficie (30 y 150 m² entran).
- Horquilla: nivel más prudente, intervalo de %, exclusiones.
- Cobertura del 100% en statements, ramas, funciones y líneas (umbral en `vitest.config.ts`).

**Decisiones de implementación (revisables):**
- **k se limita a [0, 1].** Solo afecta a la sección 2807905002 (Smed 151 m²), que daría 1,005. Si el argumento del logaritmo es ≤1 (Smed < 30), k = 0.
- **Por debajo de R_inf** el resultado es «dentro, parte baja».
- **Brecha:** se calcula siempre que el precio supera R_sup, también en el nivel «explicable». La interfaz decide si la muestra.
- **Horquilla, sección prudente:** el nivel manda sobre el %. Puede ser prudente una sección con más % si su R_max es más holgado; a igual nivel, gana la de menor %.
- **Tipo de vivienda en el CSV:** no hay columna; A50 se trata como casa (es la «casa adosada» del gate).

## Hito 1 — Datos (05/10/2026)

**Cómo regenerar** (desde la raíz, con `.venv` creado: `python3.12 -m venv .venv && .venv/bin/pip install -e .`):

```
.venv/bin/python scripts/00_descargar.py      # seccionado 2021, barrios, IPC; CartoCiudad es manual
.venv/bin/python scripts/01_poligonos.py      # polígonos, sección → barrio, vecinas
.venv/bin/python scripts/02_serpavi_secciones.py
.venv/bin/python scripts/03_callejero.py
.venv/bin/python scripts/04_ipc.py
.venv/bin/python scripts/05_verificar.py      # criterios de aceptación; sale con 1 si falla algo
```

**Fuentes en `data/raw/`** (no van a git):

| Fichero | Origen |
|---|---|
| `2026-03_09_bd_SERPAVI_2011-2024 - DEFINITIVO WEB_v2.xlsx` | MIVAU, manual |
| `seccionado_2021.zip` | INE, `SECC_CE_20210101`, el mismo que en el gate |
| `barrios_madrid.zip` | Geoportal del Ayuntamiento de Madrid |
| `ipc_alquiler_serie.json` | INE, serie IPC291807 |
| `cartociudad/madrid.gpkg` | CNIG, manual |

**Salidas en `data/processed/`:**

| Fichero | Contenido | Tamaño |
|---|---|---|
| `secciones_madrid.json` | 2.442 secciones: Smed, P25, P75, testigos, barrio, mediana 2015 y 2024 | 415 KB (105 KB gz) |
| `serie_secciones/<distrito>.json` | Serie 2011-2024 por sección | 2,2 MB en 21 ficheros |
| `secciones_madrid.topo.json` | 2.443 polígonos con centroide | 864 KB |
| `seccion_barrio.json` | Sección → barrio (131) | 55 KB |
| `vecinas.json` | Secciones a ≤150 m, solo como prefiltro | 453 KB |
| `ipc_alquiler.json` | Factor 1,054004 (97,623 → 102,895, agosto de 2026) | 1 KB |
| `geocoder.sqlite` | 8.901 viales y 224.229 portales con sección (no va a git) | 13,5 MB (7,2 MB gz) |
| `viales_autocompletar.json` | Nombres de vía para las sugerencias | 248 KB (88 KB gz) |

**Cifras de la verificación:**
- Las 2.442 secciones SERPAVI tienen polígono 2021 y barrio.
- Las 53 filas de `tests_motor_serpavi.csv` coinciden en Smed, P25, P75 y testigos.
- 2.421 secciones tienen rango; 2.369, además, más de 20 testigos.
- 64 secciones no tienen mediana de 2015: no muestran la línea de evolución.
- El 100% de los portales tiene sección. 64 caían fuera de polígono y 60 se recuperaron a ≤50 m; los 4 restantes se quedan sin sección.
- Descartados: 219 portales con número no numérico y los 583 puntos kilométricos.

**Desviaciones del plan:**
- Scripts 01 y 02 intercambiados: el de SERPAVI necesita el barrio.
- `.venv` con pip en lugar de uv (no estaba instalado). El `pyproject.toml` sirve igual con uv.
- El GeoPackage de CartoCiudad no trae viales: se derivan de los portales. Los nombres vienen sin tildes ni partículas («PASEO CASTELLANA»).
- `vecinas.json` es solo un prefiltro (11,2 vecinas de media). La horquilla del pin mide desde el punto en el navegador.
- Barrios con los nombres oficiales del Ayuntamiento, no los de Fotocasa del CSV (13 casos difieren: «PAU de Carabanchel», «Sanchinarro»…).
- Las salidas pesan más de lo estimado: `secciones_madrid.json` guarda los valores a precisión completa. Revisar si hace falta en el Hito 4 (bundle inicial por debajo de 150 KB gz).

**Notas:**
- La sección 2807910157 tiene polígono pero no fila SERPAVI: saldrá como «sin dato».
- 17 secciones están repartidas entre dos barrios: se asignan al de mayor área.

## Hito 6 — Metodología (R8)
- `/como-calculamos` (prerenderizada): referencia, ajuste IPC (factor y mes leídos de `ipc_alquiler.json`), tres niveles, precio pedido frente a firmado, límites, fuentes, datos propios, quiénes somos y financiación (textos del usuario, con «A su precio»).
- Texto en `src/lib/resultado/metodologia.ts`; test en `tests/metodologia.test.ts`; e2e en `e2e/metodologia.spec.ts`.
- Enlazada desde la cabecera (escritorio), el pie y la línea de fuente del resultado. Las atribuciones salen del pie.
- Pendiente: la explicación de «Tu zona», «Aquí estarías dentro» y la evolución, cuando existan esos componentes.

## Hito 7 — Despliegue (en curso)
- Producción: https://a-su-precio.tiene-sentido.workers.dev (Worker `a-su-precio`, D1 `a-su-precio-callejero` y `a-su-precio-registro`, R2 `a-su-precio-tarjetas`, secreto `SECRETO`). Sin dominio propio todavía.
- El adaptador de Cloudflare ya no rellena `platform.env`: el entorno se lee de `cloudflare:workers` (`entornoDe`).
- `static/.assetsignore` evita publicar `_worker.js`. `scripts/volcar_callejero.sh` genera el SQL del callejero para D1.
- Prueba de humo contra producción: `BASE_URL=<url> npx playwright test e2e/flujo.spec.ts e2e/tarjeta.spec.ts`. Tres tests asumen `localhost` o no envían `Origin`: pendientes de adaptar.
- CI (`.github/workflows/ci.yml`): check, tests y build en cada PR; despliegue al fusionar en `main`. Sin `geocoder.sqlite` (no está en git) se saltan 7 tests. Los e2e quedan en local.
- IPC (`.github/workflows/ipc-mensual.yml`): el día 18 de cada mes descarga la serie del INE y abre un PR si cambia el dato.
- Pendiente: secretos del repo (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`), vista previa en WhatsApp y X, dominio propio, PMTiles.

## Tu zona y Cómo calculamos (diseño actualizado)
- Diseño nuevo en `docs/design/` (handoff `design_handoff_a_su_precio`): reemplaza al anterior. Trae «Tu zona» (6a-6f) y «Cómo calculamos» (7a-7c).
- **Tu zona** (`TuZona.svelte`, `cliente/zona.ts`, `cliente/zona-mapa.ts`): mapa SVG con las zonas reales a ≤ 1,5 km coloreadas por la parte alta de su referencia en €/m² (cortes fijos 15, 18, 21 y 24 para toda la ciudad), líneas gruesas entre barrios (aristas compartidas de la topología), nombres de barrio solo si caben, marcadores numerados, leyenda con muesca, lista de hasta 5 zonas (una por barrio) con la posición del precio y la evolución 2015-2024. Se calcula en el navegador; ni el punto ni el precio salen del dispositivo.
- **Cómo calculamos**: índice fijo en escritorio y selector en móvil; el ejemplo de cuatro pasos sale del motor con la sección de Fuente del Berro (2200 €, 90 m²) y cambia solo con el IPC; los siete límites enlazan a `/?motivo=…`.
- Desviaciones del diseño, a propósito: «Tus datos» y las atribuciones (la del INE, literal, de CLAUDE.md) son más completos; el logotipo lleva el lema; la casilla del registro mantiene el texto pedido («Suma este piso a las estadísticas de tu barrio (anónimo)») y no el del diseño; las marcas NUEVO, BORRADOR, EJEMPLO y PENDIENTE no se publican; la lista de zonas con datos reales suele tener menos de 5 filas.
- En `vite dev` el geocodificador no se limita y se usan siempre SQLite y memoria, no los D1 y R2 simulados de wrangler.


## Tarjeta y resultado: ratio, etiquetas y aviso de error (05/10/2026)
- **Ratio:** por debajo de 2 veces la parte alta, «+X %»; desde 2, «X,X veces la parte alta». Una sola función (`src/lib/resultado/ratio.ts`) para la pantalla y la tarjeta; sin frases fijas por tramo.
- **Etiquetas de la barra:** `colocarEtiqueta` mantiene «techo para un piso excelente» y «parte alta» enteras y sin pisar el «0 €» con brechas de +100 %, +240 % y +400 %, en la tarjeta de 1080×1350 y en pantalla (390, 360 y 1280 px).
- **Aviso de error al teclear:** más de 3 veces la parte alta (`UMBRAL_ERROR_TECLEO`) pide confirmar antes del resultado; sin confirmar no hay tarjeta; el evento `confirma_precio` no lleva precio.

## Compartir la tarjeta por canales (05/10/2026)
- **Opción A:** el id `/t/ID` se genera en el navegador al abrir el resultado; la tarjeta solo se sube cuando la persona elige un canal que necesita el enlace. `POST /api/tarjeta` acepta ese `id` (formato `[0-9a-z]{10}`) y no reescribe una tarjeta existente.
- **Móvil con hoja nativa** (`navigator.canShare({files})` y puntero táctil): un botón; imagen y enlace; se sube la tarjeta; evento `comparte`.
- **Escritorio:** WhatsApp y X como enlaces normales, «Copiar enlace» y «Descargar imagen» (esta última no sube nada). Eventos `comparte_whatsapp`, `comparte_x`, `comparte_copiar` y `comparte_descarga` (tipo y id de tarjeta, sin datos del anuncio). Instagram: sin botón propio. Sin SDK, scripts ni píxeles de terceros.


## Limpieza y decisiones (06/10/2026)
- **Hecho el 05/10 y fusionado:** PR #7 («Tu zona» y «Cómo calculamos»), PR #8 (ratio, etiquetas de la barra, aviso «¿Seguro?») y PR #9 (compartir por canales).
- **Decisiones registradas** en `docs/abierto.md` y `CLAUDE.md` (plan gratuito, política de pruebas, A5, A4, A1-A3).
- **Prueba de humo de solo lectura:** `humo.yml` ya no crea tarjetas; la tercera prueba lee la tarjeta fija `pruebahumo` (excluida de las métricas) y el job `humo` del CI la lanza tras desplegar, con `--retries=3`.
- **`<main>` en la portada:** envuelve el título, el formulario y el resultado, para que haya un landmark principal visible.
- **429 del geocodificador:** ya no se presenta como «sin conexión»: «Demasiadas búsquedas. Espera un momento…», con las salidas «Solo la calle» y «En el mapa».
- **«Tus datos»:** añadida la frase sobre las tarjetas compartidas (qué se guarda y que no caducan automáticamente).
- **Ideas anotadas** en `docs/ideas.md`.
- **Producción limpiada (06/10):** borrados 5 eventos y 7 tarjetas de prueba con sus 7 imágenes; contador global a 0. Creada la tarjeta fija `pruebahumo` (`POST /api/tarjeta` con `id=pruebahumo`; hizo falta el encabezado `Origin` por la protección contra POST de otro origen). PR #10 fusionado: CI de `main` con `pruebas`, `desplegar` y `humo` en verde. Ramas fusionadas borradas.

## Autocompletado de direcciones (06/10/2026, rama `autocompletado`)
- **Moscardó:** no es una vía de CartoCiudad sino un barrio oficial de Usera. «calle moscardo» y «moscardo» ofrecen «Moscardó (barrio · Usera): elige una calle o toca el mapa», que pasa al modo mapa y lo centra en el barrio.
- **Motor** (`src/lib/resultado/autocompletar.ts`, todo en el navegador): normaliza (minúsculas, sin tildes, `c/`, `cl`, `avda`, `av`, `pº`, `pza`, `gta`, `ctra`; ignora de, del, la, las, los, el; no cuenta el número del portal), coincide por palabras en cualquier posición y ordena por nombre completo > empieza por lo escrito > palabra interior > una errata (solo si no hay otra cosa). Máximo 8, con lo coincidente resaltado (subrayado de Paja). Sin calles, busca barrios y distritos (con alias); sin nada, ofrece «Solo la calle» y el mapa.
- **Datos:** `scripts/03b_sugerencias.py` genera `viales_sugerencias.json` (8.897 vías con su barrio, 264 kB, 75 kB comprimido) que se carga al enfocar la dirección.
- **Componente:** `CampoDireccion.svelte` es un combobox accesible (flechas, Intro, Esc, `aria-activedescendant` y anuncio al lector de pantalla). Elegir una sugerencia no envía el formulario y conserva el número escrito.
- **Prueba:** un único test nuevo (`tests/autocompletar.test.ts`): cada vía se encuentra escribiendo su última palabra, con y sin tilde.
- **Alias cargados:** los 3 iniciales más 13 aprobados (ver `docs/abierto.md`). El test de «cada vía por su última palabra» busca cada palabra una sola vez y tiene un tiempo máximo de 60 s: en el CI (más lento) agotaba los 5 s por defecto.

## A5: aportaciones con `firma_mes` y `renta_firma` (06/10/2026)
- **Migración `0002_aportaciones_firma.sql`** aplicada en producción (`wrangler d1 migrations apply --remote`) después de exportar la tabla (estaba vacía; copia en `data/raw/backups/aportaciones-antes-0002.sql`, fuera de git). Dos columnas nulas: el código anterior sigue funcionando antes y después. Dos tablas separadas (anuncios y aportaciones); sin `datos_v2`, sin sección y sin fecha exacta.
- `POST /api/aportacion` acepta `firmaMes` (AAAA-MM, de ese mismo año del contrato) y `rentaFirma` (entero positivo, máx. 100.000), ambos opcionales; si llegan inválidos, 400. El formulario aún no los envía.
- Tests: se actualizó el helper de esquema (`tests/d1.ts`, aplica las dos migraciones) y la aserción de la fila de aportaciones; sin tests nuevos.

## Fase 1: «Ya vivo aquí» y habitaciones (06/10/2026, rama `f1-formulario`)
Diseño en `docs/design/design-f1/` (README sección F1, `F1 Ya vivo aqui.dc.html` y capturas F1*); no sustituye a `docs/design/`.
- **Formulario:** selector «Estoy mirando un piso | Ya vivo aquí»; «Piso | Habitación | Casa» siempre visible; resumen plegado (obra nueva y larga duración); «Somos N» (solo en pantalla); fecha de firma (mes y año, o «hace menos de un año») obligatoria al vivir, y «¿cuánto pagabas al firmar?» opcional. Menú «Comprobar · Cómo calculamos»; `/cuanto-pagas` redirige (308) a `/?modo=vivo`.
- **Resultado del inquilino:** el mismo motor, seis posiciones (por debajo, parte baja/media/alta, cerca del techo en Acero y por encima del techo), con el año de firma y sin ajustar la renta; en «cerca del techo» y «por encima», € al mes y al año sobre la parte alta. «Aportar mi alquiler» (explícito): `aportaciones` con `firma_mes` y `renta_firma`. Recuento «N alquileres aportados» solo desde 10.
- **Habitaciones:** tabla nueva `habitaciones` (migración `0003`; barrio, mes, precio, habitaciones, tramo de tamaño y gastos), rango plausible 150-1.500 €/mes, deduplicación y límite diario como el resto; `GET /api/habitacion` da el recuento y, desde 10 con el mismo «incluye gastos», la mediana. Sin nivel ni veredicto.
- **Tarjetas del inquilino:** solo la posición o el % y el barrio (nunca la renta ni la fecha), con tres textos a elegir; 1080×1350 y vista previa 1200×630; el servidor solo acepta las frases conocidas. El interruptor «Mostrar mi alquiler» no se muestra.
- **«Usar mi ubicación»:** todo en el navegador (geolocalización + punto en polígono); estados pidiendo, activa («Mi ubicación · barrio (±30 m)»), precisión baja (> 150 m, con «Escribir la dirección», «Colocar en el mapa» y «Usarla igualmente»), denegado, tiempo agotado y fuera de Madrid. Las coordenadas no se envían ni se guardan.
- **Portada de escritorio:** resultado de muestra marcado EJEMPLO, calculado por el motor con un caso real.
- **Eventos** por modalidad (`vivo_empieza`, `vivo_completa`, `vivo_aporta`, `vivo_comparte`) y desglose en `npm run metricas`. «Tus datos» actualizado con lo que se guarda al aportar un alquiler o una habitación.
- Pruebas: se adaptaron los e2e que tocaba el cambio (obra nueva en el resumen plegado, habitación, aportaciones, la portada con muestra); sin capturas ni tests nuevos más allá del de «Tus datos».

## Correcciones de la Fase 1 (06/10/2026, PR #14-#17 apilados)
- **A, resultado y tarjetas (#14):** texto factual elegido por defecto y cuarto texto «¿Y tú? Compruébalo con el tuyo.»; con horquilla, «Pago al menos un X % más…» (ratio menor) y «en estas zonas»; titular de rango del inquilino en una línea con tamaño ajustado; cifras de rango de la barra en una leyenda bajo la barra; «Se guarda» completo con enlace a «Tus datos» (y el enlace de la casilla junto a su texto); quitada la frase de la fecha de firma; `/t/:id` con texto según el tipo de tarjeta.
- **B, formulario (#15):** «Solo calle» por defecto al mirar y «Dirección» al vivir; el aviso «fuera del municipio» desaparece al escribir (era el estado de error de «Usar mi ubicación», que no se limpiaba); `?modo=vivo` y `?modo=mirando`; «Añade el número para afinar» recalcula en la misma pantalla.
- **C, «Tu zona» (#16):** con horquilla se dibujan todas las zonas afectadas con contorno grueso y «Tu calle cruza N zonas» (en anuncios ya se dibujaban sin decir cuántas; en el inquilino no salía el mapa).
- **D, habitaciones (#17):** «La habitación» al mirar con la oferta «¿Vives en una habitación? Aporta la tuya»; texto oficial de habitaciones en «Lo que no calculamos» y «Ver por qué» («no damos cifra oficial»); «Suma las habitaciones del piso» (en el navegador, sin guardar nada); decisión en `docs/ideas.md` de no invertir más en la comparación entre habitaciones ni en la estimación por medianas.

## A2 · Página `/mapa` (07/10/2026, rama `a2-mapa`)
- **Qué es:** Madrid entera por zonas, siempre disponible y sin rellenar nada. Menú «Comprobar · Mapa · Cómo calculamos», enlaces desde la portada y desde «Tu zona». Mismo lenguaje visual que «Tu zona» (Paja, gris rayado, filetes gruesos entre barrios, nombres en Tinta con halo, 11 px); sin mapa base, solo las zonas. Móvil: mapa a todo el ancho y la hoja debajo; escritorio: mapa y panel a la derecha.
- **Capas** (`src/lib/resultado/mapa.ts`, puro; todo se calcula en el navegador con el motor y el factor IPC):
  - **Referencia:** parte alta en €/m² para 40, 55, 70 (por defecto), 90 o 110 m². Cinco quintiles de las zonas con dato para esa superficie, iguales para toda la ciudad y recalculados al cambiar; la leyenda muestra los valores. Sin dato: 20 testigos o menos, sin datos de la zona o superficie fuera de 30-150 m².
  - **Mi presupuesto:** compara con el **rango completo** de la superficie elegida: por debajo (< R_inf), dentro (R_inf a R_sup) y con margen (> R_sup); «llega a la referencia» = dentro o con margen. Escala en grises (trama, Piedra, Tinta). Aviso fijo de que no son pisos disponibles; nunca «encaja».
  - **Evolución 2015-2024:** subida de la mediana registrada, con la regla de testigos de «Tu zona» y «Sin descontar la inflación». Escala Acero provisional, pendiente de visto bueno.
- **Hoja de zona:** «Una zona de [barrio]», referencia para la superficie (de X a Y € al mes), parte alta, procedencia (N alquileres · IRPF 2024… · ajustado por el IPC hasta [mes]) y «Comprueba un piso aquí».
- **«Comprueba un piso aquí»:** la zona viaja en memoria (`cliente/prellenado.ts`), no en la URL: la portada abre «En el mapa», centrada en el barrio y con el punto de la zona marcado.
- **Buscador y ubicación:** barrio, distrito o calle con los alias de barrios (todo en el navegador; la calle lleva a su barrio). «Mi ubicación» reutiliza `ubicarme()`: se resuelve en el navegador y no se envían ni guardan las coordenadas.
- **Cabecera:** con tres enlaces, en móvil de menos de 480 px el menú pasa a una segunda fila (en una sola no cabía en 360 px).
- **Correcciones del 06/10/2026 (PR #18):**
  - *Lógica y textos:* el mensaje del buscador se borra al vaciar el campo y al cambiar de capa (y «Toca una zona…» sale una vez). «Por debajo» pasa a puntos y «sin dato» sigue en rayado diagonal. El resumen dice «en el X % de las zonas con dato (N de M)», con la nota de población. En «Mi presupuesto» sale la lista de las 5 zonas más cercanas donde llega (a tu ubicación o a lo buscado; distancia entre centros de zona, en el navegador) y tocar una abre su ficha. Aviso en Evolución («pocos alquileres… ruido»). Con metros fuera de 30-150, aviso sobre el mapa. Una calle resalta todas sus zonas: `data/processed/viales_zonas.json` (lo genera `scripts/03b_sugerencias.py`; 457 kB, solo se descarga al elegir una calle).
  - *Visual:* «con margen» en Grafito (#5A5750) y «dentro» en gris cálido (#A8A294); la clase alta de Evolución en azul acero (#2F5B8A); conmutador «Referencia | Mi presupuesto | Evolución» en tres segmentos iguales; cinco chips de metros en una fila; vista inicial en el área urbana (`areaUrbana`); nombres de distrito a zoom bajo y de barrio al acercar.
  - *Móvil primero (menos de 960 px):* la página no hace scroll; el mapa llena la pantalla bajo la cabecera, el conmutador flota arriba y todo lo demás está en una hoja inferior arrastrable (`HojaArrastrable.svelte`: cerrada con la leyenda compacta, media y completa). Tocar una zona la sustituye por su ficha; la hoja mide `visualViewport` para que el teclado no tape el campo. Toque tolerante (14 px) y contorno grueso con halo en la zona elegida. El pie con las atribuciones va al final de la hoja.
  - *URL:* `?capa=&m2=&barrio=`; nunca el presupuesto ni la ubicación.
  - *Rendimiento:* se probó el mapa en canvas y era peor que el SVG (cambiar la superficie con la CPU limitada ×6: 1,2 s frente a 0,19 s), así que sigue en SVG. Medido en Chromium de escritorio con la CPU limitada, no en un Android real.
- **«Cómo calculamos»:** sección nueva «El mapa» (qué muestra y qué no).
- Sin tests nuevos ni capturas, según las decisiones vigentes; se ajustó el test de formato (espacio duro antes de «m²») en los textos nuevos.

## A2 · «Mi presupuesto»: color y lectura (07/10/2026, rama `a2-mapa-presupuesto-color`)
- **Color:** sin puntos ni rayado. «No llega» #E8E3D8 (plano), «Dentro» #84B598, «Te sobra» #3A7A5D (ajustados el 07/10/2026 para subir el contraste No llega-Dentro a 1,81:1); «Sin dato» #EFECE4 plano, con rayado tenue (1 px #CFC9BA cada 8 px) solo con zoom ≥ 12 (≤ 29,1 m/px). Líneas de barrio y contorno del municipio (nuevo, `contornoMunicipio`) más marcados que las de zona. Solo esta capa; Referencia y Evolución no cambian.
- **Textos:** «No llega», «Dentro», «Te sobra» en leyenda, hoja y nota; la hoja dice «no llega a la referencia», «queda dentro de la referencia» y «te sobra margen respecto a la referencia».
- **Leyenda en móvil:** una línea de tres chips con color bajo el conmutador (solo en esta capa), además de la de la hoja.
- **Resumen:** con más del 95 % de las zonas con dato en «Te sobra», o con menos del 5 % pero alguna, añade el aviso de probar con más o menos metros (con 0 zonas sigue el mensaje propio).

## A2 · Ubicación: calle + número (07/10/2026, rama `a2-ubicacion-calle-numero`)
- **Modos:** «Calle | En el mapa» en las dos modalidades (`?modo=vivo|mirando` sigue igual). «Dirección» y «Solo calle» pasan a un solo modo «Calle» con el número opcional en «Nº» (teclado numérico; admite «12», «12b» y «12 bis»). «Usar mi ubicación» es un chip bajo el conmutador, en mirando y en vivo.
- **Calle fijada:** elegir una sugerencia fija la calle (chip con ×, `f.via`) y pasa el foco a «Nº»; escribir «Robledal 32» pasa el 32 a «Nº» al salir del campo o al comprobar. Los formularios guardados con el modo antiguo vuelven como «Calle».
- **Sugerencias:** tipo y nombre oficial, barrio y código postal (el más frecuente de la calle). Con número escrito: «Camino Robledal, 32 · Casa de Campo · 28011» o «sin nº 32; el más cercano es el 30 (aproximado)» (misma paridad, como el geocodificador). «28038» lista sus calles (de más a menos portales); con parte del nombre las filtra.
- **Línea de confirmación** bajo los campos, ya con la calle fijada: «Camino Robledal 32 · Casa de Campo · 28011», con aviso si el número no existe, o «Calle entera: te daremos una horquilla.».
- **Teclado en móvil:** el desplegable mide el área visible (`visualViewport`), tiene scroll interno y sube la página si queda poco hueco.
- **Datos:** `scripts/03b_sugerencias.py` lee `cod_postal` del GeoPackage de CartoCiudad (en todos los portales de Madrid: 224.448, 58 códigos) y genera: `viales_sugerencias.json` con el código postal de cada calle (+ los demás, para buscar por código) y `viales_portales.json` (524 kB, 136 kB comprimido; solo se descarga al escribir un número): por calle, los grupos (barrio, código postal, números en rangos). **No se toca D1**: el callejero de D1 (`viales`, `portales`) no tiene código postal.
- **Caché:** los tres `viales_*.json` llevan el hash del contenido en el nombre (`scripts/copiar_datos.mjs` los copia a `static/data/` y escribe `src/lib/cliente/datos-rutas.json`, que va a git) y `scripts/cabeceras.mjs` les pone `Cache-Control: public, max-age=31536000, immutable`. Se piden solo al enfocar la calle (sugerencias) y al escribir un número (portales); `viales_zonas`, al elegir una calle en /mapa.
- Sin tests nuevos (decisiones vigentes); los e2e se adaptaron a los textos y al nuevo campo.

## Tarjetas compartidas: cabecera y vista previa (07/10/2026, rama `tarjeta-cabecera-og`)
- **Cabecera:** `/t/:id` lleva la cabecera con el icono (la de `cabecera-con-icono`, fusionada en esta rama).
- **Vista previa vacía en WhatsApp:** el servidor ya respondía bien a facebookexternalhit, WhatsApp y Twitterbot (200, etiquetas en el HTML, HEAD igual, og.jpg JPEG 1200×630 de unos 58 KB, caché immutable; la og.jpg se genera una vez en el navegador y se guarda en R2). La causa probable era una carrera: los enlaces de WhatsApp y X se abrían antes de que terminara la subida de la tarjeta, así que WhatsApp pedía `/t/:id`, recibía un 404 y se acordaba del fallo. Ahora WhatsApp y X se abren cuando la tarjeta ya está subida (y «Copiar enlace» avisa al terminar). Se añadieron `og:image:type` y `og:image:secure_url`.
- **Tests:** rastreadores (GET y HEAD, tres user agents, etiquetas, JPEG 1200×630 < 300 KB, < 1 s), cabecera en `/t/:id` y orden de apertura de WhatsApp (falla con el código anterior).

## A2 · Tarjeta ampliable (07/10/2026, rama `a2-tarjeta-ampliable`)
- **Qué es:** «Ver en grande» (y la propia miniatura) abre la tarjeta para compartir en un `<dialog>` modal (`TarjetaAmpliable.svelte`), en la tarjeta de los anuncios y en la del inquilino. Foco dentro, Esc o «Cerrar» o clic fuera cierran, el foco vuelve al botón, la página queda inerte y sin scroll. Es la imagen del mismo canvas que se comparte; su descripción (el `aria-label` del canvas) lleva el titular y el texto de la tarjeta, sin precio ni dirección.
- **Textos quitados** de la tarjeta del inquilino «por encima»: «El mercado va más rápido que los datos oficiales.» y «No es solo mi caso. Compruébalo con el tuyo.». Quedan dos opciones (la cifra y «¿Y tú?…»); un índice de texto que no exista cae en el primero. Las tarjetas ya compartidas conservan su texto guardado.
- Sin tests ni capturas nuevos (decisiones vigentes); comprobado a mano con teclado, Esc, clic fuera, foco de vuelta y axe, a 360, 390 y 1280 px.

## Analítica con PostHog sin cookies (07/10/2026, rama `posthog-sin-cookies`)
- **Qué cambia:** los eventos de uso salen de D1 (`/api/evento`, tabla `eventos`) y pasan a PostHog (UE) sin cookies, con `posthog-js` (variante slim sin dependencias externas), un proxy en `/r7k` y una lista blanca en `before_send`. Detalle, lista blanca de propiedades, pasos de verificación y umbral de limitación: `docs/operacion.md`, «Analítica».
- **Taxonomía nueva:** `$pageview`, `$pageleave`, `empieza`, `usar_ubicacion`, `error_geocodificador`, `confirma_precio`, `completa`, `sin_dato`, `que_haras`, `comparte`, `aporta`. Fuera: `llegada`, `segundo` y `desde_tarjeta` (ahora propiedades), `servido_*`, `vivo_*`, `comparte_*`.
- **«¿Qué vas a hacer con este resultado?»** sustituye a «¿Te ha servido?» (una sola elección, opcional, sin bloquear compartir). **«¿Algo no cuadra? Escríbenos»** es un enlace `mailto:` junto al resultado.
- **Quitado:** el contador de «pisos comprobados» de la portada (salía de los eventos) y `/api/contadores` ya no devuelve `total`; `npm run metricas` pierde el embudo (queda análisis, aportaciones y tarjetas). Migración `0004_quitar_eventos.sql` preparada y **sin aplicar en remoto**.
- **Tests:** quitados o adaptados solo los de eventos (ver el resumen del PR); `tests/analitica.test.ts`, `tests/proxy.test.ts` y `e2e/analitica.spec.ts` son nuevos.
- **Presupuesto del bundle:** el que mide el informe de lanzamiento pasa de 111,6 KB a 161,9 KB gz con PostHog, así que el presupuesto sube de 150 a 165 KB (decisión del 07/10/2026). El SDK se carga ya tras la carga de la página, pero antes de que el informe dé la página por terminada.
- **Habitaciones:** la mediana pública de `/api/habitacion` sale ahora desde 20 aportaciones (antes 10); el recuento por barrio de análisis y aportaciones sigue en 10.


## Cambio de encuadre: contratos vigentes (08/10/2026, rama `encuadre-contratos-vigentes`)
- **Por qué:** `docs/brief-cambio-de-encuadre.md`. La referencia mide lo que pagan quienes ya tienen contrato, no el precio de mercado; los textos ya no la presentan como «techo» ni como «lo que se paga aquí». Idea de fondo: entrar cuesta más que estar dentro. El motor no cambia.
- **Nombres de nivel:** «Dentro de rango», «Algo por encima», «Fuera de rango» y «Por debajo». En «Estoy mirando», «Por debajo» es solo una etiqueta (precio bajo la parte baja en todas las zonas posibles, el mismo criterio que «Ya vivo aquí»); el nivel sigue siendo «dentro». «Cerca del techo» (inquilino) pasa a «Algo por encima».
- **Portada:** «Ya vivo aquí» primero y por defecto. Las tarjetas de anuncio enlazan a `/?t=…&modo=mirando` y quien llega desde el mapa abre «Estoy mirando». El evento `empieza` ya llevaba `modo`: no hay evento nuevo. Conviene una anotación en PostHog el día del despliegue, porque el reparto entre modos cambia por el orden por defecto.
- **Resultado «Estoy mirando»:** titulares y frases nuevos («Piden X. Lo habitual aquí: de A a B.»), aviso fijo de contratos vigentes junto a la cifra, cuadro «Entrar vs. estar dentro» con su línea de contexto y barra con «contratos de aquí» y «si fuera un piso excelente». En «Algo por encima» el % va en la frase, sin la franja.
- **Línea de fuente:** «Basado en N contratos vigentes… No incluye empresas ni fondos.», con el mes del dato del IPC.
- **Negociar:** sin «techo» ni precio propuesto; pide la explicación de la diferencia o margen y cita primero los contratos declarados a Hacienda y después el Ministerio.
- **Tarjeta:** lema «Lo que piden frente a lo que pagan» (también en la cabecera), etiqueta nueva, franja habitual en euros (sin el precio pedido) y `asuprecio.com` dentro de la imagen. Ojo: en «Algo por encima» y «Fuera de rango», el % junto con la franja permite deducir el precio pedido. La validación del servidor acepta «Por debajo» en la clase a; las tarjetas guardadas conservan sus textos.
- **Mapa, «Tu zona» y «Cómo calculamos»:** etiquetas y leyendas con la frase base, aviso de «Mi presupuesto» destacado, sección «Contratos vigentes, no anuncios», bloque «Qué incluye la referencia» y explicación de la «parte alta» (no es un máximo).
- **Tests:** ningún test nuevo. `tests/textos.test.ts` prohíbe además «techo», «lo que se paga aquí», «lo que se paga en tu zona», «puedes respirar», «dentro de lo razonable» y «como mucho» («cuesta entrar» sigue prohibido). En los componentes se revisa el texto visible: no se miran las expresiones ni las clases (`paso.techo`, `class="techo"`). Se actualizaron los unitarios de textos, vista, ratio y resultado y los e2e (incluido `humo.spec.ts`). Los e2e eligen «Estoy mirando un piso» de forma explícita. Resultado: 357 unitarios y 75 e2e en móvil 390 en verde.
- **Pendiente propuesto:** plantilla para «Ya vivo aquí» (renovación o subida) en un PR aparte, sin citar normas.
- **Segunda vuelta (08/10/2026):**
  - Portada: titular «¿Cuánto pagan los demás?» y lema «Lo que pagan, no lo que piden.».
  - Selector: «Mi alquiler» (primero y por defecto) y «Un anuncio»; los valores internos `vivo` y `mirando` no cambian. Título del formulario según el modo: «Comprueba tu alquiler» o «Comprueba un anuncio».
  - Mapa: subtítulo de la capa Referencia, ayuda y nota de «Mi presupuesto».
  - Cómo calculamos: «Pasos de uso» a todo el ancho y en dos párrafos; texto nuevo de Quiénes somos; la sección `#lim` pasa a `#lo-que-no-calculamos`.
  - «← Volver» en las pantallas sin dato abiertas desde esa lista (`/?motivo=…`): vuelve atrás en el historial o, si no se llegó desde la web, va a esa sección.
  - Frases bloqueadas: también «ya vivo aquí», «estoy mirando un piso» y «tiene sentido este precio».
  - Las pantallas de resultado y las tarjetas quedan pendientes de revisión.
- **Tercera vuelta (08/10/2026): tarjetas y resultados.** Lo que cambia:
  - Lema: «Contratos reales, por zona.».
  - Etiqueta «Se sale de lo habitual» (antes «Fuera de rango»), en anuncio, Mi alquiler, vista previa y Cómo calculamos. Las tarjetas ya compartidas con la etiqueta antigua se siguen mostrando; el servidor solo valida las nuevas.
  - **Anuncio:**
    - «Dentro»: «Entrar aquí sale por lo mismo que estar dentro.»; «Por debajo»: «…sale más barato…».
    - «Algo por encima»: hasta +3 % (`UMBRAL_LIMITE_ALTO`) solo «En el límite alto de lo habitual aquí.»; más, una línea «Un X % por encima de lo habitual aquí.» y la frase del piso excelente, sin repetir la cifra.
    - «Se sale de lo habitual»: «Piden» + cifra grande + «más por entrar que lo que pagan los contratos actuales de la zona» + «frente al tramo alto de esos contratos, ajustado a N m²». Ya no sale la línea «Piden X €. Lo habitual aquí…».
  - **Tarjeta de Mi alquiler:** texto por tramo, con umbrales de presentación en `tarjeta.ts` (`UMBRALES_TARJETA`; el motor no cambia): hasta +5 % «límite alto» (sin cifra grande), hasta casi el doble «+X %», entre 1,9 y 2,1 veces «el doble», desde 2,1 «X,X veces». Debajo de la cifra: «sobre lo más alto habitual en tu zona (N m²)».
  - «Tu zona» también en Mi alquiler (como contexto).
  - La encuesta «¿Qué vas a hacer…?» se reinicia en cada resultado.
  - Ejemplo de portada y de Cómo calculamos con un caso de +32 % (2.690 €); `static/og-portada.png` regenerada con los textos nuevos (`node scripts/og_portada.mjs`).
  - «Equivale a un mes» (singular).
  - Botones «otro» según el modo.
  - «Mapa de Madrid» alineado con el titular en escritorio.
  - Compartir: WhatsApp, X y la hoja del móvil llevan la frase de la tarjeta (sin importes en euros) en lugar de «Mira mi resultado». En escritorio, WhatsApp solo admite texto: la imagen sale como vista previa del enlace, y se avisa de que «Descargar imagen» sirve para adjuntarla.
  - Pendiente: el bloque duplicado «Qué puedes hacer» / «¿Qué vas a hacer…?» no se reprodujo como duplicado literal; sin tocar a la espera de saber a cuál se refiere.
- **Cuarta vuelta (08/10/2026):**
  - «Se sale de lo habitual» (anuncio): bajo la cifra grande, «sobre lo más alto habitual en tu zona (N m²)». «Piden un X % más por entrar que lo que pagan los contratos actuales de la zona» y su línea «frente al tramo alto de esos contratos, ajustado a N m²» van solo en el cuadro «Entrar vs. estar dentro».
  - **Tarjeta del anuncio en todos los niveles:** había dos condiciones, una en `Resultado.svelte` y otra en `+page.svelte` (`tarjetaActual`). Frases propias: dentro, por debajo, límite alto y algo por encima (`FRASE_TARJETA*` en `textos.ts`). En «por debajo» ningún tercio queda marcado en la barra de la tarjeta.
  - «Qué puedes hacer» pasa a «Siguientes pasos». La encuesta se queda igual: sus opciones ya cambian según el modo (anuncio: negociar, descartar, seguir, curiosidad; Mi alquiler: hablar_casero, asesoramiento, nada, curiosidad). No hay valores nuevos de `que_haras`.
  - Cómo calculamos: «Los niveles» (cuatro, con «Por debajo»), «contratos» en lugar de «alquileres registrados», frases de Mi presupuesto, «Tus datos» sin «Somos N» (en el formulario, «Personas en el contrato») y «compartes» en vez de «compartís».
  - Contacto: hola@asuprecio.com en Quiénes somos (antes, el Gmail personal).
  - El ejemplo de la portada sigue a la pestaña activa (`construirMuestra(datos, modo)`).

## Limpieza de `abierto.md` (08/10/2026)
Qué se retiró y por qué, para no perder la historia:
- **PR #14, #15 y #16** (correcciones de la Fase 1: resultado y tarjetas, formulario, «Tu zona»): se cerraron sin fusionar; su contenido ya está en el código (`?modo=`, «Añade el número para afinar», «Tu zona» con horquilla, tarjetas del inquilino). El #17 (habitaciones) sí se fusionó. Se quitó la instrucción «fusionar #14 a #17 en orden».
- **Notas de «Correcciones F1»** (ya hechas): el titular de rango en una línea solo para Mi alquiler, la opción «¿Y tú? Compruébalo con el tuyo.» como último texto de la tarjeta, y «Añade el número para afinar» solo con calle sin número. Los alias de barrios ya cargados (El Rastro, Conde Duque, Tribunal, Huertas, Barrio de las Letras, Ópera, Bernabéu, Las Tablas, Sanchinarro, Valdebebas, La Latina, Vallecas y Barrio de Salamanca) están en `src/lib/resultado/alias.ts`.
- **Cola «Mapa»:** la parte 2 (`/mapa`, tarjeta ampliable, «Mi presupuesto», ubicación «Calle + Nº») se hizo en A2; la parte 1 (PMTiles como activo estático) pasó a «Por verificar».
- **`URL_PRODUCCION`:** la variable del repositorio no existe (solo `PUBLIC_POSTHOG_KEY`); los flujos usan https://asuprecio.com por defecto, así que se quitó el aviso.
- **Duplicados** unificados: pruebas en móvil real, R2, plan de pago de Workers, caducidad de tarjetas y previsualizaciones por rama.
- **Nuevo:** la prueba de humo en rojo por el beacon de Cloudflare Web Analytics, y la sección de credibilidad de los datos aportados.

## Analítica: user agent para el modo sin cookies (08/10/2026, rama `analitica-ua-cookieless`)
- **Problema:** PostHog descartaba los eventos con el aviso `cookieless_missing_user_agent`: el modo sin cookies calcula el identificador diario en el servidor con `$raw_user_agent`, `$host` y la IP, y `before_send` quitaba las propiedades `$…` que no estaban en una lista.
- **Arreglo (`analitica-filtro.ts`):** pasan todas las propiedades `$…` del SDK (`$raw_user_agent`, `$host`, `$device_id`, tamaño de pantalla…) salvo IP, geolocalización y perfil (`$ip`, `$geoip_*`, `$set`…). Toda URL (`$current_url`, `$referrer`, `$initial_current_url`…) sale con su ruta y la query reducida a `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `c`, `t` e `internal` (`/mapa?m2=70` sale como `/mapa`). `utm_term` deja de salir.
- **UTM en todos los eventos:** ya viajaban registrados en memoria al cargar (`posthog.register`), también en `completa`; el e2e lo comprueba.
- **Test:** `tests/analitica.test.ts` pasa un evento de ejemplo por `before_send` (el user agent y los UTM se conservan; ni m², precio, dirección ni coordenadas en ninguna propiedad ni URL). Es un test nuevo, pedido expresamente por el usuario (excepción a la regla de no añadir tests nuevos).
- **Texto público:** «Tus datos» dice ahora que PostHog recibe el user agent, el idioma y el tamaño de pantalla, y de las direcciones web solo la ruta y los parámetros de campaña.
- **Después de desplegar:** comprobar en PostHog (Live events) que los eventos ya entran sin el aviso (`docs/operacion.md`, «Verificar en PostHog»).

## Analítica: evento `mapa_capa` (08/10/2026, rama `analitica-mapa-capa`)
- **Qué mide:** qué capa de `/mapa` se ve (`referencia`, `presupuesto` o `evolucion`). Sale al cargar el mapa y cada vez que se cambia de capa. Una sola propiedad, `capa`, con valores cerrados.
- **Comprobado antes de implementarlo:** la capa ya está en la URL (`/mapa?capa=…&m2=…&barrio=…`), pero **no llegaba a PostHog**: el filtro deja en la query solo `utm_*`, `c`, `t` e `internal`, y el cambio de capa no genera `$pageview`. Por eso hacía falta un evento.
- **Privacidad:** el evento no lleva zona, barrio, presupuesto, metros ni coordenadas (comprobado en el navegador: ni `m2=` ni `barrio=` ni los importes escritos salen en ningún evento).
- **Prueba en desarrollo:** `?ph_prueba=1` se recuerda ahora una vez vista (solo en `vite dev`), porque `/mapa` reescribe la URL y la quitaba.
- «Tus datos» menciona ahora «la capa del mapa que miras».
- **Textos públicos sobre almacenamiento (08/10/2026, mismo PR):** «Tus datos» dice ahora que PostHog «no usa cookies ni guarda nada en tu navegador» para medir; que el historial de la sesión vive en `sessionStorage` y guarda lo escrito en cada comprobación, con la dirección, y el resultado; que al comprobar la dirección sí se envía al servidor para calcular el resultado (no se guarda) y que lo que no sale del dispositivo es la lista del historial. `docs/operacion.md` recoge `asp:historial` y las claves `sveltekit:*`, y el formato exacto de los `utm_*` con un ejemplo.

## «Lo que se pide» — PR 1: motor y resultado (09/10/2026, rama `oferta-1-motor`)
Tras `PUBLIC_OFERTA_ENABLED` (activa por defecto desde el 09/10/2026, ver el final de esta sección; ver `docs/operacion.md`). Decisiones en `docs/decisiones.md`.
- **Datos:** `scripts/10_oferta.py` lee la serie del Ayuntamiento (`data/raw/oferta_AAAA-MM.csv|xlsx`) y escribe `data/processed/oferta_madrid.json` con distritos y barrios (cada valor con su mes). Junio de 2026: 21 de 21 distritos y 92 de 131 barrios con dato en dos meses seguidos. `scripts/copiar_datos.mjs` lo copia a `static/data/`.
- **Motor:** `src/lib/motor/oferta.ts` (puro): nivel de la zona, estimada (€/m² × m²), `contraOferta` (`por_debajo`, `en_linea`, `por_encima`) y el caso entre los cinco. La banda sale de `config/oferta.json`. Ejemplo B comprobado: 60 m² × 17,14 = 1.028,40 → ≈1.028 € (1.000 € queda en línea).
- **Resultado:** `src/lib/resultado/oferta.ts` (textos y vista) → `PantallaResultado.oferta`; `Resultado.svelte` y `ResultadoInquilino.svelte` pintan las dos líneas y la atribución. Sin `datos.oferta` (flag apagada, fichero que no carga, sin dato de la zona o menos de 30 m²) la pantalla es idéntica a la de antes.
- **Tarjetas:** `TarjetaDatos.contratos` (opcional, validado en `validarTarjeta`) cambia nota, frase y vista previa para que digan «frente a los contratos vigentes de la zona»; sin la línea de oferta.
- **Analítica:** `resultado_oferta` y `nivel_oferta` en `completa` (lista blanca y enums en `analitica-filtro.ts`).
- **Tests:** solo se actualizó `tests/textos.test.ts` (datos con oferta, los cinco casos, «Mi alquiler» y las tarjetas pasan por las reglas de copy, y las frases nuevas prohibidas); no se añadió ninguno. Comprobado a mano en local con la flag encendida y apagada (modo mapa, «Un anuncio» y «Mi alquiler»).
- **Desviación:** la analítica `mapa_capa` + `fuente_mapa` pasa a la PR 2, con el selector de fuente.
- **Entorno Windows:** `tests/motor.test.ts` («casos sin dato», 8 tests) falla en esta máquina porque `git` convierte el CSV de `tests/fixtures` a CRLF y `tests/fixture.ts` parte por `\n`; con LF pasan los 106. No lo causa esta PR y el CI (Linux) no lo ve.
- **Revisión del 09/10/2026:** la misma línea con la cifra en los cuatro primeros casos; `ci.yml` pasa la variable (commit aparte); `CLAUDE.md` incluye la serie en la regla de no mezclar datos; las tarjetas ya guardadas, sin `contratos`, se validan y se muestran como antes (comprobado).
- **Segunda revisión (09/10/2026):** el bloque de oferta pasa a una sola línea que habla solo de la oferta (sin titular propio); con veredicto se oculta el aviso de contratos; las fuentes de contratos y anuncios van en párrafos separados. Revisada la matriz de textos (siete niveles de contratos × tres relaciones con la oferta × dos modos); las frases del resultado que quedan en tensión con la oferta se listan en la PR.
- **Tercera revisión (09/10/2026):** textos de nivel, matiz, tarjeta y «Negociar» hablan de «los contratos de la zona» cuando el bloque de oferta lleva veredicto (`NIVEL_CONTRATOS`); «Mi alquiler» y la flag apagada, sin cambios. Suite completa ejecutada en esta rama: 362 tests pasan.
- **Pendiente:** confirmar la licencia de la serie (la activación la decide el usuario) y anotar la duración del redeploy (`docs/operacion.md`).

## «Lo que se pide»: mapa (PR 2, 09/10/2026, rama `oferta-2-mapa`)
Detrás de `PUBLIC_OFERTA_ENABLED` y `PUBLIC_OFERTA_MAPA_ENABLED` (**activas por defecto desde el 09/10/2026**; solo el valor exacto `false` las apaga; `docs/operacion.md`).
- **Código:** `src/lib/resultado/mapa.ts` (`FuenteMapa`, `ZonaMapa.oferta`, `capaReferenciaAnuncios`, `capaPresupuestoAnuncios`, `posicionPresupuestoAnuncios`, `TONOS_ANUNCIOS`, `colorPunteado`; la ficha de la zona con `fuente`), textos en `MAPA_REFERENCIA.anuncios`, `MapaMadrid.svelte` (patrón punteado por tramo, bordes de distrito), `/mapa` (selector, rótulo, leyenda), `cliente/datos.ts` (`cargarDatosMapa`, `MAPA_CON_ANUNCIOS`), `cliente/zona.ts` (`lineasEntreDistritos`, solo con las dos flags).
- **Paleta violeta:** referencia `#EDE3F2 #C9B1DB #A27FC0 #7550A0 #4B2E70`; presupuesto `#E8E3D8 #B79AD0 #6A4392`. Contraste entre tonos vecinos: referencia 1,56 / 1,70 / 1,86 / 1,77 (la de Paja ya trabaja en ese orden); presupuesto 1,92 y 3,02; frente al «sin dato» de «Mi presupuesto» (`#EFECE4`) 1,08 / 2,08 / 6,28. Los tonos más claros se distinguen del fondo del mapa por la línea de zona, no por el color (el más claro, 1,04 frente al fondo). Los nombres de barrio llevan halo claro, así que se leen también sobre los tonos oscuros (comprobado en el navegador, escritorio y 390 px). El punteado usa el tono del tramo más oscuro (si el tramo es claro) o más claro (si es oscuro) para los puntos.
- **Analítica:** `mapa_capa.fuente_mapa` (`contratos` | `anuncios`), solo con las dos flags y solo en «Referencia» y «Mi presupuesto»; solo enums.
- **Hoja inferior en móvil:** con el selector, la hoja completa deja libres 114 px arriba (antes 64) para no tapar el selector.
- **Tests:** ninguno nuevo; los existentes siguen pasando (362). El único ajuste fue evitar «hoy» en un texto nuevo (lo prohíben las reglas de copy).
- **Sin cobertura en CI:** el job `pruebas` no corre ningún e2e del mapa (`e2e/mapa.spec.ts` es del mapa base del formulario y solo se ejecuta a mano) y el job de humo solo lee `/mapa/madrid.pmtiles`. Verificado en el navegador con las tres combinaciones de flags (ver el resumen de la PR).
- **Activación por defecto (09/10/2026):** las dos flags se invierten (`schema: valor !== 'false'` en `src/env.ts`); `ci.yml` y `docs/operacion.md` actualizados; decisión y riesgo aceptado en `docs/decisiones.md`. No se añadieron tests.

## «Lo que se pide»: textos (PR 3, 09/10/2026, rama `oferta-3-textos`)
Sin flag: lo visible queda explicado en la web.
- **Portada:** lema «Que el precio no sea a ciegas.» (`LEMA`, que también sale bajo el logotipo de todas las páginas, en el `<title>` y en las tarjetas compartibles), el titular no cambia, subtítulo «Compara tu alquiler o el de un anuncio con los contratos reales de tu zona y con los anuncios recientes» y la descripción (meta) alineada.
- **«Cómo calculamos»:** sección nueva «Anuncios recientes» (`#anu`, entre «Contratos vigentes» y «El mapa»; `construirAnuncios` en `metodologia.ts`) con las dos fuentes y el mes (el de `oferta_madrid.json`, leído al prerenderizar), la estimación (€/m² × m², barrio con datos de los dos últimos meses o, si no, distrito; solo con m² ≥ 30), «en línea» (±10 %, leído de `config/oferta.json`), por qué contratos y anuncios difieren (sin cifra) y los límites (barrio/distrito, barrios sin dato, variación entre barrios y entre meses, derivada de Idealista, retraso de 3-4 meses, IPC nacional). También: resumen de 30 segundos, sección «El mapa» (selector y etiquetas), «Lo que no calculamos» y la tabla de Fuentes con la serie 4.3.21.D y su atribución.
- **Pie:** nueva atribución «Anuncios recientes: Ayuntamiento de Madrid, Banco de Datos, serie 4.3.21.D (elaboración del Ayuntamiento a partir de datos de Idealista)» (`ATRIBUCIONES`; la tarjeta sigue usando solo las dos primeras).
- **FAQ:** no existe en la web; no se ha creado.
- **Tests:** ninguno nuevo ni cambiado; los existentes pasan (362).
- **Revisión de la PR 3 (09/10/2026):** «Anuncios recientes» pasa a una frase de entrada, una tabla Contratos | Anuncios recientes (el mes y la serie salen de `oferta_madrid.json`, el mes del IPC de `ipc_alquiler.json` y la banda de `config/oferta.json`; en móvil cada fila pasa a bloque) y dos `<details>` cerrados («Cómo calculamos la estimación», «Límites de los anuncios recientes»), sin JS. El recuadro oscuro se titula «Contratos vigentes» y su primera frase ya no dice «hoy». El ejemplo «Así se ve un resultado» de la portada lleva la línea de anuncios recientes (`Muestra.oferta`: el motor ya la generaba, pero el componente no la pintaba). `static/og-portada.png` regenerada con el lema y el subtítulo nuevos (`scripts/og_portada.mjs`, lema a 29 px sin salto de línea). La atribución del pie de la serie se acorta. Tarjeta (1080×1350) y vista previa (1200×630) con el lema nuevo comprobadas: caben sin cambios.
## Media en vez de horquilla (09/10/2026, rama `media-en-vez-de-horquilla`)
- **Por qué:** con varias zonas posibles (punto a menos de 150 m de otras zonas, o calle sin número) cada cifra salía como rango («entre +8,2 % y +20 %», «+75 a +164 €», «parte alta entre 836 y 925 €»): honesto pero ilegible, y aparece aunque se escriba calle y número.
- **Regla:** si TODAS las zonas candidatas caen en el mismo nivel (dentro, algo por encima o se sale de lo habitual), las cifras de pantalla (%, € al mes y al año, meses de alquiler, parte alta, «piden un X % más», cifra de las tarjetas y de «Mi alquiler») salen de UNA referencia, la media simple de R_inf, R_sup y R_max (`referenciaMedia` y `mostrarMedia`, `src/lib/resultado/barra.ts`; el motor no pondera por cercanía), para que cuadren entre sí; la barra se dibuja sin tramos. Si caen en niveles distintos, se muestra el rango como antes, con el nivel de la zona más prudente. «Lo habitual» (P25-P75) sigue siendo un rango.
- **Aclaración:** con la media, bajo el titular y en texto secundario: «Media de las zonas cercanas; según la zona exacta, de +8 % a +20 %.» (o «de 2,7 a 3,4 veces»). Sustituye a la caja de «Ubicación aproximada»; en calle sin número sigue debajo el campo «Añade el número para afinar». Solo sale si hay cifra en pantalla y la parte alta de las zonas difiere del precio en `UMBRAL_ACLARACION` o más (`vista.ts`; se queda en 3 %).
- **No cambia:** la lógica de niveles (manda la zona más prudente), `ratioMin`, `es_horquilla`, `brecha_tramo` ni ningún evento; ni «por debajo» (bajo la parte baja de todas las zonas). «Algo por encima» sigue mostrando su cifra cuando todas las zonas están en ese nivel; con zonas en niveles distintos sigue diciendo «Algo por encima de lo habitual aquí.» sin número, como antes.
- **Medida con los 951 puntos aleatorios de Madrid** (`tests/fixtures/puntos_pip.csv`; 848 con referencia; 342 con horquilla, el 40 %). Anchura de la parte alta entre zonas a 70 m²: mediana 15,6 % de la media (p25 9,4 %, p75 23,2 %, p90 33,9 %); frente al precio (1,3 veces la parte alta), mediana 12 %, y solo el 8 % de las horquillas queda por debajo del 3 %. **Mismo nivel (media) frente a niveles distintos (rango)**, a 70 m² y con el precio como múltiplo de la parte alta media: 0,9 veces, 68 % / 32 %; 1,02 veces, 8 % / 92 %; 1,1 veces, 21 % / 79 %; 1,25 veces, 88 % / 12 %; 1,5 veces o más, 100 % / 0 %. Por los 7 precios probados, 69 % media y 31 % rango (a 45 m², 73 / 27; a 100 m², 68 / 32). Cerca de la parte alta (hasta 1,1 veces) casi siempre hay rango, porque las zonas caen a ambos lados del umbral; desde 1,25 veces casi siempre hay media.
- **Con la media no queda la incoherencia «algo por encima» frente a «se sale»:** con el nivel de la zona más prudente y todas las zonas en el mismo nivel, la media está en ese mismo nivel.
- **Deuda anotada:** `AVISO_UBICACION`, `vista.aviso` y `PantallaResultado.avisoUbicacion` ya no se pintan (los sustituye la aclaración); siguen en el código y en sus tests. Limpiar cuando se decida (borrarlos obliga a tocar `tests/textos.test.ts`, `tests/resultado.test.ts` y `tests/vista.test.ts`). Con el rango (niveles distintos) la pantalla lleva, en texto secundario como la aclaración de la media, «Punto cerca de zonas con referencias distintas: la cifra depende de cuál sea la tuya.» (`MIRANDO.aclaracionRango`, en el mismo campo `vista.aclaracion`).
- **Tests:** solo se actualizaron los existentes (`tests/resultado.test.ts`, `tests/vista.test.ts`, `e2e/estados.spec.ts` 06). **El e2e 06 no se ejecuta en el CI** (el job `pruebas` corre `check`, `npm test` y `build`; el job `humo` solo `e2e/humo.spec.ts`): hay que probarlo a mano con un geocodificador. Con los datos reales, «Calle Sabadell» (2 zonas, 58 m², 1.400 €) sale con la media (+70 %, «de +65 % a +76 %»), que es lo que espera el e2e.
- **Comprobado en el navegador (marcando en el mapa; el geocodificador no está disponible en local):** Vinateros, 60 m², 1.000 €, con las zonas que dan «de +8,2 % a +20 %»: «+14 %», parte alta 874 €, «si fuera un piso excelente» 913 €, +126 €/mes, +1.507 €/año, «más de un mes de este alquiler al año» (+1,5 meses) y la aclaración; igual en «Mi alquiler» (con «Pago un 14 % más que lo habitual en mi zona. ¿Y tú?» en la tarjeta). Puntos con zonas en niveles distintos salen con rango («entre 844 y 982 €») y el titular de nivel de siempre.
- **Texto del formulario:** «Calle entera: usaremos la media de las zonas que cruza.» y «Usarla igualmente: usaremos la media de las zonas cercanas» (antes hablaban de una horquilla).

## Rediseño del resultado con dos referencias (09/10/2026, rama `rediseno-dos-referencias`)
Principio: cada cifra aparece una sola vez por pantalla. El motor, los niveles de contratos y los eventos de analítica no cambian.
- **View-model nuevo:** `src/lib/resultado/comparativa.ts` (`construirComparativa`, `comparativaEnModo`, `resumenComparativa`), en `PantallaResultado.comparativa`. Lo usan la pantalla de los dos modos, el ejemplo de la portada (`muestra.ts`) y la tarjeta. Textos en `COMPARATIVA` (`textos.ts`).
- **Pantalla (`Comparativa.svelte`, `Reglas.svelte`):** cabecera (lugar, m², precio), frase resumen en el orden del modo, dos tarjetas del mismo peso (una columna por debajo de 420 px), una línea de explicación por modo, dos reglas con el mismo eje (de 0,6 × el valor más bajo a 1,1 × el más alto, redondeados a 50 €; banda mínima de 6 px; el punto alineado) e impacto en euros una sola vez frente a los contratos. Sin dato de anuncios: sin segunda tarjeta ni segunda regla.
- **Repeticiones eliminadas:** el % de «Piden un X % más…» del cuadro «Entrar vs. estar dentro» (repetía la cifra grande); el «+X €» sobre la barra (repetía el «al mes» del cuadro); la etiqueta «tu anuncio 2.690 €» / «lo que pagas 2.690 €» de la barra (repetía la cabecera); «Lo habitual aquí para 90 m²: de X a Y €» bajo el titular de «dentro» (repetía las etiquetas de la barra); la frase de nivel y el matiz bajo la cifra (repetían la etiqueta del nivel); el aviso «Se compara con contratos vigentes…» y la línea de oferta con «≈X €» (pasan a la explicación, a la tarjeta de anuncios y a la regla); en «Mi alquiler», la nota con el % bajo «Algo por encima» y la caja de importes (pasan a la tarjeta y al impacto); el «+2,7 meses» bajo los bloques (repetía «casi 3 meses»).
- **«Mi alquiler»:** el aviso de antigüedad («Contrato de hace menos de un año: la referencia mezcla…») solo con «Hace menos de un año». Con un contrato más antiguo ya no se muestra la caja, y con ella la línea «Al firmar pagabas X. Desde entonces, +Y %» (pendiente de decidir si vuelve en otro sitio). El selector de tres textos de la tarjeta desaparece: la tarjeta lleva la frase resumen.
- **Tarjeta v2** (`tarjeta.ts`, `cliente/tarjeta-canvas-v2.ts`; piezas comunes en `cliente/tarjeta-lienzo.ts`): frase resumen, los dos porcentajes con el mismo tamaño, las dos reglas con su eje (euros redondeados a 50) y el punto sin etiqueta; sin precio exacto, m² ni dirección; cierre «¿Está a su precio? Compruébalo en asuprecio.com» y fuentes en una línea («Datos: SERPAVI (Ministerio de Vivienda) y Ayuntamiento de Madrid · detalle en asuprecio.com/como-calculamos»). `validarTarjeta` solo acepta v2 (resúmenes, notas, veredictos y etiquetas de conjuntos cerrados; cifras y euros con formato fijo). Las tarjetas v1 ya guardadas se siguen leyendo y dibujando con el código de antes.
- **Compartir:** móvil con hoja nativa, la imagen y el enlace (sin cambios); escritorio, solo «Copiar enlace» y «Descargar imagen» (se quitan WhatsApp y X). Aviso: «La tarjeta muestra tu barrio y permite deducir tu precio.», junto a la miniatura y dentro del diálogo ampliado.
- **Portada:** estado vacío «Aquí verás tu precio frente a los contratos vigentes y a los anuncios recientes de la zona» con dos reglas fantasma; el ejemplo usa el mismo diseño con valores del motor.
- **Choque con CLAUDE.md:** la tarjeta v2 ya no lleva literales «Origen de los datos: Ministerio de Vivienda y Agenda Urbana» ni la del INE (pedido expreso: una sola línea de fuentes); siguen en el pie de la web y en «Cómo calculamos».
- **Tests:** sin tests nuevos; actualizados `tests/resultado.test.ts`, `tests/vista.test.ts`, `tests/textos.test.ts` y los e2e `humo`, `flujo`, `confirmar-precio`, `etiquetas-barra`, `compartir` y `tarjeta` (la prueba de humo, que sí corre en CI, busca ahora la descripción de las reglas). Se borran `Barra.svelte`, `Equivalencia.svelte` y `EQUIVALENCIA`.
