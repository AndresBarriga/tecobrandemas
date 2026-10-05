/**
 * Worker: /api/geocode no registra la dirección; /api/tarjeta solo guarda lo de la tarjeta;
 * el almacén de tarjetas (D1 + R2) no tiene columnas de precio, m² ni dirección.
 */
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST as postGeocode } from '../src/routes/api/geocode/+server';
import { POST as postTarjeta } from '../src/routes/api/tarjeta/+server';
import { d1Local } from '../src/lib/server/callejero-local';
import {
	type D1TarjetasMinimo, ID_VALIDO, SQL_TARJETAS, almacenCloudflare, almacenMemoria, nuevoId
} from '../src/lib/server/tarjetas';
import { type TarjetaDatos, construirTarjeta, construirPantalla } from '../src/lib/resultado';
import { hayCallejero } from './callejero';

const tarjeta = (): TarjetaDatos => {
	const p = construirPantalla(
		{ precio: 2500, superficie: 90, obraNueva: false, tipo: 'piso', largaDuracion: true },
		{ cusecs: ['A'], aproximada: false, motivo: null, numerosUsados: [], punto: null, via: null },
		{
			secciones: { A: { cdis: '07', barrio: '071', smed: 70, p25: 12, p75: 20, n: 100, n_vu: 0, med2015: 10, med2024: 15 } },
			barrios: { '071': { nombre: 'Almagro', cod_distrito: '07', distrito: 'Chamberí' } },
			ipc: { factor: 1.05, ultimo_mes: '2026-08' }
		}
	);
	if (p.tipo !== 'resultado') throw new Error('esperaba resultado');
	return construirTarjeta(p);
};

/** D1 sobre SQLite en memoria, con la misma interfaz mínima */
function d1Memoria() {
	const db = new DatabaseSync(':memory:');
	db.exec(SQL_TARJETAS);
	const d1: D1TarjetasMinimo = {
		prepare: (sql) => ({
			bind: (...v) => ({
				run: async () => db.prepare(sql).run(...(v as (string | number | null)[])),
				first: async <T>() => (db.prepare(sql).get(...(v as (string | number | null)[])) as T | undefined) ?? null
			})
		})
	};
	return { db, d1 };
}

const r2Falso = () => {
	const objetos = new Map<string, Uint8Array>();
	return {
		objetos,
		put: async (k: string, v: Uint8Array) => void objetos.set(k, v),
		get: async (k: string) => {
			const o = objetos.get(k);
			return o ? { arrayBuffer: async () => o.buffer.slice(o.byteOffset, o.byteOffset + o.byteLength) as ArrayBuffer } : null;
		}
	};
};

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

describe('almacén de tarjetas', () => {
	it('ids de 10 caracteres, sin repetirse', () => {
		const ids = new Set(Array.from({ length: 200 }, nuevoId));
		expect(ids.size).toBe(200);
		for (const id of ids) expect(id).toMatch(ID_VALIDO);
	});

	it('memoria: guarda y lee', async () => {
		const a = almacenMemoria();
		const id = await a.crear(tarjeta(), JPEG);
		expect((await a.leer(id))?.datos).toEqual(tarjeta());
		expect(await a.leerOg(id)).toEqual(JPEG);
		expect(await a.leer('zzzzzzzzzz')).toBeNull();
	});

	it('D1 + R2: sin columnas de precio, m², dirección ni fecha exacta', async () => {
		const { db, d1 } = d1Memoria();
		const r2 = r2Falso();
		const a = almacenCloudflare(d1, r2, () => new Date('2026-10-05T10:20:30Z'));
		const id = await a.crear(tarjeta(), JPEG);

		const columnas = (db.prepare('PRAGMA table_info(tarjetas)').all() as { name: string }[]).map((c) => c.name);
		expect(columnas).toEqual(['id', 'mes', 'barrio', 'nivel', 'datos']);
		for (const prohibida of ['ip', 'direccion', 'cusec', 'seccion', 'fecha', 'ts', 'precio', 'm2']) {
			expect(columnas).not.toContain(prohibida);
		}

		const fila = db.prepare('SELECT * FROM tarjetas WHERE id = ?').get(id) as Record<string, string>;
		expect(fila).toMatchObject({ mes: '2026-10', barrio: 'Almagro', nivel: 'c' });
		expect(fila.datos).not.toMatch(/2500|2\.500/);

		expect((await a.leer(id))?.datos).toEqual(tarjeta());
		expect(await a.leerOg(id)).toEqual(JPEG);
		expect(r2.objetos.has(`og/${id}.jpg`)).toBe(true);
		expect(await a.leer('zzzzzzzzzz')).toBeNull();
	});
});

