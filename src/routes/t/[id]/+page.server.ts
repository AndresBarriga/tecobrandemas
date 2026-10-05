import { error } from '@sveltejs/kit';
import { almacenTarjetas, entornoDe } from '#lib/server/entorno';
import { ID_VALIDO } from '#lib/server/tarjetas';

export const prerender = false;

export async function load({ params, platform, setHeaders }) {
	const almacen = almacenTarjetas(await entornoDe(platform));
	if (!almacen) error(503, 'Almacén no disponible');
	if (!ID_VALIDO.test(params.id)) error(404, 'Esta tarjeta no existe');
	const t = await almacen.leer(params.id);
	if (!t) error(404, 'Esta tarjeta no existe');
	setHeaders({ 'cache-control': 'public, max-age=300' });
	return { id: params.id, tarjeta: t.datos };
}
