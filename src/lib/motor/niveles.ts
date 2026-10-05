/**
 * Niveles del resultado (docs/prd.md, «Brecha y niveles»):
 *   dentro      precio ≤ R_sup; posición baja, media o alta por tercios entre R_inf y R_sup
 *   explicable  R_sup < precio ≤ R_max
 *   por_encima  precio > R_max
 * La brecha se mide siempre sobre R_sup: % = precio / R_sup − 1, € = precio − R_sup.
 */
import type { Brecha, Nivel, Referencia } from './tipos';

export function clasificar(precio: number, ref: Referencia): Nivel {
	if (precio > ref.max) return { nivel: 'por_encima' };
	if (precio > ref.sup) return { nivel: 'explicable' };

	const tercio = (ref.sup - ref.inf) / 3;
	if (precio <= ref.inf + tercio) return { nivel: 'dentro', posicion: 'baja' };
	if (precio <= ref.inf + 2 * tercio) return { nivel: 'dentro', posicion: 'media' };
	return { nivel: 'dentro', posicion: 'alta' };
}

/** Brecha sobre R_sup; null si el precio no la supera */
export function brecha(precio: number, ref: Referencia): Brecha | null {
	if (precio <= ref.sup) return null;
	const euroMes = precio - ref.sup;
	return { pct: precio / ref.sup - 1, euroMes, euroAño: euroMes * 12 };
}

/** Orden de prudencia: el menor es el resultado menos desfavorable para el propietario */
export function rangoNivel(n: Nivel): number {
	if (n.nivel === 'dentro') return { baja: 0, media: 1, alta: 2 }[n.posicion];
	return n.nivel === 'explicable' ? 3 : 4;
}
