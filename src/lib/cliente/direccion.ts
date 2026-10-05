/** Geocodificación: la dirección se envía a nuestro propio Worker, que no la guarda ni la registra */
import { type ResolucionDireccion, resolverDireccion } from '#lib/resultado';

export class SinConexion extends Error {
	constructor() {
		super('sin conexión');
	}
}

export async function buscarDireccion(texto: string): Promise<ResolucionDireccion> {
	let r: Response;
	try {
		r = await fetch('/api/geocode', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ texto })
		});
	} catch {
		throw new SinConexion();
	}
	// 400: texto que el servidor no acepta (vacío o demasiado largo): se trata como no encontrada
	if (r.status === 400) return { tipo: 'no_encontrada', sugerencias: [] };
	if (!r.ok) throw new SinConexion();
	return resolverDireccion(await r.json());
}
