import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	MAPA_REFERENCIA, RANGO_METROS, RANGO_PRESUPUESTO, ajustarARango, capaPresupuesto, euros, hojaDeZona, paletaDe, posicionPresupuestoAnuncios, zonasCercanas, zonasDelMapa,
	type BarrioJson, type DatosMadrid, type IpcJson, type OfertaJson, type SeccionJson, type ZonaMapa
} from '../src/lib/resultado';
import { OFERTA_BANDA_EN_LINEA, referenciaOferta } from '../src/lib/motor';

const leer = <T>(f: string) => JSON.parse(readFileSync(`data/processed/${f}`, 'utf8')) as T;
const datos: DatosMadrid = {
	secciones: leer<Record<string, SeccionJson>>('secciones_madrid.json'),
	barrios: leer<{ barrios: Record<string, BarrioJson> }>('seccion_barrio.json').barrios,
	ipc: leer<IpcJson>('ipc_alquiler.json'),
	oferta: leer<OfertaJson>('oferta_madrid.json')
};

const zona = (cusec: string, eurosM2: number | null): ZonaMapa => ({
	cusec, barrio: null, supM2: null, refInf: null, refSup: null, n: null, evolucion: null, med2015: null, med2024: null,
	oferta: eurosM2 === null ? null : { eurosM2, mes: '2026-06', nivel: 'barrio' }
});

describe('«Mi presupuesto»: barras y números', () => {
	it('rangos: 500–3.000 € (paso 50, inicial 1.200) y 30–150 m² (paso 5, inicial 60)', () => {
		expect(RANGO_PRESUPUESTO).toEqual({ min: 500, max: 3000, paso: 50, inicial: 1200 });
		expect(RANGO_METROS).toEqual({ min: 30, max: 150, paso: 5, inicial: 60 });
	});

	it('un valor fuera del rango se ajusta al límite; dentro, se respeta; sin número, el inicial', () => {
		expect(ajustarARango(100, RANGO_PRESUPUESTO)).toBe(500);
		expect(ajustarARango(99_999, RANGO_PRESUPUESTO)).toBe(3000);
		expect(ajustarARango(1234, RANGO_PRESUPUESTO)).toBe(1234);
		expect(ajustarARango(10, RANGO_METROS)).toBe(30);
		expect(ajustarARango(400, RANGO_METROS)).toBe(150);
		expect(ajustarARango(62.4, RANGO_METROS)).toBe(62);
		expect(ajustarARango(null, RANGO_METROS)).toBe(60);
		expect(ajustarARango(Number.NaN, RANGO_PRESUPUESTO)).toBe(1200);
	});
});

describe('capa «Mi presupuesto» (solo oferta)', () => {
	const estimada = referenciaOferta(20, 60);
	const zonas = [zona('a', 20), zona('b', 20), zona('c', 20), zona('d', null)];

	it('las zonas se clasifican con los límites de la banda: 85 %, ±15 % y 115 % de la estimación', () => {
		expect(OFERTA_BANDA_EN_LINEA).toBe(0.15);
		const tono = (precio: number) => capaPresupuesto([zona('a', 20)], precio, 60).tonos.get('a');
		expect(tono(estimada * 0.84)).toBe(0);
		expect(tono(estimada * 0.86)).toBe(1);
		expect(tono(estimada * 1.14)).toBe(1);
		expect(tono(estimada * 1.16)).toBe(2);
	});

	it('sin dato de oferta, la zona queda sin tono y no cuenta en el resumen', () => {
		const c = capaPresupuesto(zonas, estimada, 60);
		expect(c.tonos.get('d')).toBeNull();
		expect(c.resumen).toMatchObject({ conDato: 3, llega: 3, sobra: 0, porcentaje: 100 });
	});

	it('mover los metros mueve la estimación: con más metros, el mismo presupuesto llega a menos', () => {
		const pocos = capaPresupuesto(zonas, 1200, 40).resumen.llega;
		const muchos = capaPresupuesto(zonas, 1200, 150).resumen.llega;
		expect(pocos).toBeGreaterThanOrEqual(muchos);
		expect(capaPresupuesto(zonas, 1200, 150).tonos.get('a')).toBe(0);
	});

	it('la leyenda y los textos son los de anuncios, sin contratos', () => {
		const c = capaPresupuesto(zonas, 1200, 60);
		expect(c.leyenda.map((l) => l.etiqueta)).toEqual(['No llega', 'En línea', 'Te sobra']);
		expect(c.nota).toContain('85');
		expect(c.nota).toContain('115');
		expect(c.nota).not.toMatch(/90|110|contratos vigentes/);
		expect(paletaDe('presupuesto', 'contratos')).toHaveLength(3);
	});

	it('con la oferta real: todas las zonas con dato se pintan al instante y la estimación coincide con la del resultado', () => {
		const z = zonasDelMapa(datos, 0);
		const c = capaPresupuesto(z, RANGO_PRESUPUESTO.inicial, RANGO_METROS.inicial);
		expect(c.resumen.conDato).toBeGreaterThan(1000);
		const con = z.find((x) => x.oferta)!;
		const hoja = hojaDeZona(con, datos, 'presupuesto', 55, 1400, 'anuncios');
		expect(hoja.parteAlta).toContain(euros(Math.round(referenciaOferta(con.oferta!.eurosM2, 55))));
		expect(hoja.referencia).not.toMatch(/contratos/);
	});

	it('las zonas más cercanas donde llega: por distancia, sin las que no llegan ni las sin dato', () => {
		const centros = new Map<string, readonly [number, number]>([['a', [0, 300]], ['b', [0, 100]], ['c', [0, 200]], ['d', [0, 10]]]);
		const zs = [zona('a', 20), zona('b', 20), zona('c', 40), zona('d', null)];
		const p = estimada * 1.1;
		const r = zonasCercanas(zs, [0, 0], centros, (z) => posicionPresupuestoAnuncios(p, 60, z), 2);
		expect(r.map((x) => x.cusec)).toEqual(['b', 'a']);
	});
});

describe('textos de «Mi presupuesto»', () => {
	it('invita a mover el presupuesto, no a escribirlo; el título de la vista es «¿Dónde me llega?»', () => {
		expect(MAPA_REFERENCIA.anuncios.presupuesto.pideDatos).toMatch(/^Mueve tu presupuesto/);
		expect(JSON.stringify(MAPA_REFERENCIA)).not.toContain('Escribe tu presupuesto');
		expect(MAPA_REFERENCIA.tituloPresupuesto).toBe('¿Dónde me llega?');
	});
});
