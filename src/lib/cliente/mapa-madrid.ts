/**
 * Geometría de /mapa en el navegador: todas las zonas de Madrid como trazados SVG en metros (el eje y,
 * invertido para pintar), las líneas gruesas entre barrios y la caja de cada barrio. Se calcula una sola
 * vez por visita; el color sale de resultado/mapa.ts y cambia sin recalcular nada de esto.
 */
import type { DatosMadrid } from '#lib/resultado';
import { cargarDatos } from './datos';
import { cargarMapa, puntoAMetros } from './mapa';
import { lineasEntreBarrios } from './zona';

export type Caja = [x0: number, y0: number, x1: number, y1: number];

export interface CeldaMadrid {
	cusec: string;
	/** Trazado en metros con y invertida (coordenadas de pantalla: y crece hacia abajo) */
	d: string;
	/** Caja y centro en metros con y invertida */
	caja: Caja;
	centro: [number, number];
	barrio: string | null;
}

export interface MadridCargado {
	datos: DatosMadrid;
	celdas: CeldaMadrid[];
	porCusec: Map<string, CeldaMadrid>;
	/** Líneas entre barrios, un solo trazado */
	lineasBarrio: string;
	/** Caja de cada barrio (para centrar la vista) y su nombre */
	barrios: Map<string, { nombre: string; caja: Caja; n: number; centro: [number, number] }>;
	extension: Caja;
}

let cargado: Promise<MadridCargado> | null = null;

const r1 = (n: number) => Math.round(n * 10) / 10;

export function cargarMadrid(): Promise<MadridCargado> {
	cargado ??= (async () => {
		const [datos, mapa] = await Promise.all([cargarDatos(), cargarMapa()]);
		const celdas: CeldaMadrid[] = [];
		for (const pol of mapa.poligonos.values()) {
			const d = pol.anillos.map((a) => 'M' + a.map(([x, y]) => `${r1(x)},${r1(-y)}`).join('L') + 'Z').join('');
			const [cx, cy] = puntoAMetros(pol.centro);
			celdas.push({
				cusec: pol.cusec,
				d,
				caja: [pol.bbox[0], -pol.bbox[3], pol.bbox[2], -pol.bbox[1]],
				centro: [cx, -cy],
				barrio: datos.secciones[pol.cusec]?.barrio ?? null
			});
		}
		const barrios: MadridCargado['barrios'] = new Map();
		for (const c of celdas) {
			if (!c.barrio) continue;
			const b = barrios.get(c.barrio);
			if (!b) {
				barrios.set(c.barrio, { nombre: datos.barrios[c.barrio]?.nombre ?? '', caja: [...c.caja], n: 1, centro: [...c.centro] });
				continue;
			}
			b.caja = [Math.min(b.caja[0], c.caja[0]), Math.min(b.caja[1], c.caja[1]), Math.max(b.caja[2], c.caja[2]), Math.max(b.caja[3], c.caja[3])];
			b.centro = [b.centro[0] + c.centro[0], b.centro[1] + c.centro[1]];
			b.n++;
		}
		for (const b of barrios.values()) b.centro = [b.centro[0] / b.n, b.centro[1] / b.n];
		const lineas = await lineasEntreBarrios(mapa, datos);
		const lineasBarrio = lineas.map((l) => 'M' + l.map(([x, y]) => `${r1(x)},${r1(-y)}`).join('L')).join('');
		const extension: Caja = [
			Math.min(...celdas.map((c) => c.caja[0])), Math.min(...celdas.map((c) => c.caja[1])),
			Math.max(...celdas.map((c) => c.caja[2])), Math.max(...celdas.map((c) => c.caja[3]))
		];
		return { datos, celdas, porCusec: new Map(celdas.map((c) => [c.cusec, c])), lineasBarrio, barrios, extension };
	})().catch((e) => {
		cargado = null;
		throw e;
	});
	return cargado;
}

/** Caja que une las de varias zonas */
export function unirCajas(cajas: Caja[]): Caja | null {
	if (!cajas.length) return null;
	return [Math.min(...cajas.map((c) => c[0])), Math.min(...cajas.map((c) => c[1])), Math.max(...cajas.map((c) => c[2])), Math.max(...cajas.map((c) => c[3]))];
}
