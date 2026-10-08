import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { type Anuncio, type SeccionConDato, referencia } from '../src/lib/motor';
import {
	type DatosMadrid, type SeccionJson, aquiEstariasDentro, barriosDe, claseZona, construirTuZona, construirBarra, construirPantalla,
	construirTarjeta, distancia, euros, evolucion, interpretarNumero, mesAnio, numero, porcentaje,
	resolverDireccion, ubicacionDesdePin, validarAportacion, validarFormulario, zona
} from '../src/lib/resultado';
import type { Punto } from '../src/lib/ubicacion/geocodificar';
import { leerFixture } from './fixture';

// ——— Datos sintéticos ———

const sec = (p25: number, p75: number, n: number | null, extra: Partial<SeccionJson> = {}): SeccionJson => ({
	cdis: '07', barrio: '071', smed: 70, p25, p75, n, n_vu: 0, med2015: 10, med2024: 15, ...extra
});

const DATOS: DatosMadrid = {
	secciones: {
		A: sec(12, 20, 100),
		B: sec(10, 16, 80, { barrio: '072' }),
		C: sec(11, 18, 120, { barrio: '072', med2015: null }),
		D: sec(9, 14, 10), // 10 testigos: no elegible
		E: sec(14, 24, 200),
		F: { ...sec(0, 0, null), smed: null, p25: null, p75: null }, // sin dato
		LEJOS: sec(8, 12, 90)
	},
	barrios: {
		'071': { nombre: 'Almagro', cod_distrito: '07', distrito: 'Chamberí' },
		'072': { nombre: 'Gaztambide', cod_distrito: '07', distrito: 'Chamberí' }
	},
	ipc: { factor: 1.05, ultimo_mes: '2026-08' }
};

const ORIGEN: Punto = { lon: -3.7, lat: 40.42 };
const CENTROS = new Map<string, Punto>([
	['A', ORIGEN],
	['B', { lon: -3.695, lat: 40.42 }], // ~420 m
	['C', { lon: -3.69, lat: 40.42 }], // ~840 m
	['D', { lon: -3.7, lat: 40.425 }], // ~550 m, 10 testigos
	['E', { lon: -3.7, lat: 40.428 }], // ~880 m
	['F', { lon: -3.705, lat: 40.42 }], // ~420 m, sin dato
	['LEJOS', { lon: -3.68, lat: 40.42 }] // ~1,7\u00A0km
]);

const anuncio = (precio: number, extra: Partial<Anuncio> = {}): Anuncio => ({
	precio, superficie: 70, obraNueva: false, tipo: 'piso', largaDuracion: true, ...extra
});
const ubic = (cusecs: string[], extra = {}) => ({
	cusecs, aproximada: false, motivo: null, numerosUsados: [] as number[], punto: ORIGEN, via: null, ...extra
});
const refDe = (id: string) => referencia(70, { cusec: id, ...DATOS.secciones[id] } as unknown as SeccionConDato, DATOS.ipc.factor);

// ——— Formato ———

describe('formato', () => {
	it('números, euros y porcentajes en español', () => {
		expect(numero(1650)).toBe('1.650');
		expect(numero(1234567.5, 1)).toBe('1.234.567,5');
		expect(numero(-3)).toBe('−3');
		expect(euros(8267.2)).toBe('8.267\u00A0€');
		expect(porcentaje(0.4147, true)).toBe('+41\u00A0%');
		expect(porcentaje(0.047, true)).toBe('+4,7\u00A0%');
		expect(porcentaje(0.47)).toBe('47\u00A0%');
		expect(porcentaje(-0.12, true)).toBe('−12\u00A0%');
		expect(porcentaje(0, true)).toBe('0,0\u00A0%');
	});

	it('mes y distancia', () => {
		expect(mesAnio('2026-08')).toBe('agosto de 2026');
		expect(distancia(1250)).toBe('1,3\u00A0km');
		expect(distancia(644)).toBe('640\u00A0m');
	});
});

