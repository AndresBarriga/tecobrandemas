/**
 * POST /api/geocode { texto } → Geocodificacion.
 * La dirección se usa para buscar y se descarta: no se escribe en logs ni en la base de datos.
 */
import { json, error } from '@sveltejs/kit';
import { callejero } from '#lib/server/entorno';
import { almacenD1, indiceD1 } from '#lib/server/callejero-d1';
import { geocodificar } from '#lib/ubicacion/geocodificar';

export const prerender = false;

const MAX_TEXTO = 200;

export async function POST({ request, platform }) {
	let texto: unknown;
	try {
		({ texto } = (await request.json()) as { texto?: unknown });
	} catch {
		error(400, 'Petición no válida');
	}
	if (typeof texto !== 'string' || !texto.trim() || texto.length > MAX_TEXTO) error(400, 'Dirección no válida');

	const db = await callejero(platform?.env);
	if (!db) error(503, 'Callejero no disponible');
	const resultado = await geocodificar(texto, await indiceD1(db), almacenD1(db));
	return json(resultado, { headers: { 'cache-control': 'no-store' } });
}
