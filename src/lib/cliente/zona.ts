/**
 * «Tu zona» en el navegador: con los polígonos de las zonas y los datos de la referencia calcula la vista
 * (lista, leyenda, evolución) y la geometría del mapa. Nada de esto sale del dispositivo: ni el punto, ni
 * el precio.
 */
import { mesh } from 'topojson-client';
import type { GeometryCollection, GeometryObject } from 'topojson-specification';
import {
	type DatosMadrid, type ParametrosZona, type VistaTuZona, barrioDe, construirTuZona
} from '#lib/resultado';
import { puntoAMetros } from '#lib/ubicacion/pin';
import type { Punto } from '#lib/ubicacion/geocodificar';
import { cargarDatos } from './datos';
import { type DatosMapa, cargarMapa } from './mapa';
import { type Anillos, type CeldaGeometria, type GeometriaZona, MEDIA_ALTURA_M, MEDIA_ANCHURA_M } from './zona-mapa';

export interface TuZonaCargada {
	vista: VistaTuZona;
	geom: GeometriaZona;
}

let lineas: Promise<[number, number][][]> | null = null;

/** Líneas entre barrios: las aristas que separan dos zonas de barrios distintos (una sola vez por visita) */
export function lineasEntreBarrios(mapa: DatosMapa, datos: DatosMadrid): Promise<[number, number][][]> {
	lineas ??= Promise.resolve().then(() => {
		const barrio = (g: GeometryObject) => datos.secciones[(g.properties as { cusec: string } | undefined)?.cusec ?? '']?.barrio;
		const capa = mapa.topo.objects.secciones as GeometryCollection;
		const m = mesh(mapa.topo, capa, (a, b) => a !== b && barrio(a) !== barrio(b));
		return m.coordinates.map((l) => l.map(([lon, lat]) => puntoAMetros({ lon: lon!, lat: lat! })));
	});
	return lineas;
}

let contorno: Promise<[number, number][][]> | null = null;

/** Contorno del municipio: las aristas que solo tienen una zona a un lado (una sola vez por visita) */
export function contornoMunicipio(mapa: DatosMapa): Promise<[number, number][][]> {
	contorno ??= Promise.resolve().then(() => {
		const capa = mapa.topo.objects.secciones as GeometryCollection;
		const m = mesh(mapa.topo, capa, (a, b) => a === b);
		return m.coordinates.map((l) => l.map(([lon, lat]) => puntoAMetros({ lon: lon!, lat: lat! })));
	});
	return contorno;
}

const dentro = (b: [number, number, number, number], x0: number, y0: number, x1: number, y1: number) =>
	!(b[2] < x0 || b[0] > x1 || b[3] < y0 || b[1] > y1);

export async function cargarTuZona(p: ParametrosZona): Promise<TuZonaCargada | null> {
	const [datos, mapa] = await Promise.all([cargarDatos(), cargarMapa()]);
	const centros = new Map<string, Punto>();
	for (const [cusec, pol] of mapa.poligonos) centros.set(cusec, pol.centro);

	// Origen: el punto de la ubicación; con solo la calle, el centro de sus zonas
	let origen = p.origen;
	if (!origen) {
		const cs = p.cusecs.map((c) => centros.get(c)).filter((c): c is Punto => !!c);
		if (!cs.length) return null;
		origen = { lon: cs.reduce((t, c) => t + c.lon, 0) / cs.length, lat: cs.reduce((t, c) => t + c.lat, 0) / cs.length };
	}

	const vista = construirTuZona({
		anuncio: { precio: p.precio, superficie: p.superficie, obraNueva: false, tipo: 'piso', largaDuracion: true },
		clase: p.clase, origen, cusecs: p.cusecs, motivo: p.motivo, inquilino: p.inquilino, datos, centros
	});

	// Ventana visible, con un margen para que los bordes no se vean cortados
	const centro = puntoAMetros(origen);
	const [x0, y0, x1, y1] = [centro[0] - MEDIA_ANCHURA_M * 1.1, centro[1] - MEDIA_ALTURA_M * 1.1, centro[0] + MEDIA_ANCHURA_M * 1.1, centro[1] + MEDIA_ALTURA_M * 1.1];
	const porCusec = new Map(vista.celdas.map((c) => [c.cusec, c]));
	const celdas: CeldaGeometria[] = [];
	for (const pol of mapa.poligonos.values()) {
		const celda = porCusec.get(pol.cusec);
		if (!celda && !dentro(pol.bbox, x0, y0, x1, y1)) continue;
		celdas.push({
			cusec: pol.cusec,
			anillos: pol.anillos as Anillos,
			tono: celda ? celda.clase : 'fuera',
			esUsuario: celda?.esUsuario ?? false,
			barrio: barrioDe(datos, pol.cusec)?.codigo ?? null,
			centro: puntoAMetros(pol.centro)
		});
	}
	const todas = await lineasEntreBarrios(mapa, datos);
	const visibles = todas.filter((l) => l.some(([x, y]) => x >= x0 && x <= x1 && y >= y0 && y <= y1));

	return {
		vista,
		geom: {
			centro,
			celdas,
			lineasBarrio: visibles,
			nombresBarrio: new Map(Object.entries(datos.barrios).map(([k, b]) => [k, b.nombre]))
		}
	};
}
