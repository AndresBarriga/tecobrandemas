/**
 * «Comprueba un anuncio aquí» (/mapa → portada): la zona elegida viaja en memoria, en la misma pestaña. No va
 * en la URL ni en el almacenamiento del navegador, así que ni se envía ni se guarda: se lee una sola vez.
 */
import type { Punto } from '#lib/ubicacion/geocodificar';

export interface Prellenado {
	/** Punto representativo de la zona (para marcarlo en el mapa de la portada) */
	punto: Punto;
	/** Código del barrio, para centrar el mapa */
	barrio: string;
}

let pendiente: Prellenado | null = null;

export const dejarPrellenado = (p: Prellenado) => (pendiente = p);

export function tomarPrellenado(): Prellenado | null {
	const p = pendiente;
	pendiente = null;
	return p;
}
