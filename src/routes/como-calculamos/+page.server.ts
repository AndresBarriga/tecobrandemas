// Solo en el servidor (se prerenderiza al compilar): los JSON de datos no entran en el bundle del navegador
import barrios from '../../../data/processed/seccion_barrio.json';
import ipc from '../../../data/processed/ipc_alquiler.json';
import secciones from '../../../data/processed/secciones_madrid.json';
import { type BarrioJson, type DatosMadrid, type IpcJson, type SeccionJson, construirMetodologia } from '#lib/resultado';

export const prerender = true;

export function load() {
	const datos: DatosMadrid = {
		secciones: secciones as unknown as Record<string, SeccionJson>,
		barrios: (barrios as unknown as { barrios: Record<string, BarrioJson> }).barrios,
		ipc: ipc as IpcJson
	};
	return { pagina: construirMetodologia(datos.ipc, datos) };
}
