/**
 * «Suma las habitaciones del piso»: la suma de lo que cuestan las habitaciones frente a la referencia del
 * piso entero (rango en €/mes con el factor IPC), con los dos extremos del tamaño. Todo en el navegador y
 * sin guardar nada. Es una comparación aparte, no un resultado: sin niveles, sin colores de nivel y sin
 * veredicto (la referencia no cubre habitaciones).
 */
import { motivoSeccion, referencia, type SeccionConDato } from '../motor';
import { type DatosMadrid, datosSeccion } from './datos';
import type { TramoPiso } from './habitacion';

/** Límites de la metodología para el piso entero */
export const METROS_MIN = 30;
export const METROS_MAX = 150;

/** Extremos en m² de cada tramo de tamaño (acotados a 30 y 150) */
export const EXTREMOS_TRAMO: Record<Exclude<TramoPiso, 'nose'>, [number, number]> = {
	hasta60: [METROS_MIN, 60],
	'60-90': [60, 90],
	'90-120': [90, 120],
	mas120: [120, METROS_MAX]
};

export interface EntradaSuma {
	/** €/mes de cada habitación */
	precios: number[];
	tramo: TramoPiso;
	/** Con «no lo sé»: los metros que escribe la persona */
	metros: number | null;
	/** Zonas de la ubicación */
	cusecs: string[];
	datos: DatosMadrid;
}

/** La suma frente a la referencia del piso entero para un tamaño */
export interface LineaSuma {
	metros: number;
	/** Referencia en €/mes: de la parte baja a la parte alta */
	inf: number;
	sup: number;
	/** Diferencia con el límite más cercano: positiva por encima de la parte alta, negativa por debajo de la baja, 0 dentro */
	diferencia: number;
}

export type ResultadoSuma =
	| { ok: true; suma: number; lineas: LineaSuma[] }
	| { ok: false; error: 'precio' | 'metros' | 'sin_dato' };

export function extremos(tramo: TramoPiso, metros: number | null): number[] | null {
	if (tramo === 'nose') return metros !== null && metros >= METROS_MIN && metros <= METROS_MAX ? [metros] : null;
	return [...EXTREMOS_TRAMO[tramo]];
}

export function calcularSuma({ precios, tramo, metros, cusecs, datos }: EntradaSuma): ResultadoSuma {
	if (!precios.length || precios.some((p) => !Number.isFinite(p) || p <= 0)) return { ok: false, error: 'precio' };
	const tamanos = extremos(tramo, metros);
	if (!tamanos) return { ok: false, error: 'metros' };

	const validas: SeccionConDato[] = [];
	for (const c of cusecs) {
		const s = datosSeccion(datos, c);
		if (motivoSeccion(s) === null) validas.push(s as SeccionConDato);
	}
	if (!validas.length) return { ok: false, error: 'sin_dato' };

	const suma = precios.reduce((t, p) => t + p, 0);
	const lineas = tamanos.map((m): LineaSuma => {
		const refs = validas.map((s) => referencia(m, s, datos.ipc.factor));
		// Con varias zonas posibles, el rango que las abarca a todas
		const inf = Math.min(...refs.map((r) => r.inf));
		const sup = Math.max(...refs.map((r) => r.sup));
		return { metros: m, inf, sup, diferencia: suma > sup ? suma - sup : suma < inf ? suma - inf : 0 };
	});
	return { ok: true, suma, lineas };
}