// ——— Barra ———

describe('barra', () => {
	const ref = { inf: 1000, sup: 1500, max: 1800 };

	it('escala desde 0 hasta 1,15 × el mayor de precio y techo', () => {
		expect(construirBarra(1250, [ref]).escala).toEqual({ min: 0, max: 1.15 * 1800 });
		expect(construirBarra(3000, [ref]).escala.max).toBeCloseTo(1.15 * 3000);
	});

	it('posiciones monótonas y dentro de [0, 1]', () => {
		for (const precio of [600, 900, 1000, 1250, 1500, 1700, 1800, 2000, 3000]) {
			const b = construirBarra(precio, [ref]);
			const p = b.posiciones;
			expect(p.inf.max).toBeLessThan(p.sup.min);
			expect(p.sup.max).toBeLessThan(p.techo.min);
			for (const v of [p.inf.min, p.sup.min, p.techo.min, p.precio]) {
				expect(v).toBeGreaterThanOrEqual(0);
				expect(v).toBeLessThanOrEqual(1);
			}
			expect(b.horquilla).toBe(false);
		}
	});

	it('el precio sigue el orden de los precios', () => {
		expect(construirBarra(1250, [ref]).posiciones.precio).toBeLessThan(construirBarra(1250, [ref]).posiciones.techo.max);
		expect(construirBarra(3000, [ref]).posiciones.precio).toBeCloseTo(1 / 1.15);
	});

	it('horquilla: tramos entre secciones y banda común', () => {
		const b = construirBarra(2000, [ref, { inf: 1050, sup: 1450, max: 1900 }]);
		expect(b.horquilla).toBe(true);
		expect(b.inf).toEqual({ min: 1000, max: 1050 });
		expect(b.sup).toEqual({ min: 1450, max: 1500 });
		expect(b.techo).toEqual({ min: 1800, max: 1900 });
		// La banda va de la mayor R_inf a la menor R_sup
		expect(b.banda.desde).toBeCloseTo(1050 / b.escala.max);
		expect(b.banda.hasta).toBeCloseTo(1450 / b.escala.max);
	});
});

// ——— Resultado ———

