/**
 * Cuánto supera el precio a la parte alta de la referencia (R_sup), dicho con una sola regla
 * para la pantalla y la tarjeta compartible:
 *  - por debajo de 2 veces la parte alta, un porcentaje («+50 %»);
 *  - desde 2 veces, «X,X veces la parte alta» (un decimal, coma decimal).
 * El argumento siempre es el ratio precio / R_sup, no el porcentaje.
 */
import { numero, porcentaje } from './formato';

/** Desde este ratio se habla de «veces» y no de porcentaje */
export const UMBRAL_VECES = 2;
/** Por encima de este ratio se pide confirmar el precio antes de mostrar el resultado */
export const UMBRAL_ERROR_TECLEO = 3;

export interface PartesRatio {
	/** Lo que va en grande: «+50 %» o «3,4 veces» */
	cifra: string;
	/** Lo que la completa: «sobre la parte alta» o «la parte alta» */
	complemento: string;
	enVeces: boolean;
}

export function partesRatio(ratio: number): PartesRatio {
	if (ratio < UMBRAL_VECES) return { cifra: porcentaje(ratio - 1, true), complemento: 'sobre la parte alta', enVeces: false };
	return { cifra: `${numero(ratio, 1)} veces`, complemento: 'la parte alta', enVeces: true };
}

/** «+50 %» por debajo de 2; «3,4 veces la parte alta» desde 2 */
export function textoRatio(ratio: number): string {
	const p = partesRatio(ratio);
	return p.enVeces ? `${p.cifra} ${p.complemento}` : p.cifra;
}

/** ¿El precio supera tanto la parte alta que puede ser un error al teclear? (estrictamente más) */
export const parecePrecioErroneo = (ratio: number, umbral = UMBRAL_ERROR_TECLEO): boolean => ratio > umbral;

/** El hero de una tarjeta guardada está en «veces» (la tarjeta solo guarda el texto) */
export const heroEnVeces = (texto: string): boolean => /\bveces\b/.test(texto);
