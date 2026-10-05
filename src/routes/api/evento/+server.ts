/** POST /api/evento { tipo, visita, tarjeta? } — embudo (R9). Sin precio, ubicación ni cookies. */
import { error } from '@sveltejs/kit';
import { contextoRegistro } from '#lib/server/entorno';
import { leerEvento, registrarEvento } from '#lib/server/registro';

export const prerender = false;

export async function POST({ request, platform, getClientAddress }) {
	const c = await contextoRegistro(platform?.env);
	if (!c) error(503, 'Eventos no disponibles');
	const entrada = leerEvento(await request.json().catch(() => null));
	if (!entrada) error(400, 'Evento no válido');
	const r = await registrarEvento(c, getClientAddress(), entrada);
	if (r === 'limite') error(429, 'Demasiados eventos hoy');
	return new Response(null, { status: 204 });
}