describe('pantalla de resultado', () => {
	it('dentro de la referencia: sin porcentaje, con la posición', () => {
		const r = refDe('A');
		const p = construirPantalla(anuncio(r.inf + 10), ubic(['A']), DATOS);
		expect(p.tipo).toBe('resultado');
		if (p.tipo !== 'resultado') return;
		expect(p.nivel).toEqual({ nivel: 'dentro', posicion: 'baja' });
		expect(p.titular).toContain('parte baja');
		expect(p.brechaPct).toBeNull();
		expect(p.etiquetaBrecha).toBeNull();
		expect(p.barrio).toBe('Almagro');
	});

	it('explicable: sin porcentaje y con el máximo posible', () => {
		const r = refDe('A');
		const p = construirPantalla(anuncio((r.sup + r.max) / 2), ubic(['A']), DATOS);
		if (p.tipo !== 'resultado') throw new Error('esperaba resultado');
		expect(p.nivel.nivel).toBe('explicable');
		expect(p.brechaPct).toBeNull();
		expect(p.textoMaximo).toContain(euros(r.max));
	});

	it('por encima: «cuánto más te piden», % y euros', () => {
		const r = refDe('A');
		const precio = r.max + 200;
		const p = construirPantalla(anuncio(precio), ubic(['A']), DATOS);
		if (p.tipo !== 'resultado') throw new Error('esperaba resultado');
		expect(p.nivel.nivel).toBe('por_encima');
		expect(p.etiquetaBrecha).toBe('Cuánto más te piden');
		expect(p.brechaPct).toBe(porcentaje(precio / r.sup - 1, true));
		expect(p.brechaEuros).toBe(`+${numero(precio - r.sup)}\u00A0€/mes · +${numero((precio - r.sup) * 12)}\u00A0€/año`);
		expect(p.base).toContain('Basado en 100 contratos vigentes en la zona');
		expect(p.base).toContain('agosto de 2026');
		expect(p.quePuedesHacer.length).toBeGreaterThan(0);
		expect(p.avisoUbicacion).toBeNull();
	});

	it('horquilla: nivel más prudente e intervalo de %', () => {
		const u = ubic(['A', 'B'], { aproximada: true, motivo: 'calle' });
		// Supera el máximo de las dos: por encima en ambas, intervalo de %
		const p = construirPantalla(anuncio(Math.max(refDe('A').max, refDe('B').max) + 300), u, DATOS);
		if (p.tipo !== 'resultado') throw new Error('esperaba resultado');
		expect(p.horquilla).toBe(true);
		expect(p.brechaPct).toMatch(/^entre \+\d+\u00A0% y \+\d+\u00A0%$/);
		expect(p.brechaEuros).toMatch(/^entre .*\u00A0€\/mes · entre .*\u00A0€\/año$/);
		expect(p.avisoUbicacion).toContain('2 zonas');
		expect(p.cusecs).toHaveLength(2);

		// Solo supera el máximo de B: manda el nivel más prudente (A), sin porcentaje
		const q = construirPantalla(anuncio(refDe('B').max + 1), u, DATOS);
		if (q.tipo !== 'resultado') throw new Error('esperaba resultado');
		expect(q.nivel.nivel).not.toBe('por_encima');
		expect(q.brechaPct).toBeNull();
	});

	it('avisos de ubicación aproximada', () => {
		const a = anuncio(refDe('A').inf + 1);
		const aviso = (u: object) => {
			const p = construirPantalla(a, ubic(['A'], u), DATOS);
			return p.tipo === 'resultado' ? p.avisoUbicacion : null;
		};
		expect(aviso({ aproximada: true, motivo: 'numero_inexistente', numerosUsados: [4, 6] })).toContain('4 y 6');
		expect(aviso({ aproximada: true, motivo: 'portal_en_varias_secciones' })).toContain('límite');
		expect(aviso({ aproximada: true, motivo: 'pin' })).toContain('150\u00A0m');
	});

	it('sección excluida por testigos o sin dato: pantalla sin dato', () => {
		expect(construirPantalla(anuncio(900), ubic(['D']), DATOS)).toMatchObject({ tipo: 'sin_dato', motivo: 'testigos' });
		expect(construirPantalla(anuncio(900), ubic(['F']), DATOS)).toMatchObject({ tipo: 'sin_dato', motivo: 'sin_dato_seccion' });
		expect(construirPantalla(anuncio(900), ubic(['NO_EXISTE']), DATOS)).toMatchObject({ tipo: 'sin_dato', motivo: 'sin_dato_seccion' });
	});

	it('cada motivo del anuncio da su pantalla, con enlace oficial y sin porcentaje', () => {
		const casos: [Partial<Anuncio>, string][] = [
			[{ superficie: 20 }, 'superficie'],
			[{ superficie: 200 }, 'superficie'],
			[{ obraNueva: true }, 'obra_nueva'],
			[{ tipo: 'casa' }, 'unifamiliar'],
			[{ largaDuracion: false }, 'temporal']
		];
		for (const [extra, motivo] of casos) {
			const p = construirPantalla(anuncio(1000, extra), ubic(['A']), DATOS);
			expect(p).toMatchObject({ tipo: 'sin_dato', motivo });
			const texto = JSON.stringify(p);
			expect(texto).toContain('serpavi.mivau.gob.es');
			expect(texto).not.toMatch(/%/);
		}
	});

	it('ubicaciones desde la dirección y desde el pin', () => {
		const vial = { id: 1, nombre: 'CALLE X' };
		const punto = ORIGEN;
		expect(resolverDireccion({ estado: 'exacta', vial, numero: 3, cusecs: ['A'], punto })).toEqual({
			tipo: 'ubicacion', ubicacion: ubic(['A'])
		});
		expect(resolverDireccion({ estado: 'calle', vial, cusecs: ['A', 'B'], punto })).toMatchObject({
			ubicacion: { aproximada: true, motivo: 'calle' }
		});
		expect(resolverDireccion({ estado: 'demasiadas_secciones', vial, nSecciones: 9 })).toEqual({
			tipo: 'pedir_numero_o_mapa', calle: 'CALLE X', nSecciones: 9
		});
		expect(resolverDireccion({ estado: 'no_encontrada', sugerencias: [vial] })).toEqual({
			tipo: 'no_encontrada', sugerencias: ['CALLE X']
		});
		expect(ubicacionDesdePin({ estado: 'fuera' }, punto)).toBeNull();
		expect(ubicacionDesdePin({ estado: 'punto', cusec: 'A', cusecs: ['A'], distancias: { A: 0 } }, punto)).toMatchObject({
			aproximada: false, motivo: null
		});
		expect(ubicacionDesdePin({ estado: 'punto', cusec: 'A', cusecs: ['A', 'B'], distancias: {} }, punto)).toMatchObject({
			aproximada: true, motivo: 'pin'
		});
	});
});

