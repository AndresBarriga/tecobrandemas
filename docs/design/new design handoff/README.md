# Handoff: resultado «La costura» y tarjetas compartibles · A su precio

## Qué es
Rediseño de **dos piezas** del comparador:
1. La parte superior de la pantalla de resultado (escritorio y móvil), en los dos modos: «Mi alquiler» y «Un anuncio».
2. Las tarjetas que se comparten (1080×1350) y la vista previa del enlace (1200×630), con un selector para que el usuario elija qué tarjeta comparte.

Todo lo demás **no cambia**: formulario, «Comprobados en esta sesión», Siguientes pasos, casilla de estadísticas, «¿Qué vas a hacer con este resultado?», Tu zona, pie y Cómo calculamos.

## Sobre estos archivos
Son **referencias de diseño en HTML**, no código de producción. Recréalas en el código de la app con sus componentes, estilos y datos reales. Para verlas, abre `Resultados final.dc.html` servido por HTTP, con `support.js` al lado.

- `Resultados final.dc.html`: lienzo con todas las pantallas (R1–R4, T).
- `ResultadoCostura.dc.html`: bloque de resultado parametrizado. Props: `caso`, `modo` (`alquiler` | `anuncio`), `desktop`, `abierto`, `demo` (portada: oculta titular, aclaraciones, notas y plegables).
- `TarjetaCostura.dc.html`: tarjetas. Props: `caso`, `tipo` (`veredictos` | `costura` | `cifra` | `og`), `modo`.
- `costura.js`: **lógica de referencia** (veredictos, escala, textos, meses) y casos de ejemplo. Es la fuente de verdad de las reglas; sustituye `CASOS` por los datos del motor.

## Margen para quien implementa
**Fijo** (no cambiar sin consultar):
- Estructura: bloque partido en dos; contratos en negro y oferta en claro; los dos carriles con **la misma escala** se tocan en la costura; la pastilla amarilla con el precio va en la costura y una línea vertical une los dos puntos.
- Orden según el modo: «Mi alquiler» → contratos arriba; «Un anuncio» → oferta arriba. Los carriles siempre quedan junto a la costura (el de arriba, al final de su mitad; el de abajo, al principio).
- Colores: color = fuente, nunca juicio. Negro #0B0A0A = contratos, ciruela #6A3A8C = oferta, paja #EBC85A = el precio del usuario.
- Reglas de veredicto, de cifras y de escala (abajo).
- Textos clave (tabla «Textos fijos»).
- Nunca se comparan contratos y oferta entre sí (nada de «entrar cuesta X € más»). Cada referencia se compara solo con el precio del usuario. La oferta siempre lleva «≈» y su cálculo.

**Flexible**:
- El resto del microtexto, los espaciados finos, los nombres de componentes y la integración con los textos que ya existan en la app. Si un texto de la app dice lo mismo, decide tú cuál conservar.

## Tokens
Los de la app (ver `design_handoff_a_su_precio/README.md`), con un cambio: **el fondo oscuro del bloque es #0B0A0A** (también en las tarjetas).
| Uso | Color |
|---|---|
| Mitad de contratos, tarjetas | `#0B0A0A` |
| Pista del carril en la mitad oscura | `#5A5750` |
| Banda «lo habitual» | `#F6F4EE` (texto «lo habitual» en tinta) |
| Tramo hasta el máximo de un piso excelente | `#857F74` |
| Tramo de incertidumbre (horquilla) | `#D6D1C6` |
| Mitad de oferta | `#EDE9E0`; pista `#E4DFD5` con contorno interior 1 px `#D6D1C6` |
| Marca de oferta, palabra de oferta | `#6A3A8C` |
| Precio del usuario (punto, pastilla, línea en la mitad oscura) | `#EBC85A`; la línea en la mitad clara, `#D8B44A` |
| Texto secundario en la mitad oscura | `#D6D1C6` |

Tipografía: Sofia Sans / Semi Condensed / Extra Condensed. Cifras con `tabular-nums`.
| Elemento | Escritorio | Móvil |
|---|---|---|
| Titular (2 frases) | Extra Condensed 800 · 62/0,9 | 42/0,9 |
| Pregunta de cada mitad | Sofia Sans 600 · 18 | 16 |
| Aclaración bajo la pregunta | 14 | 13 |
| Palabra del veredicto | Extra Condensed 800 · 80 (64 si >10 caracteres) | 56 (42) |
| % del veredicto | Extra Condensed 900 · 60, a la derecha | 36, debajo de la palabra |
| Valores del carril | Semi Condensed 700 · 15 | 13,5 |
| «máximo si fuera un piso excelente» | 15 | 13 |
| Pastilla | Semi Condensed 700 · 17 | 15 |

