/** sitemap.xml: las páginas públicas fijas (las tarjetas compartidas /t/:id no se listan: llevan siempre noindex). */
import { SITE_URL } from '#lib/resultado';

export const prerender = true;

const RUTAS = ['/', '/mapa', '/como-calculamos'];

export const GET = () =>
	new Response(
		`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${RUTAS.map((r) => `\t<url><loc>${SITE_URL}${r}</loc></url>`).join('\n')}\n</urlset>\n`,
		{ headers: { 'content-type': 'application/xml; charset=utf-8' } }
	);
