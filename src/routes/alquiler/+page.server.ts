import { construirIndiceBarrios } from '#lib/resultado';
import { datosBarrios } from '#lib/server/datos-barrios';

export const prerender = true;

export function load() {
	return { indice: construirIndiceBarrios(datosBarrios()) };
}
