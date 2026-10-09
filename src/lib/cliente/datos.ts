/** Carga de los datos de data/processed/ que sirve el propio dominio (static/data). Una sola vez por visita. */
import { PUBLIC_OFERTA_ENABLED } from '$app/env/public';
import type { BarrioJson, DatosMadrid, IpcJson, OfertaJson, SeccionJson } from '#lib/resultado';

let cargados: Promise<DatosMadrid> | null = null;

async function json<T>(ruta: string): Promise<T> {
	const r = await fetch(ruta);
	if (!r.ok) throw new Error(`${ruta}: ${r.status}`);
	return r.json() as Promise<T>;
}

export function cargarDatos(): Promise<DatosMadrid> {
	cargados ??= Promise.all([
		json<Record<string, SeccionJson>>('/data/secciones_madrid.json'),
		json<{ barrios: Record<string, BarrioJson> }>('/data/seccion_barrio.json'),
		json<IpcJson>('/data/ipc_alquiler.json'),
		// Con la flag apagada no se pide el fichero. Si falla, no hay línea de oferta: el resto funciona igual
		PUBLIC_OFERTA_ENABLED ? json<OfertaJson>('/data/oferta_madrid.json').catch(() => undefined) : Promise.resolve(undefined)
	])
		.then(([secciones, b, ipc, oferta]) => ({ secciones, barrios: b.barrios, ipc, ...(oferta ? { oferta } : {}) }))
		.catch((e) => {
			cargados = null; // se reintenta en la siguiente comprobación
			throw e;
		});
	return cargados;
}

/** Calienta la caché cuando el navegador está libre, antes de que la persona pulse «Comprobar» */
export function precargarDatos(): void {
	const lanzar = () => void cargarDatos().catch(() => {});
	if ('requestIdleCallback' in window) requestIdleCallback(lanzar);
	else setTimeout(lanzar, 800);
}
