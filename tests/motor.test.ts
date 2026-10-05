/**
 * Tests del motor contra tests/fixtures/tests_motor_serpavi.csv (regla del CLAUDE.md:
 * deben pasar siempre, error ≤ 1 céntimo frente a la app oficial).
 */
import { describe, expect, it } from 'vitest';
import {
	PUNTUACION_MINIMA,
	analizar,
	brecha,
	clasificar,
	coeficienteK,
	corregir,
	motivoAnuncio,
	motivoSeccion,
	rangoInicial,
	rangoNivel,
	referencia,
	xDesdePuntuacion,
	type Anuncio,
	type SeccionConDato
} from '../src/lib/motor';
import { leerFixture } from './fixture';

const CENTIMO = 0.01;
const F_AGOSTO_2026 = 102.895 / 97.623;

const casos = leerFixture();
const conRango = casos.filter((c) => c.rInfInicial !== null);
const validacionApp = casos.filter((c) => c.tipo === 'validacion_app');
const sinDato = casos.filter((c) => c.tipo === 'sin_dato');
const delGate = casos.filter((c) => c.caso.startsWith('A') && c.tipo !== 'sin_dato');

const mediana = (xs: number[]) => {
	const o = [...xs].sort((a, b) => a - b);
	const m = Math.floor(o.length / 2);
	return o.length % 2 ? o[m]! : (o[m - 1]! + o[m]!) / 2;
};

describe('fixture', () => {
	it('tiene los casos esperados', () => {
		expect(casos).toHaveLength(53);
		expect(validacionApp).toHaveLength(30);
		expect(sinDato).toHaveLength(8);
		expect(conRango).toHaveLength(45);
		expect(delGate).toHaveLength(42);
	});
});

describe('§5.3 rango inicial', () => {
	it.each(conRango.map((c) => [c.caso, c] as const))('%s reproduce R_inf y R_sup iniciales', (_, c) => {
		const r = rangoInicial(c.anuncio.superficie, c.seccion);
		expect(Math.abs(r.inf - c.rInfInicial!)).toBeLessThanOrEqual(CENTIMO);
		expect(Math.abs(r.sup - c.rSupInicial!)).toBeLessThanOrEqual(CENTIMO);
	});
});

describe('§5.3 + §5.4 frente a la app oficial (cuestionario mínimo, sin IPC)', () => {
	const x = xDesdePuntuacion(PUNTUACION_MINIMA);

	it.each(validacionApp.map((c) => [c.caso, c] as const))('%s: error ≤ 1 céntimo', (_, c) => {
		const S = c.anuncio.superficie;
		const r = corregir(rangoInicial(S, c.seccion), S, c.seccion, x);
		expect(Math.abs(r.inf - c.appInf!)).toBeLessThanOrEqual(CENTIMO);
		expect(Math.abs(r.sup - c.appSup!)).toBeLessThanOrEqual(CENTIMO);
		expect(Math.abs(r.inf - c.calcInf!)).toBeLessThanOrEqual(CENTIMO);
		expect(Math.abs(r.sup - c.calcSup!)).toBeLessThanOrEqual(CENTIMO);
	});

	it('los coeficientes con P = 33,865 son −0,02909 y −0,39134', () => {
		expect(0.28 * (x - 0.26)).toBeCloseTo(-0.02909, 5);
		expect(0.696 * (x - 0.5 / 0.696)).toBeCloseTo(-0.39134, 5);
	});
});

describe('casos sin dato', () => {
	it.each(sinDato.map((c) => [c.caso, c] as const))('%s → %s', (_, c) => {
		const r = analizar(c.anuncio, [c.seccion], F_AGOSTO_2026);
		expect(r).toEqual({ tipo: 'sin_dato', motivo: c.motivoEsperado });
	});
});

describe('agregado del gate (42 anuncios con resultado)', () => {
	const contar = (f: number) => {
		const res = delGate.map((c) => analizar(c.anuncio, [c.seccion], f));
		const niveles = { dentro: 0, explicable: 0, por_encima: 0 };
		const pcts: number[] = [];
		for (const r of res) {
			if (r.tipo !== 'resultado') throw new Error('se esperaba resultado');
			niveles[r.prudente.nivel.nivel]++;
			pcts.push(r.prudente.pct);
		}
		return { niveles, mediana: mediana(pcts) };
	};

	it('con IPC (1,054): 9 dentro, 4 explicables, 29 por encima; mediana +19 %', () => {
		const { niveles, mediana: m } = contar(F_AGOSTO_2026);
		expect(niveles).toEqual({ dentro: 9, explicable: 4, por_encima: 29 });
		expect(Math.round(m * 100)).toBe(19);
	});

	it('sin IPC: 6, 3 y 33; mediana +26 %', () => {
		const { niveles, mediana: m } = contar(1);
		expect(niveles).toEqual({ dentro: 6, explicable: 3, por_encima: 33 });
		expect(Math.round(m * 100)).toBe(26);
	});
});

