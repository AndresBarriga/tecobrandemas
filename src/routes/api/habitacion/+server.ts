/**
 * POST /api/habitacion { barrio, precio, habitaciones, tramo, gastos } — «Aportar mi habitación».
 * GET  /api/habitacion?barrio=071&gastos=1 → { n, mediana }: la mediana solo con 20 o más.
 * Tabla aparte de pisos y aportaciones. Sin dirección, sección ni IP.
 */
import { error, json } from '@sveltejs/kit';
import { barriosValidos, contextoRegistro, entornoDe } from '#lib/server/entorno';
import { compararHabitaciones, leerHabitacion, registrarHabitacion } from '#lib/server/registro';

export const prerender = false;

export async function POST({ request, platform, getClientAddress }) {
	const c = await contextoRegistro(await entornoDe(platform));
	if (!c) error(503, 'Registro no disponible');
	const entrada = leerHabitacion(await request.json().catch(() => null), c.barrios);
	if (!entrada) error(400, 'Datos no válidos');
	const r = await registrarHabitacion(c, getClientAddress(), entrada);
	if (r === 'limite') error(429, 'Demasiados registros hoy');
	return json({ guardado: r === 'guardado' }, { status: r === 'guardado' ? 201 : 202, headers: { 'cache-control': 'no-store' } });
}

export async function GET({ url, platform }) {
	const c = await contextoRegistro(await entornoDe(platform));
	if (!c) error(503, 'Recuentos no disponibles');
	const barrio = url.searchParams.get('barrio');
	if (!barrio || !barriosValidos.has(barrio)) error(400, 'Barrio no válido');
	const gastos = url.searchParams.get('gastos') === '1';
	return json(await compararHabitaciones(c.db, barrio, gastos), { headers: { 'cache-control': 'public, max-age=60' } });
}
