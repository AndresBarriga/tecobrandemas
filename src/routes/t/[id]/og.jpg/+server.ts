/** Vista previa del enlace (1200×630) de una tarjeta compartida */
import { error } from '@sveltejs/kit';
import { almacenTarjetas, entornoDe } from '#lib/server/entorno';
import { ID_VALIDO } from '#lib/server/tarjetas';

export const prerender = false;

export async function GET({ params, platform }) {
	const almacen = almacenTarjetas(await entornoDe(platform));
	if (!almacen || !ID_VALIDO.test(params.id)) error(404, 'No existe');
	const og = await almacen.leerOg(params.id);
	if (!og) error(404, 'No existe');
	return new Response(og as BodyInit, {
		headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable' }
	});
}
