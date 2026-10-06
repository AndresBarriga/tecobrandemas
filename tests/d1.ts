/** D1 sobre SQLite en memoria con el esquema real de migrations/ */
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import type { D1Registro, D1Sentencia } from '../src/lib/server/db';

export const ESQUEMA = ['0001_registro', '0002_aportaciones_firma']
	.map((m) => readFileSync(fileURLToPath(new URL(`../migrations/${m}.sql`, import.meta.url)), 'utf-8'))
	.join('\n');

export function d1Registro() {
	const db = new DatabaseSync(':memory:');
	db.exec(ESQUEMA);
	const sentencia = (sql: string, valores: unknown[] = []): D1Sentencia => ({
		bind: (...v) => sentencia(sql, v),
		run: async () => db.prepare(sql).run(...(valores as (string | number | null)[])),
		first: async <T>() => (db.prepare(sql).get(...(valores as (string | number | null)[])) as T | undefined) ?? null,
		all: async <T>() => ({ results: db.prepare(sql).all(...(valores as (string | number | null)[])) as T[] })
	});
	const d1: D1Registro = { prepare: (sql) => sentencia(sql) };
	return { db, d1 };
}