describe('pares de secciones vecinas (Gate C)', () => {
	const pares = casos.filter((c) => c.tipo.startsWith('horquilla_par_de_'));

	it.each(pares.map((c) => [c.caso, c] as const))('%s: la horquilla mantiene el nivel', (_, c) => {
		const original = casos.find((o) => o.caso === c.tipo.replace('horquilla_par_de_', ''))!;
		const a = analizar(original.anuncio, [original.seccion], F_AGOSTO_2026);
		const b = analizar(original.anuncio, [c.seccion], F_AGOSTO_2026);
		const h = analizar(original.anuncio, [original.seccion, c.seccion], F_AGOSTO_2026);
		if (a.tipo !== 'resultado' || b.tipo !== 'resultado' || h.tipo !== 'resultado') throw new Error();

		expect(b.prudente.nivel.nivel).toBe(a.prudente.nivel.nivel);
		expect(h.horquilla).toBe(true);
		expect(h.pctMin).toBeLessThan(h.pctMax);
		// La referencia cambia un 5-7 % entre secciones vecinas (decisiones.md)
		const cambio = Math.abs(b.prudente.referencia.sup / a.prudente.referencia.sup - 1);
		expect(cambio).toBeGreaterThan(0.04);
		expect(cambio).toBeLessThan(0.08);
	});
});

// ——— Propiedades y límites ———

const seccion: SeccionConDato = { cusec: '2807907084', smed: 55, p25: 16.5504, p75: 25.7568, n: 139 };
const anuncio = (cambios: Partial<Anuncio> = {}): Anuncio => ({
	precio: 1500,
	superficie: 65,
	obraNueva: false,
	tipo: 'piso',
	largaDuracion: true,
	...cambios
});

describe('propiedades', () => {
	it('R_max − R_sup = 0,196·(P75−P25)·S·f y coincide con §5.4 con x = 1', () => {
		for (const f of [1, F_AGOSTO_2026]) {
			const ref = referencia(65, seccion, f);
			expect(ref.max - ref.sup).toBeCloseTo(0.196 * (seccion.p75 - seccion.p25) * 65 * f, 9);
			expect(corregir(rangoInicial(65, seccion, f), 65, seccion, 1, f).sup).toBeCloseTo(ref.max, 9);
		}
	});

	it('el factor IPC escala el rango de forma lineal', () => {
		const sin = referencia(80, seccion, 1);
		const con = referencia(80, seccion, 1.054);
		expect(con.inf / sin.inf).toBeCloseTo(1.054, 12);
		expect(con.sup / sin.sup).toBeCloseTo(1.054, 12);
		expect(con.max / sin.max).toBeCloseTo(1.054, 12);
	});

	it('k se limita a [0, 1]', () => {
		expect(coeficienteK(151, 26.70194756554)).toBe(1); // sección 2807905002, k sin límite = 1,005
		expect(coeficienteK(30, 20)).toBe(0);
		expect(coeficienteK(25, 20)).toBe(0); // argumento negativo: sin NaN
		expect(coeficienteK(55, 25.7568)).toBeCloseTo(0.6622, 4);
	});
});

describe('niveles en los límites', () => {
	const ref = { inf: 900, sup: 1200, max: 1400 };

	it('precio = R_sup → dentro (alta); precio = R_max → explicable', () => {
		expect(clasificar(1200, ref)).toEqual({ nivel: 'dentro', posicion: 'alta' });
		expect(clasificar(1200.01, ref)).toEqual({ nivel: 'explicable' });
		expect(clasificar(1400, ref)).toEqual({ nivel: 'explicable' });
		expect(clasificar(1400.01, ref)).toEqual({ nivel: 'por_encima' });
	});

	it('tercios entre R_inf y R_sup; por debajo de R_inf es «baja»', () => {
		expect(clasificar(500, ref)).toEqual({ nivel: 'dentro', posicion: 'baja' });
		expect(clasificar(1000, ref)).toEqual({ nivel: 'dentro', posicion: 'baja' });
		expect(clasificar(1000.01, ref)).toEqual({ nivel: 'dentro', posicion: 'media' });
		expect(clasificar(1100, ref)).toEqual({ nivel: 'dentro', posicion: 'media' });
		expect(clasificar(1100.01, ref)).toEqual({ nivel: 'dentro', posicion: 'alta' });
	});

	it('brecha sobre R_sup en %, €/mes y €/año; null si no la supera', () => {
		expect(brecha(1200, ref)).toBeNull();
		const b = brecha(1500, ref)!;
		expect(b.pct).toBeCloseTo(0.25, 12);
		expect(b.euroMes).toBe(300);
		expect(b.euroAño).toBe(3600);
	});

	it('orden de prudencia', () => {
		const orden = [
			{ nivel: 'dentro', posicion: 'baja' },
			{ nivel: 'dentro', posicion: 'media' },
			{ nivel: 'dentro', posicion: 'alta' },
			{ nivel: 'explicable' },
			{ nivel: 'por_encima' }
		] as const;
		expect(orden.map(rangoNivel)).toEqual([0, 1, 2, 3, 4]);
	});
});

