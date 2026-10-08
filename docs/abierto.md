# Lo que está abierto

Se actualiza al cerrar cada tarea; lo hecho pasa a `progreso.md`. Última revisión: 08/10/2026 (limpieza; el cambio de encuadre está en producción, PR #26).

## Decisiones vigentes
1. **Plan:** Cloudflare sigue en el plan gratuito por ahora. No se activan URLs de vista previa por rama: se verifica en local y con la prueba de humo tras el despliegue.
2. **Pruebas del trabajo nuevo:** ni capturas ni tests unitarios nuevos; se verifica con `npm run check`, el flujo a mano en local y la prueba de humo. No se toca el CI ni se borran tests existentes (si un cambio rompe uno, se arregla). Excepciones: el test de autocompletado («cada vía se encuentra por su última palabra, con y sin tilde») y los cambios de `humo.yml` y del job de humo del CI.
3. **Esquema de datos:** nada de `datos_v2` ni de una tabla única con `tipo_dato`. Dos tablas separadas (análisis de anuncios y aportaciones de inquilinos), más la de habitaciones. Mes en lugar de fecha exacta; nunca la sección. `casero_tipo` solo cuando el formulario lo pida. Antes de migrar en producción, export de la tabla y OK del usuario.
4. **Compartir:** la tarjeta solo se guarda al elegir WhatsApp, X, copiar el enlace o la hoja nativa.
5. **Horquilla:** se usa el ratio menor, el prudente. Las tarjetas ya guardadas no cambian.
6. **Prueba de humo:** de solo lectura. Usa una tarjeta fija (`pruebahumo`), creada una vez a mano, marcada como de prueba y excluida de las métricas. Sin endpoint público de borrado.
7. **Tarjetas y «Tus datos»:** se dice la verdad de hoy: se guarda la imagen y los textos; no caducan automáticamente; se borran a petición por correo (hola@asuprecio.com).

## Para ti
- **La prueba de humo falla desde el 07/10 (14:37).** La horaria y la del CI marcan rojo porque producción pide `static.cloudflareinsights.com/beacon.min.js`, que inyecta Cloudflare Web Analytics y no está en el código; el test «sin pedir nada a terceros» (`e2e/humo.spec.ts`, caso 1) lo detecta. Lo recomendable es desactivar esa inyección en el panel de Cloudflare (encaja con no pedir nada a terceros); la alternativa es quitar esa aserción del test. Los otros dos casos de humo pasan.
- **Pruebas en un móvil real:** hoja nativa de compartir (anuncio y Mi alquiler, ahora con texto), vista previa de `/t/ID` en WhatsApp y X con una tarjeta compartida de verdad, «Usar mi ubicación» (permiso, precisión, fuera de Madrid), «Tu zona» con 150-200 zonas y los formularios a 360 px.
- **Ideas en discusión:** `docs/ideas.md` (necesitan tus decisiones y diseño).

## Por verificar (no se puede comprobar desde el código)
- **R2 `a-su-precio-tarjetas`:** marcaba 10 objetos (671 kB) con una sola tarjeta (`pruebahumo`). Puede ser retraso del contador o imágenes sueltas; mirar en el panel (debería haber `og/pruebahumo.jpg`).
- **PMTiles como activo estático:** las peticiones Range del mapa cuentan contra las 100.000 peticiones al día del Worker. Comprobar si ya se sirven como activo estático; si no, hay que bajar de 25 MiB (zoom máximo 14 o una caja más ajustada, sin las capas que no usamos) y avisar antes de cambiar de enfoque.
- **Estado de R7** (registro anónimo de análisis): el informe quedó pendiente.
- **CSP con el dominio propio:** revisarla ahora que asuprecio.com está conectado.

## Deuda técnica
- Guardar en la tarjeta el tipo de cifra (% o «veces») en vez de deducirlo del texto (`heroEnVeces`).
- Titular de rango: en Mi alquiler va en una línea con tamaño ajustado; en anuncios sigue el diseño («entre … y …») y puede partirse en dos líneas.
- Barra: la línea vertical de «si fuera un piso excelente» puede cruzar el texto de «parte alta» cuando este pasa a la derecha de su marca (sin medir).
- «Suma las habitaciones del piso»: no tiene tests propios (regla de arriba).
- El estado «cargando» de «Tu zona» no tiene prueba propia.
- El mensaje del 429 dice «espera un momento», pero el límite es diario (200 búsquedas por IP y día); y «Solo la calle» también usa el geocodificador. Solo el mapa sirve como salida real mientras dure el límite.
- «Cómo calculamos»: la fila de la muestra usa «Fuente del Berro (Salamanca)» fijo, pero los datos dan «Goya» para esa sección. Unificar.
- «Cómo calculamos» del paquete F1 difiere de `docs/design` (fila del INE con «Serie: [SERIE]» y línea de validación BORRADOR): no aplicado, a la espera del usuario.
- Diferencias con el diseño de F1 a revisar: en «Habitación» no se piden fecha de firma ni renta al firmar; «Aportar» con menos de 10 no enseña el número que falta; la portada no enseña el contador de ejemplo «12.480».
- Alias de barrios sin cargar por dudosos: Montecarmelo, Nuevos Ministerios, Plaza de Castilla, Tirso de Molina y Gran Vía (confirmar a qué barrio oficial pertenecen). Se editan en `src/lib/resultado/alias.ts`.

## Credibilidad de los datos aportados (pendiente, 08/10/2026)
Cómo proteger las aportaciones de alquiler y de habitaciones frente a datos falsos. Sin decidir ni implementar; se retoma más adelante.

**Hoy** (`src/lib/server/registro.ts`): €/m² entre 5 y 60 (habitaciones, 150-1.500 €), 20 envíos por IP y día (HMAC con sal diaria), deduplicación a 30 días, recuentos desde 10 por barrio y mediana de habitaciones desde 20. Las aportaciones no entran en la referencia ni en el nivel del resultado: es lo que más limita el daño.

**Puntos débiles:**
- La mediana de habitaciones se puede envenenar: una persona con un par de IPs puede aportar tantas habitaciones falsas como legítimas hay (variar 1 € esquiva la deduplicación).
- La plausibilidad de 5-60 €/m² es muy laxa.
- Los recuentos públicos desde 10 se pueden inflar.
- La interfaz dice cuándo se descarta un dato («no cuadran con lo habitual»), lo que sirve para sondear los filtros.
- Nada avisa de una ráfaga de datos en un barrio.

**Propuesta (de más barato a más caro):**
1. Plausibilidad contra la referencia de la zona, en vez del 5-60 global.
2. Mediana recortada, publicada solo con un mínimo de aportaciones y de días distintos, y con un tope de aportaciones por barrio y día.
3. Alerta de anomalías diaria (ráfagas y saltos de mediana, con el script de métricas) y una vía para borrar filas sospechosas, siempre con el OK del usuario.
4. Que el servidor no revele cuándo ni por qué descarta un dato.
5. Solo si aparece abuso: prueba de trabajo en el cliente, o Turnstile (carga un script de Cloudflare, lo que choca con no pedir nada a terceros).
6. Verificación documental (contrato o IRPF): descartada por privacidad y fricción.

**Decisión previa:** ¿las aportaciones serán solo contexto o algún día pesarán en el resultado? Si son solo contexto, bastan los puntos 1-3; si van a pesar, hace falta mucho más.

## Antes del lanzamiento
- `noindex: false` (`config/indexacion.json`) y purga de los datos de prueba (`docs/operacion.md`).
- Probar a mano la ruta de escritura (compartir una tarjeta de verdad, `POST /api/tarjeta`, registro de análisis, «Aportar mi alquiler» y «Aportar mi habitación»), porque la prueba de humo es de solo lectura.
- Decidir el plan de pago de Workers (unos 5 $ al mes).
- Reimportar el callejero agota las escrituras de D1 (100.000 filas al día en el plan gratuito): hacerlo en tandas o con plan de pago.
- Valorar la caducidad de tarjetas a 12 meses (`docs/ideas.md`).
