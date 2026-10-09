/**
 * Barra horizontal del resultado: referencia, parte alta, techo y precio sobre una misma escala.
 *
 * Escala del diseño: empieza en 0 € y acaba en 1,15 × max(precio, techo). Con horquilla,
 * cada límite es un tramo (mínimo y máximo entre las secciones posibles) y la banda de la
 * referencia es lo que todas las secciones comparten: de la mayor R_inf a la menor R_sup.
 * Todo en €/mes y en fracciones de la escala [0, 1]; el componente solo pinta.
 */
import type { Analisis, Referencia } from '../motor';

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

/**
 * La referencia de las zonas candidatas como UNA sola: la media simple de R_inf, R_sup y R_max (el motor no pondera por
 * cercanía). Con una sola zona es esa misma referencia. Las cifras de pantalla salen de aquí para que cuadren entre sí
 * (%, €, meses); el nivel sigue saliendo del motor, con la zona más prudente.
 */
export function referenciaMedia(referencias: Referencia[]): Referencia {
	const media = (f: (r: Referencia) => number) => referencias.reduce((t, r) => t + f(r), 0) / referencias.length;
	return { inf: media((r) => r.inf), sup: media((r) => r.sup), max: media((r) => r.max) };
}

/**
 * ¿Se muestra la media de las zonas posibles como una sola cifra? Solo si TODAS las zonas caen en el mismo nivel
 * (dentro, algo por encima o se sale de lo habitual). Si caen en niveles distintos, la cifra depende de la zona y
 * se muestra el rango, como antes, con el nivel de la zona más prudente. Con una sola zona no hay nada que promediar.
 */
export function mostrarMedia(an: Extract<Analisis, { tipo: 'resultado' }>): boolean {
	return an.horquilla && new Set(an.secciones.map((s) => s.nivel.nivel)).size === 1;
}
