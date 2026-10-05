/**
 * Callejero en Cloudflare D1 (mismas tablas que data/processed/geocoder.sqlite).
 * El índice de viales se carga una vez por instancia del Worker (~9.000 filas) y se reutiliza.
 */
import type { AlmacenCallejero, Portal } from '../ubicacion/geocodificar';
import { IndiceViales, type Vial } from '../ubicacion/indice';

/** Lo mínimo de la API de D1 que se usa; permite probarlo con SQLite local */
export interface D1Minimo {
	prepare(sql: string): {
		bind(...valores: unknown[]): { all<T>(): Promise<{ results: T[] }> };
		all<T>(): Promise<{ results: T[] }>;
	};
}

export function almacenD1(db: D1Minimo): AlmacenCallejero {
	return {
		async portales(vialId) {
			const r = await db
				.prepare('SELECT numero, extension, lon, lat, cusec FROM portales WHERE vial_id = ?')
				.bind(vialId)
				.all<Portal>();
			return r.results;
		}
	};
}

let indice: Promise<IndiceViales> | null = null;

export function indiceD1(db: D1Minimo): Promise<IndiceViales> {
	indice ??= db
		.prepare('SELECT id, tipo, nombre_norm AS nombreNorm, visible, n_portales AS nPortales FROM viales')
		.all<Vial>()
		.then((r) => new IndiceViales(r.results))
		.catch((e) => {
			indice = null; // se reintenta en la siguiente petición
			throw e;
		});
	return indice;
}
