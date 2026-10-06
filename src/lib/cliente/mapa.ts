/**
 * Mapa del modo «En el mapa»: polígonos de las secciones censales (carga diferida) y pin.
 * Todo ocurre en el navegador: las coordenadas del punto no salen del dispositivo.
 */
import type { Topology } from 'topojson-specification';
import { type Ubicacion, ubicacionDesdePin } from '#lib/resultado';
import { type PoligonoSeccion, metrosAPunto, prepararPoligonos, puntoAMetros, seccionesDelPin, type Vecinas } from '#lib/ubicacion/pin';
import type { Punto } from '#lib/ubicacion/geocodificar';

export interface DatosMapa {
	/** Topología original: las líneas entre barrios se sacan de aquí (aristas compartidas) */
	topo: Topology;
	poligonos: Map<string, PoligonoSeccion>;
	vecinas: Vecinas;
	/** Extensión del municipio en metros */
	extension: { x0: number; y0: number; x1: number; y1: number };
}

let cargado: Promise<DatosMapa> | null = null;

export function cargarMapa(): Promise<DatosMapa> {
	cargado ??= Promise.all([
		fetch('/data/secciones_madrid.topo.json').then((r) => r.json() as Promise<Topology>),
		fetch('/data/vecinas.json').then((r) => r.json() as Promise<Vecinas>)
	])
		.then(([topo, vecinas]) => {
			const poligonos = prepararPoligonos(topo);
			const cajas = [...poligonos.values()].map((p) => p.bbox);
			return {
				topo,
				poligonos,
				vecinas,
				extension: {
					x0: Math.min(...cajas.map((b) => b[0])),
					y0: Math.min(...cajas.map((b) => b[1])),
					x1: Math.max(...cajas.map((b) => b[2])),
					y1: Math.max(...cajas.map((b) => b[3]))
				}
			};
		})
		.catch((e) => {
			cargado = null;
			throw e;
		});
	return cargado;
}

export { metrosAPunto, puntoAMetros };
export type { Punto };

/** null = el punto cae fuera del municipio de Madrid */
export function ubicacionDelPunto(datos: DatosMapa, punto: Punto, radio?: number): Ubicacion | null {
	return ubicacionDesdePin(seccionesDelPin(punto, datos.poligonos, datos.vecinas, radio), punto);
}
