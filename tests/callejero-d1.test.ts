/** El adaptador de D1, probado sobre el SQLite local con la misma interfaz */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { type D1Minimo, almacenD1, indiceD1, olvidarIndice } from '../src/lib/server/callejero-d1';
import { geocodificar } from '../src/lib/ubicacion/geocodificar';
import { hayCallejero } from './callejero';

function d1Local(): D1Minimo {
	const db = new DatabaseSync(fileURLToPath(new URL('../data/processed/geocoder.sqlite', import.meta.url)), { readOnly: true });
	const ejecutar = <T>(sql: string, valores: unknown[]) =>
		Promise.resolve({ results: db.prepare(sql).all(...(valores as (string | number)[])) as T[] });
	return {
		prepare: (sql) => ({
			bind: (...valores) => ({ all: <T>() => ejecutar<T>(sql, valores) }),
			all: <T>() => ejecutar<T>(sql, [])
		})
	};
}

describe.skipIf(!hayCallejero)('callejero en D1', () => {
	it('geocodifica con el índice y los portales de D1', async () => {
		const db = d1Local();
		const r = await geocodificar('Paseo de la Castellana 100', await indiceD1(db), almacenD1(db));
		expect(r).toMatchObject({ estado: 'exacta', cusecs: ['2807905002'], vial: { nombre: 'Paseo Castellana' } });
	});

	it('reutiliza el índice entre peticiones', async () => {
		const db = d1Local();
		expect(await indiceD1(db)).toBe(await indiceD1(db));
	});
});

describe('el índice no se comparte como promesa entre peticiones', () => {
	const bd = (all: () => Promise<{ results: unknown[] }>): D1Minimo => ({ prepare: () => ({ bind: () => ({ all: all as never }), all: all as never }) });
	const conLimite = <T>(p: Promise<T>, ms = 500) => Promise.race([p, new Promise<never>((_, no) => setTimeout(() => no(new Error('colgado')), ms))]);

	it('una consulta que nunca termina (petición cancelada) no cuelga a las siguientes', async () => {
		olvidarIndice();
		void indiceD1(bd(() => new Promise(() => {}))); // la petición cancelada: no vuelve nunca
		const fila = { id: 1, tipo: 'calle', nombreNorm: 'mayor', visible: 1, nPortales: 10 };
		const indice = await conLimite(indiceD1(bd(() => Promise.resolve({ results: [fila] }))));
		expect(indice).toBeDefined();
	});

	it('si la consulta falla, la siguiente petición lo reintenta', async () => {
		olvidarIndice();
		await expect(indiceD1(bd(() => Promise.reject(new Error('D1 caído'))))).rejects.toThrow('D1 caído');
		const fila = { id: 1, tipo: 'calle', nombreNorm: 'mayor', visible: 1, nPortales: 10 };
		await expect(conLimite(indiceD1(bd(() => Promise.resolve({ results: [fila] }))))).resolves.toBeDefined();
	});

	it('la ruta de geocodificación tiene un límite de tiempo y el cliente también', () => {
		const ruta = readFileSync(fileURLToPath(new URL('../src/routes/api/geocode/+server.ts', import.meta.url)), 'utf8');
		expect(ruta).toContain('LIMITE_MS');
		expect(ruta).toContain("error(503, 'Callejero no disponible')");
		expect(readFileSync(fileURLToPath(new URL('../src/lib/cliente/direccion.ts', import.meta.url)), 'utf8')).toContain('AbortSignal.timeout');
	});
});
