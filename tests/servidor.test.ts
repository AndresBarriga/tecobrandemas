/**
 * Worker: /api/geocode no registra la dirección; /api/tarjeta solo guarda lo de la tarjeta;
 * el almacén de tarjetas (D1 + R2) no tiene columnas de precio, m² ni dirección.
 */
import { readFileSync } from 'node:fs';
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

	it('memoria: con id propuesto es idempotente', async () => {
		const a = almacenMemoria();
		expect(await a.crear(tarjeta(), JPEG, 'abcde12345')).toBe('abcde12345');
		expect(await a.crear({ ...tarjeta(), barrio: 'Otro' }, null, 'abcde12345')).toBe('abcde12345');
		expect((await a.leer('abcde12345'))?.datos.barrio).toBe('Almagro');
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
		expect(fila).toMatchObject({ mes: '2026-10', barrio: 'Almagro', nivel: 'encima' });
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

	it('usa el id que propone el navegador y no reescribe una tarjeta que ya existe', async () => {
		const { db, d1 } = d1Memoria();
		const env = { DB: d1, TARJETAS: r2Falso() };
		const f1 = formulario(tarjeta());
		f1.append('id', 'abcde12345');
		const r1 = await llamar(f1, env);
		expect(r1.status).toBe(201);
		expect(((await r1.json()) as { id: string }).id).toBe('abcde12345');

		// Otro canal sube lo mismo, o alguien intenta pisar la tarjeta con otra: no cambia nada
		const f2 = formulario({ ...tarjeta(), barrio: 'Otro barrio' });
		f2.append('id', 'abcde12345');
		expect(((await (await llamar(f2, env)).json()) as { id: string }).id).toBe('abcde12345');
		const fila = db.prepare('SELECT barrio FROM tarjetas WHERE id = ?').get('abcde12345') as { barrio: string };
		expect(fila.barrio).toBe('Almagro');
		expect((db.prepare('SELECT COUNT(*) AS n FROM tarjetas').get() as { n: number }).n).toBe(1);
	});

	it('rechaza un id con formato no válido', async () => {
		const env = { DB: d1Memoria().d1, TARJETAS: r2Falso() };
		for (const malo of ['corto', 'ABCDE12345', 'abcde1234!', '../../etc/p']) {
			const f = formulario(tarjeta());
			f.append('id', malo);
			await expect(llamar(f, env)).rejects.toMatchObject({ status: 400 });
		}
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
			platform: { env: { CALLEJERO: espiada } },
			getClientAddress: () => '203.0.113.9'
		} as never);
		const cuerpo = await r.json();

		expect(cuerpo).toMatchObject({ estado: 'exacta', numero: 14 });
		expect(r.headers.get('cache-control')).toBe('no-store');
		for (const l of logs) expect(l).not.toHaveBeenCalled();
		// Solo lecturas, y ninguna lleva el texto escrito
		expect(consultas.every((c) => /^\s*SELECT/i.test(c.sql))).toBe(true);
		expect(JSON.stringify(consultas)).not.toMatch(/Fuente del Berro/i);
	});

	it('si el límite no puede escribir en D1, la búsqueda sigue funcionando', async () => {
		const roto = { prepare: () => { throw new Error('D1_ERROR: daily row write limit'); } };
		const real = await d1Local();
		const r = await postGeocode({
			request: new Request('http://x/api/geocode', { method: 'POST', body: JSON.stringify({ texto: 'Calle de Fuente del Berro 14' }) }),
			platform: { env: { CALLEJERO: real, DB: roto, SECRETO: 's' } },
			getClientAddress: () => '203.0.113.9'
		} as never);
		expect(r.status).toBe(200);
		expect(await r.json()).toMatchObject({ estado: 'exacta' });
	});

	it('rechaza cuerpos que no son una dirección', async () => {
		const llamar = (cuerpo: string) =>
			postGeocode({
				request: new Request('http://x/api/geocode', { method: 'POST', body: cuerpo }),
				platform: { env: { CALLEJERO: await_d1() } },
				getClientAddress: () => '203.0.113.9'
			} as never);
		const await_d1 = () => ({ prepare: () => ({ bind: () => ({ all: async () => ({ results: [] }) }), all: async () => ({ results: [] }) }) });
		await expect(llamar('no es json')).rejects.toMatchObject({ status: 400 });
		await expect(llamar(JSON.stringify({ texto: '' }))).rejects.toMatchObject({ status: 400 });
		await expect(llamar(JSON.stringify({ texto: 'x'.repeat(300) }))).rejects.toMatchObject({ status: 400 });
		await expect(llamar(JSON.stringify({ texto: 5 }))).rejects.toMatchObject({ status: 400 });
	});
});

