/** GET /api/contadores?barrio=071 — recuentos reales; los de barrio solo salen desde 10 */
import { error, json } from '@sveltejs/kit';
import { barriosValidos, contextoRegistro } from '#lib/server/entorno';
import { recuentos } from '#lib/server/registro';

export const prerender = false;

export async function GET({ url, platform }) {
	const c = await contextoRegistro(platform?.env);
	if (!c) error(503, 'Recuentos no disponibles');
	const b = url.searchParams.get('barrio');
	const barrio = b && barriosValidos.has(b) ? b : null;
	return json(await recuentos(c.db, barrio), { headers: { 'cache-control': 'public, max-age=60' } });
}
