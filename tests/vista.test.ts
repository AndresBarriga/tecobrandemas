import { describe, expect, it } from 'vitest';
import type { Anuncio } from '../src/lib/motor';
import {
	type DatosMadrid, construirPantalla, construirTarjeta, contadorBarrio, contadorInicio, filaHistorial,
	mesesEquivalentes, rangoEuros, textoNegociar, textosEnlace, validarTarjeta
} from '../src/lib/resultado';

const NB = ' ';
const sec = (p25: number, p75: number, n: number, barrio = '071') => ({
	cdis: '07', barrio, smed: 70, p25, p75, n, n_vu: 0, med2015: 10, med2024: 15
});
const DATOS: DatosMadrid = {
	secciones: { A: sec(12, 20, 100), B: sec(10, 16, 80, '072') },
	barrios: {
		'071': { nombre: 'Almagro', cod_distrito: '07', distrito: 'Chamberí' },
		'072': { nombre: 'Gaztambide', cod_distrito: '07', distrito: 'Chamberí' }
	},
	ipc: { factor: 1.05, ultimo_mes: '2026-08' }
};
const anuncio = (precio: number, extra: Partial<Anuncio> = {}): Anuncio => ({
	precio, superficie: 70, obraNueva: false, tipo: 'piso', largaDuracion: true, ...extra
});
const ubic = (cusecs: string[], extra = {}) => ({
	cusecs, aproximada: false, motivo: null, numerosUsados: [] as number[], punto: null, via: null, ...extra
});
const resultado = (precio: number, u = ubic(['A'])) => {
	const p = construirPantalla(anuncio(precio), u, DATOS);
	if (p.tipo !== 'resultado') throw new Error('esperaba resultado');
	return p;
};

describe('meses equivalentes', () => {
	it.each([
		[2.78, `casi 3${NB}meses`, `+2,7${NB}meses`],
		[5.98, `casi 6${NB}meses`, `+5,9${NB}meses`],
		[3.41, `más de 3${NB}meses`, `+3,4${NB}meses`],
		[4.1, `unos 4${NB}meses`, `+4,1${NB}meses`],
		[1.5, `más de 1${NB}mes`, `+1,5${NB}meses`],
		[0.4, 'menos de 1 mes', `+0,4${NB}meses`],
		[0.8, 'casi 1 mes', `+0,8${NB}meses`]
	])('%f → «%s»', (m, frase, extra) => {
		expect(mesesEquivalentes(m, false)).toMatchObject({ frase, extra });
	});

	it('rellena un bloque por mes y deja parcial el último; «al menos» en horquilla', () => {
		expect(mesesEquivalentes(2.5, false).bloques).toEqual([1, 1, 0.5]);
		expect(mesesEquivalentes(2.5, true).extra).toBe(`al menos +2,5${NB}meses`);
	});
});

describe('rangoEuros', () => {
	it('un valor o un intervalo con un solo «€»', () => {
		expect(rangoEuros(1691.2, 1691.4)).toBe(`1.691${NB}€`);
		expect(rangoEuros(947, 995)).toBe(`entre 947 y 995${NB}€`);
	});
});

describe('vista del resultado', () => {
	it('por encima: cifra, € al mes y al año, meses y fuente con el número de alquileres', () => {
		const p = resultado(2500);
		const v = p.vista;
		expect(v.clase).toBe('c');
		expect(v.principal).toMatchObject({ tipo: 'cifra', texto: p.brechaPct });
		expect(v.brecha!.mes.startsWith('+')).toBe(true);
		expect(v.brecha!.año).toContain(`${NB}€`);
		expect(v.meses).not.toBeNull();
		expect(v.lugar).toBe('Almagro, Chamberí');
		expect(v.contexto).toBe(`70${NB}m², 2.500${NB}€/mes`);
		expect(v.fuente).toBe(
			`Basado en 100 alquileres registrados en la zona, referencia 2024 ajustada por el IPC del alquiler (hasta agosto de 2026).`
		);
		expect(v.barra.delta).toBe(v.brecha!.mes);
	});

	it('dentro y explicable: titular, sin porcentaje ni meses', () => {
		const p = resultado(1000);
		expect(p.vista.clase).toBe('a');
		expect(p.vista.principal).toMatchObject({ tipo: 'titular', texto: expect.stringMatching(/^Parte (baja|media|alta)$/) });
		expect(p.vista.meses).toBeNull();
		expect(p.vista.barra.tercio).not.toBeNull();
		const b = resultado((p.barra.sup.max + p.barra.techo.max) / 2);
		expect(b.vista.clase).toBe('b');
		expect(b.vista.principal.tipo).toBe('titular');
		expect(JSON.stringify(b.vista)).not.toContain('%');
		expect(b.vista.barra.tercio).toBeNull();
	});

	it('la cifra pasa de porcentaje a «veces» desde 2 veces la parte alta, sin frases fijas', () => {
		const sup = resultado(2000).barra.sup.max;
		const cerca = resultado(sup * 1.95).vista;
		expect(cerca.principal).toMatchObject({ tipo: 'cifra', texto: expect.stringMatching(/%$/) });
		const lejos = resultado(sup * 3.4).vista;
		expect(lejos.principal).toMatchObject({ tipo: 'cifra', texto: `3,4${NB}veces` });
		expect(lejos.frase).toBe(cerca.frase);
	});

	it('horquilla: intervalo, fuente con la suma de alquileres y aviso con la calle', () => {
		const u = ubic(['A', 'B'], { aproximada: true, motivo: 'calle', via: 'Calle de Alcalá' });
		const p = resultado(4000, u);
		expect(p.vista.principal.tipo).toBe('rango');
		expect(p.vista.brecha!.mes.startsWith('de +')).toBe(true);
		expect(p.vista.meses!.extra.startsWith('al menos')).toBe(true);
		expect(p.vista.fuente).toContain('Basado en 180 alquileres registrados en las zonas que cruza la calle');
		expect(p.vista.fuente).toContain('La referencia empieza entre');
		expect(p.vista.aviso).toBe(
			'Calle de Alcalá, sin número, cruza 2 zonas con referencias distintas. Por eso te damos una horquilla.'
		);
		expect(p.vista.barra.parteAlta).toMatch(/^entre [\d.]+ y [\d.]+ €$/);
	});

	it('sin dato: lugar, contexto y variante según el lado del límite de superficie', () => {
		const pequeno = construirPantalla(anuncio(950, { superficie: 26 }), ubic(['A']), DATOS);
		const grande = construirPantalla(anuncio(4500, { superficie: 180 }), ubic(['A']), DATOS);
		if (pequeno.tipo !== 'sin_dato' || grande.tipo !== 'sin_dato') throw new Error('esperaba sin dato');
		expect(pequeno.titular).toBe(`Menos de 30${NB}m²`);
		expect(grande.titular).toBe(`Más de 150${NB}m²`);
		expect(pequeno.lugar).toBe('Almagro, Chamberí');
		expect(pequeno.contexto).toBe(`26${NB}m², 950${NB}€/mes`);
		const casa = construirPantalla(anuncio(2000, { tipo: 'casa', superficie: 210 }), ubic(['A']), DATOS);
		if (casa.tipo !== 'sin_dato') throw new Error('esperaba sin dato');
		expect(casa.contexto).toBe(`Casa unifamiliar, 210${NB}m²`);
	});
});