describe('POST /api/tarjeta', () => {
	const formulario = (datos: unknown, og: Uint8Array | null = JPEG) => {
		const f = new FormData();
		f.append('tarjeta', JSON.stringify(datos));
		if (og) f.append('og', new File([og as BlobPart], 'og.jpg', { type: 'image/jpeg' }));
		return f;
	};
	const llamar = (cuerpo: FormData, env: object) =>
		postTarjeta({ request: new Request('http://x/api/tarjeta', { method: 'POST', body: cuerpo }), platform: { env } } as never);

	it('guarda solo los campos de la tarjeta', async () => {
		const { db, d1 } = d1Memoria();
		const r = await llamar(formulario({ ...tarjeta(), precio: 2500, direccion: 'Calle X 3' }), { DB: d1, TARJETAS: r2Falso() });
		expect(r.status).toBe(201);
		const { id } = (await r.json()) as { id: string };
		const fila = db.prepare('SELECT datos FROM tarjetas WHERE id = ?').get(id) as { datos: string };
		expect(fila.datos).not.toMatch(/2500|2\.500|"precio"|direccion|Calle X/);
	});

	it('rechaza tarjetas mal formadas y imágenes que no son JPEG', async () => {
		const env = { DB: d1Memoria().d1, TARJETAS: r2Falso() };
		await expect(llamar(formulario({ precio: 2500 }), env)).rejects.toMatchObject({ status: 400 });
		await expect(llamar(formulario(tarjeta(), new Uint8Array([1, 2, 3, 4])), env)).rejects.toMatchObject({ status: 400 });
		await expect(llamar(formulario(tarjeta(), new Uint8Array(400_000).fill(0xff)), env)).rejects.toMatchObject({ status: 413 });
	});
});

describe.skipIf(!hayCallejero)('POST /api/geocode', () => {
	afterEach(() => vi.restoreAllMocks());

	it('devuelve la ubicación y no deja rastro de la dirección: ni logs ni escrituras', async () => {
		const real = await d1Local();
		const consultas: { sql: string; valores: unknown[] }[] = [];
		const espiada = {
			prepare: (sql: string) => ({
				bind: (...valores: unknown[]) => {
					consultas.push({ sql, valores });
					return real.prepare(sql).bind(...valores);
				},
				all: () => {
					consultas.push({ sql, valores: [] });
					return real.prepare(sql).all();
				}
			})
		};
		const logs = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));

		const direccion = 'Calle de Fuente del Berro 14';
		const r = await postGeocode({
			request: new Request('http://x/api/geocode', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ texto: direccion })
			}),
			platform: { env: { CALLEJERO: espiada } }
		} as never);
		const cuerpo = await r.json();

		expect(cuerpo).toMatchObject({ estado: 'exacta', numero: 14 });
		expect(r.headers.get('cache-control')).toBe('no-store');
		for (const l of logs) expect(l).not.toHaveBeenCalled();
		// Solo lecturas, y ninguna lleva el texto escrito
		expect(consultas.every((c) => /^\s*SELECT/i.test(c.sql))).toBe(true);
		expect(JSON.stringify(consultas)).not.toMatch(/Fuente del Berro/i);
	});

	it('rechaza cuerpos que no son una dirección', async () => {
		const llamar = (cuerpo: string) =>
			postGeocode({
				request: new Request('http://x/api/geocode', { method: 'POST', body: cuerpo }),
				platform: { env: { CALLEJERO: await_d1() } }
			} as never);
		const await_d1 = () => ({ prepare: () => ({ bind: () => ({ all: async () => ({ results: [] }) }), all: async () => ({ results: [] }) }) });
		await expect(llamar('no es json')).rejects.toMatchObject({ status: 400 });
		await expect(llamar(JSON.stringify({ texto: '' }))).rejects.toMatchObject({ status: 400 });
		await expect(llamar(JSON.stringify({ texto: 'x'.repeat(300) }))).rejects.toMatchObject({ status: 400 });
		await expect(llamar(JSON.stringify({ texto: 5 }))).rejects.toMatchObject({ status: 400 });
	});
});
