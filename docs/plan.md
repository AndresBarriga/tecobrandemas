# Plan de implementación del MVP — «¿Tiene sentido este precio?» (Madrid)

Versión 2 · 05/10/2026 · aprobada por Andrés.

## Contexto

El PRD (04/10/2026) define un comparador. El usuario teclea un anuncio de Madrid y ve **cuánto más le piden** frente al rango SERPAVI 2024 de su sección censal, ajustado por el IPC del alquiler, en tres niveles. El gate ya está cerrado. Queda construir motor, ubicación, interfaz, registro, eventos, metodología y despliegue en unas 3 semanas, con privacidad fuerte y coste casi nulo.

**Lo que hay hoy en el repo:** `CLAUDE.md`, `docs/prd.md`, `docs/decisiones.md`, `tests/fixtures/tests_motor_serpavi.csv` (53 filas: 50 casos A, de ellos 42 con resultado y 8 sin dato, y 3 pares C) y `data/raw/…SERPAVI_2011-2024 - DEFINITIVO WEB_v2.xlsx` (71 MB). `scripts/` y `data/processed/` están vacíos y el repo no tiene ningún commit.

**Comprobado durante el análisis:**
- **Excel.** La hoja `Secciones censales` tiene 36.293 filas, de las que 2.442 son de Madrid (CUMUN 28079), y 285 columnas. La clave es `CUSEC`, del seccionado del Censo 2021. Mapeo para 2024:

  | Dato | Columna |
  |---|---|
  | Smed | `SLVM2_M_VC_24` |
  | P25 | `ALQM2_LV_25_VC_24` |
  | P75 | `ALQM2_LV_75_VC_24` |
  | Mediana €/m² | `ALQM2_LV_M_VC_<AA>` |
  | Testigos | `BI_ALVHEPCO_TVC_24` |

  Los valores de A01, A05, A15 y A50 coinciden con el CSV.
- **§5.3 del PRD.** Reproduce `R_inf_inicial` y `R_sup_inicial` de las 45 filas con rango inicial con un error máximo de 0,50 céntimos.
- **§5.4** (de la investigación previa):
  ```
  x        = (P − 18,115) / 100,885
  inf_corr = inf + (P75 − P25) × 0,280 × (x − 0,260)
  sup_corr = sup + (P75 − P25) × 0,696 × (x − 0,5/0,696)
  ```
  - Con P = 33,865 → x = 0,15612 → coeficientes −0,02909 y −0,39134, iguales a los observados en los 30 casos de la app.
  - Con x = 1 → +0,196 en el límite superior, que es el R_max del PRD.
- **Niveles.** Con f = 1,054 el CSV da 9/4/29 y una mediana de +19,4%. Con f = 1 da 6/3/33 y +25,9%. Coincide con el gate.
- **Faltan en `data/raw/`:** el seccionado de 2021, el callejero y los portales de CartoCiudad, el IPC y los barrios.

---

## 1. Stack y arquitectura (aprobada)

```
Navegador (todo el cálculo)                 Cloudflare (free tier)
┌──────────────────────────────┐            ┌─────────────────────────────────┐
│ SvelteKit (páginas estáticas)│  dirección │ Worker /api/geocode  → D1        │
│ motor/ (TS puro)             │ ─────────▶ │   (portales, viales)             │
│ resultado/ (view-models)     │ ◀───────── │   devuelve lon/lat + secciones   │
│ secciones_madrid.json        │  secciones │ /api/registro   → tabla analisis │
│ polígonos (lazy, PIP local)  │            │ /api/aportacion → aportaciones   │
│ MapLibre + PMTiles (lazy)    │            │ /api/evento  /api/tarjeta → R2   │
│ tarjeta en <canvas>          │            │ /t/:id  (HTML con og:image)      │
└──────────────────────────────┘            └─────────────────────────────────┘
Precio y m² solo salen con consentimiento (registro / aportación) o al compartir la tarjeta.
La sección nunca se guarda: se usa para calcular y se descarta.
```

