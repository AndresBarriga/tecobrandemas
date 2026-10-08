/**
 * «¿Cuánto pagas tú?» ya no tiene página: aportar el alquiler es la acción principal del resultado de
 * «Mi alquiler». Los enlaces antiguos llevan a la portada con el selector en «Mi alquiler».
 */
import { redirect } from '@sveltejs/kit';

export const prerender = false;

export function load() {
	redirect(308, '/?modo=vivo');
}