describe('contadores', () => {
	it('sin dato del servidor no se muestra nada', () => {
		expect(contadorInicio(null)).toBeNull();
		expect(contadorInicio(undefined)).toBeNull();
		expect(contadorBarrio(null)).toBeNull();
		expect(contadorInicio(-3)).toBeNull();
	});

	it('inicio: tres estados', () => {
		expect(contadorInicio(0)).toEqual({ numero: null, texto: 'Sé de los primeros en comprobar un piso en Madrid' });
		expect(contadorInicio(37)).toEqual({ numero: '37', texto: 'pisos comprobados. Esto acaba de empezar y el tuyo cuenta.' });
		expect(contadorInicio(12480)).toEqual({
			numero: '12.480', texto: 'pisos comprobados en Madrid. No eres el único que se lo pregunta.'
		});
		expect(contadorInicio(99)!.texto).toContain('Esto acaba de empezar');
		expect(contadorInicio(100)!.texto).toContain('No eres el único');
	});

	it('barrio: oculto por debajo de 10', () => {
		expect(contadorBarrio(0)).toBeNull();
		expect(contadorBarrio(9)).toBeNull();
		expect(contadorBarrio(10)).toEqual({ numero: '10', texto: 'personas han comprobado pisos en este barrio.' });
		expect(contadorBarrio(1234)!.numero).toBe('1.234');
	});
});

describe('negociar con el dato', () => {
	it('usa las cifras del resultado y cambia el tratamiento', () => {
		const p = resultado(2500);
		const tu = textoNegociar(p, 'tu');
		const usted = textoNegociar(p, 'usted');
		expect(tu).toContain(`vivienda de 70${NB}m² en Almagro que anuncian por 2.500${NB}€ al mes`);
		expect(tu).toContain(p.vista.barra.parteAlta);
		expect(tu).toContain('te agradecería que me lo indicaras');
		expect(usted).toContain('le agradecería que me lo indicaran');
		expect(tu).toContain('serpavi.mivau.gob.es');
	});
});

describe('historial', () => {
	it('fila con barrio, precio y m², y etiqueta corta', () => {
		const c = filaHistorial(resultado(2500));
		expect(c).toMatchObject({ titulo: 'Almagro', detalle: `2.500${NB}€, 70${NB}m²`, clase: 'c' });
		expect(c.etiqueta).toMatch(/^\+\d+ %$/);
		expect(filaHistorial(resultado(1000))).toMatchObject({ etiqueta: 'Dentro', clase: 'a' });
		const sd = construirPantalla(anuncio(900, { superficie: 20 }), ubic(['A']), DATOS);
		expect(filaHistorial(sd)).toMatchObject({ etiqueta: 'Sin dato', clase: null });
	});
});

describe('tarjeta en el servidor', () => {
	it('valida lo que construye el cliente y descarta cualquier campo extra', () => {
		const t = construirTarjeta(resultado(2500));
		const limpia = validarTarjeta({ ...t, precio: 2500, direccion: 'Calle X 3', barra: { ...t.barra } });
		expect(limpia).toEqual(t);
		expect(JSON.stringify(limpia)).not.toMatch(/2500|Calle X/);
	});

	it('rechaza lo mal formado', () => {
		const t = construirTarjeta(resultado(2500));
		expect(validarTarjeta(null)).toBeNull();
		expect(validarTarjeta({ ...t, clase: 'd' })).toBeNull();
		expect(validarTarjeta({ ...t, etiqueta: 'Otra' })).toBeNull();
		expect(validarTarjeta({ ...t, barra: { ...t.barra, punto: 7 } })).toBeNull();
		expect(validarTarjeta({ ...t, frase: 'x'.repeat(500) })).toBeNull();
		expect(validarTarjeta({ ...t, hero: { tipo: 'cifra', texto: '' } })).toBeNull();
	});

	it('el título y la descripción del enlace no llevan precio ni dirección', () => {
		const e = textosEnlace(construirTarjeta(resultado(2500)));
		expect(e.titulo).toBe('A su precio · Un piso en Almagro');
		expect(JSON.stringify(e)).not.toMatch(/2\.?500|€\/mes/);
	});
});
