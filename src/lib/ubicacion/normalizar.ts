/**
 * Normalización de nombres de vía. Debe dar lo mismo que normalizar() de
 * scripts/03_callejero.py, que generó la columna viales.nombre_norm (lo comprueba un test).
 */

const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y']);

/** Minúsculas, sin tildes (ñ → n), sin signos y sin partículas */
export function normalizar(texto: string): string {
	return quitarTildes(texto.toLowerCase())
		.replace(/[^a-z0-9 ]/g, ' ')
		.split(' ')
		.filter((p) => p && !PARTICULAS.has(p))
		.join(' ');
}

export function quitarTildes(texto: string): string {
	return texto.normalize('NFD').replace(/\p{Mn}/gu, '');
}

/**
 * Formas en que se escribe el tipo de vía → tipo de CartoCiudad. Solo los tipos con
 * peso en Madrid; el resto se trata como parte del nombre.
 */
export const TIPOS_VIA: Record<string, string> = {
	calle: 'CALLE', c: 'CALLE', cl: 'CALLE', cll: 'CALLE', cle: 'CALLE',
	avenida: 'AVENIDA', av: 'AVENIDA', avd: 'AVENIDA', avda: 'AVENIDA', avenue: 'AVENIDA',
	paseo: 'PASEO', p: 'PASEO', po: 'PASEO', pso: 'PASEO', pseo: 'PASEO',
	plaza: 'PLAZA', pl: 'PLAZA', pla: 'PLAZA', plz: 'PLAZA', pza: 'PLAZA', plza: 'PLAZA',
	camino: 'CAMINO', cm: 'CAMINO', cno: 'CAMINO', cmno: 'CAMINO',
	carretera: 'CARRETERA', ctra: 'CARRETERA', crta: 'CARRETERA',
	ronda: 'RONDA', rda: 'RONDA',
	travesia: 'TRAVESIA', trv: 'TRAVESIA', trva: 'TRAVESIA', tr: 'TRAVESIA',
	pasaje: 'PASAJE', pje: 'PASAJE', psje: 'PASAJE',
	glorieta: 'GLORIETA', gta: 'GLORIETA', glta: 'GLORIETA',
	bulevar: 'BULEVAR', blvr: 'BULEVAR', bulevard: 'BULEVAR',
	costanilla: 'COSTANILLA', cuesta: 'CUESTA', callejon: 'CALLEJON', canada: 'CAÑADA',
	colonia: 'COLONIA'
};
