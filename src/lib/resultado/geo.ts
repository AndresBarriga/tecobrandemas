/** Distancia entre dos puntos, con la misma proyección que el pin (error < 0,5 % a escala de barrio) */
import type { Punto } from '../ubicacion/geocodificar';

const LAT0 = 40.42;
const M_POR_GRADO_LAT = 110_574;
const M_POR_GRADO_LON = 111_320 * Math.cos((LAT0 * Math.PI) / 180);

export function distanciaM(a: Punto, b: Punto): number {
	return Math.hypot((a.lon - b.lon) * M_POR_GRADO_LON, (a.lat - b.lat) * M_POR_GRADO_LAT);
}

/** Radio de «Aquí estarías dentro» y «Tu zona» (supuesto del 05/10/2026, revisable) */
export const RADIO_ZONA_M = 1500;
