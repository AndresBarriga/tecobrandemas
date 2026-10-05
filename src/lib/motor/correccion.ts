/**
 * Corrección por características de la metodología SERPAVI (§5.4).
 *
 *   x        = (P − 18,115) / 100,885         P = puntuación del cuestionario
 *   inf_corr = inf + (P75 − P25) × 0,280 × (x − 0,260)
 *   sup_corr = sup + (P75 − P25) × 0,696 × (x − 0,5/0,696)
 *
 * Los términos de corrección están en €/m²·mes; aquí se pasan a €/mes (× S × f).
 * El producto no pide el cuestionario: solo usa x = 1 para R_max. La puntuación
 * general sirve para validar contra la app oficial (P = 33,865, cuestionario mínimo).
 */
import { rangoInicial } from './rango';
import type { Rango, Referencia, SeccionConDato } from './tipos';

/** Puntuación del cuestionario mínimo con la que se validaron los 30 casos del gate */
export const PUNTUACION_MINIMA = 33.865;

export function xDesdePuntuacion(puntuacion: number): number {
	return (puntuacion - 18.115) / 100.885;
}

export function corregir(rango: Rango, superficie: number, s: SeccionConDato, x: number, factorIpc = 1): Rango {
	const escala = (s.p75 - s.p25) * superficie * factorIpc;
	return {
		inf: rango.inf + escala * 0.28 * (x - 0.26),
		sup: rango.sup + escala * 0.696 * (x - 0.5 / 0.696)
	};
}

/** R_inf, R_sup (rango inicial con IPC) y R_max (límite superior con x = 1) */
export function referencia(superficie: number, s: SeccionConDato, factorIpc = 1): Referencia {
	const inicial = rangoInicial(superficie, s, factorIpc);
	const maximo = corregir(inicial, superficie, s, 1, factorIpc);
	return { ...inicial, max: maximo.sup };
}
