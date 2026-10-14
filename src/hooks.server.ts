import indexacion from '../config/indexacion.json';

/**
 * X-Robots-Tag: con `noindex` en config/indexacion.json, en todas las respuestas del Worker; si no, solo en las tarjetas
 * compartidas (/t/:id), que nunca se indexan (la vista previa de WhatsApp o X no depende de esto)
 */
export async function handle({ event, resolve }) {
	// Las páginas en inglés (/en y /en/…) llevan <html lang="en"> ya en el HTML del servidor
	const ingles = event.url.pathname === '/en' || event.url.pathname.startsWith('/en/');
	const respuesta = await resolve(event, { transformPageChunk: ({ html }) => (ingles ? html.replace('<html lang="es">', '<html lang="en">') : html) });
	if (indexacion.noindex || event.url.pathname.startsWith('/t/') || event.url.pathname === '/barcelona') respuesta.headers.set('x-robots-tag', 'noindex, nofollow');
	return respuesta;
}
