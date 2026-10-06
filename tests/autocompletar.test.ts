import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { construirIndiceVias, palabras, sugerirVias } from '#lib/resultado';

describe('autocompletado de calles', () => {
	it('cada vía del callejero se encuentra escribiendo su última palabra, con y sin tilde', () => {
		const filas = JSON.parse(readFileSync('data/processed/viales_sugerencias.json', 'utf8')) as [string, string][];
		const indice = construirIndiceVias(filas);
		const conTilde = (p: string) => p.replace(/[aeiou]/, (v) => ({ a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' })[v]!);
		const fallos: string[] = [];
		for (const [nombre] of filas) {
			const ultima = palabras(nombre).at(-1)!;
			for (const escrita of [ultima, conTilde(ultima)]) {
				if (!sugerirVias(indice, escrita, Infinity).some((s) => s.nombre === nombre)) fallos.push(`${nombre} ← «${escrita}»`);
			}
		}
		expect(fallos.slice(0, 10)).toEqual([]);
		expect(indice.length).toBeGreaterThan(8000);
	});
});
