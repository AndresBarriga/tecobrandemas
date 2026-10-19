/** «si fuera un piso excelente» (sin «máximo») y «Pagas…» sin «tus vecinos», en pantalla y en /como-calculamos */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COSTURA, type BarrioJson, type DatosMadrid, type OfertaJson, type SeccionJson, construirMetodologia } from '../src/lib/resultado';

const leer = <T>(f: string) => JSON.parse(readFileSync(`data/processed/${f}`, 'utf8')) as T;
const datos: DatosMadrid = {
	secciones: leer<Record<string, SeccionJson>>('secciones_madrid.json'),
	barrios: leer<{ barrios: Record<string, BarrioJson> }>('seccion_barrio.json').barrios,
	oferta: leer<OfertaJson>('oferta_madrid.json')
};
const cadenas = (v: unknown): string[] => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(cadenas) : []);

describe('palabras de la pantalla y de /como-calculamos', () => {
	it('«si fuera un piso excelente», sin «máximo» delante', () => {
		expect(COSTURA.contratos.maximo).toBe('si fuera un piso excelente: ');
		expect(COSTURA.aria.contratos('600 €', '900 €', '1.000 €')).toContain('; si fuera un piso excelente, 1.000 €');
		const todo = [...cadenas(COSTURA), ...cadenas(construirMetodologia(datos))];
		expect(todo.filter((t) => /máximo si fuera/i.test(t))).toEqual([]);
		expect(todo.some((t) => /si fuera un piso excelente/i.test(t))).toBe(true);
	});

	it('«Mi alquiler» no dice «tus vecinos»: compara con la parte baja o alta de lo que pagan quienes ya viven aquí', () => {
		const v = COSTURA.titular.contratos.vivo;
		expect(cadenas(COSTURA).filter((t) => /vecinos/i.test(t))).toEqual([]);
		expect(v.encima).toBe('Pagas más que la parte alta de lo que pagan quienes ya viven aquí.');
		expect(v.algo).toBe('Pagas algo más que la parte alta de lo que pagan quienes ya viven aquí.');
		expect(v.debajo).toBe('Pagas menos que la parte baja de lo que pagan quienes ya viven aquí.');
	});
});