Medidas del carril: alto 28 (escritorio) / 24 (móvil). Ancho útil: 704 en escritorio (bloque de 760 con 28 de relleno) y 350 en móvil (bloque a sangre con 20 de relleno). Punto del mismo diámetro que el alto del carril, con borde de 3 px del color de su mitad.

## Reglas (ver `costura.js`)
**Veredicto de contratos** (`lo`, `hi`, `techo` del motor; en la horquilla, `hi`–`hiMax` y `techo`–`techoMax`):
| Condición | Palabra | Cifra | Texto |
|---|---|---|---|
| precio < lo | POR DEBAJO | — | de lo habitual en tu zona |
| lo ≤ precio ≤ hi | DENTRO | — | en la parte baja / media / alta de lo habitual (tercios) |
| hi < precio ≤ techo | ALGO POR ENCIMA | % sobre hi | sobre lo más alto de lo habitual. Puede cuadrar si el piso es excelente. |
| precio > techo | POR ENCIMA | % sobre hi | sobre lo más alto de lo habitual |
En la horquilla, la cifra es «+A a +B %» (A sobre `hiMax`, B sobre `hi`).

**Veredicto de oferta**: oferta = round(€/m² del distrito × m²); d = (precio − oferta) / oferta.
- |d| ≤ umbral → EN LÍNEA
- d > umbral → POR ENCIMA
- d < −umbral → POR DEBAJO

El % siempre se muestra. **SUPUESTO: umbral = 10 %**, a confirmar con el que use el motor.

**Mi alquiler por debajo de la oferta** (típico en contratos antiguos): no se presenta como suerte. La palabra pasa a **HOY PIDEN MÁS** y la cifra a (oferta − precio) / precio: «+47 % de lo que pagas, en anuncios del distrito para 90 m²». Titular: «Si buscaras piso hoy, te pedirían más.» En la tarjeta «La cifra»: «hoy se pide un 47 % más». En «Un anuncio» se mantiene POR DEBAJO. Sin la palabra «mercado».

**Fecha de firma** (solo Mi alquiler):
- Bajo la pregunta de contratos: «Contrato de [año]: lo habitual mezcla contratos de distintos años.»
- Si el contrato tiene 2 años o más, bajo la pregunta de oferta: «Firmaste en [año]. Esto no valora tu contrato: indica cuánto costaría entrar hoy.»
- Con «Hace menos de un año», no se muestra ninguna nota.

**«A su precio»**: la primera frase del titular pasa a «A su precio.» cuando la referencia principal del modo lo confirma. En **Mi alquiler**, si los contratos dan DENTRO; en **Un anuncio**, si la oferta da EN LÍNEA (en ciruela). La segunda frase y las palabras del veredicto no cambian.

**Margen «en línea» visible**: en el carril de oferta, una franja `#E9DFF1` con contorno ciruela de 1,5 px va de oferta × (1 − umbral) a oferta × (1 + umbral). Si el punto cae dentro, se ve «en línea» aunque la escala amplíe la distancia. Va también en la tarjeta «La costura».

**Escala común**: min = ⌊0,85 × mín(lo, precio, oferta × (1 − umbral))⌋ a 100 €; max = ⌈1,10 × máx(techo, precio, oferta × (1 + umbral))⌉ a 100 €. La misma para los dos carriles. No se rotula.

**Etiquetas del carril de contratos**:
- «lo habitual» dentro de la banda si mide ≥ 90 px (76 en móvil).
- Valores bajo los extremos de la banda: centrados si la banda mide ≥ 110 px (84); si no, el inferior a la izquierda del borde y el superior a la derecha.
- «máximo si fuera un piso excelente: X €» en una segunda fila, alineado a la derecha de su marca y ajustado al borde.
- Las etiquetas llevan fondo del color de su mitad, para tapar la línea amarilla si la cruzan.
- En el prototipo los anchos se estiman; en producción hay que **medirlos**.

**Pastilla**: centrada en el precio y ajustada a los bordes del carril. Se apoya en la costura (−21 px en escritorio, −18 en móvil, sobre la mitad de abajo). La mitad de arriba deja hueco bajo su segunda fila para que no se pisen.

**Titular**: una frase por fuente, en el orden del modo; la de oferta en ciruela.
- Mi alquiler: «Pagas más que tus vecinos.» / «Pagas algo más que tus vecinos.» / «Pagas lo habitual en tu zona.» / «Pagas menos que tus vecinos.» + «En línea con lo que se pide hoy por entrar.» / «Más de lo que…» / «Menos de lo que…».
- Un anuncio: «En línea con / Por encima de / Por debajo de lo que se pide hoy en el distrito.» + «Más de / Algo más de / Menos de lo que pagan quienes ya viven aquí.» / «Lo habitual entre quienes ya viven aquí.»

