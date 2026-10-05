# Handoff: «¿Tiene sentido este precio?» (nombre provisional)

## Overview
Herramienta web independiente, primero móvil, para quien está mirando un anuncio de alquiler en Madrid. El usuario introduce ubicación, precio y m², y ve el precio pedido frente a la **referencia** de alquileres registrados de su zona (SERPAVI 2024, ajustada por el IPC del alquiler del INE). El resultado tiene tres niveles. Incluye la zona, una tarjeta para compartir, estados sin dato y de error, aportación anónima de rentas y la página de metodología.

Tono: periodismo de datos con carácter. Habla de tú y es sobrio en las cifras. **Nunca** usa «ilegal», «abusivo» ni nada acusatorio; la ironía apunta al mercado, nunca a personas.

## About the Design Files
Los archivos de esta carpeta son **referencias de diseño hechas en HTML**: prototipos que muestran el aspecto y el comportamiento previstos, no código de producción. La tarea es **recrearlos en el entorno del proyecto destino** (React, Vue, etc.) con sus patrones y librerías. Si aún no hay entorno, elige el framework más adecuado; una buena opción es Next.js o Astro con renderizado en servidor para /t/:id y las imágenes OG.

Para verlos, abre `Tiene sentido este precio.dc.html` en un navegador servido por HTTP, con `support.js` al lado. Es un lienzo con todas las pantallas agrupadas por turnos; **el turno 5 está arriba y es el más reciente**. Los archivos `*.dc.html` secundarios son componentes que el lienzo importa.

## Fidelity
**Alta fidelidad.** Colores, tipografía, espaciados, textos y comportamiento son finales. Las excepciones:
- Cifras marcadas **EJEMPLO** (contadores de uso, recuentos de alquileres por zona, datos de «Tu zona»): son inventadas y deben salir de datos reales. Si no hay dato, no se muestran.
- Secciones marcadas **PENDIENTE** («Quiénes somos», «Financiación»): falta el texto.
- El mapa de «Tu zona» (4f) es un esquema. Hay que dibujarlo con las secciones censales reales de CartoCiudad.
- La redacción del paso 5 de la fórmula («techo») debe validarse contra la metodología SERPAVI publicada.

## Índice de pantallas (ids del lienzo)
| Pantalla | Móvil 390 | Escritorio 1280 |
|---|---|---|
| Inicio + formulario | 3d | 5a |
| Resultado nivel a (dentro) | 3e | 5c |
| Resultado nivel b (explicable) | 3f | 5d |
| Resultado nivel c (por encima del techo) | 3a | 5b |
| Caso extremo El Viso | 3g | — |
| Ubicación aproximada (horquilla) | 3h | 5e |
| Prueba de barra a 360 px | 3i | — |
| Tu zona + «Aquí estarías dentro» | 4f | (debajo del resultado, misma columna) |
| Negociar con el dato | 4g | — |
| Contadores: estados según el número | 4h | — |
| Dirección no encontrada | 4i | — |
| Sin conexión | 4k | — |
| Sin dato, uno por motivo | 5j–5p | — |
| Tarjeta Instagram 1080×1350 (5 casos) | 4a–4e | — |
| Página de tarjeta compartida /t/:id | 5f | 5g |
| Vista previa del enlace 1200×630 | 5h, 5i | — |
| ¿Cuánto pagas tú? | 5q, 5r, 5s | — |
| Cómo calculamos | 5t | 5u |

La pantalla 3b (resultado sobre fondo blanco) es una alternativa descartada. La 4j queda sustituida por 5j–5p, y la 4l por 5f. El turno 2 (2a) es la ficha del sistema de diseño.

## Design Tokens

### Color
| Token | Hex | Uso |
|---|---|---|
| paja (marca) | `#EBC85A` | Botón principal (texto tinta, 10,7:1), subrayado de marca, fondo de tarjeta compartible. **Nunca como color de texto.** |
| papel | `#F6F4EE` | Fondo de página |
| superficie | `#EDE9E0` | Tarjetas, filas de acción, pie |
| blanco | `#FFFFFF` | Tarjeta del formulario |
| tinta | `#1C1B19` | Texto (15,8:1), banda de referencia, controles seleccionados |
| grafito | `#5A5750` | Texto secundario (6,5:1) |
| pista | `#E4DFD5` | Fondo de la barra, botón desactivado |
| piedra | `#857F74` | Tramo del techo en la barra, marcas de las etiquetas (solo gráfico) |
| salvia | `#2E6B52` / tinte `#DCE9E1` | Nivel a: dentro de la referencia |
| acero | `#2F5F8A` / tinte `#DDE6EF` | Nivel b: explicable si es excelente |
| ciruela | `#6A3A8C` / tinte `#E9DFF1` | Nivel c: por encima del techo |
| pista en tarjeta | `#D8B44A` | Fondo de la barra sobre paja |

