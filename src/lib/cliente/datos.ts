/** Carga de los datos de data/processed/ que sirve el propio dominio (static/data). Una sola vez por visita. */
import { PUBLIC_OFERTA_ENABLED, PUBLIC_OFERTA_MAPA_ENABLED } from '$app/env/public';
import type { BarrioJson, DatosMadrid, IpcJson, OfertaJson, SeccionJson } from '#lib/resultado';

let cargados: Promise<DatosMadrid> | null = null;
let cargadosSinOferta: Promise<DatosMadrid> | null = null;

/** El mapa muestra los anuncios recientes solo con las dos flags: la del mapa no tiene efecto sin la principal */
export const MAPA_CON_ANUNCIOS: boolean = PUBLIC_OFERTA_ENABLED && PUBLIC_OFERTA_MAPA_ENABLED;

async function json<T>(ruta: string): Promise<T> {
	const r = await fetch(ruta);
	if (!r.ok) throw new Error(`${ruta}: ${r.status}`);
	return r.json() as Promise<T>;
}

function leer(conOferta: boolean): Promise<DatosMadrid> {
	return Promise.all([
		json<Record<string, SeccionJson>>('/data/secciones_madrid.json'),
		json<{ barrios: Record<string, BarrioJson> }>('/data/seccion_barrio.json'),
		json<IpcJson>('/data/ipc_alquiler.json'),
		// Con la flag apagada no se pide el fichero. Si falla, no hay línea de oferta: el resto funciona igual
		conOferta ? json<OfertaJson>('/data/oferta_madrid.json').catch(() => undefined) : Promise.resolve(undefined)
	]).then(([secciones, b, ipc, oferta]) => ({ secciones, barrios: b.barrios, ipc, ...(oferta ? { oferta } : {}) }));
}

export function cargarDatos(): Promise<DatosMadrid> {
	cargados ??= leer(PUBLIC_OFERTA_ENABLED).catch((e) => {
		cargados = null; // se reintenta en la siguiente comprobación
		throw e;
	});
	return cargados;
}

/**
 * Datos para /mapa: el fichero de oferta solo se pide si están encendidas las dos flags. Con solo la principal, el mapa
 * no lo necesita (lo usa el resultado): si ya está cargado se reutiliza, pero /mapa no lo pide y el mapa no lo usa.
 */
export function cargarDatosMapa(): Promise<DatosMadrid> {
	if (MAPA_CON_ANUNCIOS || cargados) return cargarDatos();
	cargadosSinOferta ??= leer(false).catch((e) => {
		cargadosSinOferta = null;
		throw e;
	});
	return cargadosSinOferta;
}

/** Calienta la caché cuando el navegador está libre, antes de que la persona pulse «Comprobar» */
export function precargarDatos(): void {
	const lanzar = () => void cargarDatos().catch(() => {});
	if ('requestIdleCallback' in window) requestIdleCallback(lanzar);
	else setTimeout(lanzar, 800);
}
