import { describe, expect, it } from 'vitest';
import { colocarEtiqueta } from '#lib/resultado';

describe('colocarEtiqueta', () => {
	it('a la izquierda de su marca cuando cabe', () => {
		expect(colocarEtiqueta(500, 200, 800)).toBe(300);
	});

	it('si se saldría por la izquierda, pasa a la derecha de la marca', () => {
		// Banda pegada al borde: el caso del +240 % y del +400 %
		expect(colocarEtiqueta(120, 430, 912)).toBe(120);
	});

	it('no pisa el «0 €»: ni a la izquierda ni a la derecha', () => {
		expect(colocarEtiqueta(200, 170, 912, 60)).toBe(200);
		expect(colocarEtiqueta(20, 100, 912, 60)).toBe(60);
	});

	it('nunca sale por la derecha mientras quepa', () => {
		expect(colocarEtiqueta(700, 900, 912)).toBe(12);
		expect(colocarEtiqueta(900, 300, 912, 50)).toBe(600);
	});

	it('si no cabe de ningún modo, empieza donde queda libre', () => {
		expect(colocarEtiqueta(10, 300, 280, 40)).toBe(40);
	});

	it('con muchas combinaciones, la etiqueta queda dentro y a partir del hueco libre', () => {
		const W = 912;
		for (const w of [150, 300, 430]) {
			for (let ancla = 0; ancla <= W; ancla += 37) {
				const izq = colocarEtiqueta(ancla, w, W, 60);
				expect(izq).toBeGreaterThanOrEqual(60);
				expect(izq + w).toBeLessThanOrEqual(W);
			}
		}
	});
});
