# Progreso de la implementación

Qué está hecho, con qué cifras y qué se desvió del plan. El plan está en `docs/plan.md`; el porqué de las decisiones de producto, en `docs/decisiones.md`. Se actualiza al cerrar cada hito o cuando cambia algo relevante.

## Estado

| Hito | Estado | Fecha |
|---|---|---|
| 1. Datos | ✅ Hecho | 05/10/2026 |
| 2. Motor | Siguiente | |
| 3. Ubicación | Pendiente | |
| 4. Interfaz mínima | Pendiente | |
| 5. Registro, aportaciones y eventos | Pendiente | |
| 6. Metodología | Pendiente (antes: nombre, dominio, quiénes somos, financiación) | |
| 7. Despliegue | Pendiente | |

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
