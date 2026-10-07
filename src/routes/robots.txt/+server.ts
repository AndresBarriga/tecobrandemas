/** robots.txt: se permite todo y se apunta al sitemap. Mientras no sea el lanzamiento, el `noindex` (config/indexacion.json) sigue impidiendo indexar. */
import { SITE_URL } from '#lib/resultado';

export const prerender = true;

export const GET = () =>
	new Response(`User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
