# ¿Tiene sentido este precio? — Decisiones e investigación

Oct 4, 2026 · @Andres

## Para qué sirve este documento

Recoge el porqué de cada decisión, la evidencia y lo descartado, para retomar el proyecto en otra conversación o con Claude Code sin depender del chat original. El qué se construye está en el PRD.

| Recurso                                                                               | Qué contiene                                                        | Dónde                                               |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------- |
| [PRD del MVP](https://claude.ai/code/artifact/4006d2b3-b1e4-46aa-8066-31ad1c97c042)   | Requisitos, datos, métricas, plan                                   | Claude Docs                                         |
| [Guía del gate](https://claude.ai/code/artifact/3120e528-097b-42ba-81cd-9178b81e8117) | Cómo se hizo el gate de 50 anuncios                                 | Claude Docs                                         |
| `gate_50_anuncios_madrid_relleno.xlsx`                                                | 50 anuncios, cálculos, validación y método (hoja `Como_se_relleno`) | Carpeta del proyecto                                |
| `tests_motor_serpavi.csv`                                                             | 30 casos validados, 8 "sin dato", 3 pares de secciones              | Carpeta del proyecto, y en el repositorio de código |
| `informes_serpavi/`                                                                   | PDF de las 30 consultas a la app oficial                            | Carpeta del proyecto                                |
| `2026-03_09_bd_SERPAVI_2011-2024 - DEFINITIVO WEB_v2.xlsx`                            | Base SERPAVI por sección (68 MB)                                    | En local                                            |

**Para retomar:** crea un Proyecto en Claude con este documento, el PRD y el fichero de tests, y abre los chats dentro. Para programar, exporta ambos documentos a la carpeta del código.

## Cómo evolucionó la idea

1. **Web viral de "disparates" del alquiler** (compartir lo que pagas, anuncios absurdos, mapa de indignación). Descartada: el humor no da razón para volver, hay riesgo legal (RGPD, honor, propiedad intelectual) y los datos voluntarios están sesgados.
2. **"¿Tiene sentido este precio?"** Herramienta que primero da una respuesta útil frente a la referencia oficial y después pide datos. Objetivo: experimento de impacto, no negocio.
3. **Barcelona primero** (allí hay tope legal y se puede reclamar). Descartado como punto de partida: Andrés es de Madrid y ahí puede validar más rápido sin interpretación jurídica.
4. **Madrid como mapa de transparencia.** Mejorado tras la crítica de un consultor externo: el mapa retiene pero no capta; el núcleo es comparar un anuncio concreto.
5. **La brecha de entrada.** El sesgo de SERPAVI (contratos vigentes de 2024 frente a anuncios de hoy) pasa a ser el mensaje: cuánto cuesta entrar frente a quien ya está.
6. **PRD y gate.** Varias rondas de crítica con el consultor y validación con 50 anuncios reales; el gate confirmó el motor y cambió el formato del resultado a tres niveles.

**Contexto de lanzamiento:** el caso de Maricarmen (Retiro, septiembre de 2026) puso la vivienda en el centro del debate. Se aprovecha la conversación, nunca su nombre ni su imagen; el producto debe tener sentido cuando el caso pase.

## Decisiones tomadas

| Decisión                                                                                                                                          | Por qué                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Producto: "¿Tiene sentido este precio?", arquitectura nacional, lanzamiento en el municipio de Madrid                                             | Valida la hipótesis central sin afirmar incumplimientos legales; Barcelona añade la capa legal después                                                                                                                |
| Núcleo: comparar un anuncio concreto; mapa y evolución como segunda pantalla                                                                      | El veredicto capta usuarios; el mapa solo retiene                                                                                                                                                                     |
| Mensaje: brecha de entrada en % (para compartir) y €/mes y €/año (para decidir)                                                                   | Los euros son más tangibles; el % viaja mejor                                                                                                                                                                         |
| Referencia: límite superior del rango                                                                                                             | Lo más defendible ("supera la parte alta de lo que se paga") y es el mismo concepto que en Barcelona hace de tope legal. Dentro de una sección, las alternativas ordenan los anuncios igual: la elección es semántica |
| Resultado en tres niveles: dentro / por encima pero explicable con características excelentes / por encima incluso para un piso de máxima calidad | Sale de los coeficientes de la metodología (corrección §5.4 con x = 1), no de umbrales propios; responde a la objeción de no pedir características                                                                    |
| Ajuste por el IPC del alquiler (base: media de 2024), no por el IPC general ni por índices de portales                                            | Mide lo que pagan inquilinos con contrato, como SERPAVI; los portales borrarían la brecha por construcción. Texto: "referencia 2024 ajustada por el IPC del alquiler", nunca "actualizada a hoy"                      |
| Entrada manual, sin scraping ni Catastro                                                                                                          | Términos de los portales y derecho sobre bases de datos; el error de m² hace la brecha más pequeña, no más grande                                                                                                     |
| Ubicación aproximada aceptada, con horquilla                                                                                                      | Solo 9 de 50 anuncios dan dirección exacta; cambiar de sección mueve la referencia un 5-7% sin cambiar el nivel                                                                                                       |
| Unidades de datos: SERPAVI por sección; anuncios analizados y aportaciones por barrio (131)                                                       | Con 3.000 análisis, casi ninguna de las \~2.400 secciones llegaría a 30 observaciones                                                                                                                                 |
| Los análisis de usuarios son el dataset propio; "¿cuánto pagas tú?" va aparte y después                                                           | Cada uso genera un precio de oferta legal; las aportaciones son lentas y sesgadas. Los tres conjuntos (SERPAVI, anuncios, residentes) nunca se mezclan                                                                |
| Métricas: embudo H1-H4 + "¿te ha servido?"; volumen solo como escala                                                                              | 3.000 análisis sin compartir no prueban nada; con las cifras previstas cada usuario trae \~0,03 nuevos, así que el volumen vendrá de prensa, sindicato y anuncios                                                     |
| Tono sobrio; nunca "ilegal" ni "abusivo"; sin personas ni empresas con nombre                                                                     | Debate polarizado y lleno de bulos                                                                                                                                                                                    |
| Anuncios de pago centrados en la utilidad                                                                                                         | Meta no admite en la UE anuncios sobre temas sociales desde octubre de 2025                                                                                                                                           |

## Resultados del gate de 50 anuncios

**Método.** 50 anuncios de Fotocasa (orden "relevancia"), 14 distritos, un anuncio por barrio. Excluidos los alquileres temporales y las plataformas de media estancia. Datos SERPAVI 2024 por sección; 30 anuncios pasados por la app oficial. Detalle en la hoja `Como_se_relleno` del Excel.

&#91;embedded content: gate_50_anuncios_madrid_relleno.xlsx · 42 anuncios con resultado, octubre de 2026\]

La brecha depende del anuncio, no del barrio: su correlación con el precio por m² del anuncio es 0,73 y con el nivel de referencia de la sección, −0,04.

| Resultado                  | Dato                                                                                                                                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Validación del motor       | 30 de 30 casos iguales a la app oficial; error máximo 0,6 céntimos; la app trabaja en €/mes                                                                                                          |
| Cómo se validó             | La app exige cuestionario (estado, año, altura, certificado) y siempre aplica la corrección §5.4. Se usó el cuestionario mínimo en las 30 (P = 33,865) y se comprobó con mínimo y máximo en Tremp 24 |
| Gate A (cobertura)         | 42 de 50 (84%). Sin dato: 6 por superficie, 1 obra nueva, 1 casa adosada                                                                                                                             |
| Niveles del resultado      | Con IPC: 9 dentro; 4 por encima pero explicables con características excelentes; 29 por encima incluso para un piso de máxima calidad (sin IPC: 6, 3 y 33)                                           |
| Brecha                     | Con IPC: mediana +19%; 33 por encima del rango, con media +29% (unos 419 €/mes). Sin IPC: mediana +26%; media +34% (457 €/mes)                                                                       |
| Gate C (secciones vecinas) | 3 pares: la referencia cambia 45-68 €/mes (5-7%), la brecha 8-12 puntos, el nivel no cambia                                                                                                          |
| Direcciones                | 9 de 50 exactas; en 3 de 30 la app situó el portal en la sección vecina                                                                                                                              |
| Superficie                 | Sin medir. En Tremp 24, Catastro 77 m² frente a 113 m² del anuncio, con una puerta elegida al azar                                                                                                   |

**Límites.** Un anuncio por barrio y orden por relevancia (puede favorecer anuncios destacados): estos datos validan el producto, pero no se publican como estadística de Madrid. Las cifras usan el factor IPC 1,054; la validación frente a la app se hace sin él, como corresponde.

## Fuentes de datos y licencias

| Fuente                                                                                                                                                             | Uso en el producto                             | Licencia y atribución                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Metodología SERPAVI 18/03/2026](https://cdn.mivau.gob.es/portal-web-mivau/vivienda/serpavi/2026-03-18_Metodologia_SERPAVI.pdf) (Res. 16/04/2026, BOE-A-2026-8691) | Fórmulas §5.3 y §5.4, ámbito (§5)              | Aviso legal del MIVAU: reutilización comercial y no comercial; "Origen de los datos: Ministerio de Vivienda y Agenda Urbana" + fecha; sin sugerir respaldo; no usar los PDF de síntesis ("todos los derechos reservados") |
| Base SERPAVI 2011-2024 por sección                                                                                                                                 | Smed, P25, P75, testigos, serie histórica      | Igual que la anterior                                                                                                                                                                                                     |
| Seccionado del Censo 2021                                                                                                                                          | Punto → sección                                | INE: reutilización comercial citando "Elaboración propia con datos extraídos del sitio web del INE: www.ine.es" ([aviso legal](https://ine.es/dyngs/AYU/index.htm?cid=125))                                               |
| CartoCiudad (IGN)                                                                                                                                                  | Dirección → coordenadas                        | CC BY 4.0, "CartoCiudad CC-BY 4.0 scne.es" ([especificación](https://www.idee.es/resources/documentos/Cartociudad/CartoCiudad_Especificaciones.pdf)); mejor en local con el GeoPackage de Madrid                          |
| INE, IPC del alquiler de vivienda                                                                                                                                  | Ajuste 2024 → hoy                              | INE, mismas condiciones. Subclase 04.1.1.0 "Alquiler de vivienda principal", nacional (tabla 76128), serie ya enlazada en base 2025. Factor 1,054: media 2024 (97,623) → agosto 2026 (102,895)                            |
| App oficial serpavi.mivau.gob.es                                                                                                                                   | Solo para validar y como enlace al valor legal | Sin automatizar consultas; prohibido el _framing_; el valor con efecto legal es el de la app                                                                                                                              |
| Catastro                                                                                                                                                           | No se usa en el MVP                            | Licencia de descarga: no difundir información original sin transformar; uso interno permitido                                                                                                                             |
| Portales (idealista, Fotocasa)                                                                                                                                     | No se usan                                     | Sin scraping (términos y derecho _sui generis_); los datos de oferta solo con licencia, sin precio público                                                                                                                |

## Lo descartado y por qué

| Descartado                                                       | Por qué                                                                                                                                      |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Web de disparates y anuncios absurdos como motor                 | Sin razón para volver; riesgo de honor y propiedad intelectual (fotos). Si se usan, solo con texto propio, sin fotos ni datos identificables |
| Percentiles ("percentil 87") e índices de confianza              | SERPAVI publica P25, mediana y P75, no la distribución: sería precisión falsa                                                                |
| "Mercado actual" a partir de los anuncios analizados             | Muestra vacía al principio, sesgada al alza y circular; se muestra solo el recuento por barrio                                               |
| Mapa como pantalla principal                                     | Se mira una vez; el veredicto es lo que capta                                                                                                |
| Elegir la referencia por correlación o por el tamaño del titular | Dentro de una sección todas ordenan igual; la elección es semántica                                                                          |
| Validar con €/m² de portales como verdad (Gate B original)       | Circular; sustituido por una prueba de lectura con personas                                                                                  |
| Umbral de testigos propio                                        | Se usa el de la metodología (más de 20)                                                                                                      |
| Calculadoras de subida anual (IRAV)                              | Mercado saturado                                                                                                                             |
| Monetización y venta de datos                                    | Es un experimento de impacto; vender datos aportados choca con RGPD y confianza                                                              |
| Catastro en el MVP                                               | Licencia restrictiva para difundir datos sin transformar; el error de m² va a favor del propietario                                          |
| Barcelona primero                                                | Más complejidad jurídica; se añade como fase 2 con la capa legal                                                                             |

## Pendiente y próximos pasos

- [ ] **Gate B:** 10 tarjetas con los tres niveles (anuncios reales del gate, de "dentro" a +112%), enseñadas a 5 personas que buscan piso; pasa si ≥4 de 5 entienden 8 o más. Pospuesto a petición de Andrés.
- [x] **Factor IPC del alquiler:** 1,054 (media 2024 → agosto de 2026; INE, subclase 04.1.1.0, nacional). Se recalcula cada mes en la hoja `IPC_alquiler` del Excel. Se usa la media de 2024 y no diciembre porque SERPAVI recoge las rentas de todo el año.
- [ ] **Radio de secciones cercanas** para la horquilla de ubicaciones aproximadas.
- [ ] **Comprobación con el Catastro** de las 9 direcciones exactas, antes de publicar la página de metodología. No bloquea.
- [ ] **Consulta legal** sobre el registro de análisis.
- [ ] **Decisiones de Andrés:** nombre, dominio, quién firma el proyecto y cómo se financia la prueba de anuncios.
- [ ] **Empezar a construir** el motor con Claude Code a partir del PRD y de `tests_motor_serpavi.csv`.