| Decisión | Elección | Por qué | Alternativa descartada |
|---|---|---|---|
| Lenguaje | **TypeScript** en el front y en el back | El motor va en el navegador y los validadores antiabuso se comparten con el Worker | Backend en Python: habría que duplicar la plausibilidad y los tipos |
| Framework | **SvelteKit** + `adapter-cloudflare` | Bundle pequeño. Páginas prerenderizadas, `/api/*` y `/t/:id` en un solo despliegue | Next.js: más pesado y pensado para Vercel. SPA + Worker separado: dos despliegues |
| Motor | `src/lib/motor/` con **funciones puras** | Se prueba con el CSV y se ejecuta en el navegador | Calcular en el servidor: el precio saldría del dispositivo |
| Separar lógica y presentación | `src/lib/resultado/`: **view-models puros** (niveles, textos, barra, zona, «aquí estarías dentro», evolución), probados con Vitest. Componentes `.svelte` «tontos» y sin estilo | El diseño llegará después y se aplicará sin tocar la lógica | Lógica dentro de los componentes: habría que rehacerlos con el diseño |
| Hosting y backend | **Cloudflare Workers + D1 + R2** | Plan gratuito suficiente, TLS y CDN incluidos. Solo se paga el dominio | VPS (Hetzner + FastAPI): ~4 €/mes y mantenimiento. Vercel + Supabase: dos proveedores y pausas del plan gratuito |
| Geocodificación | **Propia con el GeoPackage de CartoCiudad en D1**. Tablas `viales` y `portales`, con el `cusec` ya calculado en el ETL. Índice de trigramas en memoria para los viales | Las direcciones no salen a terceros y no hay límites externos | API pública de CartoCiudad: enviaría direcciones a terceros. 100% en el navegador: varios MB en móvil |
| Mapas (pin y «Tu zona») | **MapLibre GL + PMTiles de OSM autoalojado** en R2. Punto-en-polígono en el navegador con el TopoJSON. Todo con carga diferida | Ni coordenadas ni vista del mapa salen a terceros | Teselas de OSM o IGN: revelan la zona al proveedor |
| Tarjeta | **`<canvas>` en el cliente**: 1080×1350 y JPG OG de 1200×630. Se sube a R2 al compartir | En menos de 3 s. Solo sube lo que el usuario comparte | Satori o resvg en el Worker: wasm pesado |
| Eventos | **Endpoint propio** → D1. Id de visita en `sessionStorage` y `?t=<idTarjeta>` | Sin cookies ni terceros | PostHog o Plausible: un tercero recibe IP y UA |
| Antiabuso sin guardar IP | `HMAC(IP, sal diaria)` con caducidad de 24 h. La sal se rota cada día | Hay límite diario y no se guarda la IP | Hash de IP sin rotar: identificador persistente |
| ETL | **Python 3.12 + uv** (pandas, openpyxl, geopandas o pyogrio) y `mapshaper` | Mejores librerías geoespaciales. Es offline | Node con GDAL: frágil |
| Tests | **Vitest** (con pool de Workers para D1) y **Playwright** | Un solo runner para todo el TS | Jest |
| IPC mensual | **GitHub Action** → PR con `ipc_alquiler.json` | Coste cero y revisión humana | Cron en el Worker: cambia producción sin revisión |

## 2. Preparación de datos (`scripts/` → `data/processed/`)

