/** El adaptador de D1, probado sobre el SQLite local con la misma interfaz */
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { type D1Minimo, almacenD1, indiceD1 } from '../src/lib/server/callejero-d1';
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
