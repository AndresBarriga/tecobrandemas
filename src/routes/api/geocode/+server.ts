/**
 * POST /api/geocode { texto } → Geocodificacion.
 * La dirección se usa para buscar y se descarta: no se escribe en logs ni en la base de datos.
 */
import { json, error } from '@sveltejs/kit';
import { callejero, contextoRegistro, entornoDe } from '#lib/server/entorno';
import { puedeGeocodificar } from '#lib/server/registro';
import { almacenD1, indiceD1 } from '#lib/server/callejero-d1';
import { geocodificar } from '#lib/ubicacion/geocodificar';

export const prerender = false;

const MAX_TEXTO = 200;

export async function POST({ request, platform, getClientAddress }) {
	let texto: unknown;
	try {
		({ texto } = (await request.json()) as { texto?: unknown });
	} catch {
		error(400, 'Petición no válida');
	}
	if (typeof texto !== 'string' || !texto.trim() || texto.length > MAX_TEXTO) error(400, 'Dirección no válida');

	const env = await entornoDe(platform);
	const db = await callejero(env);
	if (!db) error(503, 'Callejero no disponible');

	// Límite por IP y día para no agotar el plan gratuito de D1; sin base del registro no se limita
	// Si el límite no puede escribir en D1 (p. ej. cuota diaria agotada), la búsqueda sigue: el límite es una
	// protección, no una condición para responder
	// (En `vite dev` no se limita: las pruebas e2e hacen cientos de búsquedas desde la misma IP)
	const c = import.meta.env.DEV ? null : await contextoRegistro(env);
	const permitida = c ? await puedeGeocodificar(c, getClientAddress()).catch(() => true) : true;
	if (!permitida) error(429, 'Demasiadas búsquedas hoy');
	const resultado = await geocodificar(texto, await indiceD1(db), almacenD1(db));
	return json(resultado, { headers: { 'cache-control': 'no-store' } });
}
