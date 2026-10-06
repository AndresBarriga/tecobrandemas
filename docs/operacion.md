# Operación

## Uso frente a los límites del plan gratuito de Cloudflare

Los límites cambian: confirmarlos en la documentación de Cloudflare antes de fiarse de estas cifras (referencia: octubre de 2026).

| Recurso | Límite gratuito (orientativo) | Qué lo gasta aquí | Dónde verlo |
|---|---|---|---|
| Worker, peticiones | 100.000 al día | Cada `/api/*`, cada `/t/:id` y **cada petición de rangos del mapa** (`/mapa/madrid.pmtiles`). Las páginas y los ficheros estáticos no cuentan | Panel → Workers y Pages → `a-su-precio` → Metrics |
| Worker, CPU | 10 ms por petición | El geocodificador es lo más pesado | Misma pantalla, «CPU time» |
| D1, lecturas | 5 millones de filas al día | Cada búsqueda de dirección lee unas decenas o centenares de filas | Panel → D1 → base → Metrics |
| D1, escrituras | 100.000 filas al día | El límite por IP, los eventos y el registro | Ídem |
| D1, tamaño | 5 GB por cuenta | El callejero ocupa 13 MB | `npx wrangler d1 info a-su-precio-callejero` |
| R2, almacenamiento | 10 GB | Mapa (36 MB) y tarjetas (~60 KB cada una) | Panel → R2 → bucket → Metrics |
| R2, operaciones | 1 M de escrituras y 10 M de lecturas al mes | Una lectura por petición del mapa y por vista previa | Ídem |

**El punto débil es el mapa.** Un mapa abierto en el móvil pide decenas de rangos y cada uno cuenta como una petición del Worker. Con unos 50 por uso del mapa, 2.000 usos al día agotarían las 100.000 peticiones. Si hace falta: poner el archivo detrás de la caché de Cloudflare (Cache API en la ruta del mapa) o servirlo desde un dominio propio con R2 público y relajar el `connect-src` de la CSP solo para ese origen. Hoy el mapa solo se abre en el modo «En el mapa» del formulario.

**Qué se hace cuando algo se acerca al límite**
- Peticiones del Worker: revisar si es el mapa o el geocodificador y, si hace falta, bajar `LIMITE_GEOCODIFICACIONES_DIA` en `src/lib/server/registro.ts`.
- D1: `npm run metricas` enseña cuántos análisis y eventos hay; los eventos de `eventos` se pueden resumir y borrar pasadas las 6 semanas de evaluación.
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

Escribe en `informe-metricas/`: `embudo.csv` (H1-H4, utilidad, segundo análisis y aportación, con su objetivo), `barrios.csv` (análisis por barrio, solo desde 10) y `aportaciones.csv` (residentes, aparte). Notas para leerlo:

- Cuentan **visitas distintas** (id aleatorio de sesión), no clics.
- H4 divide las visitas con un análisis desde una tarjeta entre las tarjetas creadas. Desde el PR de compartir, una tarjeta solo se guarda cuando la persona elige WhatsApp, X, copiar el enlace o la hoja del móvil (descargar la imagen no guarda nada), así que «tarjetas creadas» son tarjetas compartidas. La tarjeta fija de la prueba de humo (`pruebahumo`) se excluye del recuento.
- `npm run metricas` imprime también las visitas por canal (`nativo`, `whatsapp`, `x`, `copiar`, `descarga`); H3 cuenta cualquier canal.
- Los datos de prueba hechos en producción antes del lanzamiento deben borrarse (ver «Antes del lanzamiento»).

## Antes del lanzamiento

1. Quitar el `noindex`: `config/indexacion.json` → `"noindex": false`, y desplegar.
2. Borrar los datos de prueba de producción:
   ```sh
   npx wrangler d1 execute a-su-precio-registro --remote --command "DELETE FROM eventos; DELETE FROM tarjetas; DELETE FROM analisis; DELETE FROM aportaciones; DELETE FROM limites; DELETE FROM dedupe;"
   ```
   Las imágenes de las tarjetas viejas quedan en R2 sin referencia; se pueden dejar o borrar desde el panel.
3. Probar la vista previa de `/t/:id` en WhatsApp y X desde un móvil.
4. `npm run informe:lanzamiento` sin fallos.