describe('con los datos reales (caso A01 del gate)', () => {
	const leer = (f: string) => JSON.parse(readFileSync(fileURLToPath(new URL(`../data/processed/${f}`, import.meta.url)), 'utf-8'));
	const real: DatosMadrid = {
		secciones: leer('secciones_madrid.json'),
		barrios: leer('seccion_barrio.json').barrios,
		ipc: leer('ipc_alquiler.json')
	};

	it('A01: por encima, +41 %, Almagro', () => {
		const a01 = leerFixture().find((c) => c.caso === 'A01')!;
		const p = construirPantalla(a01.anuncio, ubic([a01.seccion.cusec]), real);
		if (p.tipo !== 'resultado') throw new Error('esperaba resultado');
		expect(p.nivel.nivel).toBe('por_encima');
		expect(p.brechaPct).toBe('+41\u00A0%');
		expect(p.barrio).toBe('Almagro');
		expect(p.evolucion).not.toBeNull();
	});

	it('todos los barrios de las secciones existen', () => {
		const sinBarrio = Object.keys(real.secciones).filter((c) => barriosDe(real, [c]).length === 0);
		expect(sinBarrio).toEqual([]);
	});
});

// ——— Aquí estarías dentro ———

describe('este precio entra en la referencia de…', () => {
	it('solo zonas cercanas, elegibles y con el precio dentro de la referencia; por distancia, una por barrio', () => {
		// B (420 m, barrio 072) y C (840 m, barrio 072) tienen R_sup menor que A; E (880 m, barrio 071) tiene mayor
		const precio = (refDe('B').sup + refDe('E').sup) / 2 + 1;
		const r = aquiEstariasDentro(anuncio(precio), ORIGEN, ['A'], DATOS, CENTROS);
		const ids = r.opciones.map((o) => o.cusec);
		expect(ids).toEqual(['E']);
		for (const o of r.opciones) {
			expect(o.refSup).toBeGreaterThanOrEqual(precio);
			expect(o.refInf).toBeLessThan(o.refSup);
			expect(o.distanciaM).toBeLessThanOrEqual(1500);
		}
		expect(ids).not.toContain('D'); // 10 testigos
		expect(ids).not.toContain('F'); // sin dato
		expect(ids).not.toContain('LEJOS'); // a 1,7\u00A0km
		expect(ids).not.toContain('A'); // la propia zona
	});

	it('la posición es la del motor: parte baja, media o alta entre la referencia inferior y la superior', () => {
		const r = refDe('E');
		const en = (p: number) => aquiEstariasDentro(anuncio(p), ORIGEN, ['A', 'B', 'C'], DATOS, CENTROS).opciones[0]!.posicion;
		expect(en(r.inf + (r.sup - r.inf) * 0.2)).toBe('baja');
		expect(en(r.inf + (r.sup - r.inf) * 0.5)).toBe('media');
		expect(en(r.inf + (r.sup - r.inf) * 0.9)).toBe('alta');
	});

	it('una por barrio, ordenadas por distancia y como mucho 5', () => {
		const muchas: Record<string, SeccionJson> = {};
		const centros = new Map<string, Punto>();
		const barrios: DatosMadrid['barrios'] = {};
		for (let i = 0; i < 9; i++) {
			// S0…S8 en 9 barrios distintos; S9 comparte barrio con S8, pero está más lejos
			muchas[`S${i}`] = sec(12, 20, 100, { barrio: `B${i}` });
			barrios[`B${i}`] = { nombre: `Barrio ${i}`, cod_distrito: '01', distrito: 'Centro' };
			centros.set(`S${i}`, { lon: -3.7 + (9 - i) * 0.0008, lat: 40.42 }); // S8 es la más cercana
		}
		muchas.S9 = sec(12, 20, 100, { barrio: 'B8' });
		centros.set('S9', { lon: -3.7 + 0.0001 + 0.0, lat: 40.4215 });
		const datos = { ...DATOS, secciones: muchas, barrios };
		const r = aquiEstariasDentro(anuncio(refDe('A').sup), ORIGEN, [], datos, centros);
		expect(r.opciones).toHaveLength(5);
		const barriosElegidos = r.opciones.map((o) => o.barrio!.codigo);
		expect(new Set(barriosElegidos).size).toBe(5);
		const d = r.opciones.map((o) => o.distanciaM);
		expect([...d].sort((a, b) => a - b)).toEqual(d);
		// El barrio B8 aparece con su zona más cercana (S8), no con S9, que está más lejos
		expect(r.opciones[0]).toMatchObject({ cusec: 'S8' });
		expect(r.opciones.map((o) => o.cusec)).not.toContain('S9');
	});

	it('lista vacía si ninguna cumple', () => {
		expect(aquiEstariasDentro(anuncio(5000), ORIGEN, ['A'], DATOS, CENTROS).opciones).toEqual([]);
	});
});

