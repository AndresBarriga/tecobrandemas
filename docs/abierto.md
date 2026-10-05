# Lo que está abierto

Se actualiza al cerrar cada tarea. Última revisión: 05/10/2026.

## En curso (rama `tarjeta-ratio`)
- **A1 Etiqueta «techo para un piso excelente»:** corregida en la tarjeta (`colocarEtiqueta`, `src/lib/resultado/etiquetas.ts`) y en la barra de la pantalla. Probado con +100 %, +240 % y +400 % a 390, 360 y 1280 px (`e2e/etiquetas-barra.spec.ts`). Efecto lateral corregido: «5,0 veces» se salía de la tarjeta y de la pantalla a 360 px.
- **A2 Texto por ratio:** `textoRatio` / `partesRatio` (`src/lib/resultado/ratio.ts`). Se eliminaron las frases fijas de «casi el doble» y «más del doble».
- **A3 Aviso de error al teclear:** `UMBRAL_ERROR_TECLEO = 3`, pantalla `ConfirmarPrecio`, evento `confirma_precio` (sin precio).

## Decisiones tomadas por defecto (revisables)
- Con horquilla (varias zonas posibles) el ratio es el menor (el prudente); la unidad de un rango (% o «veces») la marca ese ratio menor.
- El aviso de A3 usa el mismo ratio prudente: solo salta si es seguro que se supera 3×.
- Las tarjetas ya guardadas (`/t/:id`) conservan el texto con el que se crearon, incluidas las frases antiguas de «más del doble».
- «Veces» en el texto de una tarjeta guardada se reconoce por el propio texto (`heroEnVeces`), porque la tarjeta solo guarda cadenas.
- Si los dos extremos de una horquilla se escriben igual, se muestra una sola cifra.

## Pendiente de respuesta del usuario
- **A5 (esquema de datos): aparcado por decisión del usuario (05/10/2026).** `seccion` y `created_at` exacto chocan con «nunca la sección» ni la fecha exacta; una tabla única con `tipo_dato` choca con «no se mezclan». Propuesta: tabla nueva `datos_v2` junto a las actuales, sin escrituras, con `created_at` en AAAA-MM y `seccion` solo si se confirma.
- **A4 (compartir):** los enlaces normales de WhatsApp y X necesitan el id `/t/:id` antes de pulsar; propuesta: «Compartir» sube la tarjeta y luego aparecen los cuatro botones.
- **Mapa «En el mapa»:** orden respecto a A1–A5; URL de vista previa por rama (necesita activar preview URLs de Cloudflare y un job de CI; cambio en Cloudflare, requiere visto bueno); un PR o dos.

## Pendiente (de antes)
- Borrar en producción las filas de prueba `analisis` y `dedupe` (D1 sin escrituras hasta medianoche UTC).
- Probar la vista previa de `/t/:id` en WhatsApp y X desde un móvil real.
- Dominio propio: no hay.
- La portada no tiene un `main` visible (axe, moderado).
- Un 429 del geocodificador muestra la pantalla genérica de «sin conexión».
- Las peticiones Range del mapa cuentan contra las 100.000 peticiones/día del Worker.
- Con el plan gratuito, reimportar el callejero agota las escrituras de D1; valorar el plan de pago.
- Antes del lanzamiento: `noindex: false` y purgar los datos de prueba (`docs/operacion.md`).
- Sin prueba propia: el estado «cargando» de «Tu zona».
