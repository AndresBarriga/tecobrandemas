/**
 * Corrección por características de la metodología SERPAVI (§5.4).
 *
 *   x        = (P − 18,115) / 100,885         P = puntuación del cuestionario
 *   inf_corr = inf + (P75 − P25) × 0,280 × (x − 0,260)
 *   sup_corr = sup + (P75 − P25) × 0,696 × (x − 0,5/0,696)
 *
 * Los términos de corrección están en €/m²·mes; aquí se pasan a €/mes (× S).
 * El producto no pide el cuestionario: solo usa x = 1 para R_max. La puntuación
 * general sirve para validar contra la app oficial (P = 33,865, PUNTUACION_FIXTURE; solo para tests).
 */
import { rangoInicial } from './rango';
import type { Rango, Referencia, SeccionConDato } from './tipos';

/** Puntuación con la que se validaron los 30 casos del gate contra la app oficial (tests/fixtures/tests_motor_serpavi.csv) */
export const PUNTUACION_FIXTURE = 33.865;
/**
 * Puntuación mínima alcanzable en la app oficial: el suelo de la banda del RDL. La tabla de §5.4 da 18,115 (x = 0), pero
 * la app oficial cuenta el ascensor como «Sí» en planta baja, así que el mínimo alcanzable es 18,365 (altura «Primero o
 * segundo», sin ascensor y el resto en su valor mínimo). El máximo es R_max (P = 119, alcanzable)
 */
export const PUNTUACION_MINIMA_BANDA = 18.365;

export function xDesdePuntuacion(puntuacion: number): number {
	return (puntuacion - 18.115) / 100.885;
}

export function corregir(rango: Rango, superficie: number, s: SeccionConDato, x: number): Rango {
	const escala = (s.p75 - s.p25) * superficie;
	return {
		inf: rango.inf + escala * 0.28 * (x - 0.26),
		sup: rango.sup + escala * 0.696 * (x - 0.5 / 0.696)
	};
}

/** R_inf, R_sup (rango inicial) y R_max (límite superior con x = 1) */
export function referencia(superficie: number, s: SeccionConDato): Referencia {
	const inicial = rangoInicial(superficie, s);
	const maximo = corregir(inicial, superficie, s, 1);
	return { ...inicial, max: maximo.sup };
}