**Plegables** (cerrados por defecto; en escritorio, en fila; abiertos, en columna):
1. «¿Cuánto es al año?»: **solo si precio > lo más alto de lo habitual**. Al mes = precio − hi (en la horquilla, hiMax, con «Al mes, como mínimo»); al año × 12; meses = al año ÷ precio. Frase: «casi N meses» si la parte decimal es ≥ 0,5; si no, «más de N meses». Rótulo truncado a un decimal («+2,7 meses»). 12 bloques en tinta y N en paja, el último relleno en proporción, sin degradado.
2. «¿Por qué no coinciden?»
3. «De dónde salen los datos»: el texto de fuentes actual de la app, con el recuento de contratos.

**Estados**:
- **Sin dato de oferta**: la mitad clara se queda sin carril. Muestra la etiqueta con contorno «Sin dato de oferta este mes» y un texto. El titular se queda con una frase.
- **Ubicación aproximada**: aviso con borde discontinuo bajo el contexto, tramo de incertidumbre en el carril y cifra en rango.

## Textos fijos
| Dónde | Texto |
|---|---|
| Pregunta de contratos | ¿Cuánto pagan quienes ya viven aquí? |
| Aclaración | Lo habitual en los contratos de alquiler firmados en tu zona, para pisos de [m²] m². |
| Pregunta de oferta | ¿Cuánto se pide hoy por entrar en un piso de [m²] m²? |
| Aclaración | Según los anuncios del distrito. Solo cuenta el tamaño, no cómo es el piso. |
| Banda | lo habitual |
| Máximo | máximo si fuera un piso excelente: [X] € |
| Marca de oferta | se pide ≈[X] € |
| Nota de oferta | ≈ Estimación: [€/m²] €/m² del distrito × tus [m²] m². No es el precio de pisos como el tuyo. |
| Pastilla | Tu alquiler · [X] € / Tu anuncio · [X] € |
| Palabras | POR DEBAJO · DENTRO · ALGO POR ENCIMA · POR ENCIMA / POR DEBAJO · EN LÍNEA · POR ENCIMA |

Vocabulario: no se usan «referencia», «parte alta» ni «techo» en esta pantalla («techo» confundía). Equivalencias: referencia → lo habitual; parte alta → lo más alto de lo habitual; techo para un piso excelente → máximo si fuera un piso excelente; oferta estimada → se pide ≈.

## Compartir
El bloque «Tu tarjeta para compartir» añade un **selector de 3 tarjetas**, con miniaturas reales y un radio. Los botones siguen igual (WhatsApp, X, Copiar enlace, Descargar imagen).
- **Dos veredictos** (por defecto): mitad negra (contratos) y mitad paja (oferta). Palabra a 200 px (128 si tiene más de 10 caracteres), % a 120 px y la pastilla del lugar en la costura.
- **La costura**: el mismo dibujo que la pantalla, sin euros. «yo» / «el anuncio» en la costura.
- **La cifra**: el % frente a los contratos a 380 px. **Solo se ofrece si hay %** (algo por encima / por encima); si no, desaparece del selector.
- **Vista previa 1200×630**: siempre en formato «Dos veredictos».
- Formato: **1080×1350** (el actual); de momento no hay historias. Ningún texto por debajo de 30 px. Sin renta, dirección ni fecha: solo barrio, distrito, veredictos y %.
- Las palabras y las cifras grandes deben **medirse y reducirse** hasta caber, como en F1.

## Datos de ejemplo
`principal` (Vinateros, Moratalaz, 90 m², 1.400 €, hi 1.074 €, techo 1.138 €, 17,14 €/m² → ≈1.543 €) es el caso del enunciado, salvo `lo` = 742 €, que es un valor de boceto. El resto de casos y el recuento de 118 contratos son **EJEMPLO**.

## Pantallas del lienzo
| Id | Pantalla |
|---|---|
| P | Portada: ejemplo de entrada (escritorio y móvil). Es ResultadoCostura con `demo` (sin titular, aclaraciones, notas ni plegables) + «Así se ve un resultado · EJEMPLO» + una línea de nota. Al comprobar, el resultado ocupa ese sitio. |
| R1 | Mi alquiler, escritorio 1280 (en la página, con el selector de compartir) y móvil 390 |
| R2 | Un anuncio, escritorio y móvil |
| R3 | Móvil: dentro, algo por encima, las dos por encima, sin oferta, contrato antiguo, «a su precio», horquilla |
| R4 | Plegables abiertos, escritorio y móvil |
| T | 3 tarjetas + vista previa × 5 combinaciones (incluido el contrato antiguo) |
