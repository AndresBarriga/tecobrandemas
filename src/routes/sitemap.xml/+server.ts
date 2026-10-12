/** sitemap.xml: las páginas públicas fijas (las tarjetas compartidas /t/:id no se listan: llevan siempre noindex). */
import { contenidoSitemap } from '#lib/resultado';

export const prerender = true;

export const GET = () => new Response(contenidoSitemap(), { headers: { 'content-type': 'application/xml; charset=utf-8' } });
