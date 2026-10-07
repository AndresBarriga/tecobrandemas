/**
 * «¿Cuánto pagas tú?»: del texto de la calle al barrio (en el navegador) y envío de la aportación.
 * Solo se envía con la casilla de consentimiento marcada; la calle no sale de la geocodificación
 * y no se guarda: del servidor solo se lleva el barrio.
 */
import { type AportacionPayload, type BarrioDeSeccion, type HabitacionPayload, barriosDe } from '#lib/resultado';
import { cargarDatos } from './datos';
import { buscarDireccion } from './direccion';

export type BarriosDeLaCalle =
	| { tipo: 'barrios'; barrios: BarrioDeSeccion[] }
	| { tipo: 'calle_larga' }
	| { tipo: 'no_encontrada' };

export async function barriosDeLaCalle(texto: string): Promise<BarriosDeLaCalle> {
	const [datos, r] = await Promise.all([cargarDatos(), buscarDireccion(texto)]);
	if (r.tipo === 'pedir_numero_o_mapa') return { tipo: 'calle_larga' };
	if (r.tipo === 'no_encontrada') return { tipo: 'no_encontrada' };
	const barrios = barriosDe(datos, r.ubicacion.cusecs);
	return barrios.length ? { tipo: 'barrios', barrios } : { tipo: 'no_encontrada' };
}

export type EnvioAportacion = 'guardada' | 'no_guardada' | 'limite' | 'error';

export async function enviarAportacion(p: AportacionPayload): Promise<EnvioAportacion> {
	try {
		const r = await fetch('/api/aportacion', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(p)
		});
		if (r.status === 429) return 'limite';
		if (!r.ok) return 'error';
		return ((await r.json()) as { guardado: boolean }).guardado ? 'guardada' : 'no_guardada';
	} catch {
		return 'error';
	}
}

export async function enviarHabitacion(p: HabitacionPayload): Promise<EnvioAportacion> {
	try {
		const r = await fetch('/api/habitacion', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(p)
		});
		if (r.status === 429) return 'limite';
		if (!r.ok) return 'error';
		return ((await r.json()) as { guardado: boolean }).guardado ? 'guardada' : 'no_guardada';
	} catch {
		return 'error';
	}
}

/** Habitaciones aportadas en el barrio con el mismo «incluye gastos»: el recuento y, desde 20, la mediana */
export async function pedirComparacion(barrio: string, gastos: boolean): Promise<{ n: number; mediana: number | null } | null> {
	try {
		// `t` evita la caché de 60 s: tras aportar, el recuento tiene que incluir la propia
		const r = await fetch(`/api/habitacion?barrio=${encodeURIComponent(barrio)}&gastos=${gastos ? 1 : 0}&t=${Date.now()}`);
		return r.ok ? await r.json() : null;
	} catch {
		return null;
	}
}
