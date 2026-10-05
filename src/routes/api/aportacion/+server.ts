/**
 * POST /api/aportacion { barrio, precio, m2, anioContrato, incluye[] } — «¿Cuánto pagas tú?».
 * Tabla y endpoint aparte del registro de análisis. Solo con consentimiento (lo comprueba el cliente).
 */
import { error, json } from '@sveltejs/kit';
import { contextoRegistro } from '#lib/server/entorno';
import { leerAportacion, registrarAportacion } from '#lib/server/registro';

export const prerender = false;

export async function POST({ request, platform, getClientAddress }) {
	const c = await contextoRegistro(platform?.env);
	if (!c) error(503, 'Registro no disponible');
	const entrada = leerAportacion(await request.json().catch(() => null), c.barrios, c.ahora().getUTCFullYear());
	if (!entrada) error(400, 'Datos no válidos');
	const r = await registrarAportacion(c, getClientAddress(), entrada);
	if (r === 'limite') error(429, 'Demasiados registros hoy');
	return json({ guardado: r === 'guardado' }, { status: r === 'guardado' ? 201 : 202, headers: { 'cache-control': 'no-store' } });
}
