import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
	type AnalisisEntrada, type Contexto, LIMITE_REGISTROS_DIA, claveLimite, leerAnalisis, leerAportacion,
	LIMITE_GEOCODIFICACIONES_DIA, MINIMO_HABITACIONES, compararHabitaciones, plausible, puedeGeocodificar, recuentos, registrarAnalisis, registrarAportacion, salDelDia
} from '../src/lib/server/registro';
import { MINIMO_COMPARACION } from '../src/lib/resultado/habitacion';
import { GET as getHabitacion } from '../src/routes/api/habitacion/+server';
import { d1Registro } from './d1';

const BARRIOS = new Set(['071', '072']);
const DIA = 24 * 3600 * 1000;

function contexto(inicio = '2026-10-05T10:00:00Z') {
	const { db, d1 } = d1Registro();
	let t = new Date(inicio).getTime();
	const c: Contexto = { db: d1, secreto: 'secreto-de-prueba', barrios: BARRIOS, ahora: () => new Date(t) };
	return { db, d1, c, avanzar: (ms: number) => (t += ms) };
}
const a = (extra: Partial<AnalisisEntrada> = {}): AnalisisEntrada => ({
	barrio: '071', precio: 1400, m2: 70, nivel: 'b', tarjetaOrigen: null, ...extra
});
const cuenta = (db: ReturnType<typeof d1Registro>['db'], tabla: string) =>
	(db.prepare(`SELECT COUNT(*) AS n FROM ${tabla}`).get() as { n: number }).n;

