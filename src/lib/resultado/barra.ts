/**
 * Barra horizontal del resultado: referencia, parte alta, techo y precio sobre una misma escala.
 *
 * Escala del diseño: empieza en 0 € y acaba en 1,15 × max(precio, techo). Con horquilla,
 * cada límite es un tramo (mínimo y máximo entre las secciones posibles) y la banda de la
 * referencia es lo que todas las secciones comparten: de la mayor R_inf a la menor R_sup.
 * Todo en €/mes y en fracciones de la escala [0, 1]; el componente solo pinta.
 */
import type { Referencia } from '../motor';

export interface Tramo {
	min: number;
	max: number;
}

export interface Barra {
	/** Valores en €/mes de los extremos de la escala */
	escala: { min: 0; max: number };
	/** €/mes */
	precio: number;
	/** Parte baja de la referencia */
	inf: Tramo;
	/** Parte alta de la referencia (R_sup) */
	sup: Tramo;
	/** Techo para un piso excelente (R_max) */
	techo: Tramo;
	/** Lo mismo en fracciones de la escala */
	posiciones: { inf: Tramo; sup: Tramo; techo: Tramo; precio: number };
	/** Banda «referencia» común a todas las secciones, en fracciones */
	banda: { desde: number; hasta: number };
	/** true cuando algún límite es un tramo y no un valor */
	horquilla: boolean;
}

export const MARGEN_ESCALA = 1.15;

const tramo = (xs: number[]): Tramo => ({ min: Math.min(...xs), max: Math.max(...xs) });

export function construirBarra(precio: number, referencias: Referencia[]): Barra {
	const inf = tramo(referencias.map((r) => r.inf));
	const sup = tramo(referencias.map((r) => r.sup));
	const techo = tramo(referencias.map((r) => r.max));
	const max = MARGEN_ESCALA * Math.max(precio, techo.max);
	const f = (v: number) => v / max;
	const t = (x: Tramo): Tramo => ({ min: f(x.min), max: f(x.max) });
	return {
		escala: { min: 0, max },
		precio,
		inf,
		sup,
		techo,
		posiciones: { inf: t(inf), sup: t(sup), techo: t(techo), precio: f(precio) },
		banda: { desde: f(inf.max), hasta: f(Math.max(inf.max, sup.min)) },
		horquilla: referencias.length > 1
	};
}
