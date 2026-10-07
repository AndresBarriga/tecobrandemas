-- Los eventos de uso ya no se guardan en D1: van a PostHog (UE) sin cookies. Se borra la tabla `eventos`.
-- Aplicar DESPUÉS de desplegar el código que ya no la usa; si no, los navegadores con la versión anterior
-- fallarían al registrar eventos (en silencio, pero fallarían). La tabla `limites` se queda: la usan el
-- geocodificador y el registro de análisis, aportaciones y habitaciones.
DROP TABLE IF EXISTS eventos;
