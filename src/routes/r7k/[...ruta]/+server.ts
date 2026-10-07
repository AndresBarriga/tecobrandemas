/**
 * Proxy de la analítica en el propio dominio: reenvía a PostHog (UE) lo que manda el SDK y nada más.
 * Solo acepta POST a las rutas de captura que el SDK usa con esta configuración (RUTAS); todo lo demás es 404,
 * así que no es un relé abierto. Reenvía la IP del cliente (`X-Forwarded-For`) y su user agent, que PostHog
 * necesita para el identificador diario sin cookies; no reenvía cookies ni autorización y no escribe nada en D1.
 * La limitación de frecuencia va en una regla de Cloudflare sobre /r7k/* (docs/operacion.md).
 */
import { error } from '@sveltejs/kit';

export const prerender = false;

const ORIGEN = 'https://eu.i.posthog.com';
/** Rutas de captura que usa posthog-js con esta configuración (comprobado en e2e/analitica.spec.ts) */
const RUTAS = new Set(['/e/', '/i/v0/e/', '/batch/']);
/** Parámetros de la petición que se reenvían; el resto se descarta */
const PARAMETROS = new Set(['compression', 'ver', '_', 'ip', 'retry_count', 'beacon']);
const MAX_BYTES = 200_000;

export async function POST({ request, params, url, getClientAddress }) {
	const ruta = `/${(params.ruta ?? '').replace(/^\/+|\/+$/g, '')}/`;
	if (!RUTAS.has(ruta)) error(404, 'No encontrado');
	// En desarrollo y en las pruebas no se reenvía nada a PostHog
	if (import.meta.env.DEV) return new Response(null, { status: 204 });
	const cuerpo = await request.arrayBuffer();
	if (cuerpo.byteLength === 0 || cuerpo.byteLength > MAX_BYTES) error(413, 'Demasiado grande');

	const destino = new URL(ORIGEN + ruta);
	for (const [k, v] of url.searchParams) if (PARAMETROS.has(k)) destino.searchParams.set(k, v.slice(0, 40));

	const cabeceras = new Headers({
		'content-type': request.headers.get('content-type') ?? 'text/plain',
		'user-agent': request.headers.get('user-agent') ?? '',
		'x-forwarded-for': getClientAddress()
	});
	try {
		const r = await fetch(destino, { method: 'POST', headers: cabeceras, body: cuerpo });
		return new Response(r.body, { status: r.status, headers: { 'content-type': r.headers.get('content-type') ?? 'application/json', 'cache-control': 'no-store' } });
	} catch {
		// PostHog no responde: la herramienta no depende de ello
		return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
	}
}

/** Cualquier otro método o ruta: 404 */
export const fallback = () => error(404, 'No encontrado');
