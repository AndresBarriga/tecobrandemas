import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { construirIndiceVias, palabras, sugerirVias } from '#lib/resultado';

describe('autocompletado de calles', () => {
	it('cada vía del callejero se encuentra escribiendo su última palabra, con y sin tilde', () => {
		const filas = JSON.parse(readFileSync('data/processed/viales_sugerencias.json', 'utf8')) as [string, string][];
		const indice = construirIndiceVias(filas);
		const conTilde = (p: string) => p.replace(/[aeiou]/, (v) => ({ a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' })[v]!);
		// Cada última palabra se busca una vez: todas las vías que acaban en ella deben salir
		const porUltima = new Map<string, string[]>();
		for (const [nombre] of filas) {
			const ultima = palabras(nombre).at(-1)!;
			porUltima.set(ultima, [...(porUltima.get(ultima) ?? []), nombre]);
		}
		const fallos: string[] = [];
		for (const [ultima, nombres] of porUltima) {
			for (const escrita of [ultima, conTilde(ultima)]) {
				const halladas = new Set(sugerirVias(indice, escrita, Infinity).map((s) => s.nombre));
				for (const nombre of nombres) if (!halladas.has(nombre)) fallos.push(`${nombre} ← «${escrita}»`);
			}
		}
		expect(fallos.slice(0, 10)).toEqual([]);
		expect(indice.length).toBeGreaterThan(8000);
	}, 60_000);
});
