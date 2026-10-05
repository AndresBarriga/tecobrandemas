import indexacion from '../config/indexacion.json';

/** Con `noindex` en config/indexacion.json, todas las respuestas del Worker llevan X-Robots-Tag */
export async function handle({ event, resolve }) {
	const respuesta = await resolve(event);
	if (indexacion.noindex) respuesta.headers.set('x-robots-tag', 'noindex, nofollow');
	return respuesta;
}
