/** Base del registro para desarrollo: SQLite en memoria con el esquema de migrations/. Solo se carga en `vite dev`. */
import type { D1Registro, D1Sentencia } from './db';

export async function dbLocal(esquema: string): Promise<D1Registro> {
	const { DatabaseSync } = await import(/* @vite-ignore */ 'node:sqlite');
	const db = new DatabaseSync(':memory:');
	db.exec(esquema);
	type Valor = string | number | null;
	const sentencia = (sql: string, v: unknown[] = []): D1Sentencia => ({
		bind: (...x) => sentencia(sql, x),
		run: async () => db.prepare(sql).run(...(v as Valor[])),
		first: async <T>() => (db.prepare(sql).get(...(v as Valor[])) as T | undefined) ?? null,
		all: async <T>() => ({ results: db.prepare(sql).all(...(v as Valor[])) as T[] })
	});
	return { prepare: (sql) => sentencia(sql) };
}
