# A su precio (antes «¿Tiene sentido este precio?») — instrucciones para Claude Code

Herramienta web: el usuario introduce un anuncio de alquiler de Madrid y ve cuánto
supera la referencia de alquileres registrados de su zona (SERPAVI 2024 ajustado por IPC).

## Documentación (leer antes de empezar)
- docs/prd.md: qué se construye (requisitos R1-R13, métricas, plan).
- docs/decisiones.md: por qué se decidió cada cosa, resultados del gate y fuentes.
- docs/plan.md: plan de implementación aprobado (hitos, arquitectura, tests).
- docs/progreso.md: qué está hecho, cifras y desviaciones del plan. Actualizarlo al
  cerrar cada hito o cuando cambie algo relevante.
- docs/estado.md: tabla de R1-R13 y de las pantallas del diseño (hecho / parcial / falta).
- docs/operacion.md: límites del plan gratuito, métricas y pasos antes del lanzamiento.
- README.md: cómo desarrollar, regenerar datos, actualizar el IPC, desplegar y rotar el secreto.

## Reglas que no se rompen nunca
- Los tests de tests/fixtures/tests_motor_serpavi.csv deben pasar siempre
  (casos de validación: error ≤ 1 céntimo frente a la app oficial).
- Nada de scraping de portales: los datos del anuncio los teclea el usuario.
- Nunca usar "ilegal" ni "abusivo" en textos. Tono sobrio, cifras con fuente y fecha.
- No guardar direcciones exactas ni IP. Registro anónimo solo con consentimiento.
- SERPAVI, anuncios analizados y aportaciones de residentes nunca se mezclan.
- Atribuciones obligatorias: "Origen de los datos: Ministerio de Vivienda y Agenda Urbana",
  "Elaboración propia con datos extraídos del sitio web del INE: www.ine.es",
  "CartoCiudad CC-BY 4.0 scne.es". Nunca sugerir respaldo oficial.
- Es una estimación independiente: enlazar siempre a serpavi.mivau.gob.es para el valor legal.

## Estado (05/10/2026)
- Producto: «A su precio». Hitos 1-7 hechos salvo «Tu zona» (Hito 4, paso 2), que espera su diseño:
  mapa de la zona, «Aquí estarías dentro» y la evolución 2015-2024. El cálculo ya existe en
  `src/lib/resultado` (`zona.ts`, `aqui.ts`, `evolucion.ts`); faltan los componentes.
- Producción en Cloudflare (Worker + D1 + R2) con CI en GitHub. Sin dominio propio todavía.
- `noindex` en todo el sitio hasta el lanzamiento: `config/indexacion.json`.
- Se trabaja en ramas con PR; el CI despliega al fusionar en `main`.
- Arquitectura: los componentes y las rutas no importan `src/lib/motor` ni `src/lib/ubicacion`
  (un test lo comprueba). Alias de importación: `#lib/...` (SvelteKit 3 no tiene `$lib`).
- Lo que se guarda: barrio y mes, nunca la sección, la dirección, la IP ni la fecha exacta del análisis.

## Forma de trabajar
- Proponer un plan antes de escribir código.
- Primero el motor (funciones puras + tests), después ubicación, después interfaz.
- data/raw/ no se sube a git; los scripts de scripts/ generan data/processed/.
