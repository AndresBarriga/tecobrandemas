# Inventario de copys: oferta, bandas y veredictos (11/10/2026, rama `oferta-ajuste-tamano`)

Criterio de la columna «¿Fase 1?»:
- **Sí**: menciona el 10 % o sus umbrales (90/110 %), describe el cálculo como €/m² × m², da cifras que cambian con la fórmula o afirma algo que ya no es cierto. Se corrige en esta rama (estado en «por qué»).
- **Revisar**: no es falso pero puede leerse distinto ahora. **No se toca**: queda para la fase 2.
- **No**: no depende de la oferta ni de la banda (p. ej. todo lo de contratos) o ya es correcto.

Los textos largos se acortan con «…». Las rutas son de `src/lib/resultado/` salvo indicación. «dinámico» = el umbral sale de `OFERTA_BANDA_EN_LINEA` (0,15), no está escrito en el texto.

## A. Resultado (Un anuncio · Mi alquiler · Mi presupuesto · Tu zona · mapa)

| Superficie | archivo:línea | Texto actual | ¿Fase 1? | Por qué | Propuesta |
|---|---|---|---|---|---|
| Un anuncio / Mi alquiler | textos.ts:402 | POR DEBAJO · DENTRO · ALGO POR ENCIMA · POR ENCIMA | No | Palabras de contratos | |
| Un anuncio / Mi alquiler | textos.ts:402 | EN LÍNEA · PIDEN MÁS | No | Umbral dinámico: ya son ±15 % (hecho en motor) | |
| Un anuncio | textos.ts:404 | A su precio. | Revisar | Ahora más pisos pequeños salen «en línea» y abren el titular con «A su precio.» | |
| Un anuncio | textos.ts:407-410 | Menos de lo que pagan quienes ya viven aquí. / Lo habitual entre… / Algo más de lo que pagan… / Más de lo que pagan quienes ya viven aquí. | No | Contratos, fase 2 | |
| Mi alquiler | textos.ts:412 | Pagas menos que tus vecinos. / Pagas lo habitual en tu zona. / Pagas algo más que tus vecinos. / Pagas más que tus vecinos. | No | Contratos, fase 2 | |
| Un anuncio | textos.ts:416 | {En línea con / Por encima de / Por debajo de} lo que se pide ahora en el {barrio/distrito}. | Revisar | Un «por encima» que antes se debía al tamaño del piso ahora puede salir «en línea» | |
| Mi alquiler | textos.ts:418 | En línea con lo que se pide ahora por entrar. / Más de lo que se pide ahora por entrar. / Si buscaras piso ahora, te pedirían más. | Revisar | «Te pedirían más» ahora exige pagar >15 % menos, no >10 % | |
| Un anuncio / Mi alquiler | textos.ts:422-432 | ¿Cuánto pagan quienes ya viven aquí? · Lo habitual en los contratos… · Contrato de hace menos de un año… · de lo habitual en la zona · sobre lo más alto de lo habitual · Puede cuadrar si el piso es excelente · lo habitual · máximo si fuera un piso excelente | No | Contratos | |
| Un anuncio / Mi alquiler | textos.ts:435 | ¿Cuánto se pide ahora por entrar en un piso de {m2}? | No | | |
| Un anuncio / Mi alquiler | textos.ts:436 | Según los anuncios del {barrio}. Solo cuenta el tamaño, no cómo es el piso. | Revisar | Ahora es cierto («solo cuenta el tamaño») pero repite la frase de la estimación | |
| Un anuncio / Mi alquiler | textos.ts:437 | frente a lo que se pide en anuncios | No | | |
| Un anuncio / Mi alquiler | textos.ts:439 | Estimación para {m2} a partir de {x} €/m² del {barrio}. Los pisos pequeños se anuncian más caros por m², y lo tenemos en cuenta. No mira cómo es el piso (estado, planta, reforma). | Sí | Antes «≈ Estimación: X €/m² × los N m²»; ya cambiado | Hecho |
| Un anuncio / Mi alquiler | textos.ts:440 | se pide ≈{e} | No | La cifra es la ajustada, el texto no cambia | |
| Un anuncio / Mi alquiler | textos.ts:441-442 | Sin dato de oferta este mes · El Ayuntamiento no ha publicado precio de oferta… | No | | |
| Un anuncio / Mi alquiler | textos.ts:444 | Tu anuncio · {e} / Tu alquiler · {e} | No | | |
| Un anuncio / Mi alquiler | textos.ts:446-448 | ¿Por qué no coinciden? · Los contratos recogen rentas ya firmadas… Miden cosas distintas… | No | | |
| Un anuncio / Mi alquiler | textos.ts:450 | La línea morada marca el margen «en línea»: ±15 %. Es el margen en el que suele quedar un anuncio corriente respecto a nuestra estimación. | Sí | Antes ±10 % y «una estimación del barrio, no un precio exacto»; ya cambiado | Hecho |
| Un anuncio / Mi alquiler | textos.ts:453-454 | De dónde salen los datos · Precio de oferta del barrio o del distrito, ajustado por tamaño (calibrado con 145 anuncios reales de Idealista y Fotocasa, octubre de 2026). | Sí | Antes «Cálculo: X €/m² × Y m²…»; ya cambiado | Hecho |
| Un anuncio / Mi alquiler | textos.ts:457-462 | Contratos: SERPAVI (Ministerio de Vivienda), 2024 · Anuncios: Ayuntamiento de Madrid, {mes} · aria | No | | |
| Un anuncio | textos.ts:202 (MIRANDO.aviso) | Se compara con contratos vigentes, algunos de hace años. Por eso un anuncio suele salir por encima. | Revisar | Es el motivo de la fase 2 (contratos); no depende de la banda | |
| Un anuncio | textos.ts:174-198 (MIRANDO.*) | Piden un {pct} más por entrar que lo que pagan los contratos actuales… · En el límite alto de lo habitual aquí · Entrar aquí sale por lo mismo que estar dentro… | No | Contratos | |
| Un anuncio | textos.ts:592-615 (NIVEL_CONTRATOS.*) | Se sale de lo habitual… · Algo por encima… solo cuadra si el piso es excelente… · ¿Me podrías decir qué explica la diferencia…? | No | Contratos, fase 2 | |
| Mi alquiler | textos.ts:341-361 (INQUILINO.etiqueta/titular/frase) | Por debajo · Dentro de rango · Algo por encima · Se sale de lo habitual · Pagas lo habitual en tu zona… | No | Contratos, fase 2 | |
| Un anuncio (línea de oferta, `PantallaOferta.linea`) | textos.ts:550-551 | Anuncios recientes en el {nivel}: ≈{x}. | No | La cifra es la ajustada | |
| Un anuncio (línea de oferta) | textos.ts:552-554 | En línea con los anuncios recientes del {nivel} (≈{x}). / Por debajo de… / También por encima de… | Revisar | Mismo caso que textos.ts:416 | |
| Mi alquiler (línea de oferta) | textos.ts:558 | Si buscaras en el {nivel}, los anuncios recientes rondan {x} para tu piso. | Revisar | «Para tu piso» suena a valoración del piso concreto; la estimación solo mira tamaño | |
| Un anuncio / Mi alquiler | textos.ts:540-544 | Anuncios recientes: Ayuntamiento de Madrid, Banco de Datos, serie 4.3.21.D… · Contratos: SERPAVI… · Media del {nivel}, {mes}. | No | | |
| Portada y tarjeta v2 (reglas) | textos.ts:473-474 | Por encima de los contratos. / Dentro… / Por debajo… / Por encima de los anuncios. / En línea con los anuncios. / Por debajo de los anuncios. | Revisar | «Por encima de los anuncios» cambia de significado igual que textos.ts:416 | |
| Portada y tarjeta v2 (reglas) | textos.ts:475-478 | Por encima de anuncios y contratos. / Por debajo de anuncios y contratos. (y la versión «vivo») | Revisar | Idem: la parte de anuncios cambia | |
| Portada y tarjeta v2 | textos.ts:480-496 | Por encima · En línea · Por debajo · Anuncios recientes · lo que se pide / si te mudaras · Frente a la oferta estimada para una vivienda de {m2} m² en el {lugar}. | No | Texto correcto con el ajuste | |
| Portada y tarjeta v2 | textos.ts:498-511 | Un anuncio muestra lo que se pide por entrar… · Oferta estimada · {e} · Estimación para una vivienda de {m2} m² en el {lugar}. | No | | |
| Mi presupuesto (mapa) | textos.ts:1156-1158 | No llega · En línea · Te sobra | No | Etiquetas; los umbrales están en la nota | |
| Mi presupuesto (mapa) | textos.ts:1160 | No llega: menos del 85 % de la estimación (€/m² de anuncios ajustado por tamaño × tus metros). En línea: dentro de ±15 %. Te sobra: más del 115 %. | Sí | Antes 90 % / ±10 % / 110 % y «€/m² de anuncios × tus metros»; los 85/15/115 salen de `OFERTA_BANDA_EN_LINEA` | Hecho |
| Mi presupuesto (mapa) | textos.ts:1161-1169 | Son anuncios recientes, no contratos firmados… · En el {x} % de las zonas con dato… · Tu presupuesto no llega a lo que se pide en ninguna zona… | No | | |
| Mi presupuesto (hoja de zona) | textos.ts:1174 | Para {m2}: unos {x} al mes | Sí | La cifra pasa a ser la ajustada (misma función que el resultado: `referenciaOferta`) | Hecho |
| Mi presupuesto (hoja de zona) | textos.ts:1176-1178 | Tu presupuesto ({e} al mes) queda por debajo de / en línea con / supera lo que se pide en los anuncios recientes de esta zona… | No | | |
| Mi presupuesto (hoja de zona) | textos.ts:1172-1173, 1181-1183 | Anuncios recientes en el barrio: {x} €/m² al mes · Media de los anuncios recientes… · Esta zona no tiene dato… | No | Es el €/m² de la serie, sin ajustar (correcto) | |
| Mapa (Referencia con Oferta) | textos.ts:1146-1153 | Lo que se pide en los anuncios recientes de cada barrio o distrito… · Según anuncios recientes (media del barrio/distrito, {mes}). No son contratos firmados. | No | | |
| Mapa (Referencia con Oferta) | textos.ts:1150 | Anuncios recientes de {mes}: media del barrio o distrito, en €/m² al mes | Revisar | El mapa pinta el €/m² de la serie, sin el ajuste por tamaño; el resultado sí lo aplica | |
| Mapa / Mi presupuesto (contratos) | textos.ts:1058-1136 | Madrid por zonas… · No llega: menos que la parte baja de lo habitual… | No | Contratos | |
| Tu zona (capa Oferta) | textos.ts:1046 | Las zonas se colorean según el precio de oferta de alquiler publicado para su barrio o, si el barrio no tiene dato, para su distrito, en €/m². | Revisar | Igual: €/m² de la serie sin ajustar | |
| Tu zona (capa Oferta) | textos.ts:1049-1050 | Precio de oferta del barrio o del distrito, en €/m² al mes · Punteado: valor del distrito… | Revisar | Igual | |
| Tu zona (contratos) | textos.ts:1023-1048 | Sin dato: zonas con pocos contratos… · Contratos: SERPAVI… | No | | |

