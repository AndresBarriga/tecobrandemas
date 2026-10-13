// Solo en el servidor (se prerenderiza al compilar): el mes del último dato del IPC, leído de los datos y no escrito a mano
import ipc from '../../data/processed/ipc_alquiler.json';
import { mesAnio } from '#lib/resultado';

export function load() {
	return { actualizado: mesAnio(ipc.ultimo_mes) };
}
