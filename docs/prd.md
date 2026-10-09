# ¿Tiene sentido este precio? — PRD del MVP (Madrid)

Oct 4, 2026 · @Andres

## Resumen

Una web independiente donde introduces un alquiler y ves cuánto más te piden por entrar frente a la referencia de alquileres registrados en tu zona (2024, ajustada por el IPC del alquiler). MVP solo en el municipio de Madrid, lanzado en unas 3 semanas. Barcelona, con capa legal, después.

**Por qué ahora.** El caso de Maricarmen, vecina de Retiro de 87 años desahuciada el 23/09/2026 tras pedirle la propiedad 1.650 € frente a los 500 € que pagaba, ha puesto la vivienda en el centro de la conversación, con acampada en Sol y un real decreto anunciado ([El Español](https://www.elespanol.com/sociedad/20260924/confirmado-desahucio-maricarmen-anos-no-ilegal-ley-arrendamientos-urbanos-td/1003744395045_0.amp.html), [Maldita](https://maldita.es/desinfo/20260930/bulos-acampada-vivienda-sol-maricarmen/)). La atención es alta, pero la ventana dura semanas, no meses.

**Tono.** Aprovechamos la conversación, no a la persona: ni su nombre ni su imagen en el producto ni en los anuncios. El debate está muy polarizado y lleno de bulos, así que el producto da cifras con fuente y fecha, no adjetivos ni opiniones.

## Problema, usuario e hipótesis

**Problema.** Quien busca piso no tiene forma rápida de saber si un precio tiene sentido. Los datos oficiales existen (SERPAVI), pero están en un visor técnico y no responden a "¿y este anuncio?".

**Usuario y momento de uso.** Persona de 25 a 40 años en Madrid que está viendo un anuncio concreto: "Estoy viendo un alquiler y quiero saber rápido si el precio está muy por encima de lo que se paga en esa zona". Secundario: periodistas y sindicatos que necesitan datos citables.

**Hipótesis principal.** Ante un anuncio concreto, la comparación con los alquileres registrados de la zona es lo bastante útil como para introducir sus datos y, en una proporción relevante, compartir el resultado con otra persona que a su vez analiza otro piso. Se descompone en H1-H4 (ver Métricas).

**Mensaje central.** La brecha de entrada, con tres niveles de resultado basados en la propia metodología SERPAVI:

- **Dentro de la referencia** (en la parte baja, media o alta). Sin porcentaje: también es una respuesta útil.
- **Por encima, aunque podría explicarse si el piso tiene características excelentes:** el precio supera la parte alta del rango inicial, pero no el máximo que alcanzaría un piso con el mejor cuestionario posible.
- **Por encima incluso para un piso de máxima calidad:** "+X% por encima de la parte alta de la referencia de alquileres registrados en esta zona" y, en segundo nivel, "+Y €/mes · +Z €/año". El porcentaje sirve para compartir; los euros, para decidir.

No es "abusivo" ni "ilegal": es cuánto cuesta entrar hoy frente a quien ya está. En el gate, con el ajuste por IPC, 29 de 42 anuncios con resultado cayeron en el tercer nivel (33 sin el ajuste).

## Alcance del MVP

Un flujo: introduces un anuncio, ves la brecha, compartes. Todo lo demás es secundario.

**Entra:** municipio de Madrid; comparador con entrada manual; resultado con brecha frente a SERPAVI; tarjeta compartible; registro anónimo de cada análisis; pregunta "¿cuánto pagas tú?"; página de metodología y financiación.

**Fuera del MVP:** Barcelona y capa legal; resto de España; Catastro; corrección por las 11 características; mapa completo; percentiles e índices de confianza; rankings y anuncios absurdos; informe PDF; esfuerzo salarial; compraventa; monetización.

## Requisitos funcionales

P0 bloquea el lanzamiento; P1 puede llegar en la semana siguiente.

| ID  | Requisito                                                                                                                                                                                                                                                                                                                                                                                                                     | Criterio de aceptación                                                                                                            | Prioridad |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------- |
| R1  | Entrada: ubicación (dirección con número, calle sin número o punto en el mapa), precio €/mes, m² construidos, casilla "Obra nueva (2022 o después)" y pregunta "¿Es un alquiler de larga duración?". Solo viviendas completas en edificio de pisos; enlace "¿Es una habitación?" a una pantalla explicativa, con contador de clics                                                                                            | Completable en menos de 30 s en móvil                                                                                             | P0        |
| R2  | Ubicación → coordenadas → sección censal (Censo 2021). Si la ubicación es aproximada, calcular también las secciones cercanas (radio a definir) y dar la brecha como horquilla ("entre +47% y +55%")                                                                                                                                                                                                                          | ≥95% de 100 direcciones de prueba resueltas                                                                                       | P0        |
| R3  | Rango inicial basado en SERPAVI (superficie, Smed, P25, P75 de la sección), ajustado de 2024 al último mes publicado con el IPC del alquiler de vivienda                                                                                                                                                                                                                                                                      | Reproduce los 30 casos de validación de `tests_motor_serpavi.csv` con error ≤1 céntimo (la fórmula de referencia da 0,6 céntimos) | P0        |
| R4  | Resultado en tres niveles (ver Mensaje central). Tercer nivel: % sobre la parte alta como número principal; debajo, €/mes y €/año. Siempre: rango estimado en €/mes, "Basado en N alquileres registrados en la zona · referencia 2024 ajustada por el IPC del alquiler", aviso de ubicación aproximada si aplica y "Estimación independiente basada en la metodología SERPAVI; el valor oficial está en serpavi.mivau.gob.es" | Se entiende sin leer la metodología (test con 5 personas)                                                                         | P0        |
| R5  | Pantallas "sin dato": <30 o >150 m², obra nueva, casa unifamiliar, alquiler temporal o de media estancia, sección con 20 o menos testigos (umbral de la metodología SERPAVI, §5)                                                                                                                                                                                                                                              | Explica el motivo y enlaza a la app oficial                                                                                       | P0        |
| R6  | Tarjeta compartible: imagen 1080×1350 para Instagram + enlace con vista previa, con resultado, barrio, fuente y "Comprueba otro piso"                                                                                                                                                                                                                                                                                         | Se genera en menos de 3 s; sin dirección exacta                                                                                   | P0        |
| R7  | Registro anónimo de cada análisis válido (barrio, sección, precio, m², fecha) con consentimiento                                                                                                                                                                                                                                                                                                                              | Sin dirección ni IP guardadas; pasa los filtros antiabuso                                                                         | P0        |
| R8  | Una página estática: cómo calculamos, fuentes, limitaciones, quiénes somos y financiación                                                                                                                                                                                                                                                                                                                                     | Máximo medio día de trabajo; enlazada desde resultado y tarjeta                                                                   | P0        |
| R9  | Eventos del embudo sin cookies de terceros: llegada, empieza análisis, completa, "¿te ha servido?", comparte, análisis desde tarjeta, segundo análisis, aporta, clic en habitación                                                                                                                                                                                                                                            | Cada tarjeta lleva un identificador para atribuir los análisis que genera                                                         | P0        |
| R13 | Pregunta "¿Te ha servido esta comparación?" (sí / no) bajo el resultado                                                                                                                                                                                                                                                                                                                                                       | Un toque; no bloquea compartir                                                                                                    | P0        |
| R10 | Tras el resultado: "Ya se han comprobado N pisos en este barrio" (solo el recuento)                                                                                                                                                                                                                                                                                                                                             | Visible desde el día 1                                                                                                            | P1        |
| R11 | Después: "¿Cuánto pagas tú?", formulario corto mostrado aparte como "alquileres que pagan residentes"; nunca mezclado con anuncios ni con SERPAVI                                                                                                                                                                                                                                                                             | Menos de 6 campos; se muestra por barrio con n≥10                                                                                 | P1        |
| R12 | Evolución 2011-2024 de la zona en un gráfico pequeño                                                                                                                                                                                                                                                                                                                                                                          | Carga sin bloquear el resultado                                                                                                   | P1        |

## Datos y cálculo

El MVP usa una sola fuente oficial (SERPAVI 2024 por sección censal) y la metodología publicada: el rango inicial y, para separar los niveles, la corrección máxima por características. No se pide el cuestionario de 11 características ni se usa el Catastro: los m² los introduce el usuario.

| Fuente                                                                                                                                          | Uso                                                     | Unidad                                              | Licencia y atribución                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [SERPAVI, Excel por sección censal (datos 2024)](https://cdn.mivau.gob.es/portal-web-mivau/vivienda/serpavi/2026-03-18_Metodologia_SERPAVI.pdf) | Smed, P25, P75, alquileres registrados, serie 2011-2024 | Sección censal                                      | Reutilización comercial y no comercial; "Origen de los datos: Ministerio de Vivienda y Agenda Urbana" + fecha; sin sugerir respaldo                                                                                                                                                                                        |
| INE, IPC, subclase 04.1.1.0 "Alquiler de vivienda principal" (tabla 76128)                                                                      | Actualizar el rango de 2024 al último mes publicado     | Nacional (la tabla no da la subclase por comunidad) | Reutilización comercial citando "Elaboración propia con datos extraídos del sitio web del INE: www.ine.es". Serie ya enlazada por el INE en base 2025. Factor actual: 1,054 (media 2024 = 97,623 → agosto 2026 = 102,895); se actualiza cada mes                                                                           |
| Secciones censales INE (Censo 2021)                                                                                                             | Punto → sección                                         | Sección censal                                      | Reutilización comercial y no comercial citando "Elaboración propia con datos extraídos del sitio web del INE: www.ine.es"; sin sugerir respaldo del INE ([aviso legal](https://ine.es/dyngs/AYU/index.htm?cid=125)). En el gate se usó la versión publicada por el MIVAU (SECC_CE_20210101), con su propio aviso legal     |
| Geocodificador CartoCiudad (IGN)                                                                                                                | Dirección → coordenadas                                 | Dirección                                           | CC BY 4.0; atribución "CartoCiudad CC-BY 4.0 scne.es" ([especificación](https://www.idee.es/resources/documentos/Cartociudad/CartoCiudad_Especificaciones.pdf)). Recomendado: descargar el GeoPackage de Madrid y geocodificar en local, sin enviar direcciones de usuarios a terceros ni depender de límites del servicio |
| Análisis de usuarios                                                                                                                            | Recuento "pisos comprobados"                          | Barrio (131 en Madrid)                              | Propia, con consentimiento                                                                                                                                                                                                                                                                                                 |
| Aportaciones "¿cuánto pagas?"                                                                                                                   | "Alquileres que pagan residentes"                       | Barrio                                              | Propia, con consentimiento                                                                                                                                                                                                                                                                                                 |

Rango inicial (§5.3 de la metodología, en €/m²·mes; S = superficie del usuario):

```latex
k = \log_{100}\left(99 \cdot \frac{S_{med}-30}{120} \cdot \frac{P_{75}-2{,}58}{23{,}776} + 1\right)
```

```latex
V_{inf} = k\left[0{,}0000111459(S_{med}^3-S^3) + 0{,}0041(S^2-S_{med}^2) + 0{,}5168(S_{med}-S) + P_{25}\right] + (1-k)P_{25}
```

```latex
V_{sup} = k\left[0{,}00001724(S_{med}^3-S^3) + 0{,}0066(S^2-S_{med}^2) + 0{,}8336(S_{med}-S) + P_{75}\right] + (1-k)P_{75}
```

**Ajuste por IPC.** El rango de 2024 se multiplica por la variación del IPC del alquiler de vivienda entre la media de 2024 (SERPAVI recoge rentas anuales de 2024) y el último mes publicado: factor 1,054 a agosto de 2026. Se usa esta subclase porque mide lo que pagan los inquilinos con contrato, lo mismo que SERPAVI; así la comparación sigue siendo "lo que ya se paga" frente a "lo que cuesta entrar". No se usan índices de portales: miden precios de oferta y borrarían la brecha por construcción. En pantalla nunca "actualizado a hoy", sino "referencia 2024 ajustada por el IPC del alquiler (+X%)".

**Brecha y niveles.** Con f = factor IPC: R_inf = V_inf × S × f y R_sup = V_sup × S × f. El máximo para un piso de máxima calidad sale de la corrección §5.4 con el cuestionario máximo (x = 1): R_max = R_sup + (P75 − P25) × (0,696 − 0,5) × S × f. Niveles: dentro si precio ≤ R_sup (posición baja, media o alta por tercios entre R_inf y R_sup); segundo nivel si R_sup < precio ≤ R_max; tercer nivel si precio > R_max. En el tercer nivel, la brecha mostrada es la del límite superior: % = precio / R_sup − 1 y € = precio − R_sup. La decisión es semántica ("¿supera la parte alta de lo que se paga?"), no se elige por el titular que produce.

**Validado en el gate (04/10/2026).** La fórmula completa (§5.3 + §5.4) reproduce la app oficial en 30 de 30 casos con un error máximo de 0,6 céntimos. La app trabaja en €/mes. Los 30 casos, los 8 "sin dato" y 3 pares de secciones vecinas están en `tests_motor_serpavi.csv` y son los tests del motor.

## Privacidad, legal y antiabuso

- **Privacidad:** sin cuentas ni email; no se guarda dirección exacta ni IP; nada público con menos de 10 observaciones por barrio; consentimiento explícito para guardar el análisis.
- **Lenguaje:** "por encima de la referencia" o "brecha de entrada", nunca "ilegal" ni "abusivo". La crítica va a cifras, nunca a personas ni empresas con nombre.
- **Sin scraping:** no se leen URLs de portales; todos los datos del anuncio los teclea el usuario.
- **Antiabuso:** €/m² dentro de un rango plausible; deduplicación por precio, m² y barrio en 30 días; límite de análisis por IP y día (sin almacenar la IP).
- **Revisión externa:** una consulta con abogado de protección de datos antes de lanzar, centrada en el registro de análisis.

## Lanzamiento

El crecimiento tiene que venir de la tarjeta compartida; los anuncios solo dan el empujón inicial.

- **Instagram orgánico:** cuenta propia con un formato fijo, "Analizamos N anuncios de \[barrio\]: entrar cuesta un +X%". Cifras con fuente; nada de caras ni nombres.
- **Anuncios de pago (Meta):** desde octubre de 2025 Meta no admite en la UE anuncios sobre temas políticos, electorales o sociales ([Meta](https://about.fb.com/ltam/news/2025/07/fin-de-la-publicidad-sobre-temas-politicos-electorales-y-sociales-en-la-ue-en-respuesta-a-la-nueva-regulacion-europea/)). Un anuncio sobre la crisis de la vivienda puede ser rechazado. Los anuncios deben vender la utilidad ("¿Te piden mucho por ese piso? Compruébalo en 30 s"), sin referencias al debate ni a casos concretos. Presupuesto de prueba pequeño y probar antes de lanzar.
- **Sindicato de Inquilinas de Madrid:** ofrecer la herramienta y los datos agregados antes del lanzamiento, sin pedir respaldo público.
- **Prensa:** un dato propio en la primera semana (la brecha media por distrito con los primeros análisis) para periodistas de vivienda.
- **TikTok y X:** reutilizar las mismas piezas de Instagram.

## Métricas y criterios de éxito

Objetivos fijados antes de lanzar; se evalúan a las 6 semanas y no se mueven después. La señal clave es H4: si un resultado compartido genera nuevos análisis.

| Hipótesis                   | Métrica                                               | Objetivo                                         |
| --------------------------- | ----------------------------------------------------- | ------------------------------------------------ |
| H1 Utilidad                 | Empiezan un análisis / llegadas                       | ≥25%                                             |
| H2 Completado               | Completan / empiezan                                  | ≥70%                                             |
| H3 Compartible              | Comparten / completan                                 | ≥10%                                             |
| H4 Conversión desde tarjeta | Análisis nuevos generados por cada tarjeta compartida | ≥0,3 (medido con el identificador de la tarjeta) |
| Utilidad percibida          | "Sí" en "¿te ha servido?" / respuestas                | ≥60%                                             |
| Uso repetido                | Hacen un segundo análisis                             | Medir                                            |
| Escala                      | Análisis totales                                      | Medir; no es criterio de éxito                   |
| Aportación                  | Aportan "¿cuánto pagas?" / completan                  | Medir; secundaria                                |

Con un 10% que comparte y 0,3 análisis por tarjeta, cada usuario trae unos 0,03 usuarios nuevos: el producto no crecerá solo. El volumen tendrá que venir de prensa, sindicato y anuncios; H4 indica si el formato funciona, no si es viral.

**Seguir** si se cumplen H2 y H3 y H4 está cerca del objetivo. **Parar o replantear** si hay tráfico pero H1 queda por debajo del 15% o casi nadie comparte: más datos, mapas o ciudades no lo arreglarían.

## Plan

Estado a 04/10/2026: gates A y C cerrados, motor validado. Queda el Gate B, que decide los textos del resultado pero no impide construir.

1. **Hecho — Gate con 50 anuncios** (Fotocasa, 14 distritos; detalle en el documento de decisiones):
   - **A. Cobertura:** superado, 42 de 50 (84%).
   - **Validación del motor:** 30 de 30 casos iguales a la app oficial.
   - **C. Estabilidad:** 3 pares de secciones vecinas; la referencia cambia un 5-7% y el nivel del resultado no cambia → horquilla para ubicaciones aproximadas.
2. **Pendiente — Gate B (lectura):** 10 tarjetas con el formato de tres niveles, enseñadas a 5 personas que buscan piso; ≥4 de 5 las entienden.
3. **Semana 1 — Motor:** ubicación → sección → rango y niveles (R1-R3), pasando los tests de `tests_motor_serpavi.csv`. En paralelo, Gate B y 5-10 publicaciones de Instagram con ejemplos concretos del gate (sin presentarlos como estadística de Madrid).
4. **Semana 2 — Producto:** resultado, pantallas sin dato, tarjeta, registro, "¿te ha servido?", página de metodología y eventos (R4-R9, R13). Consulta legal.
5. **Semana 3 — Lanzamiento:** prueba de anuncios, contacto con sindicato y prensa. Salida.
6. **Semanas 4-9 — Medir:** P1 (R10-R12) según datos; evaluación de H1-H4 a las 6 semanas.

## Riesgos y preguntas abiertas

| Riesgo                                                             | Mitigación                                                                                                                                     |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| La ventana de atención se cierra antes del lanzamiento             | Alcance mínimo; P1 después de salir                                                                                                            |
| El resultado sale casi siempre "por encima" y deja de informar     | Comprobado en el gate: con el ajuste por IPC, la brecha va de −20% a +101% y depende del anuncio, no del barrio; resultado en tres niveles     |
| La mayoría de anuncios no da dirección exacta (9 de 50 en el gate) | Aceptar calle sin número o punto en el mapa; horquilla entre secciones cercanas                                                                |
| Los m² del anuncio no coinciden con los del Catastro               | El error hace la brecha más pequeña, no más grande; pedir m² construidos; comprobar las 9 direcciones exactas antes de publicar la metodología |
| Muchos anuncios son temporales o de media estancia                 | Pregunta de larga duración en R1 y pantalla propia en R5                                                                                       |
| Meta rechaza los anuncios por tema social                          | Mensaje de utilidad; peso en orgánico y prensa                                                                                                 |
| El producto se lee como partidista                                 | Cifras con fuente; sin opiniones; página de financiación                                                                                       |
| Datos falsos en el registro                                        | Filtros de plausibilidad, deduplicación y límite diario                                                                                        |
| El real decreto anunciado cambia el marco                          | El MVP de Madrid no da veredictos legales; revisar al aprobarse                                                                                |

- [x] Referencia de la brecha: límite superior, con tres niveles de resultado.
- [x] Unidades y redondeos de la app oficial: €/mes; la fórmula coincide al céntimo.
- [x] Licencias del seccionado del INE y de CartoCiudad: reutilización comercial con atribución.
- [x] Factor IPC del alquiler: 1,054 (media 2024 → agosto de 2026; INE, subclase 04.1.1.0, nacional).
- [ ] Gate B: prueba de lectura con 5 personas.
- [ ] Radio de búsqueda de secciones cercanas para la horquilla.
- [ ] ¿Quién firma el proyecto en "Quiénes somos" y cómo se financia la prueba de anuncios?
- [ ] Nombre y dominio.
- [ ] Consulta legal sobre el registro de análisis.