| Script | Entrada | Salida | Formato y tamaño estimado |
|---|---|---|---|
| `00_descargar.py` | — | Descarga a `data/raw/` el seccionado 2021 (`SECC_CE_20210101` del MIVAU o el del INE de 2021), los barrios del Ayuntamiento (datos.madrid.es) y el IPC (API del INE, tabla 76128). El GeoPackage de CartoCiudad del CNIG se baja a mano por la licencia: el script lo comprueba y, si falta, explica el paso | — |
| `02_serpavi_secciones.py` | Excel (lectura en streaming, ~20 s) y `seccion_barrio.json` | `secciones_madrid.json`: `{cusec: {cdis, barrio, smed, p25, p75, n, n_vu, med2015, med2024}}` para las 2.442 secciones, a precisión completa, con `null` si falta. `med2015` y `med2024` alimentan la línea de evolución (R12, P0) | Real: 415 KB (105 KB gz). Va al navegador |
| | | `serie_secciones/<distrito>.json` (R12 gráfico, P1): P25, mediana, P75 y n de 2011 a 2024 | ~1,5 MB en total, con carga diferida |
| `01_poligonos.py` | Seccionado 2021 y barrios | `secciones_madrid.topo.json`: EPSG:4326, cuantizado a 1e5, con el centroide en las propiedades. Lo usan el pin, «Tu zona» y «Aquí estarías dentro» | Real: 864 KB |
| | | `seccion_barrio.json`: cusec → barrio (131), por mayor área de intersección | ~60 KB |
| | | `vecinas.json`: secciones a 150 m o menos de cada sección (distancia entre polígonos). Es solo un **prefiltro**: hay 11,2 de media, así que la horquilla del pin mide la distancia desde el punto en el navegador y aplica el tope de 6 | Real: 453 KB |
| `03_callejero.py` | GeoPackage de CartoCiudad (provincia 28) | `geocoder.sqlite` → D1: `viales` (~10k) y `portales` (~190k) con el `cusec` precalculado y un índice `(vial_id, numero)` | ~20 MB (~6 MB gz). No va a git |
| | | `viales_autocompletar.json` | ~250 KB (~70 KB gz) |
| `04_ipc.py` | API del INE, tabla 76128 | `ipc_alquiler.json`: `{media_2024, ultimo_mes, valor, factor, fuente, fecha_extraccion}` | ~1 KB |
| `05_verificar.py` | Todas las salidas | Informe: cobertura de polígonos (100%), secciones con dato y más de 20 testigos, portales sin sección, cruce con los 53 casos del CSV y secciones sin `med2015` | Texto, ejecutado en CI |

## 3. Hitos

**Total estimado: ~15,5 días de trabajo.** Si hay que recortar, el autocompletado y el mapa del pin pasan a P1.

### Hito 1 — Datos (2 días)
- **Tareas:**
  - repo Python (`pyproject.toml`, `.venv` local; compatible con uv) y scripts 00-05 (01 = polígonos y barrios, antes que 02 = SERPAVI, que necesita el barrio);
  - descarga y paso manual del CNIG;
  - generar `data/processed/`.
- **Requisitos:** R2, R3 (datos), R12 (línea de evolución y serie).
- **Aceptación:**
  - `05_verificar.py` sin errores;
  - las 2.442 secciones tienen polígono 2021;
  - los 53 casos del CSV existen con los mismos Smed, P25 y P75 (a 4 decimales) y testigos;
  - ≥98% de los portales tienen sección;
  - factor IPC = 1,054.

### Hito 2 — Motor (1,5 días)
- **Tareas:**
  - `motor/rango.ts`: §5.3 por el factor f;
  - `motor/correccion.ts`: §5.4 con las fórmulas de arriba;
  - `motor/niveles.ts`: dentro (baja, media o alta), segundo y tercer nivel, con % y € sobre R_sup;
  - `motor/elegibilidad.ts`: motivos sin dato en orden de precedencia;
  - `motor/horquilla.ts`: intervalo de % y nivel más prudente, excluyendo las secciones con 20 testigos o menos.
- **Requisitos:** R3, R4 y R5 (la lógica), R2 (la horquilla).
- **Aceptación:**
  - los 30 casos `validacion_app` reproducen `app_*` con un error ≤1 céntimo;
  - las 45 filas con rango inicial (§5.3) dan `R_*_inicial` con un error ≤1 céntimo;
  - los 8 casos sin dato devuelven `motivo_esperado`;
  - el agregado da 9/4/29 y 6/3/33, con medianas de +19% y +26%;
  - en los pares C el nivel no cambia;
  - cobertura de ramas del 100% en `motor/`.

### Hito 3 — Ubicación (3 días)
- **Tareas:**
  - normalizador y parser de direcciones;
  - `/api/geocode` con estos casos:
    - dirección exacta → portal → sección;
    - calle sin número → secciones del vial, con un **tope de 6**; si son más, se pide el número o el mapa;
    - número inexistente → portal más cercano de la misma paridad, con aviso;
  - pin → punto-en-polígono en el navegador y secciones a 150 m o menos;
  - fixture `direcciones_100.csv`.