El nivel nunca se comunica solo con color: va siempre con icono y texto. Iconos: a = check; b = onda; c = chevron hacia arriba, en un círculo relleno de 18 px. Los trazados SVG están en `Resultado.dc.html` (`NIV`).

### Tipografía
Una superfamilia: **Sofia Sans** (Google Fonts), en tres anchos. Todas las cifras usan `font-variant-numeric: tabular-nums`. No se usa monoespaciada.
| Rol | Familia | Peso / tamaño / interlineado |
|---|---|---|
| Cifra principal | Sofia Sans Extra Condensed | 900 · 144/0,82 (móvil); 84 en horquilla |
| Titular de nivel (2-3 palabras, MAYÚSCULAS) | Extra Condensed | 800 · 60/0,88 |
| Titular de página (escritorio) | Extra Condensed | 800 · 96–104/0,86 |
| Logotipo | Extra Condensed | 800 · 18 (móvil) / 24 (escritorio), mayúsculas, +0,01em |
| Frase de complicidad | Sofia Sans | 600 · 21/1,3 |
| Dato | Sofia Sans Semi Condensed | 700 · 22–30 |
| Texto | Sofia Sans | 400 · 16/1,5 |
| Etiquetas de campo | Sofia Sans | 600 · 14 |
| Etiquetas de la barra | Semi Condensed | 500/700 · 12–13 |
| Nota, fuente y pie | Sofia Sans | 400 · 12,5–13/1,45, grafito |

Solo se usan mayúsculas condensadas en titulares de dos o tres palabras, en la cifra y en el logotipo. Las frases van en minúscula normal.

### Formato
Formato español con espacio duro (U+00A0): `2.200 €`, `18,7 €/m²`, `+30 %`. Los números de cuatro cifras llevan punto de millar; **ojo, `Intl.NumberFormat('es-ES')` no agrupa los de 4 cifras**, así que hay que forzarlo (ver `fmt` en `Resultado.dc.html`). En la horquilla: «entre +40 % y +47 %», «de +395 a +443 €».

### Espaciado, forma y elevación
- Margen lateral en móvil: 20 px (tarjeta de formulario: 12 px de margen y 16 de relleno). Separación entre bloques: 16–28 px. Se separa con espacio, no con filetes.
- Radio: **8 px** en botones, campos, tarjetas y etiquetas; 4 px en la casilla; 2 px en los bloques de meses.
- Sin sombras en la interfaz; las del lienzo son solo de presentación. Sin degradados.
- Zonas táctiles de **44 px como mínimo**. Botón principal: 56 px (52 en escritorio). Secundarios: 48 px.
- Foco: `outline: 2px solid #1C1B19; outline-offset: 3px`.

## Componentes clave

### Barra de resultado (componente central)
Fuente: `Resultado.dc.html`, en `renderVals`.
- Escala: **empieza en 0 €** y el máximo es `1,15 × max(precio, techo)`. Ancho: 350 px en móvil y 560 en escritorio.
- **Capas:**
  - pista (28 px de alto);
  - banda de **referencia** (tinta, de la parte baja a la parte alta);
  - en la horquilla, tramo de incertidumbre de la parte alta (grafito);
  - tramo del **techo para un piso excelente** (piedra, de la parte alta al techo);
  - en el nivel c, línea guía de 2 px en el color del nivel, de la parte alta al punto;
  - **punto** de 28 px en el color del nivel, con borde de 3 px del color de fondo.
- **Etiquetas directas, sin leyenda:**
  - «tu anuncio 2.200 €» encima del punto.
  - «referencia» dentro de la banda si mide 66 px o más. Si no, va encima, con una línea guía de 1 px.
  - «parte alta X €» en la fila 1, alineada a la derecha de su marca.
  - «techo para un piso excelente X €» en la fila 2.
  - En el nivel a, «baja · media · alta» bajo los tercios de la banda, con el tercio activo en negrita, y las dos etiquetas anteriores bajan una fila.
  - En el nivel c, la diferencia en € en la fila 1, siempre a la derecha de la marca del techo.
