# A su precio

Herramienta web que compara el precio de un anuncio de alquiler de Madrid con los alquileres registrados de su zona (SERPAVI 2024, ajustado por el IPC del alquiler). Estimación independiente: el valor oficial está en https://serpavi.mivau.gob.es

SvelteKit 3 + Svelte 5 en Cloudflare Workers (D1 y R2). El motor de cálculo está en `src/lib/motor`, la ubicación en `src/lib/ubicacion`, la lógica de pantalla en `src/lib/resultado` y los componentes en `src/lib/componentes`. Los datos oficiales se preparan con scripts de Python en `scripts/`.

Documentación: `docs/prd.md` (qué), `docs/decisiones.md` (por qué), `docs/plan.md` (cómo), `docs/progreso.md` (qué se hizo), `docs/estado.md` (qué falta) y `docs/operacion.md` (límites y métricas). Reglas del proyecto en `CLAUDE.md`.

## Desarrollo

Requiere Node 24.

```sh
npm install
npm run dev          # http://localhost:5173; usa data/processed/geocoder.sqlite y madrid.pmtiles si existen
npm test             # Vitest: motor, ubicación, textos, servidor
npm run check        # tipos (svelte-check)
npm run e2e          # Playwright en móvil 390 y 360 y en escritorio 1280; capturas en e2e/capturas/
npm run build        # copia los datos a static/data, compila y añade las cabeceras de noindex
```

Los datos que carga el navegador se copian de `data/processed/` a `static/data/` con `npm run datos` (lo hace `npm run build`).

## Regenerar los datos

Los datos originales (`data/raw/`) y los grandes (`geocoder.sqlite`, `madrid.pmtiles`) no están en git. Los JSON pequeños de `data/processed/` sí.

```sh
python3.12 -m venv .venv && .venv/bin/pip install -e .
.venv/bin/python scripts/00_descargar.py       # seccionado 2021, barrios e IPC. CartoCiudad es manual (ver el aviso del script)
.venv/bin/python scripts/01_poligonos.py       # polígonos, sección → barrio, vecinas
.venv/bin/python scripts/02_serpavi_secciones.py
.venv/bin/python scripts/03_callejero.py       # genera geocoder.sqlite
.venv/bin/python scripts/04_ipc.py
.venv/bin/python scripts/10_oferta.py        # anuncios recientes por distrito y barrio (ver docs/operacion.md); el Excel del Ayuntamiento va en data/raw/oferta_AAAA-MM.csv|xlsx
.venv/bin/python scripts/05_verificar.py       # criterios de aceptación; sale con 1 si falla algo
scripts/09_mapa_base.sh                        # data/processed/madrid.pmtiles (necesita la CLI de pmtiles)
```

El Excel de SERPAVI se descarga a mano del Ministerio y va a `data/raw/`.

## Actualizar el IPC

Es automático: `.github/workflows/ipc-mensual.yml` corre el día 18 de cada mes, descarga la serie del INE, recalcula `data/processed/ipc_alquiler.json` y abre un PR si cambia. Al fusionarlo, el CI despliega. A mano:

```sh
.venv/bin/python scripts/00_descargar.py && .venv/bin/python scripts/04_ipc.py
```

(o sin el entorno: `curl` de la serie, como en el workflow, y `python3 scripts/04_ipc.py`).

## Desplegar

Al fusionar en `main`, `.github/workflows/ci.yml` pasa `check`, tests y build y ejecuta `wrangler deploy`. Necesita en el repositorio los secretos `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`. Los recursos se declaran en `wrangler.jsonc`: Worker `a-su-precio`, D1 `a-su-precio-callejero` y `a-su-precio-registro`, R2 `a-su-precio-tarjetas` y `a-su-precio-mapa`.

Primera vez, o cuando cambian los datos de D1 o R2 (esto no lo hace el CI):

```sh
npx wrangler login
scripts/volcar_callejero.sh && npx wrangler d1 execute a-su-precio-callejero --remote --file=data/processed/callejero.sql
npx wrangler d1 migrations apply a-su-precio-registro --remote
npx wrangler r2 object put a-su-precio-mapa/madrid.pmtiles --file data/processed/madrid.pmtiles --content-type application/octet-stream --remote
```

Comprobar un despliegue: `BASE_URL=<url> npx playwright test e2e/humo.spec.ts --project=movil-390` (la prueba horaria de `.github/workflows/humo.yml` hace lo mismo) y `BASE_URL=<url> npm run informe:lanzamiento`.

## Rotar el secreto

`SECRETO` es la clave de los HMAC del límite por IP y de la deduplicación. Rotarlo no rompe nada: las claves de límite duran 24 horas y las de deduplicación 30 días, así que al cambiarlo solo se pierde, durante ese tiempo, la detección de duplicados anteriores.

```sh
openssl rand -hex 32 | npx wrangler secret put SECRETO
```

Cada secreto nuevo es una versión nueva del Worker; no hace falta redesplegar.

## Indexación

Mientras no sea el lanzamiento, todo el sitio lleva `noindex` (etiqueta meta y cabecera `X-Robots-Tag`). Está controlado por una sola variable: `config/indexacion.json` → `"noindex"`. Las tarjetas compartidas (`/t/:id`) y `/cuanto-pagas` son siempre `noindex`. Los robots de las vistas previas de WhatsApp y X leen las etiquetas Open Graph, no las de indexación.

## Privacidad en una línea

No se guarda la dirección ni la IP; solo barrio y mes, y solo con consentimiento. Sin cookies. El detalle está en la página «Tus datos» (`/como-calculamos#tus-datos`).
