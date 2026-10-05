/**
 * Callejero para desarrollo: lee data/processed/geocoder.sqlite con node:sqlite, con la misma
 * interfaz que D1. Solo se carga en `vite dev` y en las pruebas; en el Worker se usa D1.
 */
import type { D1Minimo } from './callejero-d1';

export async function d1Local(): Promise<D1Minimo> {
	const { DatabaseSync } = await import(/* @vite-ignore */ 'node:sqlite');
	const db = new DatabaseSync('data/processed/geocoder.sqlite', { readOnly: true });
	const ejecutar = <T>(sql: string, valores: unknown[]) =>
		Promise.resolve({ results: db.prepare(sql).all(...(valores as (string | number)[])) as T[] });
	return {
		prepare: (sql) => ({
			bind: (...valores) => ({ all: <T>() => ejecutar<T>(sql, valores) }),
			all: <T>() => ejecutar<T>(sql, [])
		})
	};
}
