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

