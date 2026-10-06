# Lo que está abierto

Se actualiza al cerrar cada tarea; lo hecho pasa a `progreso.md`. Última revisión: 06/10/2026 (Fase 1 en producción; correcciones en los PR #14-#17).

## Decisiones vigentes (06/10/2026)
1. **Plan:** Cloudflare sigue en el plan gratuito por ahora. Sin dominio propio y con `noindex` hasta el lanzamiento. No se activan URLs de vista previa por rama: se verifica en local y con la prueba de humo tras el despliegue.
2. **Pruebas del trabajo nuevo:** ni capturas ni tests unitarios nuevos; se verifica con `npm run check`, el flujo a mano en local y la prueba de humo. No se toca el CI ni se borran tests existentes (si un cambio rompe uno, se arregla). Excepciones: el test de autocompletado («cada vía se encuentra por su última palabra, con y sin tilde») y los cambios de `humo.yml` y del job de humo del CI.
3. **A5 (esquema de datos):** nada de `datos_v2` ni de una tabla única con `tipo_dato`. Dos tablas separadas (análisis de anuncios y aportaciones de inquilinos). Solo se amplía la de inquilinos con `firma_mes` (AAAA-MM) y `renta_firma` (opcional). Mes en lugar de fecha exacta; nunca la sección. `casero_tipo` solo cuando el formulario lo pida. Antes de migrar en producción, export de la tabla.
4. **A4 (compartir):** aprobada y hecha. La tarjeta solo se guarda al elegir WhatsApp, X, copiar el enlace o la hoja nativa.
5. **A1-A3:** decisiones por defecto aprobadas (con horquilla se usa el ratio menor, el prudente; las tarjetas ya guardadas no cambian).
6. **Prueba de humo:** de solo lectura. Usa una tarjeta fija (`pruebahumo`), creada una vez a mano, marcada como de prueba y excluida de las métricas. Sin endpoint público de borrado.
7. **Tarjetas y «Tus datos»:** se dice la verdad de hoy: se guarda la imagen y los textos; no caducan automáticamente; se borran a petición por correo. La caducidad a 12 meses está en `docs/ideas.md`.

## Para ti (desarrollo)
**Fase 1 («Ya vivo aquí» y habitaciones): en producción** (PR #13; migraciones 0002 y 0003 aplicadas).
**Correcciones de la Fase 1: PR #14 (A: resultado y tarjetas), #15 (B: formulario), #16 (C: «Tu zona») y #17 (D: habitaciones), apilados: fusionar en ese orden** (cada uno se basa en el anterior; sin migraciones nuevas).

Cola siguiente, en este orden:
1. **Mapa, parte 1:** servir los PMTiles como activo estático para que las peticiones Range no gasten invocaciones del Worker. Hay que bajar de 25 MiB (zoom máximo 14 o una caja más ajustada; quitar capas que no usamos: edificios, puntos de interés). Si no cabe, avisar antes de cambiar de enfoque.
2. **Mapa, parte 2:** «Ampliar», pin fijo, hoja inferior en vivo, estilo apagado y zoom. («Usar mi ubicación» ya está hecho en F1, en los tres modos.)
3. **Estado de R7 y del resto de la lista anterior** (se entrega como informe).

Deuda y detalles:
- Correcciones F1: el titular de rango en una sola línea con tamaño ajustado solo se aplica al resultado del inquilino («+65 % a +76 %»); en el de anuncios sigue el diseño («entre … y …», que puede partirse en dos líneas).
- Correcciones F1: «¿Y tú? Compruébalo con el tuyo.» se añadió como cuarto texto de la tarjeta del inquilino (no como sufijo de los otros); el texto factual va primero y sale elegido por defecto.
- Correcciones F1: «Añade el número para afinar» solo aparece con calle sin número; con horquilla por el punto del dispositivo (radio de precisión) se corrige colocando el punto en el mapa.
- Correcciones F1: «Tu zona» del inquilino solo sale con horquilla (modo contexto); sin horquilla no se enseña.
- «Suma las habitaciones del piso»: la referencia del piso entero usa las zonas de la ubicación (con varias, el rango que las abarca todas) y los dos extremos del tamaño; no tiene tests propios (regla A2).
- Guardar en la tarjeta el tipo de cifra (% o «veces») en vez de deducirlo del texto (`heroEnVeces`).
- Barra: la línea vertical del techo puede cruzar el texto de «parte alta» cuando este pasa a la derecha de su marca (sin medir).
- El estado «cargando» de «Tu zona» no tiene prueba propia.
- El mensaje del 429 dice «espera un momento», pero el límite es diario (200 búsquedas por IP y día); y «Solo la calle» también usa el geocodificador. Solo el mapa sirve como salida real mientras dure el límite.
- R2 `a-su-precio-tarjetas` sigue marcando 10 objetos (671 kB) tras borrar las 7 imágenes de prueba y quedar 1 tarjeta (`pruebahumo`): puede ser retraso del contador o imágenes sueltas; wrangler no lista objetos.
- «Cómo calculamos»: la fila de la muestra usa «Fuente del Berro (Salamanca)» fijo, pero los datos dan «Goya» para esa sección (la muestra de la portada ya usa el barrio real). Unificar.
- «Cómo calculamos» del paquete F1 difiere de `docs/design` (fila del INE con «Serie: [SERIE]» y línea de validación BORRADOR): no aplicado, a la espera del usuario.
- F1, diferencias con el diseño a revisar: en «Habitación» no se piden fecha de firma ni renta al firmar (la tabla de habitaciones guarda solo el mes del registro); «Aportar» con menos de 10 no enseña el número que falta (solo la tarjeta de habitación enseña el recuento, como pidió el usuario); la portada no enseña el contador de ejemplo «12.480».

### Alias de barrios
Cargados (06/10): los 3 pedidos más los «seguros» y los «ambiguos» de la lista propuesta (El Rastro, Conde Duque, Tribunal, Huertas, Barrio de las Letras, Ópera, Bernabéu, Las Tablas, Sanchinarro, Valdebebas, La Latina, Vallecas, Barrio de Salamanca). Sin cargar, por dudosos: Montecarmelo, Nuevos Ministerios, Plaza de Castilla, Tirso de Molina y Gran Vía (confirmar a qué barrio oficial pertenecen). Se editan en `src/lib/resultado/alias.ts`.

## Para el usuario
- **Dominio propio:** no hay. Al tenerlo, cambiar la variable `URL_PRODUCCION` del repositorio y revisar la CSP y los enlaces.
- **Plan de pago de Workers** (unos 5 $ al mes): decidir antes del lanzamiento (ver «Antes del lanzamiento»).
- **Vista previa de `/t/ID` en WhatsApp y X** desde un móvil real, con una tarjeta compartida de verdad.
- **Pruebas en un móvil real:** hoja nativa de compartir, «Tu zona» con 150-200 zonas, y el mapa ampliable cuando esté.
- **Previews por rama de Cloudflare:** decidido no activarlas por ahora.
- **`noindex: false`** cuando decidas lanzar (`config/indexacion.json`).
- **R2:** mirar en el panel (bucket `a-su-precio-tarjetas`) si hay imágenes sueltas; debería haber una (`og/pruebahumo.jpg`).
- **Fusionar los PR #14 a #17** en orden (cada uno despliega a producción al fusionarse el último de la pila; conviene fusionarlos uno a uno y esperar al humo).
- **Probar en un móvil real:** «Usar mi ubicación» (permiso, precisión, fuera de Madrid), la hoja de compartir con la tarjeta del inquilino y los nuevos formularios a 360 px.
- **Ideas en discusión:** `docs/ideas.md` (necesitan tus decisiones y diseño).

## Antes del lanzamiento
- `noindex: false` y purga de los datos de prueba (`docs/operacion.md`).
- Probar a mano la ruta de escritura (compartir una tarjeta de verdad, `POST /api/tarjeta`, registro de análisis, «Aportar mi alquiler» y «Aportar mi habitación»), porque la prueba de humo es de solo lectura.
- **Las peticiones Range del mapa cuentan contra las 100.000 peticiones al día del Worker** (se resuelve con el punto 3 de «Para ti» si los PMTiles pasan a activo estático; comprobarlo).
- **Reimportar el callejero agota las escrituras de D1** (100.000 filas al día en el plan gratuito): hacerlo en tandas o con plan de pago.
- Valorar el plan de pago de Workers.
- Caducidad de tarjetas a 12 meses: antes de las tarjetas del inquilino (`docs/ideas.md`).
