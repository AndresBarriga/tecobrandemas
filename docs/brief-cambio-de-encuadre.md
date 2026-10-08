# Brief: cambio de encuadre de A su precio

Fecha: 08/10/2026. Para Claude Code. **Primero propón un plan** (qué pantallas y textos tocas, en qué orden y qué dudas tienes) y espera confirmación antes de cambiar nada.

## Por qué

La referencia mide lo que pagan hoy quienes ya tienen contrato: contratos vigentes de propietarios particulares declarados en el IRPF, de distintas fechas, ajustados por el IPC del alquiler. **No mide el precio de mercado de hoy ni lo que se pide por entrar.** Varios textos actuales («lo que se paga aquí», «techo», «Puedes respirar», «¿Tiene sentido este precio?») la presentan como precio de mercado y convierten el resultado en un veredicto sobre el anuncio. Resultado: quien mira anuncios lee la referencia como «precios muy bajos» y concluye que la herramienta está mal. Es un problema de encuadre, no de método.

La idea de fondo que queremos transmitir: **entrar cuesta más que estar dentro**, y la herramienta mide cuánto más.

## Alcance

- **No se toca el motor** (`src/lib/motor/`): ni cálculo, ni niveles, ni umbrales.
- **No se rediseña la UI.** Se mantiene minimalista y con su gancho. Cambian textos, etiquetas, leyendas, el orden de los modos y la tarjeta.
- **Se mantienen** los números grandes («2,4 veces», «PARTE ALTA», el +%), el tono directo y todo lo que ya tiene gancho.
- Si una pantalla no encaja con este encuadre y no se arregla solo con texto (por ejemplo, «Negociar con el dato»), propón el cambio mínimo.

## Reglas de lenguaje

- **Evitar:** «techo» (la referencia es la parte alta, ≈ P75: hay contratos por encima), «como mucho/como máximo», «lo que se paga aquí/en tu zona», «Puedes respirar», «dentro de lo razonable», «precio de mercado» (salvo para negarlo), «de media» (la brecha es contra la parte alta, no contra la media).
- **Usar:** «lo habitual aquí», «lo que paga la gente de tu zona», «contratos vigentes», «fuera de rango», «dentro de rango».
- La frase larga «lo que pagan quienes ya viven de alquiler en esta zona» solo en la línea de fuente y en Cómo calculamos. En titulares, versión corta.
- Sin lenguaje de bando ni acusación al propietario («abuso», «robo», «especulación», «te toman el pelo»). La gracia está en el número, con tono de complicidad, no de denuncia. Estamos en campaña electoral (elecciones el 29/11).
- **Una cifra por frase.** No mezclar un % con una fracción.
- Cuando una cifra de dinero necesite contexto (por ejemplo «+1.093 €/mes»), añadir una línea que diga contra qué se compara: «más que la parte alta de lo que pagan quienes ya viven aquí».

## Cambios por pantalla

### Portada y selector
- **Orden: «Ya vivo aquí» primero y por defecto**, luego «Estoy mirando un piso». Si se llega desde el enlace de una tarjeta, abrir el modo con el que se creó.
- Título del formulario «Comprueba un piso» → algo válido para los dos modos («Compara un alquiler»).
- Subtítulo → «Compara tu alquiler, o el de un anuncio, con lo que pagan quienes ya viven de alquiler en la zona.» (sustituye a «…sabrás si es lo que se paga en tu zona»).
- Titular «El anuncio pide. Los datos responden.» → «Lo que piden por entrar. Lo que pagan los que ya están dentro.»
- Mantener un evento de analítica que indique qué modo elige la gente (`mode_selected` o propiedad en `analysis_started`), sin dirección, coordenadas ni precio exacto.

### Resultado: nombres de nivel
| Actual | Nuevo |
|---|---|
| Por debajo de la referencia | Por debajo |
| Dentro de la referencia (baja/media/alta) | Dentro de rango (baja/media/alta) |
| Por encima, explicable si es excelente | Algo por encima |
| Por encima del techo para un piso excelente | Fuera de rango |

### Resultado: «Estoy mirando un piso» (la pantalla con más cambio)
- Titulares (ejemplos de tono; ajusta según encaje con la UI):
  - Fuera de rango: «Piden 1.860 €. Lo habitual aquí: de 588 a 767 €.» Debajo: «Ni como piso excelente llegaría a lo habitual de aquí.»
  - Algo por encima: «Un 4 % por encima de lo habitual aquí.» Debajo: «Solo cuadra si el piso es excelente.»
  - Dentro de rango: «Pide lo que ya paga la gente de aquí.»
  - Por debajo: «Pide menos de lo que paga la gente de aquí.»
