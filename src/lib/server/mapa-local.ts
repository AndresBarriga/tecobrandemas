/** Solo en `vite dev`: sirve data/processed/madrid.pmtiles con rangos de bytes (no entra en el Worker) */
import { open, stat } from 'node:fs/promises';
import { error } from '@sveltejs/kit';

const RUTA = 'data/processed/madrid.pmtiles';

export async function servirLocal(request: Request): Promise<Response> {
	const info = await stat(RUTA).catch(() => null);
	if (!info) error(503, 'Falta data/processed/madrid.pmtiles (scripts/09_mapa_base.sh)');
	const m = /^bytes=(\d+)-(\d*)$/.exec(request.headers.get('range') ?? '');
	const inicio = m ? Number(m[1]) : 0;
	const fin = m ? Math.min(m[2] ? Number(m[2]) : info.size - 1, info.size - 1) : info.size - 1;
	const archivo = await open(RUTA);
	const buffer = Buffer.alloc(fin - inicio + 1);
	await archivo.read(buffer, 0, buffer.length, inicio);
	await archivo.close();
	return new Response(buffer, {
		status: m ? 206 : 200,
		headers: {
			'content-type': 'application/octet-stream',
			'accept-ranges': 'bytes',
			'content-length': String(buffer.length),
			...(m ? { 'content-range': `bytes ${inicio}-${fin}/${info.size}` } : {})
		}
	});
}
