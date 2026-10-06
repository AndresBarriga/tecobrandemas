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

## Estado (06/10/2026)
- Producto: «A su precio». Hitos 1-7 y Fase 1 («Ya vivo aquí», habitaciones, ubicación del dispositivo) hechos, incluidas «Tu zona», «Cómo calculamos», compartir la tarjeta por
  canales (la tarjeta solo se guarda al elegir un canal), el ratio por tramos («+X %» o «X,X veces la parte
  alta») y el aviso «¿Seguro?» con más de 3 veces la parte alta. El cálculo está en `src/lib/resultado`; la
  geometría del mapa, en `src/lib/cliente/zona*.ts`. En «Tu zona» se dice «zona», nunca «sección».
- Producción en Cloudflare (Worker + D1 + R2) con CI en GitHub, en el **plan gratuito**. Sin dominio propio y con
  `noindex` en todo el sitio hasta el lanzamiento: `config/indexacion.json`.
- Se trabaja en ramas con PR; el CI despliega al fusionar en `main` y lanza después la prueba de humo (de solo
  lectura, con la tarjeta fija `pruebahumo`). Qué falta: `docs/abierto.md`; ideas sin empezar: `docs/ideas.md`.
- Arquitectura: los componentes y las rutas no importan `src/lib/motor` ni `src/lib/ubicacion`
  (un test lo comprueba). Alias de importación: `#lib/...` (SvelteKit 3 no tiene `$lib`).
- Analítica de uso: PostHog (UE) sin cookies, vía el proxy `/r7k`, con lista blanca en `before_send` (`src/lib/cliente/analitica*.ts`); solo se activa en el despliegue a producción. Los eventos ya no se guardan en D1. Detalle y verificación: `docs/operacion.md`.
- Lo que se guarda: barrio y mes, nunca la sección, la dirección, la IP ni la fecha exacta del análisis. Las
  tarjetas compartidas guardan su imagen y los textos que se ven; no caducan automáticamente.

## Decisiones del usuario vigentes (06/10/2026)
- Cloudflare sigue en el plan gratuito. No se activan URLs de vista previa por rama: se verifica en local y con
  la prueba de humo tras el despliegue.
- Para el trabajo nuevo, ni capturas ni tests unitarios nuevos: `npm run check`, el flujo a mano en local y la
  prueba de humo. No se toca el CI ni se borran tests existentes (si un cambio rompe uno, se arregla).
  Excepciones: el test de autocompletado (cada vía se encuentra por su última palabra, con y sin tilde) y los
  cambios de `humo.yml` y del job de humo.
- Datos: tablas separadas (análisis de anuncios, aportaciones de inquilinos y habitaciones); nunca una tabla única con
  `tipo_dato` ni `datos_v2`. Aportaciones: `firma_mes` (AAAA-MM) y `renta_firma` opcional; mes y no fecha
  exacta; nunca la sección. `casero_tipo` solo cuando el formulario lo pida.
- Producción: borrados y migraciones solo tras enseñar el recuento o el export y con el «ok» del usuario. La
  prueba de humo no escribe nada; la ruta de escritura se prueba a mano antes del lanzamiento.
- Los números de los diseños son ejemplos; los datos reales salen del motor.

## Forma de trabajar
- Proponer un plan antes de escribir código.
- Primero el motor (funciones puras + tests), después ubicación, después interfaz.
- data/raw/ no se sube a git; los scripts de scripts/ generan data/processed/.
