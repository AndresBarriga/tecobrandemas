/** Recuentos públicos por barrio (solo salen desde 10 observaciones); sin ellos, el bloque no se muestra */
export async function recuentos(barrio?: string | null): Promise<{ barrio: number | null; aportacionesBarrio: number | null } | null> {
	try {
		const r = await fetch(`/api/contadores${barrio ? `?barrio=${encodeURIComponent(barrio)}` : ''}`);
		return r.ok ? await r.json() : null;
	} catch {
		return null;
	}
}
