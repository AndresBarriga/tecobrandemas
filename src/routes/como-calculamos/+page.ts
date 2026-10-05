import ipc from '../../../data/processed/ipc_alquiler.json';
import { construirMetodologia, type IpcJson } from '#lib/resultado';

export const prerender = true;

export function load() {
	return { pagina: construirMetodologia(ipc as IpcJson) };
}
