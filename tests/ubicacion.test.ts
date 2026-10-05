import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { type AlmacenCallejero, type Geocodificacion, type Portal, geocodificar } from '../src/lib/ubicacion/geocodificar';
import { IndiceViales, type Vial } from '../src/lib/ubicacion/indice';
import { normalizar } from '../src/lib/ubicacion/normalizar';
import { parsearDireccion } from '../src/lib/ubicacion/parser';
import { abrirCallejero, hayCallejero } from './callejero';

/** CSV con comillas dobles (las direcciones llevan comas) */
function leerCsv(nombre: string): Record<string, string>[] {
	const texto = readFileSync(fileURLToPath(new URL(`./fixtures/${nombre}`, import.meta.url)), 'utf-8');
	const filas = texto.trim().split(/\r?\n/).map((linea) => {
		const campos: string[] = [];
		let actual = '';
		let comillas = false;
		for (const c of linea) {
			if (c === '"') comillas = !comillas;
			else if (c === ',' && !comillas) {
				campos.push(actual);
				actual = '';
			} else actual += c;
		}
		campos.push(actual);
		return campos;
	});
	const [cabecera, ...resto] = filas;
	return resto.map((f) => Object.fromEntries(cabecera!.map((c, i) => [c, f[i] ?? ''])));
}

describe('parser', () => {
	it.each([
		['C/ de Alcalá, nº 45, 3º B, 28009 Madrid', { tipo: 'CALLE', nombre: 'alcala', numero: 45, extension: null }],
		['Paseo de la Castellana 100', { tipo: 'PASEO', nombre: 'castellana', numero: 100, extension: null }],
		['Pº Castellana 100', { tipo: 'PASEO', nombre: 'castellana', numero: 100, extension: null }],
		['Gran Vía 28', { tipo: null, nombre: 'gran via', numero: 28, extension: null }],
		['Avda. Albufera 112b', { tipo: 'AVENIDA', nombre: 'albufera', numero: 112, extension: 'b' }],
		['calle toledo 80 b', { tipo: 'CALLE', nombre: 'toledo', numero: 80, extension: 'b' }],
		['Calle Arfe', { tipo: 'CALLE', nombre: 'arfe', numero: null, extension: null }]
	])('%s', (texto, esperado) => {
		expect(parsearDireccion(texto)[0]).toEqual(esperado);
	});

	it('nombres con dígitos: devuelve todas las interpretaciones con número', () => {
		const r = parsearDireccion('Prov Ahijones 18, nº 133');
		expect(r.map((i) => [i.nombre, i.numero])).toEqual([
			['prov ahijones', 18],
			['prov ahijones 18', 133]
		]);
	});

	it('texto sin nombre de vía no da interpretaciones', () => {
		expect(parsearDireccion('28009 Madrid')).toEqual([]);
		expect(parsearDireccion('')).toEqual([]);
	});
});

// ——— Reglas de resolución con un callejero sintético ———

const vial = (id: number, tipo: string, nombreNorm: string, nPortales = 10): Vial => ({
	id, tipo, nombreNorm, visible: `${tipo} ${nombreNorm}`, nPortales
});
const p = (numero: number, cusec: string | null, extension = ''): Portal => ({ numero, extension, lon: -3.7, lat: 40.4, cusec });

const VIALES = [
	vial(1, 'CALLE', 'ejemplo'),
	vial(2, 'CALLE', 'larga'),
	vial(3, 'AVENIDA', 'aguilas', 200),
	vial(4, 'AVENIDA', 'aguilas', 40),
	vial(5, 'PLAZA', 'ejemplo'),
	vial(6, 'CALLE', 'vacia'),
	vial(7, 'CALLE', 'hueco')
];
const PORTALES: Record<number, Portal[]> = {
	1: [p(1, 'S1'), p(3, 'S1'), p(5, 'S2'), p(5, 'S2', 'A'), p(7, 'S3', 'B'), p(2, 'S4'), p(4, 'S4'), p(9, 'S5'), p(9, 'S6'), p(11, null)],
	2: Array.from({ length: 7 }, (_, i) => p(i + 1, `L${i}`)),
	3: [p(1, 'A1')],
	4: [p(50, 'A2')],
	5: [p(1, 'P1')],
	6: [p(1, null)],
	7: [p(2, 'H1'), p(6, 'H2')]
};
const indice = new IndiceViales(VIALES);
const almacen: AlmacenCallejero = { portales: async (id) => PORTALES[id] ?? [] };
const geo = (texto: string) => geocodificar(texto, indice, almacen);

