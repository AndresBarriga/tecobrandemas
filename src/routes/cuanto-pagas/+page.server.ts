/**
 * «¿Cuánto pagas tú?» ya no tiene página: aportar el alquiler es la acción principal del resultado de
 * «Ya vivo aquí». Los enlaces antiguos llevan a la portada con el selector en «Ya vivo aquí».
 */
import { redirect } from '@sveltejs/kit';

export const prerender = false;

export function load() {
	redirect(308, '/?modo=vivo');
}