## B. Tarjetas para compartir y descargables

| Superficie | archivo:línea | Texto actual | ¿Fase 1? | Por qué | Propuesta |
|---|---|---|---|---|---|
| v3 «Dos veredictos» / «La costura» / «La cifra» | textos.ts:813 | Dos veredictos · La costura · La cifra | No | | |
| v3 | textos.ts:814-816 | Un anuncio · Mi alquiler · Frente a quienes ya viven aquí · Frente a lo que se pide por entrar | No | | |
| v3 | textos.ts:817-822 | por debajo de lo habitual · en la parte {x} de lo habitual · sobre lo más alto de lo habitual · lo más alto de lo habitual | No | Contratos | |
| v3 | textos.ts:823 | frente a lo que se pide en el {barrio/distrito} | No | | |
| v3 | textos.ts:824-828 | Sin dato de oferta este mes · el anuncio / yo · lo habitual · lo que se pide | No | | |
| v3 («La cifra») | textos.ts:830-835 | …lo más alto de lo habitual entre quienes ya viven en la zona. · Frente a lo que se pide ahora en el {nivel}: · pago un {pct} menos | Revisar | «Pago un X % menos» (PIDEN MÁS) ahora exige >15 % por debajo; el texto no lo dice | |
| v3 (dibujo) | cliente/tarjeta-canvas-v3.ts:172-177 | (margen «en línea») | Sí | Antes línea fina; ahora tramo claro dentro del carril | Hecho |
| v3 (palabras de la tarjeta) | textos.ts:402 | EN LÍNEA · PIDEN MÁS · POR ENCIMA · POR DEBAJO | No | Umbral dinámico | |
| v3 | textos.ts:836-841 | ¿Y EL TUYO? · asuprecio.com · Origen de los datos… · Oferta: Ayuntamiento de Madrid, serie 4.3.21.D… | No | | |
| v2 | textos.ts:781-803 (TARJETA.*) | Tu tarjeta para compartir · La tarjeta muestra tu barrio y tus porcentajes… · ¿Está a su precio? Compruébalo en asuprecio.com · Estimación independiente… | No | | |
| v2 (columna Anuncios) | cliente/tarjeta-canvas-v2.ts:106-113 | ANUNCIOS RECIENTES · lo que se pide · {lugar} · {±X %} · pastilla En línea / Por encima / Por debajo | Sí | El % sale de precio / estimación ajustada (calculado, cambia con la fórmula) | Hecho (calculado) |
| v2 (dibujo) | cliente/tarjeta-canvas-v2.ts:145 | (marca violeta; la banda no se dibuja) | No | Se deja sin banda, como pediste | |
| Mensaje de WhatsApp / X / hoja nativa | tarjeta.ts:170-186 + textos.ts:815-816 | «{lugar}. Frente a quienes ya viven aquí: por encima (+35 %). Frente a lo que se pide por entrar: en línea (−4 %).» (v3) | Sí | El % de la oferta sale de la estimación ajustada (calculado) | Hecho (calculado) |
| Mensaje de WhatsApp / X (enlace sin texto propio) | textos.ts:796 | Mira mi resultado | No | | |
| Mensaje v2 | tarjeta.ts:186 | {barrio}: {resumen} (p. ej. «Por encima de los anuncios.») | Revisar | Igual que textos.ts:473-474 | |
| Vista previa /t/:id (título) | tarjeta.ts:209 | A su precio · Un anuncio en {lugar} / Un alquiler en {lugar} | No | | |
| Vista previa /t/:id (descripción) | tarjeta.ts:205, 210 | {resumen} ¿Está a su precio? Compruébalo en asuprecio.com | Sí | Lleva el % de la oferta (calculado), que cambia con la fórmula | Hecho (calculado) |
| Vista previa v1 (tarjetas antiguas) | textos.ts:942-947 | Dentro de rango · Algo por encima · Se sale de lo habitual · Un piso en {barrio}: lo que piden frente a lo que pagan quienes ya viven allí. | No | Solo contratos | |
| Vista previa / tarjetas con oferta (v1) | textos.ts:560-585 | frente a los contratos vigentes de la zona… | No | Solo contratos | |
| Página /t/:id | textos.ts:890-912 | Alguien ha comprobado un piso en {barrio}… · …y los anuncios recientes del barrio o del distrito (Ayuntamiento de Madrid). · La tarjeta no incluye la dirección ni el precio exacto del anuncio. | No | | |
| Tarjetas ya guardadas | (D1 + R2) | Guardan fracciones y textos; no se recalculan | No | Se conservan tal cual | |
| Tarjeta del inquilino (v1) | textos.ts:845-888 | Pago lo habitual en mi zona. ¿Y tú? … | No | Contratos | |