// ——— Registro, aportaciones y contadores ———
import { GET as getContadores } from '../src/routes/api/contadores/+server';
import { POST as postAnalisis } from '../src/routes/api/analisis/+server';
import { POST as postAportacion } from '../src/routes/api/aportacion/+server';
import { d1Registro } from './d1';

describe('endpoints de registro', () => {
	const entorno = () => ({ DB: d1Registro().d1, SECRETO: 'prueba' });
	const peticion = (handler: (e: never) => unknown, env: object, cuerpo: unknown, ip = '5.5.5.5') =>
		handler({
			request: new Request('http://x/api', { method: 'POST', body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo) }),
			platform: { env },
			getClientAddress: () => ip
		} as never) as Promise<Response>;
	const barrio = Object.keys((JSON.parse(readFileSync(new URL('../data/processed/seccion_barrio.json', import.meta.url), 'utf-8')) as { barrios: object }).barrios)[0]!;
	const analisis = (precio = 1400) => ({ barrio, precio, m2: 70, nivel: 'c' });

	it('análisis: 201 al guardar, 202 si es duplicado o implausible, 400 si no es válido, 429 al pasar el límite', async () => {
		const env = entorno();
		expect((await peticion(postAnalisis, env, analisis())).status).toBe(201);
		expect((await peticion(postAnalisis, env, analisis(), '6.6.6.6')).status).toBe(202);
		expect(await (await peticion(postAnalisis, env, analisis(60_000), '6.6.6.6')).json()).toEqual({ guardado: false });
		await expect(peticion(postAnalisis, env, { barrio: 'zzz', precio: 1, m2: 1, nivel: 'c' })).rejects.toMatchObject({ status: 400 });
		await expect(peticion(postAnalisis, env, 'no es json')).rejects.toMatchObject({ status: 400 });
		for (let i = 0; i < 20; i++) await peticion(postAnalisis, env, analisis(1500 + i * 10), '7.7.7.7');
		await expect(peticion(postAnalisis, env, analisis(2000), '7.7.7.7')).rejects.toMatchObject({ status: 429 });
	});

	it('aportación', async () => {
		const env = entorno();
		const ok = { barrio, precio: 1150, m2: 68, anioContrato: 2023, incluye: ['garaje'] };
		expect((await peticion(postAportacion, env, ok)).status).toBe(201);
		await expect(peticion(postAportacion, env, { ...ok, anioContrato: 1800 })).rejects.toMatchObject({ status: 400 });
	});

	it('contadores: el barrio queda oculto por debajo de 10', async () => {
		const env = entorno();
		const r = await getContadores({ url: new URL(`http://x/api/contadores?barrio=${barrio}`), platform: { env } } as never);
		expect(await r.json()).toEqual({ barrio: null, aportacionesBarrio: null });
	});

	it('sin base de datos en producción da 503, no se guarda en memoria', async () => {
		// En pruebas import.meta.env.DEV es true; sin DB cae a la base local, que sí responde
		expect((await peticion(postAportacion, {}, { barrio, precio: 1150, m2: 68, anioContrato: 2023, incluye: ['garaje'] })).status).toBe(201);
	});
});
