/**
 * Registro anónimo (R7), aportaciones de residentes (R11), habitaciones y recuentos (R10).
 * (Los eventos de uso ya no se guardan aquí: van a PostHog sin cookies, ver src/lib/cliente/analitica.ts.)
 *
 * Reglas (CLAUDE.md y plan):
 *  - se guarda el barrio y el mes, nunca la sección, la dirección, la IP ni la fecha exacta;
 *  - `analisis` y `aportaciones` no se cruzan: tablas, funciones y consultas separadas;
 *  - antiabuso: €/m² entre 5 y 60, duplicado a 30 días, 20 registros por IP y día. La IP solo
 *    existe como HMAC con una sal que rota cada día (la clave caduca a las 24 h);
 *  - los fallos de antiabuso no se notifican como error: el resultado se ve igual y no se guarda.
 */
import type { D1Registro } from './db';

export const EUROS_M2_MIN = 5;
export const EUROS_M2_MAX = 60;
export const LIMITE_REGISTROS_DIA = 20;
/** Cada «Comprobar» geocodifica 1-2 veces: con 200 al día cabe un uso normal y no un volcado */
export const LIMITE_GEOCODIFICACIONES_DIA = 200;
export const DEDUPE_MS = 30 * 24 * 3600 * 1000;
export const LIMITE_MS = 24 * 3600 * 1000;
/** Recuentos públicos solo desde este número de observaciones por barrio */
export const MINIMO_PUBLICO = 10;

export type Resultado = 'guardado' | 'descartado' | 'limite';

export const NIVELES = ['a', 'b', 'c'] as const;
export const INCLUYE = ['garaje', 'trastero', 'comunidad', 'amueblado'] as const;

export interface Contexto {
	db: D1Registro;
	/** Secreto del Worker (variable cifrada) */
	secreto: string;
	/** Códigos de barrio válidos (131) */
	barrios: ReadonlySet<string>;
	ahora: () => Date;
}

// ——— HMAC ———

async function hmac(clave: string, mensaje: string): Promise<string> {
	const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(clave), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const firma = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(mensaje));
	return [...new Uint8Array(firma)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Sal del día: cambia cada día, así que la clave de un día no sirve para reconocer a nadie al siguiente */
export const salDelDia = (secreto: string, ahora: Date) => hmac(secreto, `sal:${ahora.toISOString().slice(0, 10)}`);

export async function claveLimite(secreto: string, ip: string, ahora: Date): Promise<string> {
	return hmac(await salDelDia(secreto, ahora), ip);
}

/** Clave de deduplicación: HMAC con secreto, separada por tipo para que registros y aportaciones no se mezclen */
export const claveDedupe = (secreto: string, tipo: 'a' | 'p' | 'h', precio: number, m2: number, barrio: string) =>
	hmac(secreto, `dedupe:${tipo}:${precio}:${m2}:${barrio}`);

// ——— Validación ———

export const mesDe = (d: Date) => d.toISOString().slice(0, 7);

export function plausible(precio: number, m2: number): boolean {
	if (!Number.isFinite(precio) || !Number.isFinite(m2) || precio <= 0 || m2 <= 0) return false;
	const eurosM2 = precio / m2;
	return eurosM2 >= EUROS_M2_MIN && eurosM2 <= EUROS_M2_MAX;
}

const entero = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x);
const numero = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

export interface AnalisisEntrada {
	barrio: string;
	precio: number;
	m2: number;
	nivel: (typeof NIVELES)[number];
	tarjetaOrigen: string | null;
}

export function leerAnalisis(x: unknown, barrios: ReadonlySet<string>): AnalisisEntrada | null {
	const o = x as Record<string, unknown> | null;
	if (!o || typeof o !== 'object') return null;
	if (typeof o.barrio !== 'string' || !barrios.has(o.barrio)) return null;
	if (!entero(o.precio) || !numero(o.m2) || o.precio > 100_000 || o.m2 > 2_000) return null;
	if (!NIVELES.includes(o.nivel as never)) return null;
	const t = o.tarjetaOrigen;
	if (t !== null && t !== undefined && !(typeof t === 'string' && /^[0-9a-z]{10}$/.test(t))) return null;
	return { barrio: o.barrio, precio: o.precio, m2: o.m2, nivel: o.nivel as AnalisisEntrada['nivel'], tarjetaOrigen: (t as string | null | undefined) ?? null };
}

export interface AportacionEntrada {
	barrio: string;
	precio: number;
	m2: number;
	anioContrato: number;
	incluye: (typeof INCLUYE)[number][];
	/** Mes de la firma, AAAA-MM (opcional; nunca la fecha exacta) */
	firmaMes?: string | null;
	/** Renta al firmar, en €/mes (opcional) */
	rentaFirma?: number | null;
}

