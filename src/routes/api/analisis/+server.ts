/**
 * POST /api/analisis { barrio, precio, m2, nivel, tarjetaOrigen? } — registro anónimo de un análisis.
 * El cliente solo lo envía si la persona ha dado su consentimiento. Se guarda barrio y mes.
 */
import { error, json } from '@sveltejs/kit';
import { contextoRegistro } from '#lib/server/entorno';
import { leerAnalisis, registrarAnalisis } from '#lib/server/registro';

export const prerender = false;

export async function POST({ request, platform, getClientAddress }) {
	const c = await contextoRegistro(platform?.env);
	if (!c) error(503, 'Registro no disponible');
	const entrada = leerAnalisis(await request.json().catch(() => null), c.barrios);
	if (!entrada) error(400, 'Datos no válidos');
	const r = await registrarAnalisis(c, getClientAddress(), entrada);
	if (r === 'limite') error(429, 'Demasiados registros hoy');
	return json({ guardado: r === 'guardado' }, { status: r === 'guardado' ? 201 : 202, headers: { 'cache-control': 'no-store' } });
}
