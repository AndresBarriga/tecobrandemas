/**
 * GET /mapa/madrid.pmtiles — teselas de OpenStreetMap (Protomaps) de Madrid, con rangos de bytes.
 * En producción salen de R2 (enlace MAPA); en `vite dev`, de data/processed/madrid.pmtiles.
 * El archivo no cambia entre regeneraciones del mapa, así que se puede cachear.
 */
import { error } from '@sveltejs/kit';
import { entornoDe } from '#lib/server/entorno';

export const prerender = false;

const CABECERAS = {
	'content-type': 'application/octet-stream',
	'accept-ranges': 'bytes',
	'cache-control': 'public, max-age=86400'
};

export async function GET({ request, platform }) {
	const env = await entornoDe(platform);
	if (env?.MAPA) {
		const objeto = await env.MAPA.get('madrid.pmtiles', { range: request.headers });
		if (!objeto) error(404, 'Mapa no disponible');
		const cuerpo = objeto.body;
		if (!cuerpo) error(416, 'Rango no válido');
		const r = objeto.range;
		const cabeceras: Record<string, string> = { ...CABECERAS, etag: objeto.httpEtag };
		if (r && request.headers.has('range')) {
			const inicio = r.offset ?? 0;
			const largo = r.length ?? objeto.size - inicio;
			cabeceras['content-range'] = `bytes ${inicio}-${inicio + largo - 1}/${objeto.size}`;
			cabeceras['content-length'] = String(largo);
			return new Response(cuerpo, { status: 206, headers: cabeceras });
		}
		cabeceras['content-length'] = String(objeto.size);
		return new Response(cuerpo, { headers: cabeceras });
	}
	if (import.meta.env.DEV) return (await import('#lib/server/mapa-local')).servirLocal(request);
	error(503, 'Mapa no disponible');
}