export function leerAportacion(x: unknown, barrios: ReadonlySet<string>, anioActual: number): AportacionEntrada | null {
	const o = x as Record<string, unknown> | null;
	if (!o || typeof o !== 'object') return null;
	if (typeof o.barrio !== 'string' || !barrios.has(o.barrio)) return null;
	if (!entero(o.precio) || !numero(o.m2) || o.precio > 100_000 || o.m2 > 2_000) return null;
	if (!entero(o.anioContrato) || o.anioContrato < 1990 || o.anioContrato > anioActual) return null;
	if (!Array.isArray(o.incluye) || o.incluye.some((i) => !INCLUYE.includes(i as never))) return null;
	// Opcionales: ausentes o null valen «sin dato»; si llegan, tienen que ser válidos
	const firma = o.firmaMes ?? null;
	if (firma !== null && !(typeof firma === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(firma) && Number(firma.slice(0, 4)) === o.anioContrato)) return null;
	const renta = o.rentaFirma ?? null;
	if (renta !== null && !(entero(renta) && renta > 0 && renta <= 100_000)) return null;
	return {
		barrio: o.barrio, precio: o.precio, m2: o.m2, anioContrato: o.anioContrato,
		incluye: INCLUYE.filter((i) => (o.incluye as string[]).includes(i)),
		firmaMes: firma,
		rentaFirma: renta
	};
}

// ——— Habitaciones ———

/** €/mes de una habitación que se acepta (plausible); fuera de este rango se descarta */
export const HABITACION_MIN = 150;
export const HABITACION_MAX = 1500;
export const TRAMOS_PISO = ['hasta60', '60-90', '90-120', 'mas120', 'nose'] as const;

export interface HabitacionEntrada {
	barrio: string;
	precio: number;
	habitaciones: number;
	tramo: (typeof TRAMOS_PISO)[number];
	gastos: boolean;
}

export function leerHabitacion(x: unknown, barrios: ReadonlySet<string>): HabitacionEntrada | null {
	const o = x as Record<string, unknown> | null;
	if (!o || typeof o !== 'object') return null;
	if (typeof o.barrio !== 'string' || !barrios.has(o.barrio)) return null;
	if (!entero(o.precio) || o.precio < HABITACION_MIN || o.precio > HABITACION_MAX) return null;
	if (!entero(o.habitaciones) || o.habitaciones < 1 || o.habitaciones > 6) return null;
	if (!TRAMOS_PISO.includes(o.tramo as never) || typeof o.gastos !== 'boolean') return null;
	return { barrio: o.barrio, precio: o.precio, habitaciones: o.habitaciones, tramo: o.tramo as HabitacionEntrada['tramo'], gastos: o.gastos };
}

// ——— Antiabuso ———

async function purgar(db: D1Registro, ahora: number) {
	await db.prepare('DELETE FROM limites WHERE caduca < ?').bind(ahora).run();
	await db.prepare('DELETE FROM dedupe WHERE caduca < ?').bind(ahora).run();
}

/** Cuenta una acción de esta IP hoy; false si ya pasó el máximo */
async function dentroDelLimite(c: Contexto, ip: string, ambito: 'r' | 'g', maximo: number): Promise<boolean> {
	const ahora = c.ahora();
	const t = ahora.getTime();
	const clave = `${ambito}:${await claveLimite(c.secreto, ip, ahora)}`;
	const fila = await c.db.prepare('SELECT n, caduca FROM limites WHERE clave = ?').bind(clave).first<{ n: number; caduca: number }>();
	if (fila && fila.caduca >= t) {
		if (fila.n >= maximo) return false;
		await c.db.prepare('UPDATE limites SET n = n + 1 WHERE clave = ?').bind(clave).run();
		return true;
	}
	// Primera acción del día de esta IP: aprovecha para borrar las claves que ya caducaron
	await c.db.prepare('DELETE FROM limites WHERE caduca < ?').bind(t).run();
	await c.db.prepare('INSERT OR REPLACE INTO limites (clave, n, caduca) VALUES (?, 1, ?)').bind(clave, t + LIMITE_MS).run();
	return true;
}

/** Límite diario de geocodificaciones por IP (HMAC con sal diaria, como el resto: la IP no se guarda) */
export const puedeGeocodificar = (c: Contexto, ip: string) => dentroDelLimite(c, ip, 'g', LIMITE_GEOCODIFICACIONES_DIA);

/** true si es nuevo (y lo anota); false si ya se registró en los últimos 30 días */
async function esNuevo(c: Contexto, tipo: 'a' | 'p' | 'h', precio: number, m2: number, barrio: string): Promise<boolean> {
	const t = c.ahora().getTime();
	const clave = await claveDedupe(c.secreto, tipo, precio, m2, barrio);
	const fila = await c.db.prepare('SELECT caduca FROM dedupe WHERE clave = ?').bind(clave).first<{ caduca: number }>();
	if (fila && fila.caduca >= t) return false;
	await c.db.prepare('INSERT OR REPLACE INTO dedupe (clave, caduca) VALUES (?, ?)').bind(clave, t + DEDUPE_MS).run();
	return true;
}