- Sustituir «No es barato, pero es lo que se paga aquí. Puedes respirar.» y «Ni con las mejores características la referencia llega a esta cifra.»
- Texto bajo la cifra grande: «la parte alta de la referencia para 50 m²» → «la parte alta de lo habitual aquí (50 m²)».
- Barra: «referencia» → «contratos de aquí»; «techo para un piso excelente 803 €» → «si fuera un piso excelente 803 €».
- Cuadro «Al mes +X € / Al año +X € / equivale a unos N meses»: se mantiene (es gancho), pero con el sujeto explícito: más que la parte alta de lo que pagan quienes ya viven aquí. No debe leerse como «te sobrecobran» ni como que se pueda alquilar a esa cifra.
- Aviso fijo y breve, visible junto a la cifra: «Se compara con contratos vigentes, algunos de hace años. Por eso un anuncio suele salir por encima.»

### Resultado: «Ya vivo aquí» (casi bien; solo retoques)
- «Dentro de la referencia» → «Dentro de rango».
- «Estás en la parte alta de lo que se paga en tu zona, aún dentro de la referencia» → «…de lo que paga la gente de tu zona, aún dentro de rango».
- «techo para un piso excelente» → «si fuera un piso excelente».
- La nota de contrato de menos de un año se mantiene tal cual.

### Línea de fuente (los dos modos)
«Basado en N contratos vigentes en la zona, de propietarios particulares declarados a Hacienda (2024), ajustados por el IPC del alquiler hasta [último mes disponible]. No incluye empresas ni fondos.» El mes sale del dato, no se escribe a mano.

### «Negociar con el dato» (cambio de fondo, no solo de etiquetas)
La plantilla de mensaje al propietario no debe presentar la referencia como precio de mercado, ni decir «techo». Debe hablar de **contratos vigentes** de la zona, sin «techo», y citar primero «contratos declarados a Hacienda (2024, ajustados por el IPC)» antes que «Ministerio de Vivienda». El propietario va a responder «eso son contratos antiguos»: la plantilla debe sostenerse sin que la referencia parezca el precio de hoy.

### «Tu zona» (dentro del resultado)
Se queda. Solo texto: leyenda → «Parte alta de lo que pagan quienes ya viven aquí, en €/m² al mes»; «Tu precio ya está dentro de la referencia…» → «Tu precio está dentro de lo habitual aquí. Aquí ves cómo es en las zonas de alrededor»; «sin dato: zonas con pocos alquileres registrados» → «pocos contratos». El dato de «+34 % entre 2015 y 2024» se mantiene.

### Mapa (`/mapa`)
- Referencia y Evolución: solo etiquetas (título, subtítulo, leyenda con la frase base). En Evolución: «Mediana de contratos vigentes registrados, sin descontar la inflación. Datos hasta 2024.»
- **Mi presupuesto:** se mantiene el mapa y la interacción. Cambian: «Lo que puedes pagar al mes» → «Tu presupuesto al mes»; la leyenda con la frase base; y el aviso, que debe ser visible (no gris pequeño): «Son contratos vigentes, no anuncios ni pisos disponibles. Hoy se suele pedir más.» Al tocar una zona, «dentro» no debe poder leerse como «hay pisos a ese precio».

### Tarjeta compartible (importante: circula sin contexto)
- Debe sostenerse sola. Etiqueta de nivel nueva + cifra grande + una línea con contexto.
- Ejemplo (estoy mirando): «Fuera de rango +62 %. Piden 1.860 €. Lo habitual aquí: de 588 a 767 €.»
- Ejemplo (ya vivo aquí): «Pago un X % más / menos que lo habitual en [barrio].»
- Añadir **asuprecio.com dentro de la imagen** (las capturas viajan sin enlace). Mantener atribución.
- El lema «¿Tiene sentido este precio?» invita a leer un veredicto. **Decisión pendiente de Andrés:** sustituirlo por «Lo que piden frente a lo que pagan» o mantenerlo.

### «Cómo calculamos»
- En 30 segundos, punto 1: «Comparamos el precio de un anuncio, o de tu alquiler, con lo que pagan quienes ya viven de alquiler en su zona: contratos vigentes declarados a Hacienda (2024).» Punto nuevo: «Son contratos ya firmados, algunos hace años. No es lo que se pide hoy por un piso nuevo.»
- Sección «Un precio pedido, no firmado» → «Contratos vigentes, no anuncios»: «Que un anuncio salga por encima no lo hace incorrecto: mide cuánto más cuesta entrar que estar dentro.»
- Bloque nuevo «Qué incluye la referencia»: propietarios particulares declarados en el IRPF; sin empresas, fondos ni contratos no declarados.
- Explicar «parte alta»: el valor por debajo del cual está la mayoría de los contratos; **no es un máximo**.
- Ejemplo paso a paso y «Los tres niveles»: sustituir «techo» por «si fuera un piso excelente» y usar los nombres nuevos.
- Quiénes somos: «si el precio… está dentro de lo razonable» → «cuánto más se pide por entrar que lo que pagan quienes ya viven allí».

## Antes de dar nada por cerrado
- Comprobar que el rango que se muestra («Entre 588 y 767 €») es el que el motor define como franja habitual, y que «parte alta» es ≈ P75. Si no, ajustar «lo habitual» y las explicaciones.
- Actualizar el test de frases bloqueadas (añadir las de «Evitar») y los tests de textos de resultado. La lógica no cambia.
- Revisar en móvil las etiquetas y titulares nuevos.
