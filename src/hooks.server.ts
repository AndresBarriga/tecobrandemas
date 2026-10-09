import indexacion from '../config/indexacion.json';

/**
 * X-Robots-Tag: con `noindex` en config/indexacion.json, en todas las respuestas del Worker; si no, solo en las tarjetas
 * compartidas (/t/:id), que nunca se indexan (la vista previa de WhatsApp o X no depende de esto)
 */
export async function handle({ event, resolve }) {
	const respuesta = await resolve(event);
	if (indexacion.noindex || event.url.pathname.startsWith('/t/')) respuesta.headers.set('x-robots-tag', 'noindex, nofollow');
	return respuesta;
}
