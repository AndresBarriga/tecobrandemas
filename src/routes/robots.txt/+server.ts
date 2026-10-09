/**
 * robots.txt: se permite rastrear todo lo público y se apunta al sitemap. Solo se cierran los puntos técnicos sin
 * contenido: la API (/api/, respuestas JSON) y el proxy de analítica (/r7k/). OAI-SearchBot (ChatGPT Search) lleva su
 * propio grupo con las mismas reglas, para que quede explícito que puede rastrear. Que se indexe o no lo decide el
 * `noindex` de config/indexacion.json.
 */
import { SITE_URL } from '#lib/resultado';

export const prerender = true;

const REGLAS = ['Allow: /', 'Disallow: /api/', 'Disallow: /r7k/'];

export const GET = () =>
	new Response(
		[...['*', 'OAI-SearchBot'].flatMap((agente) => [`User-agent: ${agente}`, ...REGLAS, '']), `Sitemap: ${SITE_URL}/sitemap.xml`, ''].join('\n'),
		{ headers: { 'content-type': 'text/plain; charset=utf-8' } }
	);
