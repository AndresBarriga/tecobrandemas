-- Habitaciones aportadas por quien vive en ellas (con su botón «Aportar mi habitación»).
-- Tabla propia y separada de `analisis` y `aportaciones`: nunca se mezcla con pisos ni con la referencia.
-- Sin dirección, sin sección, sin IP ni fecha exacta: barrio y mes. `tamano_piso_tramo` es un tramo
-- (hasta60, 60-90, 90-120, mas120, nose), nunca los m² exactos.
CREATE TABLE IF NOT EXISTS habitaciones (
	mes TEXT NOT NULL,
	barrio TEXT NOT NULL,
	precio INTEGER NOT NULL,
	num_habitaciones INTEGER NOT NULL,
	tamano_piso_tramo TEXT NOT NULL,
	gastos_incluidos INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS habitaciones_barrio ON habitaciones (barrio, gastos_incluidos);
