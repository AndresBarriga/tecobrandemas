/**
 * Punto en el mapa → sección y secciones cercanas, en el navegador (R2).
 * Las coordenadas del pin no salen del dispositivo.
 *
 * Usa data/processed/secciones_madrid.topo.json (polígonos) y vecinas.json (secciones a
 * ≤150 m de cada sección, como prefiltro). La distancia se mide desde el punto: una
 * sección a ≤150 m del punto siempre está a ≤150 m de la sección que lo contiene.
 */
import type { MultiPolygon, Polygon } from 'geojson';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import type { Punto } from './geocodificar';

/** Radio y tope de la horquilla del pin (decididos el 05/10/2026) */
export const RADIO_PIN_M = 150;
export const MAX_SECCIONES_PIN = 6;

/** Proyección equirectangular centrada en Madrid: error < 0,5 % a escala de barrio */
const LAT0 = 40.42;
const M_POR_GRADO_LAT = 110_574;
const M_POR_GRADO_LON = 111_320 * Math.cos((LAT0 * Math.PI) / 180);

type Anillo = [number, number][];

export interface PoligonoSeccion {
	cusec: string;
	/** Anillos en metros (exteriores y huecos mezclados: se usa la regla par-impar) */
	anillos: Anillo[];
	bbox: [number, number, number, number];
	/** Centroide (representative point) en grados, para «Tu zona» */
	centro: Punto;
}

export type Vecinas = Record<string, Record<string, number>>;

export type ResultadoPin =
	| { estado: 'punto'; cusec: string; cusecs: string[]; distancias: Record<string, number> }
	| { estado: 'fuera' };

const aMetros = ([lon, lat]: number[]): [number, number] => [lon! * M_POR_GRADO_LON, lat! * M_POR_GRADO_LAT];

export function prepararPoligonos(topo: Topology): Map<string, PoligonoSeccion> {
	const capa = feature(topo, topo.objects.secciones!) as unknown as GeoJSON.FeatureCollection<
		Polygon | MultiPolygon, { cusec: string; cx: number; cy: number }
	>;
	const out = new Map<string, PoligonoSeccion>();
	for (const f of capa.features) {
		const poligonos = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
		const anillos = poligonos.flat().map((anillo) => anillo.map(aMetros));
		const xs = anillos.flat().map((p) => p[0]);
		const ys = anillos.flat().map((p) => p[1]);
		out.set(f.properties.cusec, {
			cusec: f.properties.cusec,
			anillos,
			bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
			centro: { lon: f.properties.cx, lat: f.properties.cy }
		});
	}
	return out;
}

function contiene(s: PoligonoSeccion, [x, y]: [number, number]): boolean {
	const [x0, y0, x1, y1] = s.bbox;
	if (x < x0 || x > x1 || y < y0 || y > y1) return false;
	let dentro = false;
	for (const anillo of s.anillos) {
		for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
			const [xi, yi] = anillo[i]!;
			const [xj, yj] = anillo[j]!;
			if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
		}
	}
	return dentro;
}

function distanciaSegmento([x, y]: [number, number], [ax, ay]: [number, number], [bx, by]: [number, number]): number {
	const dx = bx - ax;
	const dy = by - ay;
	const largo2 = dx * dx + dy * dy;
	const t = largo2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / largo2));
	return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
}

/** Distancia en metros del punto a la sección (0 si está dentro) */
export function distanciaMetros(s: PoligonoSeccion, punto: Punto): number {
	const p = aMetros([punto.lon, punto.lat]);
	if (contiene(s, p)) return 0;
	let minimo = Infinity;
	for (const anillo of s.anillos) {
		for (let i = 1; i < anillo.length; i++) minimo = Math.min(minimo, distanciaSegmento(p, anillo[i - 1]!, anillo[i]!));
	}
	return minimo;
}

export function seccionEnPunto(poligonos: Map<string, PoligonoSeccion>, punto: Punto): string | null {
	const p = aMetros([punto.lon, punto.lat]);
	for (const s of poligonos.values()) if (contiene(s, p)) return s.cusec;
	return null;
}

export function seccionesDelPin(
	punto: Punto, poligonos: Map<string, PoligonoSeccion>, vecinas: Vecinas,
	radio = RADIO_PIN_M, tope = MAX_SECCIONES_PIN
): ResultadoPin {
	const base = seccionEnPunto(poligonos, punto);
	if (base === null) return { estado: 'fuera' };

	const cercanas = Object.keys(vecinas[base] ?? {})
		.map((cusec) => ({ cusec, d: distanciaMetros(poligonos.get(cusec)!, punto) }))
		.filter((c) => c.d <= radio)
		.sort((a, b) => a.d - b.d)
		.slice(0, tope - 1);
	const todas = [{ cusec: base, d: 0 }, ...cercanas];
	return {
		estado: 'punto',
		cusec: base,
		cusecs: todas.map((c) => c.cusec),
		distancias: Object.fromEntries(todas.map((c) => [c.cusec, Math.round(c.d)]))
	};
}