describe('resolución', () => {
	it('portal exacto', async () => {
		expect(await geo('Calle Ejemplo 3')).toMatchObject({ estado: 'exacta', numero: 3, cusecs: ['S1'] });
	});

	it('extensión: la usa si existe; si no, el portal sin extensión', async () => {
		expect(await geo('Calle Ejemplo 5A')).toMatchObject({ estado: 'exacta', cusecs: ['S2'] });
		expect(await geo('Calle Ejemplo 3 c')).toMatchObject({ estado: 'exacta', cusecs: ['S1'] });
		// Solo existe 7B: sin extensión pedida, se usa la que hay
		expect(await geo('Calle Ejemplo 7')).toMatchObject({ estado: 'exacta', cusecs: ['S3'] });
	});

	it('portal en dos secciones → horquilla', async () => {
		expect(await geo('Calle Ejemplo 9')).toMatchObject({
			estado: 'aproximada', motivo: 'portal_en_varias_secciones', cusecs: ['S5', 'S6']
		});
	});

	it('número inexistente → portal más cercano de la misma paridad', async () => {
		expect(await geo('Calle Ejemplo 8')).toMatchObject({
			estado: 'aproximada', motivo: 'numero_inexistente', numerosUsados: [4], cusecs: ['S4']
		});
		expect(await geo('Calle Larga 9')).toMatchObject({ numerosUsados: [7], cusecs: ['L6'] });
		// El más cercano (9) está en dos secciones: las dos
		expect(await geo('Calle Ejemplo 13')).toMatchObject({ numerosUsados: [9], cusecs: ['S5', 'S6'] });
	});

	it('si no hay portales de esa paridad, usa cualquiera', async () => {
		expect(await geo('Plaza Ejemplo 4')).toMatchObject({ estado: 'aproximada', numerosUsados: [1], cusecs: ['P1'] });
	});

	it('equidistante entre dos portales → los dos y sus secciones', async () => {
		expect(await geo('Calle Hueco 4')).toMatchObject({ numerosUsados: [2, 6], cusecs: ['H1', 'H2'] });
	});

	it('extensión inexistente → el portal con la extensión que haya', async () => {
		expect(await geo('Calle Ejemplo 7a')).toMatchObject({ estado: 'exacta', cusecs: ['S3'] });
	});

	it('calle sin número: horquilla si son ≤ 6 secciones; si no, pide más datos', async () => {
		expect(await geo('Calle Ejemplo')).toMatchObject({ estado: 'calle', cusecs: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'] });
		expect(await geo('Calle Larga')).toEqual({
			estado: 'demasiadas_secciones', vial: { id: 2, nombre: 'CALLE larga' }, nSecciones: 7
		});
	});

	it('viales empatados: gana el que tiene el portal', async () => {
		expect(await geo('Avenida Las Águilas 50')).toMatchObject({ estado: 'exacta', vial: { id: 4 } });
		expect(await geo('Avenida Águilas 1')).toMatchObject({ estado: 'exacta', vial: { id: 3 } });
	});

	it('el tipo de vía desempata nombres iguales', async () => {
		expect(await geo('Plaza Ejemplo 1')).toMatchObject({ vial: { id: 5 } });
		expect(await geo('Calle Ejemplo 1')).toMatchObject({ vial: { id: 1 } });
	});

	it('vial sin portales con sección → no encontrada', async () => {
		expect(await geo('Calle Vacía 1')).toMatchObject({ estado: 'no_encontrada' });
	});

	it('tolera erratas; si no se parece lo bastante, no encontrada con sugerencias', async () => {
		expect(await geo('Calle Ejempl 3')).toMatchObject({ estado: 'exacta', cusecs: ['S1'] });
		const r = await geo('Calle Ejzzzlo 3');
		expect(r.estado).toBe('no_encontrada');
		if (r.estado === 'no_encontrada') expect(r.sugerencias.map((v) => v.id)).toContain(1);
		expect(await geo('Zzzz 1')).toEqual({ estado: 'no_encontrada', sugerencias: [] });
	});
});

// ——— Callejero real ———

describe.skipIf(!hayCallejero)('callejero de Madrid', () => {
	const { indice: indiceReal, almacen: almacenReal, viales } = hayCallejero
		? abrirCallejero()
		: ({} as ReturnType<typeof abrirCallejero>);

	it('normalizar() da lo mismo que el ETL en Python para los ~9.000 viales', () => {
		const distintos = (viales as (Vial & { nombre: string })[]).filter((v) => normalizar(v.nombre) !== v.nombreNorm);
		expect(distintos).toEqual([]);
	});

	it('resuelve ≥ 95 de las 100 direcciones de prueba, con p95 < 300 ms', async () => {
		const casos = leerCsv('direcciones_100.csv');
		expect(casos).toHaveLength(100);
		const fallos: string[] = [];
		const tiempos: number[] = [];

		for (const c of casos) {
			const t0 = performance.now();
			const r: Geocodificacion = await geocodificar(c.entrada!, indiceReal, almacenReal);
			tiempos.push(performance.now() - t0);

			const esperados = c.cusecs_esperados ? c.cusecs_esperados.split('|') : [];
			const cusecs = 'cusecs' in r ? r.cusecs : [];
			const ok =
				c.estado_esperado === 'demasiadas_secciones'
					? r.estado === 'demasiadas_secciones'
					: c.estado_esperado === 'calle'
						? r.estado === 'calle' && cusecs.join('|') === esperados.join('|')
						: esperados.every((e) => cusecs.includes(e));
			if (!ok) fallos.push(`${c.id} [${c.categoria}] «${c.entrada}» → ${r.estado} ${cusecs.join('|')} (esperado ${c.cusecs_esperados || c.estado_esperado})`);
		}

		tiempos.sort((a, b) => a - b);
		const p95 = tiempos[Math.floor(tiempos.length * 0.95)]!;
		console.log(`Resueltas ${100 - fallos.length}/100 · p95 ${p95.toFixed(1)} ms\n${fallos.join('\n')}`);
		expect(fallos.length).toBeLessThanOrEqual(5);
		expect(p95).toBeLessThan(300);
	});

	/**
	 * Referencia independiente: la sección que dio la app oficial en 30 anuncios del gate,
	 * con la dirección del anuncio y con la que se tecleó en la app. En los otros 20 la
	 * sección del gate sale de las coordenadas del anuncio, no del portal: puede ser la de
	 * la acera de enfrente (A12, Pradillo 26), así que ahí se tolera un fallo.
	 */
	it('direcciones del gate: misma sección que la app oficial', async () => {
		const casos = leerCsv('direcciones_gate.csv');
		expect(casos).toHaveLength(50);
		const fallosApp: string[] = [];
		const fallosGate: string[] = [];
		let consultasApp = 0;

		for (const c of casos) {
			const esperada = c.cusec_app || c.cusec_gate!;
			const entradas = c.cusec_app ? [c.entrada!, c.direccion_app!] : [c.entrada!];
			for (const entrada of entradas) {
				const r = await geocodificar(entrada, indiceReal, almacenReal);
				const cusecs = 'cusecs' in r ? r.cusecs : [];
				if (c.cusec_app) consultasApp++;
				if (!cusecs.includes(esperada)) {
					(c.cusec_app ? fallosApp : fallosGate).push(
						`${c.caso} «${entrada}» → ${r.estado} ${cusecs.join('|')} (esperada ${esperada})`
					);
				}
			}
		}

		console.log(
			`Gate: app oficial ${consultasApp - fallosApp.length}/${consultasApp} · resto ${20 - fallosGate.length}/20\n` +
				[...fallosApp, ...fallosGate].join('\n')
		);
		expect(consultasApp).toBe(60);
		expect(fallosApp).toEqual([]);
		expect(fallosGate.length).toBeLessThanOrEqual(1);
	});
});
