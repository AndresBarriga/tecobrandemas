/**
 * Datos que el navegador carga de data/processed/ y utilidades para consultarlos.
 * Los view-models reciben esto ya cargado: no hacen fetch ni leen ficheros.
 */
import type { DatosSeccion, TablaOferta } from '../motor';
import type { Punto } from '../ubicacion/geocodificar';

/** Una entrada de secciones_madrid.json */
export interface SeccionJson {
	cdis: string;
	barrio: string;
	smed: number | null;
	p25: number | null;
	p75: number | null;
	n: number | null;
	n_vu: number | null;
	/** Mediana de €/m²·mes registrada en la sección */
	med2015: number | null;
	med2024: number | null;
}

/** Una entrada de seccion_barrio.json → barrios */
export interface BarrioJson {
	nombre: string;
	cod_distrito: string;
	distrito: string;
}

/** ipc_alquiler.json */
export interface IpcJson {
	factor: number;
	/** AAAA-MM */
	ultimo_mes: string;
}

/** oferta_madrid.json: anuncios recientes (€/m²) del Ayuntamiento; solo se carga con la flag de la oferta encendida */
export interface OfertaJson extends TablaOferta {
	serie: string;
	fuente: string;
	/** AAAA-MM del último mes con dato */
	mes: string;
}

export interface DatosMadrid {
	secciones: Record<string, SeccionJson>;
	barrios: Record<string, BarrioJson>;
	ipc: IpcJson;
	/** Sin esto (flag apagada, o el fichero no carga) no hay ninguna línea de oferta */
	oferta?: OfertaJson;
	/** Centroide de cada sección; llega con los polígonos (carga diferida) */
	centros?: Map<string, Punto>;
}

/** Datos del motor de una sección; todo a null si el cusec no está en la tabla */
export function datosSeccion(datos: DatosMadrid, cusec: string): DatosSeccion {
	const s = datos.secciones[cusec];
	return { cusec, smed: s?.smed ?? null, p25: s?.p25 ?? null, p75: s?.p75 ?? null, n: s?.n ?? null };
}

export interface BarrioDeSeccion {
	codigo: string;
	nombre: string;
	distrito: string;
}

export function barrioDe(datos: DatosMadrid, cusec: string): BarrioDeSeccion | null {
	const codigo = datos.secciones[cusec]?.barrio;
	const b = codigo ? datos.barrios[codigo] : undefined;
	return codigo && b ? { codigo, nombre: b.nombre, distrito: b.distrito } : null;
}

/** Barrios distintos de un conjunto de secciones, sin repetir y en orden alfabético */
export function barriosDe(datos: DatosMadrid, cusecs: string[]): BarrioDeSeccion[] {
	const porCodigo = new Map<string, BarrioDeSeccion>();
	for (const c of cusecs) {
		const b = barrioDe(datos, c);
		if (b) porCodigo.set(b.codigo, b);
	}
	return [...porCodigo.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}
