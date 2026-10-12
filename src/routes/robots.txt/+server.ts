/**
 * robots.txt: se permite rastrear todo lo público salvo el proxy de analítica (/r7k/) y las tarjetas compartidas (/t/),
 * y se apunta al sitemap. Las reglas están en `contenidoRobots` (#lib/resultado/seo). Que se indexe o no el resto lo
 * decide el `noindex` de config/indexacion.json.
 */
import { contenidoRobots } from '#lib/resultado';

export const prerender = true;

export const GET = () => new Response(contenidoRobots(), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