describe('elegibilidad', () => {
	it('superficie: 30 y 150 m² entran; fuera de ese intervalo, no', () => {
		expect(motivoAnuncio(anuncio({ superficie: 30 }))).toBeNull();
		expect(motivoAnuncio(anuncio({ superficie: 150 }))).toBeNull();
		expect(motivoAnuncio(anuncio({ superficie: 29.9 }))).toBe('superficie');
		expect(motivoAnuncio(anuncio({ superficie: 150.1 }))).toBe('superficie');
	});

	it('precedencia: unifamiliar > temporal > obra nueva > superficie', () => {
		expect(motivoAnuncio(anuncio({ tipo: 'casa', largaDuracion: false, obraNueva: true, superficie: 200 }))).toBe('unifamiliar');
		expect(motivoAnuncio(anuncio({ largaDuracion: false, obraNueva: true, superficie: 200 }))).toBe('temporal');
		expect(motivoAnuncio(anuncio({ obraNueva: true, superficie: 200 }))).toBe('obra_nueva');
	});

	it('sección: sin dato y testigos (más de 20)', () => {
		expect(motivoSeccion({ ...seccion, p25: null })).toBe('sin_dato_seccion');
		expect(motivoSeccion({ ...seccion, n: 20 })).toBe('testigos');
		expect(motivoSeccion({ ...seccion, n: 21 })).toBeNull();
	});
});

describe('horquilla', () => {
	const barata: SeccionConDato = { ...seccion, cusec: 'barata', p25: 10, p75: 14 };
	const cara: SeccionConDato = { ...seccion, cusec: 'cara', p25: 20, p75: 30 };

	it('muestra el nivel más prudente y el intervalo de %', () => {
		const r = analizar(anuncio({ precio: 1500 }), [barata, cara], 1);
		if (r.tipo !== 'resultado') throw new Error();
		expect(r.horquilla).toBe(true);
		expect(r.prudente.seccion.cusec).toBe('cara');
		expect(r.prudente.nivel.nivel).toBe('dentro');
		expect(r.secciones.map((s) => s.seccion.cusec)).toEqual(['cara', 'barata']);
		expect(r.pctMin).toBe(r.secciones[0]!.pct);
		expect(r.pctMax).toBe(r.secciones[1]!.pct);
		expect(r.pctMin).toBeLessThan(0);
		expect(r.pctMax).toBeGreaterThan(0);
	});

	it('a igual nivel, la prudente es la de menor %', () => {
		const r = analizar(anuncio({ precio: 5000 }), [barata, { ...barata, cusec: 'otra', p75: 15 }], 1);
		if (r.tipo !== 'resultado') throw new Error();
		expect(r.prudente.seccion.cusec).toBe('otra');
	});

	it('el nivel manda sobre el %: una sección con más % puede ser más prudente si su R_max es más holgado', () => {
		const estrecha: SeccionConDato = { ...seccion, cusec: 'estrecha', p25: 19, p75: 20 };
		const ancha: SeccionConDato = { ...seccion, cusec: 'ancha', p25: 10, p75: 19.9 };
		const r = analizar(anuncio({ precio: 1300 }), [estrecha, ancha], 1);
		if (r.tipo !== 'resultado') throw new Error();
		expect(r.secciones.map((s) => [s.seccion.cusec, s.nivel.nivel])).toEqual([
			['estrecha', 'por_encima'],
			['ancha', 'explicable']
		]);
		expect(r.prudente.seccion.cusec).toBe('ancha');
	});

	it('excluye las secciones sin dato o con ≤20 testigos', () => {
		const r = analizar(anuncio(), [seccion, { ...cara, n: 20 }, { ...barata, smed: null }], 1);
		if (r.tipo !== 'resultado') throw new Error();
		expect(r.horquilla).toBe(false);
		expect(r.excluidas).toEqual([
			{ cusec: 'cara', motivo: 'testigos' },
			{ cusec: 'barata', motivo: 'sin_dato_seccion' }
		]);
	});

	it('si no queda ninguna, el motivo es testigos o sin dato', () => {
		expect(analizar(anuncio(), [{ ...cara, n: 5 }, { ...barata, p75: null }], 1)).toEqual({ tipo: 'sin_dato', motivo: 'testigos' });
		expect(analizar(anuncio(), [{ ...barata, p75: null }], 1)).toEqual({ tipo: 'sin_dato', motivo: 'sin_dato_seccion' });
		expect(analizar(anuncio(), [], 1)).toEqual({ tipo: 'sin_dato', motivo: 'sin_dato_seccion' });
	});

	it('los motivos del anuncio van antes que los de la sección', () => {
		expect(analizar(anuncio({ obraNueva: true }), [{ ...seccion, n: 3 }], 1)).toEqual({ tipo: 'sin_dato', motivo: 'obra_nueva' });
	});
});
