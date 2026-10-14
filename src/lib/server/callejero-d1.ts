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

/**
 * Se guarda el índice YA CARGADO, nunca la promesa de cargarlo: una promesa compartida entre peticiones queda atada a la petición
 * que la creó y, si esa petición se cancela (la persona cierra la pestaña) a media consulta, no termina jamás; todas las
 * peticiones siguientes de ese isolate se quedan esperándola para siempre (fallo en producción el 14/10/2026: /api/geocode
 * sin respuesta, con 1 ms de CPU). Dos peticiones en frío a la vez hacen la consulta cada una: no pasa nada.
 */
let indice: IndiceViales | null = null;

export async function indiceD1(db: D1Minimo): Promise<IndiceViales> {
	if (indice) return indice;
	const r = await db
		.prepare('SELECT id, tipo, nombre_norm AS nombreNorm, visible, n_portales AS nPortales FROM viales')
		.all<Vial>();
	indice = new IndiceViales(r.results);
	return indice;
}

/** Solo para las pruebas: olvida el índice cargado */
export const olvidarIndice = () => {
	indice = null;
};