- **Colocación de las etiquetas:** se miden con el ancho real del texto (refs, no estimación). Alineadas a la derecha de su marca; si no caben, a la izquierda; si tampoco, centradas y ajustadas al borde.
- **Horquilla:** la parte alta y el techo se dibujan como **tramos**, con un corchete de 1 px bajo cada uno.
- **Movimiento (el único de la app):** al aparecer el resultado, el punto se desliza de 0 € al precio con `left 700ms cubic-bezier(.2,.7,.2,1)` y unos 400 ms de retardo. Con `prefers-reduced-motion: reduce` aparece ya colocado y sin transición.

### Equivalencia en meses (nivel c)
12 bloques en tinta y N bloques en el color del nivel; el último se rellena parcialmente con un ancho proporcional, sin degradado. El rótulo usa la cifra **truncada** («+5,9 meses» para 5,98) para no contradecir «casi 6 meses».

### Terminología fija
- **referencia**: la banda.
- **parte alta de la referencia**: su límite superior. El % y los € se calculan sobre ella: `(precio − parteAlta) / parteAlta`.
- **techo para un piso excelente**: el máximo explicable.

Etiquetas de nivel:
- «Dentro de la referencia»
- «Por encima, explicable si es excelente»
- «Por encima del techo para un piso excelente»

## Screens / Views (detalle)

### Inicio + formulario (3d · 5a)
- **Cabecera:** logotipo y, en escritorio, la navegación «Cómo calculamos» y «¿Cuánto pagas tú?».
- **Titular:** «El anuncio pide. Los datos responden.»; la segunda frase lleva subrayado paja (`text-decoration-thickness: .16em`).
- **Contador de uso**, según el número:
  - 0: «Sé de los primeros en comprobar un piso en Madrid».
  - 1–99: «N pisos comprobados. Esto acaba de empezar y el tuyo cuenta.»
  - 100 o más: «N pisos comprobados en Madrid. No eres el único que se lo pregunta.»
- **Formulario** (tarjeta blanca):
  - Control segmentado de 3 opciones (Dirección / Solo calle / En el mapa).
  - Campo de dirección con la etiqueta siempre visible encima.
  - Precio y m² en dos columnas.
  - Tres preguntas Sí/No en segmentados de 56×44: obra nueva desde 2022, larga duración, piso o casa.
  - Botón paja «Comprobar el precio» y enlace «¿Es una habitación?».
- **Escritorio:** cuadrícula de 440 px más el resto.
  - **Columna izquierda:** fija (`position: sticky`). Contiene el formulario y «Comprobados en esta sesión», con filas de 56 px y la activa con contorno de 2 px en tinta. El historial se guarda en `sessionStorage` y «se borra al cerrar la pestaña».
  - **Columna derecha:** resultado de 600 px centrado. Antes de comprobar, muestra una barra fantasma con contornos discontinuos.
  - **Tras comprobar:** el botón pasa a «Comprobar otro piso».

### Resultado (3a, 3e, 3f, 3g, 3h · 5b–5e)
En este orden:
1. Lugar y contexto.
2. Etiqueta de nivel.
3. **Un único protagonista:** la cifra en el nivel c y el titular en los niveles a y b.
4. Frase de complicidad.
5. Barra.
6. En el nivel c, la tarjeta «Al mes / Al año» y la equivalencia en meses.
7. Contador del barrio, que **solo aparece con 10 o más**.
8. Fuente: «Basado en N alquileres registrados en la zona, referencia 2024 ajustada por el IPC del alquiler.»
9. «Qué puedes hacer», con tres filas: Negociar con el dato, Comparar con otro piso, Consultar el valor oficial.
10. En el nivel c, la miniatura de la tarjeta y el botón paja «Compartir el resultado». En los niveles a y b, el botón paja «Comprobar otro piso».
11. «¿Te ha servido?» con los botones Sí y No (48 px).
12. Pie.

En la horquilla (Ventas) la cifra pasa a «entre +40 % y +47 %» y se añade un aviso con el botón «Añadir el número del portal».

