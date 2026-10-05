# A su precio · Tu zona

Extracto del handoff completo: solo la pantalla «Tu zona». Los archivos son **referencias de diseño en HTML**, no código de producción. Las fichas de tokens, tipografía y formato están en el README del paquete completo.

Para verlo, abre `Tu zona.dc.html` servido por HTTP, con `support.js` y `TuZona.dc.html` en la misma carpeta. Si solo quieres verlo, sin servidor, usa `A su precio - Tu zona.html`, que lo incluye todo.

## Tokens que usa
- Papel `#F6F4EE`, superficie `#EDE9E0`, tinta `#1C1B19`, grafito `#5A5750` y piedra `#857F74`. Paja `#EBC85A` es la marca y no aparece en esta pantalla.
- Escala del mapa: `#F3E4B0`, `#E2BE55`, `#BF962F`, `#8E6B1D`, `#5A4413`. Base del mapa: `#ECEAE5`. Rayado sin dato: `#DAD5CA` y `#857F74`.
- Tipografía: Sofia Sans, Sofia Sans Semi Condensed y Sofia Sans Extra Condensed (Google Fonts), con cifras tabulares.
- Radio de 8 px y zonas táctiles de 44 px como mínimo.

### Tu zona (6a–6f, `TuZona.dc.html`)
Va debajo del resultado, en el mismo ancho de lectura que este: 390 px en móvil (mapa de 350×310) y 600 px centrados en escritorio (mapa de 600×531, lista debajo). **En todos los textos se dice «zona», nunca «sección».** Los datos de ejemplo son **idénticos** en móvil y escritorio.

- **Mapa:**
  - **Base:** gris muy suave `#ECEAE5` con contornos irregulares de zona (`#DDD9D1`). Las líneas de 2 px en `#A39D91` separan barrios.
  - **Nombres de barrio:** un solo color, tinta `#1C1B19`, con halo papel. Sofia Sans 600 a 11,5 px en móvil y 13 px en escritorio, **nunca por debajo de 11 px**. Van en el centro del barrio y **solo se muestran si caben** sin pisar tu zona, su línea, los marcadores ni otro nombre; si no, se prueba a desplazarlos en vertical y, si aun así no caben, se omiten.
  - **Radio:** las zonas a 1,5 km o menos (círculo discontinuo en tinta, con el rótulo «círculo: 1,5 km» bajo el mapa) se colorean por la parte alta de su referencia en €/m² al mes.
  - **Escala:** Paja en 5 tonos, con **cortes fijos para toda la ciudad**: menos de 15 `#F3E4B0`, 15–18 `#E2BE55`, 18–21 `#BF962F`, 21–24 `#8E6B1D`, 24 o más `#5A4413`. Contorno de 1 px en piedra.
  - **Sin dato:** rayado a 45°.
  - **Tu zona:** contorno de 4 px en tinta. La etiqueta «tu zona» va **fuera del mapa, debajo**, unida con una línea de 1,5 px.
  - **Marcadores:** numerados, en botones de 44×44. La zona seleccionada lleva contorno discontinuo y marcador invertido.
- **Leyenda:** «Parte alta de la referencia, en €/m² al mes» y 6 muestras.
  - Una **muesca** (triángulo y línea de 2 px en tinta) marca el tramo donde cae el precio del usuario, con la etiqueta «tu precio: 24,4 €/m²».
  - La etiqueta se alinea a la izquierda, al centro o a la derecha de la muesca según su posición, para no salirse.
  - Nota: «Sin dato: zonas con pocos alquileres registrados. Cortes iguales para toda la ciudad. Las líneas gruesas separan barrios.»
- **Lista**, solo en los niveles b y c (marcada **EJEMPLO**):
  - Título: «Este precio entra en la referencia de…»
  - Subtítulo: «Zonas cercanas donde la referencia llega a este precio»
  - Aviso: «No son pisos disponibles: son zonas donde este precio quedaría dentro de lo que pagan los alquileres registrados.»
  - Hasta 5 zonas, una por barrio, ordenadas por distancia.
  - **Cada fila:**
    - número;
    - «una zona de Goya»;
    - «Referencia para 90 m²: 1.552 a 2.351 € al mes»;
    - «Este precio caería en su parte baja / media / alta»;
    - distancia.
  - Nada que sugiera mudarse.
- **Interacción:** al tocar una fila o un marcador se resalta en el mapa; un segundo toque lo deselecciona.
- **Evolución:** «La renta registrada en esta zona ha subido / ha bajado un X % entre 2015 y 2024, sin descontar la inflación.»
- **Estados:**
  - **Sin zonas que cumplan (6b):** se ocultan el título y el aviso. Queda una caja con «Zonas cercanas donde la referencia llega a este precio: ninguna» y «Este precio (24,4 €/m²) supera la referencia de todas las zonas a 1,5 km o menos.» El mapa de este estado **no tiene ninguna zona de 24 €/m² o más**, en coherencia con el texto.
  - **Cargando (6c):** silueta de las zonas en pista, el rótulo «Cargando el mapa de la zona…» y filas fantasma.
  - **Nivel a (6d, 6f):** sin lista; solo el mapa de contexto, con la muesca en el precio del usuario (18,7 €/m² en el ejemplo de Virgen del Cortijo).
- **Datos:** la geometría es un esquema generado. En producción, las zonas reales (secciones censales del INE) vienen de CartoCiudad y las referencias, de SERPAVI.

