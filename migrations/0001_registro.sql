-- Hito 5: registro anónimo, aportaciones, eventos y antiabuso.
-- Privacidad: ninguna tabla guarda IP, dirección, sección censal ni fecha exacta.
-- `analisis` y `aportaciones` están separadas y nunca se cruzan.

CREATE TABLE IF NOT EXISTS tarjetas (
	id TEXT PRIMARY KEY,
	mes TEXT NOT NULL,
	barrio TEXT,
	nivel TEXT NOT NULL,
	datos TEXT NOT NULL
);

-- Análisis de anuncios (con consentimiento). Solo el mes, nunca el día.
CREATE TABLE IF NOT EXISTS analisis (
	mes TEXT NOT NULL,
	barrio TEXT NOT NULL,
	precio INTEGER NOT NULL,
	m2 REAL NOT NULL,
	nivel TEXT NOT NULL,
	tarjeta_origen TEXT
);
CREATE INDEX IF NOT EXISTS analisis_barrio ON analisis (barrio);

-- Rentas que pagan residentes (con consentimiento). Aparte de `analisis`.
CREATE TABLE IF NOT EXISTS aportaciones (
	mes TEXT NOT NULL,
	barrio TEXT NOT NULL,
	precio INTEGER NOT NULL,
	m2 REAL NOT NULL,
	anio_contrato INTEGER NOT NULL,
	incluye TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS aportaciones_barrio ON aportaciones (barrio);

-- Embudo (R9): sin precio ni ubicación. `visita` es un id aleatorio de sessionStorage.
CREATE TABLE IF NOT EXISTS eventos (
	tipo TEXT NOT NULL,
	ts INTEGER NOT NULL,
	visita TEXT NOT NULL,
	tarjeta TEXT
);

-- Límite diario: HMAC(IP, sal del día). Caduca a las 24 h; la IP no se guarda.
CREATE TABLE IF NOT EXISTS limites (
	clave TEXT PRIMARY KEY,
	n INTEGER NOT NULL,
	caduca INTEGER NOT NULL
);

-- Deduplicación a 30 días: HMAC con secreto de (precio, m², barrio). Sin relación con `analisis`.
CREATE TABLE IF NOT EXISTS dedupe (
	clave TEXT PRIMARY KEY,
	caduca INTEGER NOT NULL
);
