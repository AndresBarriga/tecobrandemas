/**
 * Acceso a los recursos del Worker (D1 y R2) y alternativas locales para `vite dev`.
 * En producción faltar un recurso es un error (503), nunca se cae a memoria.
 */
import { almacenCloudflare, almacenMemoria, type AlmacenTarjetas, type D1TarjetasMinimo, type R2Minimo } from './tarjetas';
import type { D1Minimo } from './callejero-d1';
import type { D1Registro } from './db';
import type { Contexto } from './registro';
import barriosJson from '../../../data/processed/seccion_barrio.json';
import esquema1 from '../../../migrations/0001_registro.sql?raw';
import esquema2 from '../../../migrations/0002_aportaciones_firma.sql?raw';

import esquema3 from '../../../migrations/0003_habitaciones.sql?raw';
import esquema4 from '../../../migrations/0004_quitar_eventos.sql?raw';

const esquema = `${esquema1}\n${esquema2}\n${esquema3}\n${esquema4}`;

/** Lo mínimo de R2 que usa la ruta del mapa: lectura con rangos de bytes */
export interface R2Mapa {
	get(
		clave: string,
		opciones: { range: Headers }
	): Promise<{ body?: ReadableStream; size: number; httpEtag: string; range?: { offset?: number; length?: number } } | null>;
}

export interface EntornoWorker {
	/** Callejero (viales y portales) */
	CALLEJERO?: D1Minimo;
	/** Tarjetas compartidas */
	DB?: D1TarjetasMinimo & D1Registro;
	TARJETAS?: R2Minimo;
	/** Teselas del mapa base (PMTiles de Madrid) */
	MAPA?: R2Mapa;
	/** Secreto cifrado del Worker para los HMAC (sal diaria y deduplicación) */
	SECRETO?: string;
}

/**
 * El adaptador de Cloudflare ya no rellena `platform.env`: los recursos se leen de
 * `cloudflare:workers` (en `vite dev` lo sustituye un módulo virtual del adaptador).
 * Si el entorno viene en `platform` (tests), manda ese.
 */
export async function entornoDe(platform: { env?: EntornoWorker } | undefined): Promise<EntornoWorker | undefined> {
	if (platform?.env) return platform.env;
	// En `vite dev` se usan siempre las alternativas locales (SQLite y memoria), no los D1 y R2 simulados de wrangler
	if (import.meta.env.DEV) return undefined;
	try {
		const { env } = await import('cloudflare:workers');
		return env as unknown as EntornoWorker;
	} catch {
		return undefined;
	}
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

const BARRIOS: ReadonlySet<string> = new Set(Object.keys((barriosJson as { barrios: Record<string, unknown> }).barrios));

let dbDev: Promise<D1Registro> | null = null;

/** Base del registro: D1 en el Worker; en desarrollo, SQLite en memoria con el mismo esquema */
async function baseRegistro(env: EntornoWorker | undefined): Promise<D1Registro | null> {
	if (env?.DB) return env.DB;
	if (!import.meta.env.DEV) return null;
	dbDev ??= import('./registro-local').then((m) => m.dbLocal(esquema));
	return dbDev;
}

export async function contextoRegistro(env: EntornoWorker | undefined): Promise<Contexto | null> {
	const db = await baseRegistro(env);
	if (!db) return null;
	const secreto = env?.SECRETO ?? (import.meta.env.DEV ? 'secreto-de-desarrollo' : null);
	if (!secreto) return null;
	return { db, secreto, barrios: BARRIOS, ahora: () => new Date() };
}

export const barriosValidos = BARRIOS;
