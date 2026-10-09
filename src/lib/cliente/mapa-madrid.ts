/**
 * Geometría de /mapa en el navegador: todas las zonas de Madrid como trazados SVG en metros (el eje y,
 * invertido para pintar), las líneas gruesas entre barrios y la caja de cada barrio. Se calcula una sola
 * vez por visita; el color sale de resultado/mapa.ts y cambia sin recalcular nada de esto.
 */
import type { DatosMadrid } from '#lib/resultado';
import { MAPA_CON_ANUNCIOS, cargarDatosMapa } from './datos';
import { cargarMapa, puntoAMetros } from './mapa';
import { contornoMunicipio, lineasEntreBarrios, lineasEntreDistritos } from './zona';

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
	/** Líneas entre distritos, un solo trazado; vacío si el mapa no muestra los anuncios (no se calculan) */
	lineasDistrito: string;
	/** Contorno del municipio, un solo trazado */
	contorno: string;
	/** Caja de cada barrio (para centrar la vista) y su nombre */
	barrios: Map<string, { nombre: string; caja: Caja; n: number; centro: [number, number] }>;
	/** Distritos: nombre, caja y centro (para los nombres a zoom bajo) */
	distritos: Map<string, { nombre: string; caja: Caja; n: number; centro: [number, number] }>;
	extension: Caja;
	/** Área urbana (sin el monte y el suelo rural del municipio): la vista inicial */
	extensionUrbana: Caja;
}

let cargado: Promise<MadridCargado> | null = null;

const r1 = (n: number) => Math.round(n * 10) / 10;

export function cargarMadrid(): Promise<MadridCargado> {
	cargado ??= (async () => {
		const [datos, mapa] = await Promise.all([cargarDatosMapa(), cargarMapa()]);
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
		const distritos: MadridCargado['distritos'] = new Map();
		for (const [codigo, b] of barrios) {
			const cod = datos.barrios[codigo]?.cod_distrito;
			if (!cod) continue;
			const d = distritos.get(cod);
			if (!d) {
				distritos.set(cod, { nombre: datos.barrios[codigo]!.distrito, caja: [...b.caja], n: b.n, centro: [b.centro[0] * b.n, b.centro[1] * b.n] });
				continue;
			}
			d.caja = [Math.min(d.caja[0], b.caja[0]), Math.min(d.caja[1], b.caja[1]), Math.max(d.caja[2], b.caja[2]), Math.max(d.caja[3], b.caja[3])];
			d.centro = [d.centro[0] + b.centro[0] * b.n, d.centro[1] + b.centro[1] * b.n];
			d.n += b.n;
		}
		for (const d of distritos.values()) d.centro = [d.centro[0] / d.n, d.centro[1] / d.n];
		const lineas = await lineasEntreBarrios(mapa, datos);
		const lineasBarrio = lineas.map((l) => 'M' + l.map(([x, y]) => `${r1(x)},${r1(-y)}`).join('L')).join('');
		const lineasDistrito = MAPA_CON_ANUNCIOS
			? (await lineasEntreDistritos(mapa, datos)).map((l) => 'M' + l.map(([x, y]) => `${r1(x)},${r1(-y)}`).join('L')).join('')
			: '';
		const contorno = (await contornoMunicipio(mapa)).map((l) => 'M' + l.map(([x, y]) => `${r1(x)},${r1(-y)}`).join('L')).join('');
		const extension: Caja = [
			Math.min(...celdas.map((c) => c.caja[0])), Math.min(...celdas.map((c) => c.caja[1])),
			Math.max(...celdas.map((c) => c.caja[2])), Math.max(...celdas.map((c) => c.caja[3]))
		];
		return { datos, celdas, porCusec: new Map(celdas.map((c) => [c.cusec, c])), lineasBarrio, lineasDistrito, contorno, barrios, distritos, extension, extensionUrbana: areaUrbana(celdas, extension) };
	})().catch((e) => {
		cargado = null;
		throw e;
	});
	return cargado;
}

/**
 * Área urbana: los centros de las zonas pequeñas (las grandes son monte y suelo rural) entre los percentiles
 * 1 y 99, con un margen del 4 %. Si hay pocas, la extensión entera.
 */
export function areaUrbana(celdas: readonly CeldaMadrid[], total: Caja): Caja {
	const pequenas = celdas.filter((c) => c.caja[2] - c.caja[0] < 2500 && c.caja[3] - c.caja[1] < 2500);
	if (pequenas.length < 50) return total;
	const percentil = (v: number[], p: number) => v.sort((a, b) => a - b)[Math.min(v.length - 1, Math.max(0, Math.round((v.length - 1) * p)))]!;
	const xs = pequenas.map((c) => c.centro[0]);
	const ys = pequenas.map((c) => c.centro[1]);
	const x0 = percentil(xs, 0.01), x1 = percentil(xs, 0.99), y0 = percentil(ys, 0.01), y1 = percentil(ys, 0.99);
	const mx = (x1 - x0) * 0.04, my = (y1 - y0) * 0.04;
	return [x0 - mx, y0 - my, x1 + mx, y1 + my];
}

/** Caja que une las de varias zonas */
export function unirCajas(cajas: Caja[]): Caja | null {
	if (!cajas.length) return null;
	return [Math.min(...cajas.map((c) => c[0])), Math.min(...cajas.map((c) => c[1])), Math.max(...cajas.map((c) => c[2])), Math.max(...cajas.map((c) => c[3]))];
}