Frases por nivel (en `Resultado.dc.html`, `CASOS`):
- **a:** «No es barato, pero es lo que se paga aquí. Puedes respirar.»
- **b:** «Si tiene ascensor, garaje, reforma reciente, piscina o vistas, puede cuadrar. Si no, pregunta qué lo justifica.» (La terraza **no** forma parte del modelo.)
- **c:** «Ni con las mejores características la referencia llega a esta cifra.»

### Tu zona (4f)
- Mapa con tu sección resaltada (contorno de 4 px en tinta) y las vecinas coloreadas por la parte alta de su referencia, con una rampa de 5 tonos de paja (`#F3EAD0` a `#6F5622`).
- Las zonas «aquí estarías dentro» van con contorno discontinuo salvia y numeradas, con su lista debajo.
- Aclaración obligatoria: «Son zonas donde ese precio sería normal según los alquileres registrados, no pisos disponibles».
- Línea de evolución: «+X % ha subido la renta registrada en esta zona desde 2015».

### Negociar con el dato (4g)
- Texto editable para copiar, con opción Tú/Usted.
- Incluye la parte alta, el techo y la fuente.
- Botón «Copiar el texto», que pasa a «Texto copiado» con un check.
- La web **no envía nada**.

### Sin dato (5j–5p, `SinDato.dc.html`)
Siete motivos con la misma plantilla: menos de 30 m², más de 150 m², obra nueva, casa unifamiliar, alquiler temporal o de media estancia, pocos datos en la zona y habitación.
- Etiqueta neutra con contorno: «Sin referencia para este caso».
- Titular y razón.
- Botones «Consultar el sistema oficial · serpavi.mivau.gob.es» y paja «Comprobar otro piso».
- Los textos están en `M`.

### Errores
- **Dirección no encontrada (4i):** sugiere «¿Querías decir…?» y ofrece salida a «Solo la calle» o «En el mapa». Nunca es un callejón sin salida.
- **Sin conexión (4k):** conserva lo escrito y ofrece «Reintentar» y «Editar los datos».

### Tarjeta compartible 1080×1350 (4a–4e, `Tarjeta.dc.html`)
- Fondo paja, la cifra (o el titular en los niveles a y b) a 340 px y una sola frase.
- Barra simplificada **sin precio exacto ni dirección**; el techo se dibuja como un contorno de 4 px en tinta.
- Botón «Comprueba otro piso».
- **Ningún texto por debajo de 30 px.**
- El pie es literal: «Estimación independiente. Origen de los datos: Ministerio de Vivienda y Agenda Urbana. Elaboración propia con datos del INE.»

### Página /t/:id (5f, 5g) y vista previa OG 1200×630 (5h, `PreviaEnlace.dc.html`)
- La página muestra la tarjeta, la frase explicativa y el botón paja «Comprueba tu piso».
- En escritorio, la tarjeta va a 480 px junto al titular «¿Y el tuyo?».
- **Vista previa OG:** panel paja de 500 px con el logotipo y la cifra, y panel papel con la etiqueta de nivel, la frase del barrio y la barra. Se genera en el servidor (p. ej. `@vercel/og`).
- El título y la descripción del enlace no incluyen precio ni dirección.

### ¿Cuánto pagas tú? (5q–5s)
- **Campos:**
  - calle sin número (no se guarda);
  - renta al mes;
  - m² construidos;
  - año de inicio del contrato;
  - qué incluye la renta: garaje, trastero, gastos de comunidad o amueblado (multiselección).
- **Casilla de consentimiento, desmarcada por defecto.** Mientras no se marque, el botón está desactivado («Marca la casilla para enviar», `aria-disabled`) y no se envía nada.
- **Qué se guarda:** sección censal, m², renta, año del contrato, qué incluye y fecha.
- **Qué no se guarda:** calle, número, nombre, correo, IP ni nada identificativo.
- Hay pantalla de confirmación.

### Cómo calculamos (5t, 5u)
- Secciones: fórmula en seis pasos, con un ejemplo de Fuente del Berro; fuentes con la atribución literal; limitaciones; quiénes somos (PENDIENTE); financiación (PENDIENTE).
- En escritorio, un índice fijo de 240 px y contenido de 680 px.

