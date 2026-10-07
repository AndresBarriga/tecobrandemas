# Estado del producto

Revisado el 05/10/2026 contra `main` más las ramas abiertas del día (#1 a #4 en GitHub). **Hecho** = existe y tiene prueba que lo demuestra; **parcial** = existe pero le falta algo concreto, que se indica; **falta** = no existe.
Lo que depende de un PR sin fusionar lleva su número. Producción: https://a-su-precio.tiene-sentido.workers.dev

## Requisitos del PRD (R1-R13)

| R | Requisito | Estado | Dónde se demuestra y qué falta |
|---|---|---|---|
| R1 | Formulario (dirección, calle, mapa; precio, m², obra nueva, larga duración, habitación) | Hecho | `e2e/flujo.spec.ts`, `e2e/estados.spec.ts` (14, 20), `tests/resultado.test.ts`. El mapa tiene base de OpenStreetMap con el PR #2 |
| R2 | Ubicación → sección y horquilla | Hecho | `tests/ubicacion.test.ts` (100 direcciones), `tests/pin.test.ts` (1.000 puntos), `e2e/estados.spec.ts` 06 |
| R3 | Rango SERPAVI ajustado por IPC | Hecho | `tests/motor.test.ts` (30 casos de la app oficial, error ≤ 1 céntimo); el factor sale de `ipc_alquiler.json` |
| R4 | Tres niveles de resultado | Hecho | `tests/vista.test.ts`, `e2e/estados.spec.ts` 02-05, `e2e/humo.spec.ts` |
| R5 | Pantallas «sin dato» (8 motivos) | Hecho | `e2e/estados.spec.ts` 07-14 |
| R6 | Tarjeta compartible y `/t/:id` | Parcial | `e2e/tarjeta.spec.ts`. Falta comprobar la vista previa en WhatsApp y X desde un móvil (no se puede automatizar) |
| R7 | Registro anónimo con consentimiento | Hecho con el PR #1 | Casilla desmarcada y POST solo si se marca: `e2e/consentimiento.spec.ts`. Se guarda barrio y mes, no sección ni fecha (desviación del diseño 5q) |
| R8 | Metodología, fuentes, límites, quiénes somos, financiación | Hecho | `/como-calculamos` según el diseño 7a/7b: `e2e/como-calculamos.spec.ts`, `tests/metodologia.test.ts` (el ejemplo sale del motor y cambia con el IPC) |
| R9 | Eventos del embudo sin cookies | Hecho (PostHog UE, sin cookies) | `e2e/analitica.spec.ts`; `tests/analitica.test.ts`; `tests/proxy.test.ts`; sin cookies: `npm run informe:lanzamiento` |
| R10 | «Ya hemos analizado N pisos» (≥ 10) | Hecho | `tests/vista.test.ts` (contadores), `e2e/estados.spec.ts` («el contador del barrio no sale sin dato real») |
| R11 | «¿Cuánto pagas tú?» | Hecho | `/cuanto-pagas`, `e2e/registro.spec.ts` 24-26 |
| R12 | Evolución 2015-2024 | Hecho | Línea al pie de «Tu zona» según el diseño: `tests/resultado.test.ts` (evolución), `e2e/tu-zona.spec.ts`. El diseño es una frase con la variación, no un gráfico |
| R13 | «¿Qué vas a hacer con este resultado?» (sustituye a «¿Te ha servido?») | Hecho | `e2e/analitica.spec.ts` |

## Pantallas del paquete de diseño

| Pantalla (ids del lienzo) | Estado | Dónde |
|---|---|---|
| Inicio y formulario (3d, 5a) | Hecho | `e2e/flujo.spec.ts`; capturas en `e2e/capturas/` |
| Resultado a, b, c (3e, 3f, 3a / 5c, 5d, 5b) | Hecho | `e2e/estados.spec.ts` 02-04 |
| Caso extremo El Viso (3g) | Hecho | `e2e/estados.spec.ts` 05 |
| Ubicación aproximada (3h, 5e) | Hecho | `e2e/estados.spec.ts` 06 |
| Barra a 360 px (3i) | Hecho | proyecto `movil-360` de Playwright |
| Tu zona: lista y selección (6a, 6e), sin zonas (6b), cargando (6c), nivel a (6d, 6f) | Hecho | `e2e/tu-zona.spec.ts` (lista, selección y nivel a); la caja «sin zonas» y los textos, en `tests/resultado.test.ts`. El estado «cargando» sale mientras llegan los datos, sin prueba propia |
| Negociar con el dato (4g) | Hecho | `e2e/estados.spec.ts` 19 |
| Contadores, 3 estados (4h) | Hecho | `tests/vista.test.ts` |
| Dirección no encontrada (4i) | Hecho | `e2e/estados.spec.ts` 15 |
| Sin conexión (4k) | Hecho | `e2e/estados.spec.ts` 17 |
| Sin dato, uno por motivo (5j-5p) | Hecho | `e2e/estados.spec.ts` 07-14 |
| Tarjeta 1080×1350, 5 casos (4a-4e) | Parcial | `e2e/tarjeta.spec.ts` 22. La tarjeta solo se ofrece en el nivel c; los 5 casos del diseño no están todos comprobados uno a uno |
| `/t/:id` (5f, 5g) | Hecho | `e2e/tarjeta.spec.ts` 23 |
| Vista previa OG 1200×630 (5h, 5i) | Hecho | `e2e/tarjeta.spec.ts` 24 (`og.jpg`) |
| ¿Cuánto pagas tú? (5q-5s) | Hecho | `e2e/registro.spec.ts` 24-26 |
| Cómo calculamos (7a, 7b) | Hecho | Ver R8 |

## Infraestructura y operación

| Pieza | Estado | Nota |
|---|---|---|
| Despliegue en Cloudflare (Worker, D1 ×2, R2) | Hecho | CI al fusionar en `main` (`.github/workflows/ci.yml`) |
| Dominio propio | Falta | Se sirve desde `*.workers.dev` |
| Mapa base autoalojado | PR #2 | `scripts/09_mapa_base.sh`; el archivo (36 MB) ya está en R2 |
| `noindex` en todo el sitio | PR #1 | `config/indexacion.json` |
| Prueba de humo horaria | PR #3 | `.github/workflows/humo.yml` |
| Informe de lanzamiento | PR #4 | `npm run informe:lanzamiento` |
| Métricas internas | PR #5 | `npm run metricas` |
| Límite del geocodificador | PR #5 | 200 búsquedas por IP y día |
| Revisión externa de privacidad | Falta | Decidido en el plan: sin consulta legal antes de lanzar |
