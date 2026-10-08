import { describe, expect, it } from 'vitest';
import {
	FRASE_NIVEL, FRASE_TARJETA, heroEnVeces, parecePrecioErroneo, partesRatio, principalPorEncima, textoRatio,
	UMBRAL_ERROR_TECLEO
} from '#lib/resultado';

const NB = '\u00A0';

describe('textoRatio (precio / R_sup)', () => {
	it('por debajo de 2 es un porcentaje', () => {
		expect(textoRatio(1.5)).toBe(`+50${NB}%`);
		expect(textoRatio(1.99)).toBe(`+99${NB}%`);
		expect(textoRatio(1.047)).toBe(`+4,7${NB}%`);
	});

	it('desde 2 son «X,X veces la parte alta», con coma decimal y un decimal', () => {
		expect(textoRatio(2)).toBe(`2,0${NB}veces la parte alta`);
		expect(textoRatio(3.4)).toBe(`3,4${NB}veces la parte alta`);
		expect(textoRatio(5)).toBe(`5,0${NB}veces la parte alta`);
		expect(textoRatio(12.34)).toBe(`12,3${NB}veces la parte alta`);
	});

	it('la cifra en grande y su complemento dependen de la misma frontera', () => {
		expect(partesRatio(1.99)).toMatchObject({ cifra: `+99${NB}%`, complemento: 'sobre la parte alta', enVeces: false });
		expect(partesRatio(2)).toMatchObject({ cifra: `2,0${NB}veces`, complemento: 'la parte alta', enVeces: true });
	});

	it('no quedan frases fijas de «más del doble»', () => {
		expect(Object.keys(FRASE_NIVEL)).toEqual(['a', 'b', 'c']);
		expect(Object.keys(FRASE_TARJETA)).toEqual(['a', 'b', 'c']);
	});
});

describe('cifra principal del nivel «por encima»', () => {
	it('una sola cifra, en % o en veces', () => {
		expect(principalPorEncima(1.5, null, `90${NB}m²`)).toEqual({
			tipo: 'cifra', texto: `+50${NB}%`, nota: `sobre lo más alto habitual en tu zona (90${NB}m²)`
		});
		expect(principalPorEncima(3.4, null, `90${NB}m²`)).toEqual({
			tipo: 'cifra', texto: `3,4${NB}veces`, nota: `lo más alto habitual en tu zona (90${NB}m²)`
		});
	});

	it('con horquilla, la unidad la marca el ratio menor', () => {
		expect(principalPorEncima(2.3, 3.1, '')).toMatchObject({ tipo: 'rango', desde: `2,3${NB}veces`, hasta: `3,1${NB}veces` });
		expect(principalPorEncima(1.95, 3.1, '')).toMatchObject({ tipo: 'rango', desde: `+95${NB}%`, hasta: `+210${NB}%` });
		// Si los dos extremos se escriben igual, es una sola cifra
		expect(principalPorEncima(2.31, 2.34, '').tipo).toBe('cifra');
	});
});

describe('aviso de posible error al teclear', () => {
	it('solo con más de 3 veces la parte alta, nunca con exactamente 3', () => {
		expect(UMBRAL_ERROR_TECLEO).toBe(3);
		expect(parecePrecioErroneo(3)).toBe(false);
		expect(parecePrecioErroneo(3.0001)).toBe(true);
		expect(parecePrecioErroneo(2.99)).toBe(false);
		expect(parecePrecioErroneo(4, 5)).toBe(false);
		expect(parecePrecioErroneo(5.1, 5)).toBe(true);
	});
});

describe('hero de tarjeta en veces', () => {
	it('se reconoce por el texto guardado', () => {
		expect(heroEnVeces(`3,4${NB}veces`)).toBe(true);
		expect(heroEnVeces(`+240${NB}%`)).toBe(false);
	});
});
