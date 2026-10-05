/**
 * POST /api/tarjeta (multipart: `tarjeta` JSON + `og` JPG) → { id }.
 * Solo se guarda lo que pasa validarTarjeta (sin precio, m² ni dirección). El límite diario por
 * IP con HMAC rotado y el registro de eventos llegan en el Hito 5.
 */
import { json, error } from '@sveltejs/kit';
import { validarTarjeta } from '#lib/resultado';
import { almacenTarjetas } from '#lib/server/entorno';

export const prerender = false;

const MAX_OG = 300_000;
const esJpeg = (b: Uint8Array) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

export async function POST({ request, platform }) {
	const almacen = almacenTarjetas(platform?.env);
	if (!almacen) error(503, 'Almacén no disponible');

	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		error(400, 'Petición no válida');
	}

	const bruto = form.get('tarjeta');
	let datos = null;
	try {
		datos = typeof bruto === 'string' && bruto.length < 5_000 ? validarTarjeta(JSON.parse(bruto)) : null;
	} catch {
		datos = null;
	}
	if (!datos) error(400, 'Tarjeta no válida');

	let og: Uint8Array | null = null;
	const fichero = form.get('og');
	if (fichero instanceof File) {
		if (fichero.size > MAX_OG) error(413, 'Imagen demasiado grande');
		const bytes = new Uint8Array(await fichero.arrayBuffer());
		if (!esJpeg(bytes)) error(400, 'Imagen no válida');
		og = bytes;
	}

	const id = await almacen.crear(datos, og);
	return json({ id }, { status: 201, headers: { 'cache-control': 'no-store' } });
}
