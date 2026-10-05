# Lo que está abierto

Se actualiza al cerrar cada tarea. Última revisión: 05/10/2026 (cierre del día).

## Hecho hoy (en producción tras fusionar)
- **PR #7:** «Tu zona» y «Cómo calculamos» según el diseño actualizado.
- **PR #8 (A1-A3):** ratio por tramos (`textoRatio`), etiquetas de la barra enteras (`colocarEtiqueta`), cifra grande ajustada al ancho y aviso «¿Seguro?» con más de 3 veces la parte alta (evento `confirma_precio`, sin precio).
- **PR #9 (A4, opción A):** la tarjeta solo se guarda al elegir WhatsApp, X, copiar el enlace o la hoja nativa del móvil; «Descargar imagen» no sube nada; eventos por canal sin datos del anuncio.

## Decisiones por defecto (revisables)
- Con horquilla (varias zonas posibles) el ratio es el menor (el prudente); la unidad de un rango (% o «veces») la marca ese ratio menor. El aviso de «¿Seguro?» usa ese mismo ratio.
- Las tarjetas ya guardadas (`/t/:id`) conservan el texto con el que se crearon, incluidas las frases antiguas de «más del doble».
- «Veces» en una tarjeta guardada se reconoce por el propio texto (`heroEnVeces`), porque la tarjeta solo guarda cadenas.
- «Tarjetas creadas» (H4) son ahora tarjetas compartidas (`docs/operacion.md`).
- La hoja nativa de compartir se usa solo con puntero táctil y `canShare({files})`; en escritorio, siempre los cuatro canales.

## Aparcado
- **A5 (esquema de datos):** aparcado por decisión del usuario. Chocaba con las reglas del proyecto: `seccion` («nunca la sección»), `created_at` exacto («nunca la fecha exacta») y una tabla única con `tipo_dato` («no se mezclan»). Propuesta guardada: tabla nueva `datos_v2` junto a las actuales, sin escrituras, con `created_at` solo en AAAA-MM y `seccion` únicamente si se confirma como excepción.

## Pendiente de respuesta del usuario
- **Mapa «En el mapa»** (ampliar, pin fijo, hoja inferior en vivo, chip «Usar mi ubicación»; el mapa base PMTiles ya existe): falta decidir el orden, si es un PR o dos y si se activan las URLs de vista previa por rama en Cloudflare (cambio en Cloudflare, requiere su visto bueno y un job de CI). Supuestos a confirmar: «±30 m» del chip es un texto fijo; «cerca de un borde» = 25 m.

## Por comprobar en producción
- Vista previa de `/t/ID` en WhatsApp y X desde un móvil real (que la imagen salga aunque se comparta recién subida la tarjeta).
- La hoja nativa de compartir en un móvil real (los tests la simulan).
- «Tu zona» con 150-200 zonas en un móvil real: fluidez.
- Barra: la línea vertical del techo puede cruzar el texto de «parte alta» cuando este pasa a la derecha de su marca (no medido).

## Pendiente (de antes)
- Borrar en producción las filas de prueba `analisis` y `dedupe` (D1 sin escrituras hasta medianoche UTC): `DELETE FROM analisis; DELETE FROM dedupe;`.
- Dominio propio: no hay.
- La portada no tiene un `main` visible (axe, moderado).
- Un 429 del geocodificador muestra la pantalla genérica de «sin conexión».
- Sin prueba propia: el estado «cargando» de «Tu zona».
- Las peticiones Range del mapa cuentan contra las 100.000 peticiones/día del Worker.
- Con el plan gratuito, reimportar el callejero agota las escrituras de D1; valorar el plan de pago.
- Antes del lanzamiento: `noindex: false` y purgar los datos de prueba (`docs/operacion.md`).