// ——— Operaciones ———

export async function registrarAnalisis(c: Contexto, ip: string, a: AnalisisEntrada): Promise<Resultado> {
	if (!(await dentroDelLimite(c, ip, 'r', LIMITE_REGISTROS_DIA))) return 'limite';
	if (!plausible(a.precio, a.m2)) return 'descartado';
	await purgar(c.db, c.ahora().getTime());
	if (!(await esNuevo(c, 'a', a.precio, a.m2, a.barrio))) return 'descartado';
	await c.db
		.prepare('INSERT INTO analisis (mes, barrio, precio, m2, nivel, tarjeta_origen) VALUES (?, ?, ?, ?, ?, ?)')
		.bind(mesDe(c.ahora()), a.barrio, a.precio, a.m2, a.nivel, a.tarjetaOrigen)
		.run();
	return 'guardado';
}

export async function registrarAportacion(c: Contexto, ip: string, a: AportacionEntrada): Promise<Resultado> {
	if (!(await dentroDelLimite(c, ip, 'r', LIMITE_REGISTROS_DIA))) return 'limite';
	if (!plausible(a.precio, a.m2)) return 'descartado';
	await purgar(c.db, c.ahora().getTime());
	if (!(await esNuevo(c, 'p', a.precio, a.m2, a.barrio))) return 'descartado';
	await c.db
		.prepare('INSERT INTO aportaciones (mes, barrio, precio, m2, anio_contrato, incluye, firma_mes, renta_firma) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
		.bind(mesDe(c.ahora()), a.barrio, a.precio, a.m2, a.anioContrato, a.incluye.join(','), a.firmaMes ?? null, a.rentaFirma ?? null)
		.run();
	return 'guardado';
}

export async function registrarHabitacion(c: Contexto, ip: string, h: HabitacionEntrada): Promise<Resultado> {
	if (!(await dentroDelLimite(c, ip, 'r', LIMITE_REGISTROS_DIA))) return 'limite';
	await purgar(c.db, c.ahora().getTime());
	// Mismo mes, barrio, renta y habitaciones: se cuenta una sola vez (la clave no se puede revertir)
	if (!(await esNuevo(c, 'h', h.precio, h.habitaciones, h.barrio))) return 'descartado';
	await c.db
		.prepare('INSERT INTO habitaciones (mes, barrio, precio, num_habitaciones, tamano_piso_tramo, gastos_incluidos) VALUES (?, ?, ?, ?, ?, ?)')
		.bind(mesDe(c.ahora()), h.barrio, h.precio, h.habitaciones, h.tramo, h.gastos ? 1 : 0)
		.run();
	return 'guardado';
}

export interface ComparacionHabitaciones {
	/** Habitaciones aportadas en el barrio con el mismo «incluye gastos» */
	n: number;
	/** Mediana en €/mes; solo desde 10 aportaciones */
	mediana: number | null;
}

/** Con menos de 10 solo se da el recuento: la mediana de pocas habitaciones dejaría ver rentas sueltas */
export async function compararHabitaciones(db: D1Registro, barrio: string, gastos: boolean): Promise<ComparacionHabitaciones> {
	const filas =
		(await db
			.prepare('SELECT precio FROM habitaciones WHERE barrio = ? AND gastos_incluidos = ? ORDER BY precio')
			.bind(barrio, gastos ? 1 : 0)
			.all<{ precio: number }>()).results ?? [];
	const n = filas.length;
	if (n < MINIMO_PUBLICO) return { n, mediana: null };
	const m = n >> 1;
	return { n, mediana: n % 2 ? filas[m]!.precio : Math.round((filas[m - 1]!.precio + filas[m]!.precio) / 2) };
}

// ——— Recuentos públicos (R10, R11) ———

export interface Recuentos {
	/** Análisis registrados en el barrio; null si hay menos de 10 */
	barrio: number | null;
	/** Aportaciones de residentes en el barrio; null si hay menos de 10 */
	aportacionesBarrio: number | null;
}

/** Recuentos públicos por barrio (solo desde 10 observaciones) */
export async function recuentos(db: D1Registro, barrio: string | null): Promise<Recuentos> {
	const deBarrio = async (tabla: 'analisis' | 'aportaciones') => {
		if (!barrio) return null;
		const n = (await db.prepare(`SELECT COUNT(*) AS n FROM ${tabla} WHERE barrio = ?`).bind(barrio).first<{ n: number }>())?.n ?? 0;
		return n >= MINIMO_PUBLICO ? n : null;
	};
	return { barrio: await deBarrio('analisis'), aportacionesBarrio: await deBarrio('aportaciones') };
}