- **Requisitos:** R1 (ubicación), R2.
- **Aceptación:**
  - ≥95 de 100 direcciones resueltas a la sección esperada o a una horquilla que la contiene;
  - p95 por debajo de 300 ms en local;
  - el Worker no registra la dirección ni en logs ni en D1.

### Hito 4 — Interfaz mínima y funcional, sin estilo (3,5 días)
- **Tareas (view-models en `resultado/`, cada uno con su componente HTML semántico sin estilo):**
  - **Formulario R1:** dirección con autocompletado, calle o mapa; precio; m² construidos; obra nueva; larga duración; selector **piso / casa**; enlace «¿Es una habitación?» con su pantalla y contador.
  - **Resultado R4:**
    - texto **«cuánto más te piden»**;
    - rango en €/mes, «Basado en N alquileres registrados…» y aviso de ubicación aproximada;
    - enlace a serpavi.mivau.gob.es;
    - línea **«Qué puedes hacer»**: negociar con el dato, comparar con otros pisos y consultar el valor oficial, sin consejo jurídico.
  - **Barra horizontal:** el view-model da las posiciones normalizadas de R_inf, R_sup, R_max y el precio, con escala y recortes en los extremos.
  - **«Tu zona»:** mapa con la sección del usuario resaltada y las secciones a 1,5 km o menos coloreadas por referencia. La referencia es V_sup·f en €/m² para la superficie del usuario; las secciones sin dato van en gris. Se carga después del resultado.
  - **«Aquí estarías dentro»:** las 5 secciones más cercanas, a 1,5 km o menos y elegibles, donde precio ≤ R_sup con la misma superficie. Se calcula en el navegador, con su distancia y su barrio, y con el aviso «no son pisos disponibles».
  - **Evolución (R12, P0):** una línea con la mediana de €/m² registrada en la sección en 2015 y en 2024 y la variación en %. Si hay horquilla, se da el intervalo; si falta el dato de 2015, se omite.
  - **Pantallas sin dato (R5)** y «¿Te ha servido?» (R13).
  - **Tarjeta (R6)** con %, nivel, barrio y fuente, sin precio.
  - **«¿Cuánto pagas tú?» (R11, P0):** formulario aparte con menos de 6 campos (ubicación → barrio, precio, m², año de inicio del contrato, consentimiento).
  - Pie con las atribuciones, incluidas «Ayuntamiento de Madrid» y «© OpenStreetMap contributors».
- **Requisitos:** R1, R4, R5, R6, R11, R12 (línea), R13.
- **Aceptación:**
  - Playwright en móvil completa el flujo en menos de 30 s;
  - tarjeta en menos de 3 s;
  - los view-models tienen tests unitarios y los componentes no hacen ningún cálculo (revisión y regla de lint: los componentes no importan `motor/`);
  - una prueba de textos impide «ilegal», «abusivo», «actualizado a hoy» y «cuesta entrar», y exige las atribuciones y el enlace oficial;
  - bundle inicial por debajo de 150 KB gz, con los mapas cargados después.

### Hito 5 — Registro, aportaciones y eventos (2,5 días)
- **Tablas D1:**

  | Tabla | Columnas |
  |---|---|
  | `analisis` | `mes` (AAAA-MM), `barrio`, `precio`, `m2`, `nivel`, `tarjeta_origen`. **Sin fecha, sin cusec, sin dirección** |
  | `aportaciones` | `mes`, `barrio`, `precio`, `m2`, `anio_contrato`. Tabla, endpoint y consultas separados de `analisis`: nunca se cruzan |
  | `tarjetas` | `id`, `mes`, `barrio`, `nivel`, `pct` |
  | `eventos` | `tipo`, `ts`, `visita`, `tarjeta` (sin precio ni ubicación) |
  | `limites` | HMAC diario, con caducidad de 24 h |
  | `dedupe` | `HMAC_secreto(precio, m2, barrio)` y caducidad a 30 días. Sin relación con `analisis`; se purga a diario |

- **Antiabuso** (igual para registro y aportaciones):
  - €/m² entre 5 y 60;
  - deduplicación a 30 días;
  - 20 registros por IP y día;
  - casilla de consentimiento desmarcada por defecto.
