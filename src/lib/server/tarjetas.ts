/**
 * Tarjetas compartidas (/t/:id). Se guarda solo lo que sale de validarTarjeta (nivel, cifra,
 * barrio, frase y barra en fracciones) y la vista previa JPG: nunca precio, m² ni dirección.
 * Producción: D1 (tabla `tarjetas`) + R2 (vista previa). Desarrollo y tests: memoria.
 */
import { type TarjetaDatos, esV2 } from '../resultado';

export interface TarjetaGuardada {
	datos: TarjetaDatos;
}

export interface AlmacenTarjetas {
	/**
	 * Guarda la tarjeta. Con `id` (lo genera el navegador antes de subirla) se usa ese; si ya existe
	 * no se toca nada y se devuelve el mismo id: subir dos veces es inofensivo y nadie reescribe una tarjeta.
	 */
	crear(datos: TarjetaDatos, og: Uint8Array | null, id?: string): Promise<string>;
	leer(id: string): Promise<TarjetaGuardada | null>;
	leerOg(id: string): Promise<Uint8Array | null>;
}

/** Id corto y no adivinable: 10 caracteres en base 36 (≈ 52 bits) */
export function nuevoId(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(10));
	return [...bytes].map((b) => (b % 36).toString(36)).join('');
}

/** Tarjeta fija de la prueba de humo: no cuenta en las métricas */
export const ID_TARJETA_PRUEBA = 'pruebahumo';

export const ID_VALIDO = /^[0-9a-z]{10}$/;

export function almacenMemoria(): AlmacenTarjetas {
	const filas = new Map<string, { datos: TarjetaDatos; og: Uint8Array | null }>();
	return {
		async crear(datos, og, id = nuevoId()) {
			if (!filas.has(id)) filas.set(id, { datos, og });
			return id;
		},
		async leer(id) {
			const f = filas.get(id);
			return f ? { datos: f.datos } : null;
		},
		async leerOg(id) {
			return filas.get(id)?.og ?? null;
		}
	};
}

// ——— Cloudflare: D1 + R2 ———

export interface D1TarjetasMinimo {
	prepare(sql: string): {
		bind(...valores: unknown[]): {
			run(): Promise<unknown>;
			first<T>(): Promise<T | null>;
		};
	};
}

export interface R2Minimo {
	put(clave: string, valor: Uint8Array, opciones?: { httpMetadata?: { contentType: string } }): Promise<unknown>;
	get(clave: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>;
}

/** Esquema de la tabla (migración del Hito 5): sin fecha ni precio; solo el mes */
export const SQL_TARJETAS =
	'CREATE TABLE IF NOT EXISTS tarjetas (id TEXT PRIMARY KEY, mes TEXT NOT NULL, barrio TEXT, nivel TEXT NOT NULL, datos TEXT NOT NULL)';

export function almacenCloudflare(db: D1TarjetasMinimo, r2: R2Minimo, ahora: () => Date = () => new Date()): AlmacenTarjetas {
	return {
		async crear(datos, og, id = nuevoId()) {
			if (await db.prepare('SELECT id FROM tarjetas WHERE id = ?').bind(id).first()) return id;
			const mes = ahora().toISOString().slice(0, 7);
			await db
				.prepare('INSERT INTO tarjetas (id, mes, barrio, nivel, datos) VALUES (?, ?, ?, ?, ?)')
				.bind(id, mes, datos.barrio, esV2(datos) ? datos.contratos.clase : datos.clase, JSON.stringify(datos))
				.run();
			if (og) await r2.put(`og/${id}.jpg`, og, { httpMetadata: { contentType: 'image/jpeg' } });
			return id;
		},
		async leer(id) {
			const f = await db.prepare('SELECT datos FROM tarjetas WHERE id = ?').bind(id).first<{ datos: string }>();
			return f ? { datos: JSON.parse(f.datos) as TarjetaDatos } : null;
		},
		async leerOg(id) {
			const o = await r2.get(`og/${id}.jpg`);
			return o ? new Uint8Array(await o.arrayBuffer()) : null;
		}
	};
}
