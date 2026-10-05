/**
 * Acceso a los recursos del Worker (D1 y R2) y alternativas locales para `vite dev`.
 * En producción faltar un recurso es un error (503), nunca se cae a memoria.
 */
import { almacenCloudflare, almacenMemoria, type AlmacenTarjetas, type D1TarjetasMinimo, type R2Minimo } from './tarjetas';
import type { D1Minimo } from './callejero-d1';

export interface EntornoWorker {
	/** Callejero (viales y portales) */
	CALLEJERO?: D1Minimo;
	/** Tarjetas compartidas */
	DB?: D1TarjetasMinimo;
	TARJETAS?: R2Minimo;
}

let memoria: AlmacenTarjetas | null = null;

export function almacenTarjetas(env: EntornoWorker | undefined): AlmacenTarjetas | null {
	if (env?.DB && env.TARJETAS) return almacenCloudflare(env.DB, env.TARJETAS);
	if (import.meta.env.DEV) return (memoria ??= almacenMemoria());
	return null;
}

export async function callejero(env: EntornoWorker | undefined): Promise<D1Minimo | null> {
	if (env?.CALLEJERO) return env.CALLEJERO;
	if (import.meta.env.DEV) return (await import('./callejero-local')).d1Local();
	return null;
}
