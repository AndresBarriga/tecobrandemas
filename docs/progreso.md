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


## Compartir la tarjeta por canales (05/10/2026)
- **Opción A:** el id `/t/ID` se genera en el navegador al abrir el resultado; la tarjeta solo se sube cuando la persona elige un canal que necesita el enlace. `POST /api/tarjeta` acepta ese `id` (formato `[0-9a-z]{10}`) y no reescribe una tarjeta existente.
- **Móvil con hoja nativa** (`navigator.canShare({files})` y puntero táctil): un botón; imagen y enlace; se sube la tarjeta; evento `comparte`.
- **Escritorio:** WhatsApp y X como enlaces normales, «Copiar enlace» y «Descargar imagen» (esta última no sube nada). Eventos `comparte_whatsapp`, `comparte_x`, `comparte_copiar` y `comparte_descarga` (tipo y id de tarjeta, sin datos del anuncio). Instagram: sin botón propio. Sin SDK, scripts ni píxeles de terceros.
