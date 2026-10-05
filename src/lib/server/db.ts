/** Lo mínimo de D1 que usa el registro; permite probarlo con SQLite local */
export interface D1Sentencia {
	bind(...valores: unknown[]): D1Sentencia;
	run(): Promise<unknown>;
	first<T>(): Promise<T | null>;
	all<T>(): Promise<{ results: T[] }>;
}

export interface D1Registro {
	prepare(sql: string): D1Sentencia;
}