describe('esquema', () => {
	it('analisis, aportaciones y tarjetas no tienen columnas de IP, dirección, sección ni fecha', () => {
		const { db } = d1Registro();
		const prohibidas = ['ip', 'direccion', 'cusec', 'seccion', 'fecha', 'ts'];
		for (const tabla of ['analisis', 'aportaciones', 'tarjetas', 'dedupe', 'limites']) {
			const cols = (db.prepare(`PRAGMA table_info(${tabla})`).all() as { name: string }[]).map((c) => c.name);
			for (const p of prohibidas) expect(cols, `${tabla}.${p}`).not.toContain(p);
		}
		// Los eventos de uso ya no se guardan en D1 (van a PostHog): la migración 0004 borra la tabla
		const tablas = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((t) => t.name);
		expect(tablas).not.toContain('eventos');
	});

	it('ninguna consulta cruza analisis con aportaciones', () => {
		const raiz = fileURLToPath(new URL('..', import.meta.url));
		const ficheros = (dir: string): string[] =>
			readdirSync(dir).flatMap((f) => {
				const r = join(dir, f);
				return statSync(r).isDirectory() ? ficheros(r) : /\.(ts|sql)$/.test(r) ? [r] : [];
			});
		for (const f of [...ficheros(join(raiz, 'src')), ...ficheros(join(raiz, 'migrations'))]) {
			const texto = readFileSync(f, 'utf-8');
			// Cada sentencia SQL (entre comillas o backticks) nombra como mucho una de las dos tablas
			for (const s of texto.match(/(['`"])(?:SELECT|INSERT|UPDATE|DELETE)[\s\S]*?\1/g) ?? []) {
				expect(/analisis/.test(s) && /aportaciones/.test(s), `${f}: ${s}`).toBe(false);
			}
		}
	});
});

describe('plausibilidad', () => {
	it('€/m² entre 5 y 60', () => {
		expect(plausible(350, 70)).toBe(true); // 5
		expect(plausible(4200, 70)).toBe(true); // 60
		expect(plausible(340, 70)).toBe(false);
		expect(plausible(4300, 70)).toBe(false);
		expect(plausible(0, 70)).toBe(false);
		expect(plausible(1000, NaN)).toBe(false);
	});

	it('fuera de rango: no se guarda', async () => {
		const { db, c } = contexto();
		expect(await registrarAnalisis(c, '1.1.1.1', a({ precio: 50_000, m2: 70 }))).toBe('descartado');
		expect(cuenta(db, 'analisis')).toBe(0);
	});
});

describe('guardado', () => {
	it('guarda barrio, mes y valores; nunca fecha ni IP', async () => {
		const { db, c } = contexto();
		expect(await registrarAnalisis(c, '1.1.1.1', a({ tarjetaOrigen: 'abcdefghij' }))).toBe('guardado');
		expect(db.prepare('SELECT * FROM analisis').get()).toEqual({
			mes: '2026-10', barrio: '071', precio: 1400, m2: 70, nivel: 'b', tarjeta_origen: 'abcdefghij'
		});
		const todo = JSON.stringify([db.prepare('SELECT * FROM limites').all(), db.prepare('SELECT * FROM dedupe').all()]);
		expect(todo).not.toContain('1.1.1.1');
	});

	it('aportaciones: tabla propia', async () => {
		const { db, c } = contexto();
		const r = await registrarAportacion(c, '1.1.1.1', {
			barrio: '072', precio: 1150, m2: 68, anioContrato: 2023, incluye: ['comunidad', 'amueblado']
		});
		expect(r).toBe('guardado');
		expect(db.prepare('SELECT * FROM aportaciones').get()).toEqual({
			mes: '2026-10', barrio: '072', precio: 1150, m2: 68, anio_contrato: 2023, incluye: 'comunidad,amueblado',
			firma_mes: null, renta_firma: null
		});
		expect(cuenta(db, 'analisis')).toBe(0);
	});
});

describe('deduplicación a 30 días', () => {
	it('el duplicado no se guarda; el día 31 sí (reloj simulado)', async () => {
		const { db, c, avanzar } = contexto();
		expect(await registrarAnalisis(c, '2.2.2.2', a())).toBe('guardado');
		avanzar(29 * DIA);
		expect(await registrarAnalisis(c, '3.3.3.3', a())).toBe('descartado');
		avanzar(2 * DIA);
		expect(await registrarAnalisis(c, '4.4.4.4', a())).toBe('guardado');
		expect(cuenta(db, 'analisis')).toBe(2);
	});

	it('analisis y aportaciones no se deduplican entre sí', async () => {
		const { c } = contexto();
		expect(await registrarAnalisis(c, '1.1.1.1', a())).toBe('guardado');
		const aport = { barrio: '071', precio: 1400, m2: 70, anioContrato: 2020, incluye: [] };
		expect(await registrarAportacion(c, '1.1.1.1', aport)).toBe('guardado');
	});

	it('la tabla de deduplicación no lleva precio, m² ni barrio en claro', async () => {
		const { db, c } = contexto();
		await registrarAnalisis(c, '1.1.1.1', a());
		const fila = JSON.stringify(db.prepare('SELECT * FROM dedupe').all());
		expect(fila).not.toMatch(/1400|071/);
	});
});

describe('límite por IP y día', () => {
	it('el registro 21 de la misma IP en un día es rechazado', async () => {
		const { db, c } = contexto();
		for (let i = 0; i < LIMITE_REGISTROS_DIA; i++) {
			expect(await registrarAnalisis(c, '9.9.9.9', a({ precio: 1000 + i * 10 }))).toBe('guardado');
		}
		expect(await registrarAnalisis(c, '9.9.9.9', a({ precio: 2000 }))).toBe('limite');
		expect(cuenta(db, 'analisis')).toBe(LIMITE_REGISTROS_DIA);
		// Otra IP no se ve afectada
		expect(await registrarAnalisis(c, '8.8.8.8', a({ precio: 2000 }))).toBe('guardado');
	});

	it('al día siguiente se puede volver a registrar', async () => {
		const { c, avanzar } = contexto();
		for (let i = 0; i < LIMITE_REGISTROS_DIA; i++) await registrarAnalisis(c, '9.9.9.9', a({ precio: 1000 + i * 10 }));
		avanzar(DIA + 1000);
		expect(await registrarAnalisis(c, '9.9.9.9', a({ precio: 2500 }))).toBe('guardado');
	});

	it('la sal rotada cambia la clave y la IP no se guarda', async () => {
		const hoy = new Date('2026-10-05T10:00:00Z');
		const manana = new Date('2026-10-06T10:00:00Z');
		expect(await salDelDia('s', hoy)).not.toBe(await salDelDia('s', manana));
		expect(await claveLimite('s', '1.1.1.1', hoy)).not.toBe(await claveLimite('s', '1.1.1.1', manana));
		expect(await claveLimite('s', '1.1.1.1', hoy)).toBe(await claveLimite('s', '1.1.1.1', new Date('2026-10-05T23:00:00Z')));
		expect(await claveLimite('s', '1.1.1.1', hoy)).not.toContain('1.1.1.1');
		const { db, c } = contexto();
		await registrarAnalisis(c, '1.1.1.1', a());
		expect(JSON.stringify(db.prepare('SELECT * FROM limites').all())).not.toContain('1.1.1.1');
	});
});

describe('entradas', () => {
	it('análisis: barrio conocido, enteros y nivel', () => {
		expect(leerAnalisis({ barrio: '071', precio: 1400, m2: 70, nivel: 'c' }, BARRIOS)).toMatchObject({ nivel: 'c', tarjetaOrigen: null });
		for (const mala of [
			null, { barrio: '999', precio: 1400, m2: 70, nivel: 'c' }, { barrio: '071', precio: 1400.5, m2: 70, nivel: 'c' },
			{ barrio: '071', precio: 1400, m2: 70, nivel: 'z' }, { barrio: '071', precio: 1400, m2: 70, nivel: 'c', tarjetaOrigen: 'x' },
			{ barrio: '071', precio: 1e9, m2: 70, nivel: 'c' }
		]) expect(leerAnalisis(mala, BARRIOS)).toBeNull();
	});

	it('análisis: ignora campos extra como la dirección o la sección', () => {
		const r = leerAnalisis({ barrio: '071', precio: 1400, m2: 70, nivel: 'a', direccion: 'Calle X 3', cusec: '2807901001' }, BARRIOS);
		expect(JSON.stringify(r)).not.toMatch(/Calle X|2807/);
	});

	it('aportación: año, barrio y lo que incluye', () => {
		const ok = { barrio: '071', precio: 1150, m2: 68, anioContrato: 2023, incluye: ['amueblado', 'garaje'] };
		expect(leerAportacion(ok, BARRIOS, 2026)?.incluye).toEqual(['garaje', 'amueblado']);
		expect(leerAportacion({ ...ok, anioContrato: 2030 }, BARRIOS, 2026)).toBeNull();
		expect(leerAportacion({ ...ok, incluye: ['piscina'] }, BARRIOS, 2026)).toBeNull();
		expect(leerAportacion({ ...ok, barrio: 'x' }, BARRIOS, 2026)).toBeNull();
	});
});

describe('atribución y recuentos', () => {
	it('un análisis iniciado desde /t/:id queda atribuido a la tarjeta', async () => {
		const { db, c } = contexto();
		await registrarAnalisis(c, '1.1.1.1', a({ tarjetaOrigen: 'abcdefghij' }));
		expect(db.prepare('SELECT tarjeta_origen FROM analisis').get()).toEqual({ tarjeta_origen: 'abcdefghij' });
	});

	it('los recuentos de barrio solo salen desde 10 y nunca antes', async () => {
		const { d1, c } = contexto();
		expect(await recuentos(d1, '071')).toEqual({ barrio: null, aportacionesBarrio: null });
		for (let i = 0; i < 9; i++) await registrarAnalisis(c, `ip${i}`, a({ precio: 1000 + i * 10 }));
		expect((await recuentos(d1, '071')).barrio).toBeNull();
		await registrarAnalisis(c, 'ip10', a({ precio: 1500 }));
		expect((await recuentos(d1, '071')).barrio).toBe(10);
		expect((await recuentos(d1, '072')).barrio).toBeNull();
		expect((await recuentos(d1, null)).barrio).toBeNull();
	});
});

describe('habitaciones: la mediana pública', () => {
	const con = (n: number, gastos = 1) => {
		const { db, d1 } = d1Registro();
		for (let i = 0; i < n; i++) db.prepare("INSERT INTO habitaciones (mes, barrio, precio, num_habitaciones, tamano_piso_tramo, gastos_incluidos) VALUES ('2026-10', '071', ?, 3, '60-90', ?)").run(400 + i * 10, gastos);
		return d1;
	};

	it('el mínimo es 20, el mismo en el servidor y en el cliente', () => {
		expect(MINIMO_HABITACIONES).toBe(20);
		expect(MINIMO_COMPARACION).toBe(MINIMO_HABITACIONES);
	});

	it('con 19 solo se da el recuento; con 20, la mediana', async () => {
		expect(await compararHabitaciones(con(19), '071', true)).toEqual({ n: 19, mediana: null });
		expect(await compararHabitaciones(con(10), '071', true)).toEqual({ n: 10, mediana: null }); // el mínimo anterior ya no basta
		const r = await compararHabitaciones(con(20), '071', true);
		expect(r.n).toBe(20);
		expect(r.mediana).toBe(495); // 400, 410, …, 590: la media de las dos centrales (490 y 500)
	});

	it('solo cuentan las habitaciones con el mismo «incluye gastos», y otro barrio no suma', async () => {
		expect(await compararHabitaciones(con(25, 1), '071', false)).toEqual({ n: 0, mediana: null });
		expect(await compararHabitaciones(con(25, 1), '072', true)).toEqual({ n: 0, mediana: null });
	});

	it('el endpoint público no da la mediana por debajo del mínimo', async () => {
		const barrio = Object.keys((JSON.parse(readFileSync(new URL('../data/processed/seccion_barrio.json', import.meta.url), 'utf-8')) as { barrios: object }).barrios)[0]!;
		const { db, d1 } = d1Registro();
		const poner = (precio: number) =>
			db.prepare("INSERT INTO habitaciones (mes, barrio, precio, num_habitaciones, tamano_piso_tramo, gastos_incluidos) VALUES ('2026-10', ?, ?, 3, '60-90', 1)").run(barrio, precio);
		const get = async () =>
			(await getHabitacion({ url: new URL(`http://x/api/habitacion?barrio=${barrio}&gastos=1`), platform: { env: { DB: d1, SECRETO: 'prueba' } } } as never)).json();
		for (let i = 0; i < 19; i++) poner(400 + i * 10);
		expect(await get()).toEqual({ n: 19, mediana: null });
		poner(590);
		expect(await get()).toEqual({ n: 20, mediana: 495 });
	});
});

describe('límite del geocodificador', () => {
	it('200 búsquedas al día por IP; la 201 se rechaza y al día siguiente vuelve a empezar', async () => {
		const { c, avanzar } = contexto();
		for (let i = 0; i < LIMITE_GEOCODIFICACIONES_DIA; i++) expect(await puedeGeocodificar(c, '203.0.113.9')).toBe(true);
		expect(await puedeGeocodificar(c, '203.0.113.9')).toBe(false);
		expect(await puedeGeocodificar(c, '203.0.113.10')).toBe(true); // otra IP, otro contador
		avanzar(DIA + 1000);
		expect(await puedeGeocodificar(c, '203.0.113.9')).toBe(true);
	});

	it('no guarda la IP: solo un HMAC, y las claves caducadas se borran con la primera acción del día', async () => {
		const { db, c, avanzar } = contexto();
		await puedeGeocodificar(c, '203.0.113.9');
		const claves = (db.prepare('SELECT clave FROM limites').all() as { clave: string }[]).map((f) => f.clave);
		expect(claves).toHaveLength(1);
		expect(claves[0]).toMatch(/^g:[0-9a-f]{64}$/);
		expect(claves.join()).not.toContain('203.0.113');
		avanzar(2 * DIA);
		await puedeGeocodificar(c, '198.51.100.7');
		expect(cuenta(db, 'limites')).toBe(1); // la del día anterior se borró
	});
});