// ——— Tu zona ———

describe('tu zona', () => {
	const z = zona(70, ORIGEN, ['A'], DATOS, CENTROS);
	const celda = (id: string) => z.celdas.find((c) => c.cusec === id)!;

	it('solo las cercanas y la del usuario; sin dato aparte', () => {
		expect(z.celdas.map((c) => c.cusec)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
		expect(celda('A').esUsuario).toBe(true);
		expect(celda('B').esUsuario).toBe(false);
		for (const id of ['D', 'F']) expect(celda(id)).toMatchObject({ eurosM2: null, clase: null });
		expect(celda('A').barrio).toBe('071');
	});

	it('los cortes son fijos para toda la ciudad: 15, 18, 21 y 24 €/m²', () => {
		expect(z.cortes).toEqual([15, 18, 21, 24]);
		expect(claseZona(14.99)).toBe(0);
		expect(claseZona(15)).toBe(1);
		expect(claseZona(18)).toBe(2);
		expect(claseZona(21)).toBe(3);
		expect(claseZona(24)).toBe(4);
		expect(claseZona(31)).toBe(4);
	});

	it('la clase de cada zona depende solo de su referencia, no de las demás', () => {
		for (const c of z.celdas.filter((x) => x.eurosM2 !== null)) expect(c.clase).toBe(claseZona(c.eurosM2!));
		// La misma zona, con otro vecindario, da la misma clase
		const sola = zona(70, ORIGEN, ['A'], DATOS, new Map([['A', ORIGEN]]));
		expect(sola.celdas[0]!.clase).toBe(celda('A').clase);
	});

	it('la zona del usuario entra aunque esté lejos', () => {
		const lejos = zona(70, ORIGEN, ['LEJOS'], DATOS, CENTROS);
		expect(lejos.celdas.some((c) => c.cusec === 'LEJOS' && c.esUsuario)).toBe(true);
	});

	it('sin ninguna zona con dato: todo sin dato', () => {
		const vacia = zona(70, ORIGEN, ['F'], DATOS, new Map([['F', ORIGEN]]));
		expect(vacia.celdas[0]).toMatchObject({ clase: null, eurosM2: null });
	});
});

describe('tu zona (vista)', () => {
	const entrada = (precio: number, clase: 'a' | 'b' | 'c', extra = {}) => ({
		anuncio: anuncio(precio), clase, origen: ORIGEN, cusecs: ['A'], datos: DATOS, centros: CENTROS, ...extra
	});

	it('niveles b y c: lista con filas numeradas, referencia, posición y distancia', () => {
		const v = construirTuZona(entrada(refDe('E').sup - 1, 'c'));
		expect(v.modo).toBe('lista');
		const f = v.lista!.filas[0]!;
		expect(f).toMatchObject({ n: 1, cusec: 'E', nombre: 'una zona de Almagro' });
		expect(f.referencia).toMatch(/^Referencia para 70\u00A0m²: [\d.]+ a [\d.]+\u00A0€ al mes$/);
		expect(f.posicion).toMatch(/^Este precio caería en su parte (baja|media|alta)$/);
		expect(f.distancia).toBe('0,9\u00A0km');
		expect(v.intro).toContain('Los números señalan');
		expect(v.lista!.aviso).toContain('No son pisos disponibles');
		expect(v.vacia).toBeNull();
	});

	it('sin zonas que cumplan: caja con el precio por m² y sin lista', () => {
		const v = construirTuZona(entrada(5000, 'c'));
		expect(v.modo).toBe('vacia');
		expect(v.lista).toBeNull();
		expect(v.vacia!.titulo).toBe('Zonas cercanas donde este precio es habitual: ninguna');
		expect(v.vacia!.texto).toBe('Este precio (71,4\u00A0€/m²) supera lo habitual en todas las zonas a 1,5\u00A0km o menos.');
		expect(v.intro).not.toContain('Los números señalan');
	});

	it('nivel a: solo contexto, sin lista ni caja vacía', () => {
		const v = construirTuZona(entrada(refDe('A').inf, 'a'));
		expect(v.modo).toBe('contexto');
		expect(v.lista).toBeNull();
		expect(v.vacia).toBeNull();
		expect(v.contexto).toContain('dentro de lo habitual aquí');
	});

	it('la leyenda tiene 6 muestras y la muesca cae en el tramo del precio por m²', () => {
		const v = construirTuZona(entrada(24.4 * 70, 'c'));
		expect(v.leyenda.map((l) => l.etiqueta)).toEqual(['<\u00A015', '15–18', '18–21', '21–24', '≥\u00A024', 'Sin dato']);
		expect(v.leyenda.at(-1)!.tono).toBeNull();
		expect(v.precioM2).toBe('24,4\u00A0€/m²');
		// Quinto tramo: entre 4/6,15 y 5/6,15 del ancho
		expect(v.muesca.x).toBeGreaterThan((4 / 6.15) * 100);
		expect(v.muesca.x).toBeLessThan((5 / 6.15) * 100);
		expect(v.muesca.alineada).toBe('derecha');
		expect(construirTuZona(entrada(10 * 70, 'a')).muesca.alineada).toBe('izquierda');
		expect(construirTuZona(entrada(19.5 * 70, 'a')).muesca.alineada).toBe('centro');
	});

	it('la evolución sale de la zona del usuario', () => {
		expect(construirTuZona(entrada(100, 'a')).evolucion!.tendencia).toBe('sube');
	});
});

// ——— Evolución ———

describe('evolución', () => {
	it('una zona: sube un X % entre 2015 y 2024, sin descontar la inflación', () => {
		const e = evolucion(DATOS, ['A'])!;
		expect(e.variacionMin).toBeCloseTo(0.5);
		expect(e.tendencia).toBe('sube');
		expect(e.texto).toBe('La renta registrada en esta zona ha subido un 50\u00A0% entre 2015 y 2024, sin descontar la inflación.');
		expect(e.partes.filter((p) => p.fuerte).map((p) => p.texto)).toEqual(['50\u00A0%']);
	});

	it('si baja, «ha bajado» y la cifra sin signo', () => {
		const datos = { ...DATOS, secciones: { ...DATOS.secciones, A: sec(12, 20, 100, { med2015: 20, med2024: 19.2 }) } };
		const e = evolucion(datos, ['A'])!;
		expect(e.tendencia).toBe('baja');
		expect(e.texto).toContain('ha bajado un 4\u00A0%');
	});

	it('si falta el dato de 2015 se omite', () => {
		expect(evolucion(DATOS, ['C'])).toBeNull();
		expect(evolucion(DATOS, ['NO_EXISTE'])).toBeNull();
	});

	it('horquilla: intervalo, sin contar las zonas sin 2015', () => {
		const datos = { ...DATOS, secciones: { ...DATOS.secciones, B: sec(10, 16, 80, { med2015: 12, med2024: 15 }) } };
		const e = evolucion(datos, ['A', 'B', 'C'])!;
		expect(e.puntos.map((p) => p.cusec)).toEqual(['A', 'B']);
		expect(e.variacionMin).toBeCloseTo(0.25);
		expect(e.variacionMax).toBeCloseTo(0.5);
		expect(e.texto).toContain('ha subido entre un 25\u00A0% y un 50\u00A0%');
	});

	it('si unas zonas suben y otras bajan, «ha cambiado entre» con signo', () => {
		const datos = { ...DATOS, secciones: { ...DATOS.secciones, B: sec(10, 16, 80, { med2015: 20, med2024: 19 }) } };
		expect(evolucion(datos, ['A', 'B'])!.texto).toContain('ha cambiado entre −5\u00A0% y +50\u00A0%');
	});
});

// ——— Tarjeta ———

describe('tarjeta', () => {
	it('lleva cifra, nivel, barrio, frase y barra en fracciones; nunca el precio ni los m²', () => {
		const r = refDe('A');
		const precio = Math.round(r.max + 237);
		const p = construirPantalla(anuncio(precio), ubic(['A']), DATOS);
		if (p.tipo !== 'resultado') throw new Error('esperaba resultado');
		const t = construirTarjeta(p);
		expect(t).toMatchObject({ clase: 'c', hero: { tipo: 'cifra', texto: p.brechaPct }, barrio: 'Almagro', aproximada: false });
		const texto = JSON.stringify(t);
		expect(texto).not.toContain(String(precio));
		expect(texto).not.toContain('€/mes');
		// Con la escala fija de la tarjeta no se puede volver al importe
		expect(t.barra.punto).toBeCloseTo(1 / 1.15);
		expect(t.barra.techo.hasta).toBeLessThan(t.barra.punto);
	});

	it('niveles sin porcentaje: titular y frase propia', () => {
		const r = refDe('A');
		for (const [precio, clase] of [[r.inf + 1, 'a'], [(r.sup + r.max) / 2, 'b']] as const) {
			const p = construirPantalla(anuncio(precio), ubic(['A']), DATOS);
			if (p.tipo !== 'resultado') throw new Error('esperaba resultado');
			const t = construirTarjeta(p);
			expect(t.clase).toBe(clase);
			expect(t.hero.tipo).toBe('titular');
			expect(JSON.stringify(t)).not.toContain('%');
		}
	});

	it('con horquilla, la barra lleva el tramo de incertidumbre', () => {
		const u = ubic(['A', 'B'], { aproximada: true, motivo: 'calle' });
		const p = construirPantalla(anuncio(Math.max(refDe('A').max, refDe('B').max) + 300), u, DATOS);
		if (p.tipo !== 'resultado') throw new Error('esperaba resultado');
		const t = construirTarjeta(p);
		expect(t.aproximada).toBe(true);
		expect(t.hero.tipo).toBe('rango');
		expect(t.barra.incertidumbre).not.toBeNull();
	});
});

// ——— Formulario ———

describe('formulario', () => {
	it.each([
		['1650', 1650], ['1.650', 1650], ['1.650,50', 1650.5], ['65,5', 65.5], ['65\u00A0m²', 65], ['1.650\u00A0€', 1650],
		['', null], ['abc', null], ['1,2,3', null], ['-5', null]
	])('interpretarNumero(%j)', (texto, esperado) => {
		expect(interpretarNumero(texto)).toBe(esperado);
	});

	const ok = { precio: '1.650', superficie: '65', obraNueva: false, largaDuracion: true, tipo: 'piso' as const };

	it('válido → anuncio', () => {
		expect(validarFormulario(ok)).toEqual({
			ok: true, anuncio: { precio: 1650, superficie: 65, obraNueva: false, tipo: 'piso', largaDuracion: true }
		});
	});

	it('errores por campo; 20 y 200 m² pasan al motor', () => {
		expect(validarFormulario({ ...ok, precio: '', superficie: 'x' })).toMatchObject({
			ok: false, errores: { precio: expect.any(String), superficie: expect.any(String) }
		});
		expect(validarFormulario({ ...ok, precio: '10' })).toMatchObject({ ok: false, errores: { precio: expect.any(String) } });
		expect(validarFormulario({ ...ok, superficie: '3000' })).toMatchObject({ ok: false, errores: { superficie: expect.any(String) } });
		expect(validarFormulario({ ...ok, superficie: '20' }).ok).toBe(true);
		expect(validarFormulario({ ...ok, superficie: '200' }).ok).toBe(true);
	});
});

// ——— R11: ¿Cuánto pagas tú? ———

describe('aportación', () => {
	const barrios = barriosDe(DATOS, ['A', 'B']);
	const base = { precio: '700', superficie: '50', anioContrato: '2018', barrio: '071', consentimiento: true };

	it('válida: payload con barrio, sin sección ni dirección', () => {
		const r = validarAportacion(base, barrios, 2026);
		expect(r).toEqual({ ok: true, payload: { barrio: '071', precio: 700, m2: 50, anioContrato: 2018, incluye: [] } });
		expect(Object.keys((r as { payload: object }).payload).sort()).toEqual(['anioContrato', 'barrio', 'incluye', 'm2', 'precio']);
	});

	it('sin consentimiento no hay payload', () => {
		expect(validarAportacion({ ...base, consentimiento: false }, barrios, 2026)).toMatchObject({
			ok: false, errores: { consentimiento: expect.any(String) }
		});
	});

	it('barrio ajeno, año fuera de rango y €/m² fuera de rango', () => {
		expect(validarAportacion({ ...base, barrio: '999' }, barrios, 2026)).toMatchObject({ ok: false, errores: { barrio: expect.any(String) } });
		expect(validarAportacion({ ...base, anioContrato: '2030' }, barrios, 2026)).toMatchObject({ ok: false, errores: { anioContrato: expect.any(String) } });
		expect(validarAportacion({ ...base, anioContrato: '1980' }, barrios, 2026).ok).toBe(false);
		expect(validarAportacion({ ...base, precio: '100' }, barrios, 2026)).toMatchObject({ ok: false, errores: { precio: expect.stringContaining('€/m²') } });
		expect(validarAportacion({ ...base, precio: '5000' }, barrios, 2026).ok).toBe(false);
	});

	it('barrios posibles de una horquilla, sin repetir y ordenados', () => {
		expect(barrios.map((b) => b.nombre)).toEqual(['Almagro', 'Gaztambide']);
	});
});
