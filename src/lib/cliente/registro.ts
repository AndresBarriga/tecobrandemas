import type { RegistroAnalisis } from '#lib/resultado';
import { tarjetaOrigen } from './origen';

/**
 * Registro anónimo de un análisis (R7). Solo se llama cuando la persona ha marcado la casilla.
 * Un fallo de red no se avisa: el resultado ya se ha visto y no se reintenta en silencio.
 */
export async function registrarAnalisis(r: RegistroAnalisis): Promise<boolean> {
	try {
		const res = await fetch('/api/analisis', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ ...r, tarjetaOrigen: tarjetaOrigen() })
		});
		return res.ok;
	} catch {
		return false;
	}
}