## Interactions & Behavior
- **Precio y m²:**
  - `inputmode="numeric"`.
  - Aceptar «2.200», «2200» y «2200€»: normalizar quitando todo lo que no sea dígito o coma.
  - Validación al salir del campo, con mensajes que dicen cómo corregir: «Escribe los m² del anuncio, entre 10 y 500». Nunca «dato inválido».
  - En error, el borde pasa a 2 px en ciruela y el mensaje aparece debajo, también en ciruela.
- **Estado de carga:** solo durante la geocodificación. El botón muestra un spinner y «Buscando la dirección…». El cálculo es instantáneo.
- **Reglas de nivel:**
  - precio ≤ parte alta → a; dentro de a, la posición baja/media/alta va por tercios de la banda;
  - parte alta < precio ≤ techo → b;
  - precio > techo → c.
- **Reglas de sin dato:** m² < 30 o > 150; obra nueva desde 2022; casa; no es de larga duración; habitación; pocos registros en la zona.
- **Contador del barrio:** se muestra a partir de 10; por debajo, el bloque desaparece sin dejar hueco.
- **Escritorio:** «Comprobar otro piso» sustituye el resultado y añade el anterior arriba del historial; un clic en una fila lo restaura.

## State Management
- **form:** `{ modoUbicacion: 'direccion'|'calle'|'mapa', direccion, precio, m2, obraNueva, largaDuracion, tipo: 'piso'|'casa' }`
- **resultado:** `{ estado: 'idle'|'geocodificando'|'ok'|'sinDato'|'noEncontrada'|'sinConexion', nivel: 'a'|'b'|'c', posicion?: 'baja'|'media'|'alta', lo, hi, hiMax?, techo, techoMin?, aprox, n, vecinos?, motivoSinDato? }`
- **historial** (sessionStorage, solo en escritorio).
- **Datos que hay que obtener:**
  - geocodificación (CartoCiudad) → sección o secciones censales;
  - referencia SERPAVI por sección y tramo de superficie;
  - IPC del alquiler (INE);
  - contadores agregados.
- **Persistencia en servidor:** la tarjeta compartida (`/t/:id`, sin precio ni dirección) y las aportaciones con consentimiento.

## Assets
- No hay imágenes. Iconos: SVG en línea de 20×20 (check, onda, chevron, información, guion).
- **Fuente:** Sofia Sans, Sofia Sans Semi Condensed y Sofia Sans Extra Condensed (Google Fonts, OFL).
- **Logotipo provisional:** texto en Extra Condensed con el atributo `data-logo="true"` en todos los sitios. Debe implementarse como un único componente `<Logo>` fácil de sustituir.

## Files
- `Tiene sentido este precio.dc.html`: lienzo con todas las pantallas (turnos 5 → 2).
- `Resultado.dc.html`: pantalla de resultado y barra. Props: `caso`, `fondo`, `desktop`, `soloBarra`, `ancho`. Contiene los datos de ejemplo reales (`CASOS`) y la lógica de colocación de etiquetas.
- `Escritorio.dc.html`: plantilla de escritorio a 1280. Prop `caso` (vacío para el inicio).
- `Tarjeta.dc.html`: tarjeta de 1080×1350. Prop `caso`.
- `PreviaEnlace.dc.html`: imagen OG de 1200×630.
- `SinDato.dc.html`: pantallas sin dato. Prop `motivo`.
- `support.js`: entorno de ejecución para ver los `.dc.html`; no forma parte del producto.

## Datos de ejemplo reales
| Caso | Precio | m² | Referencia | Techo | Resultado |
|---|---|---|---|---|---|
| Fuente del Berro (Salamanca) | 2.200 € | 90 | 1.119–1.691 € | 1.820 € | c, +30 %, +509 €/mes, +6.108 €/año, casi 3 meses |
| Fuente del Berro, variante b | 1.780 € | 90 | 1.119–1.691 € | 1.820 € | b, +89 € sobre la parte alta |
| Virgen del Cortijo (Hortaleza) | 1.400 € | 75 | 1.167–1.698 € | 1.804 € | a, parte media |
| El Viso | 4.000 € | 89 | 1.297–2.006 € | 2.149 € | c, +99 %, +1.994 €/mes, +23.928 €/año, casi 6 meses |
| Ventas (aproximada) | 1.390 € | 58 | desde 719–723 €, parte alta 947–995 € | 989–1.046 € | c, entre +40 % y +47 %, de +395 a +443 €/mes |
