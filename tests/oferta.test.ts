import { describe, expect, it } from 'vitest';
import { OFERTA_BANDA_EN_LINEA, compararConOferta, factorTamano, referenciaOferta } from '#lib/motor';

const dato = (eurosM2: number) => ({ eurosM2, mes: '2026-06', nivel: 'distrito' as const });

describe('ajuste de la oferta por tamaño', () => {
	it('factor de tamaño', () => {
		expect(factorTamano(35)).toBeCloseTo(1.378, 3);
		expect(factorTamano(60)).toBeCloseTo(1.111, 3);
		expect(factorTamano(78)).toBeCloseTo(1, 3);
		expect(factorTamano(130)).toBeCloseTo(0.815, 3);
	});

	it('Vinateros: 17,14 €/m², 60 m², 1.400 € → referencia ≈ 1.142 €, +23 %, por encima', () => {
		expect(Math.abs(referenciaOferta(17.14, 60) - 1142)).toBeLessThanOrEqual(1);
		const r = compararConOferta(1400, 60, dato(17.14))!;
		expect(r.oferta.estimada).toBeCloseTo(referenciaOferta(17.14, 60), 6);
		expect(1400 / r.oferta.estimada - 1).toBeCloseTo(0.226, 2);
		expect(r.contraOferta).toBe('por_encima');
	});

	it('banda de «en línea» de ±15 %', () => {
		expect(OFERTA_BANDA_EN_LINEA).toBe(0.15);
		const e = referenciaOferta(20, 70);
		const caso = (f: number) => compararConOferta(e * f, 70, dato(20))!.contraOferta;
		expect(caso(1.14)).toBe('en_linea');
		expect(caso(1.16)).toBe('por_encima');
		expect(caso(0.84)).toBe('por_debajo');
	});

	it('no falla fuera de 30–150 m²', () => {
		for (const m2 of [1, 29, 151, 400]) expect(Number.isFinite(referenciaOferta(18, m2))).toBe(true);
	});
});
