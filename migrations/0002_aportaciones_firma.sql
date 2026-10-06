-- Aportaciones de inquilinos: mes de la firma del contrato y renta al firmar (ambos opcionales).
-- Solo el mes (AAAA-MM), nunca la fecha exacta; sin sección ni dirección. Las filas anteriores quedan en NULL.
-- Las dos columnas son nulas: el código antiguo sigue funcionando antes y después de aplicarla.
ALTER TABLE aportaciones ADD COLUMN firma_mes TEXT;
ALTER TABLE aportaciones ADD COLUMN renta_firma INTEGER;
