# Lo que está abierto

Se actualiza al cerrar cada tarea; lo hecho pasa a `progreso.md`. Última revisión: 06/10/2026.

## Decisiones vigentes (06/10/2026)
1. **Plan:** Cloudflare sigue en el plan gratuito por ahora. Sin dominio propio y con `noindex` hasta el lanzamiento. No se activan URLs de vista previa por rama: se verifica en local y con la prueba de humo tras el despliegue.
2. **Pruebas del trabajo nuevo:** ni capturas ni tests unitarios nuevos; se verifica con `npm run check`, el flujo a mano en local y la prueba de humo. No se toca el CI ni se borran tests existentes (si un cambio rompe uno, se arregla). Excepciones: el test de autocompletado («cada vía se encuentra por su última palabra, con y sin tilde») y los cambios de `humo.yml` y del job de humo del CI.
3. **A5 (esquema de datos):** nada de `datos_v2` ni de una tabla única con `tipo_dato`. Dos tablas separadas (análisis de anuncios y aportaciones de inquilinos). Solo se amplía la de inquilinos con `firma_mes` (AAAA-MM) y `renta_firma` (opcional). Mes en lugar de fecha exacta; nunca la sección. `casero_tipo` solo cuando el formulario lo pida. Antes de migrar en producción, export de la tabla.
4. **A4 (compartir):** aprobada y hecha. La tarjeta solo se guarda al elegir WhatsApp, X, copiar el enlace o la hoja nativa.
5. **A1-A3:** decisiones por defecto aprobadas (con horquilla se usa el ratio menor, el prudente; las tarjetas ya guardadas no cambian).
6. **Prueba de humo:** de solo lectura. Usa una tarjeta fija (`pruebahumo`), creada una vez a mano, marcada como de prueba y excluida de las métricas. Sin endpoint público de borrado.
7. **Tarjetas y «Tus datos»:** se dice la verdad de hoy: se guarda la imagen y los textos; no caducan automáticamente; se borran a petición por correo. La caducidad a 12 meses está en `docs/ideas.md`.

## Para ti (desarrollo)
En este orden, un PR por punto:
1. **Autocompletado de direcciones y «Moscardó».** «Moscardó» no es una vía de CartoCiudad: es un barrio oficial de Usera. Sin calles que coincidan, buscar también en barrios y distritos (con alias) y ofrecer «Moscardó (barrio · Usera): elige una calle o toca el mapa», que centra el mapa. Normalización, coincidencia por palabras, orden, máximo 8, alias de barrios populares (propongo la lista antes de cargarla) y combobox accesible.
2. **A5:** migración de `aportaciones` (`firma_mes`, `renta_firma`) y, si el formulario lo pide, su campo; export de la tabla antes de migrar en producción.
3. **Mapa, parte 1:** servir los PMTiles como activo estático para que las peticiones Range no gasten invocaciones del Worker. Hay que bajar de 25 MiB (zoom máximo 14 o una caja más ajustada; quitar capas que no usamos: edificios, puntos de interés). Si no cabe, avisar antes de cambiar de enfoque.
4. **Mapa, parte 2:** «Ampliar», pin fijo, hoja inferior en vivo, estilo apagado y «Usar mi ubicación» en los tres modos (todo en el navegador).
5. **Estado de R7 y del resto de la lista anterior** (se entrega como informe).

Deuda y detalles:
- Guardar en la tarjeta el tipo de cifra (% o «veces») en vez de deducirlo del texto (`heroEnVeces`).
- Barra: la línea vertical del techo puede cruzar el texto de «parte alta» cuando este pasa a la derecha de su marca (sin medir).
- El estado «cargando» de «Tu zona» no tiene prueba propia.
- El mensaje del 429 dice «espera un momento», pero el límite es diario (200 búsquedas por IP y día); y «Solo la calle» también usa el geocodificador. Solo el mapa sirve como salida real mientras dure el límite.
- Restos de pruebas en producción (ver «Para el usuario»): pendiente de tu «ok».

## Para el usuario
- **Dominio propio:** no hay. Al tenerlo, cambiar la variable `URL_PRODUCCION` del repositorio y revisar la CSP y los enlaces.
- **Plan de pago de Workers** (unos 5 $ al mes): decidir antes del lanzamiento (ver «Antes del lanzamiento»).
- **Vista previa de `/t/ID` en WhatsApp y X** desde un móvil real, con una tarjeta compartida de verdad.
- **Pruebas en un móvil real:** hoja nativa de compartir, «Tu zona» con 150-200 zonas, y el mapa ampliable cuando esté.
- **Previews por rama de Cloudflare:** decidido no activarlas por ahora.
- **`noindex: false`** cuando decidas lanzar (`config/indexacion.json`).
- **Borrado de restos de pruebas en producción:** necesito tu «ok» tras ver el recuento (se te muestra aparte).
- **Ideas en discusión:** `docs/ideas.md` (necesitan tus decisiones y diseño).

## Antes del lanzamiento
- `noindex: false` y purga de los datos de prueba (`docs/operacion.md`).
- Probar a mano la ruta de escritura (compartir una tarjeta de verdad, `POST /api/tarjeta`, registro de análisis y aportaciones), porque la prueba de humo es de solo lectura.
- **Las peticiones Range del mapa cuentan contra las 100.000 peticiones al día del Worker** (se resuelve con el punto 3 de «Para ti» si los PMTiles pasan a activo estático; comprobarlo).
- **Reimportar el callejero agota las escrituras de D1** (100.000 filas al día en el plan gratuito): hacerlo en tandas o con plan de pago.
- Valorar el plan de pago de Workers.
- Caducidad de tarjetas a 12 meses: antes de las tarjetas del inquilino (`docs/ideas.md`).