- **Eventos (R9):** los 9, con el «segundo análisis» medido solo dentro de la visita.
- **R10:** recuento por barrio visible solo desde 10.
- **R11:** aportaciones por barrio visibles solo desde 10.
- **Otras tareas:** `/api/tarjeta` → R2, `/t/:id` y consultas SQL de H1-H4.
- **Requisitos:** R6 (enlace), R7, R9, R10, R11.
- **Aceptación:**
  - un test de esquema prueba que no hay columnas `ip`, `direccion`, `cusec`, `seccion`, `fecha` ni `ts` en `analisis` ni en `aportaciones`;
  - sin consentimiento no se hace ningún POST (Playwright);
  - antiabuso cubierto por tests;
  - un análisis iniciado desde `/t/:id` queda atribuido a la tarjeta;
  - H4 da el valor correcto con datos sintéticos.

### Hito 6 — Metodología (0,5 días). Antes: nombre, dominio, quiénes somos y financiación
- **Contenido:**
  - cómo calculamos (§5.3, §5.4, niveles, IPC con su fecha y factor leídos de `ipc_alquiler.json`);
  - que el dato es **un precio pedido, no firmado**: el precio final puede ser menor si se negocia;
  - fuentes y atribuciones;
  - limitaciones (m², ubicación, contratos frente a anuncios);
  - cómo se calculan «Tu zona», «Aquí estarías dentro» y la evolución;
  - quiénes somos y financiación.
- **Requisitos:** R8.
- **Aceptación:** enlazada desde el resultado y desde `/t/:id`, y pasa la prueba de textos.

### Hito 7 — Despliegue (1,5 días)
- **Tareas:**
  - `wrangler` con D1, R2 y el dominio;
  - carga de `geocoder.sqlite` y del PMTiles;
  - CI con tests en cada PR y despliegue al fusionar en `main`;
  - Action mensual del IPC;
  - CSP sin orígenes externos;
  - prueba de humo.
- **Aceptación:**
  - 0 €/mes fuera del dominio;
  - la prueba de humo pasa en producción;
  - la vista previa de `/t/:id` funciona en WhatsApp y en X.

**Después:** aplicar tu diseño sobre los componentes, sin tocar `motor/` ni `resultado/`. En P1, el gráfico de la evolución.

## 4. Estrategia de tests

**Motor** (Vitest, el CSV se lee en tiempo de test):
- `validacion_app` (30 casos): §5.3 + §5.4 con P = 33,865 y f = 1 ≈ `app_*` y `calc_*`, con un error ≤ 0,01 €.
- Todos los casos con `R_inf_inicial`: §5.3 con un error ≤ 0,01 €.
- `sin_dato`: devuelve `motivo_esperado`. La precedencia es unifamiliar > obra nueva > superficie > testigos (A50 → unifamiliar; A48 → superficie).
- Pares C: mismo nivel en la horquilla.
- Agregado del gate: 9/4/29 y 6/3/33, con sus medianas.
- Propiedades:
  - R_max − R_sup = 0,196·(P75−P25)·S·f;
  - §5.4 con x = 1 coincide con R_max;
  - en los límites de los niveles, precio = R_sup y precio = R_max;
  - tercios dentro del rango;
  - superficie 30 y 150 (los límites inclusivos se confirman en §5).
- Bloquean la fusión en cada PR.

**View-models del resultado:**
- La barra da posiciones monotónicas y recorta los extremos.
- «Aquí estarías dentro»:
  - ninguna sección devuelta tiene R_sup < precio;
  - excluye las no elegibles;
  - como mucho 5, ordenadas por distancia;
  - lista vacía con su mensaje.
- «Tu zona»: colores por cuantiles y gris si no hay dato.
- La evolución omite el dato si falta 2015 y da un intervalo si hay horquilla.
- Los textos dicen «cuánto más te piden» e incluyen la línea «Qué puedes hacer».

**Datos:** los 53 casos del CSV coinciden y no hay ninguno sin polígono.

