/** sitemap.xml: las páginas públicas fijas (las tarjetas compartidas /t/:id no se listan: llevan siempre noindex). */
import { contenidoSitemap } from '#lib/resultado';
import { barriosPublicados, datosBarrios } from '#lib/server/datos-barrios';

export const prerender = true;

// Los barrios sin dato suficiente no se publican y las páginas de barrio llevan como `lastmod` la fecha de los datos
export const GET = () =>
	new Response(
		contenidoSitemap({ barrios: barriosPublicados().map((b) => b.slug), lastmodBarrios: datosBarrios().ipc.fecha_extraccion }),
		{ headers: { 'content-type': 'application/xml; charset=utf-8' } }
	);