## C. /como-calculamos (`metodologia.ts` y `routes/como-calculamos/+page.svelte`)

| Superficie | archivo:línea | Texto actual | ¿Fase 1? | Por qué | Propuesta |
|---|---|---|---|---|---|
| Resumen (30 segundos) | metodologia.ts:434 | Comparamos el precio… con dos referencias: … y lo que se pide ahora en los anuncios del barrio o del distrito. | No | | |
| Resumen (30 segundos) | metodologia.ts:435 | Ajustamos los contratos con el IPC del alquiler: +5,4 % hasta agosto de 2026. Lo que se pide no se ajusta por IPC (ya es reciente), pero sí por tamaño: los pisos pequeños se anuncian más caros por m². | Sí | Antes «Lo que se pide no se ajusta: ya es reciente» (ya no es cierto: se ajusta por tamaño) | Hecho |
| Resumen (30 segundos) | metodologia.ts:436-438 | Los contratos ya están firmados… · No vemos el piso por dentro… damos una palabra y un margen · No somos una tasación… | No | | |
| Cómo se lee | metodologia.ts:305-310 | ¿Cuánto se pide ahora por entrar? · A menos de un 15 % de lo que se pide, por arriba o por abajo. / Más de un 15 % por encima… / por debajo… / Solo en «Mi alquiler»: pagas más de un 15 % menos de lo que se pide… | Sí | Antes 10 %; sale de `OFERTA_BANDA_EN_LINEA` | Hecho (dinámico) |
| Cómo se lee | metodologia.ts:315-320 | El resultado tiene dos mitades… · El color dice de dónde sale cada cosa… · Abre el titular solo cuando… en «Un anuncio», si estás EN LÍNEA con lo que se pide. | No | | |
| Cómo se lee | metodologia.ts:290-297 | Por debajo de la parte baja de lo habitual. … Supera incluso el máximo si fuera un piso excelente… | No | Contratos | |
| Paso a paso | metodologia.ts:279 | Un anuncio de 45 m² en Embajadores, Centro por 1.400 € al mes. Las barras usan la misma escala que el resultado. | No | | |
| Paso a paso (1-3) | metodologia.ts:238-258 | Lo que pagan en la zona · Con el ajuste del IPC (×1,054) · Si fuera un piso excelente | No | Contratos | |
| Paso a paso (4) | metodologia.ts:263-266 | Lo que se pide ahora · Los anuncios del barrio piden de media 25,89 €/m² (junio de 2026). Por 45 m², con el ajuste por tamaño: ≈1.452 € al mes. «En línea» es ±15 % de esa cifra: de 1.234 a 1.670 €. | Sí | Antes ≈1.165 €, ±10 % (1.049–1.282 €); calculado, verificado | Hecho (calculado) |
| Paso a paso (4) | metodologia.ts:267-272 | aria «Lo que se pide ahora, ≈1.452 €; en línea, de 1.234 a 1.670 €» · leyenda «se pide ≈1.452 €», «en línea 1.234–1.670 €» | Sí | Idem | Hecho (calculado) |
| Paso a paso (5) | metodologia.ts:275 | 1.400 € se compara con cada referencia por separado… | No | | |
| Paso a paso (resultado) | (costura del ejemplo) | EN LÍNEA −3,6 % frente a lo que se pide · POR ENCIMA +35 % frente a contratos | Sí | Antes POR ENCIMA +20 % frente a lo que se pide | Hecho (calculado) |
| Las dos referencias | metodologia.ts:336-337 | Las dos referencias · Cada resultado compara tu precio con dos cosas distintas… | No | | |
| Las dos referencias (Oferta) | metodologia.ts:353-358 | ¿Cuánto se pide ahora por entrar? · Precios pedidos en anuncios, antes de cerrar el precio · Serie 4.3.21.D del Ayuntamiento… · Es lo que se anuncia, no lo que se firma | No | | |
| Las dos referencias (Oferta) | metodologia.ts:357 | {Junio de 2026}, sin ajuste de IPC: ya es reciente | Sí | Antes «sin ajustar»: ya no es cierto (se ajusta por tamaño) | Hecho |
| Las dos referencias (Oferta) | metodologia.ts:361 | Estimación: El €/m² del barrio (o del distrito, si el barrio no tiene dato) por tus metros, ajustado por el tamaño del piso. | Sí | Antes «…por tus metros» | Hecho |
| Las dos referencias (Oferta) | metodologia.ts:362 | En línea: Tu precio queda a ±15 % o menos de la estimación. | Sí | Antes ±10 %; dinámico | Hecho (dinámico) |
| Las dos referencias | metodologia.ts:367-368 | Miden cosas distintas… · Que un precio salga por encima no lo hace incorrecto… | No | | |
| Límites (Oferta) | metodologia.ts:384-387 | La resolución es de barrio o distrito… · Usamos la media del barrio… · Solo la calculamos con 30 m² o más… · No mira cómo es el piso (estado, planta, reforma): solo el tamaño. Los estudios de menos de 50 m² aún salen un 12 % altos. | Sí | Línea nueva de la fase 1 | Hecho |
| Límites (Oferta) | metodologia.ts:388 | La serie viene de Idealista: refleja lo que se anuncia allí… | No | | |
| Límites (Contratos) | metodologia.ts:374-379 | Son datos de 2024… · Mezclan contratos de distintos años… | No | Contratos | |
| Ajuste por tamaño (nuevo) | metodologia.ts:401-405 | Un piso pequeño se anuncia más caro por metro cuadrado que uno grande… · cada vez que el piso es un 10 % más grande, el €/m² esperado baja algo menos de un 4 % · Lo calibramos con 145 anuncios reales de Idealista y Fotocasa… · el error típico baja del 14 % al 10 % y los anuncios corrientes dentro de ±15 % pasan del 52 % al 68 % | Sí | Sección nueva de la fase 1 (su «10 %» es el error típico, no la banda) | Hecho |
| Ajuste por tamaño (nuevo) | metodologia.ts:410-415 | Metros / Factor · 35 m² ×1,38 … 130 m² ×0,82 · límites: No tiene en cuenta el estado… · Los estudios… 12 % por encima · error típico del 10 %, no un precio exacto | Sí | Idem | Hecho |
| El mapa y Tu zona | metodologia.ts:447-450 | …«Mi presupuesto» compara tu presupuesto con la estimación (€/m² ajustado por tamaño × tus metros): «No llega» por debajo del 85 %, «En línea» dentro de ±15 % y «Te sobra» por encima del 115 %. | Sí | Antes «(€/m² × tus metros)», 90 % / ±10 % / 110 %; dinámico | Hecho (dinámico) |
| El mapa y Tu zona | metodologia.ts:455-466 | Bajo cada resultado, «Tu zona» dibuja… «Oferta»… · Con «Oferta»: lo que se pide en los anuncios recientes de cada barrio o distrito… · Pisos disponibles: ni los contratos ni la media de anuncios… | Revisar | El mapa pinta el €/m² de la serie sin ajustar (ver textos.ts:1150) | |
| Tus datos | metodologia.ts:473-488 | Los datos del anuncio los escribes tú… | No | | |
| Lo que no calculamos | metodologia.ts:497 | …Los anuncios recientes tampoco se calculan con menos de 30 m² ni si la zona no tiene dato. | No | | |
| Fuentes | metodologia.ts:517-521 | Banco de Datos del Ayuntamiento de Madrid, serie 4.3.21.D… Serie elaborada por el Ayuntamiento a partir de datos de Idealista; no usamos Idealista directamente. | Revisar | La sección nueva dice que se calibró con anuncios de Idealista y Fotocasa a mano; «no usamos Idealista directamente» puede chocar | |
| Quiénes somos | metodologia.ts:176-178 | Los portales muestran lo que se pide… | No | | |

## Recuento

| Tabla | Textos | Sí | Revisar | No |
|---|---|---|---|---|
| A. Resultado | 43 | 5 | 12 | 26 |
| B. Tarjetas | 22 | 4 | 2 | 16 |
| C. /como-calculamos | 29 | 12 | 2 | 15 |
| **Total** | **94** | **21** | **16** | **57** |

Los 21 «Sí» están hechos en esta rama (varios porque el texto es calculado y ya sale con la fórmula nueva). Los 16 «Revisar» no se han tocado.