**Ubicación** (`direcciones_100.csv`):
- **Composición:** 50 direcciones del gate (las 9 exactas con la sección de la app; las 3 en que la app eligió la vecina, documentadas) y 50 portales aleatorios con variantes («C/», «Avda.», sin tildes, errores, sin número, número inexistente).
- **Verdad de referencia:** calculada en Python, independiente del TS.
- **Punto-en-polígono del navegador frente a Python:** ≥99,5% iguales en 1.000 puntos.
- **Reglas:** el tope de 6 secciones y el radio de 150 m.

**Pantallas sin dato** (Playwright): una por motivo (<30, >150, obra nueva, unifamiliar, temporal, 20 testigos o menos, sin dato, fuera de Madrid). Cada una con su texto, el enlace oficial, ningún porcentaje y ningún evento de «completa».

**Antiabuso y privacidad** (Vitest con Workers y D1 local):
- €/m² fuera de rango → no se guarda, pero el resultado se ve.
- Duplicado antes de 30 días → no se guarda; el día 31 sí (reloj simulado).
- Registro 21 de la misma IP en un día → 429.
- La sal rotada cambia la clave.
- Test de esquema (ver Hito 5).
- Ninguna consulta cruza `analisis` con `aportaciones`, comprobado con un grep en CI sobre el SQL.
- Sin consentimiento no sale ninguna petición con precio.

## 5. Riesgos técnicos

| Riesgo | Mitigación |
|---|---|
| Usar un seccionado distinto del de 2021 | Fijar el de 2021 y test de cobertura del 100% |
| La descarga del CNIG no se puede automatizar | Paso manual documentado y comprobación de que el fichero existe |
| Calidad del geocoder | Fixture de 100 direcciones desde el día 1 del Hito 3; alternativas: calle sin número y mapa |
| La horquilla de calles largas | Tope de 6 secciones; por encima, se pide el número o el mapa |
| Peso en móvil por los mapas («Tu zona» y pin) | Carga diferida después de pintar el resultado; bundle inicial por debajo de 150 KB gz |
| La sección 2015 no existía o cambió de límites (el seccionado es de 2021) | Usar la serie del propio Excel (ya en el seccionado de 2021); si falta 2015, omitir la línea |
| `navigator.share` con ficheros y OG de WhatsApp | Alternativa de descarga; JPG OG aparte; prueba en dispositivos reales |
| Límites de D1 en el plan gratuito | Consultas por índice; vigilar el uso |
| Calendario de ~15,5 días | Recortes ya pensados: autocompletado y pin → P1 |
| Cambios en la API del INE | La Action abre un PR; test de la forma del JSON |

## 6. Decisiones cerradas y pendientes

**Cerradas** (05/10/2026):
- **Horquilla:** tope de 6 secciones para la calle y 150 m para el pin; se muestra el nivel más prudente; se excluyen las secciones con 20 testigos o menos.
- **Registro:** €/m² entre 5 y 60; 20 registros por IP y día; consentimiento desmarcado por defecto.
- **Fuentes y atribuciones:** barrios del Ayuntamiento y mapa de OSM, cada uno con su atribución.
- **Tarjeta:** sin precio.
- **Medición:** «segundo análisis» solo dentro de la visita; recuentos visibles desde 10.
- **Formulario:** selector piso / casa.
- **Privacidad:** se guarda el mes y el barrio, nunca la fecha ni la sección.
- **Alcance:** R11 y la línea de evolución pasan a P0.
- **Diseño:** llega aparte.
- **Sin consulta legal.**

**Supuestos míos, revisables cuando quieras:**
- radio de 1,5 km y máximo de 5 secciones en «Aquí estarías dentro» y «Tu zona»;
- campos de R11: ubicación, precio, m², año de inicio del contrato y consentimiento.

**Pendientes (antes del Hito 6):** nombre y dominio; quiénes somos y financiación.

## Verificación de punta a punta

- `uv run scripts/05_verificar.py` sin errores.
- `npm test` en verde (motor ≤1 céntimo, agregado 9/4/29, view-models, ubicación y Worker).
- `npx playwright test` en móvil: flujo completo, pantallas sin dato, R11, tarjeta y ninguna petición sin consentimiento.
- `wrangler dev`: 5 direcciones reales comparadas con la app oficial.
- Producción: prueba de humo, vista previa de `/t/:id` y consulta de H4.
