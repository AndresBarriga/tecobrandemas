/**
 * Pin en el mapa: el navegador (TopoJSON cuantizado, proyección aproximada) frente a Python
 * (polígonos a precisión completa en EPSG:25830) en 1.000 puntos aleatorios.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Topology } from 'topojson-specification';
import { describe, expect, it } from 'vitest';
import {
	MAX_SECCIONES_PIN, RADIO_PIN_M, distanciaMetros, prepararPoligonos, seccionEnPunto, seccionesDelPin, type Vecinas
} from '../src/lib/ubicacion/pin';

const leer = (ruta: string) => readFileSync(fileURLToPath(new URL(ruta, import.meta.url)), 'utf-8');
const poligonos = prepararPoligonos(JSON.parse(leer('../data/processed/secciones_madrid.topo.json')) as Topology);
const vecinas = JSON.parse(leer('../data/processed/vecinas.json')) as Vecinas;

const puntos = leer('./fixtures/puntos_pip.csv').trim().split(/\r?\n/).slice(1).map((linea) => {
	const [id, lon, lat, cusec, cercanas] = linea.split(',');
	return {
		id: id!,
		punto: { lon: Number(lon), lat: Number(lat) },
		cusec: cusec || null,
		cercanas: (cercanas ? cercanas.split('|') : []).map((c) => {
			const [s, d] = c.split(':');
			return { cusec: s!, d: Number(d) };
		})
	};
});

/** Margen por la cuantización (≈0,4 m) y la proyección aproximada */
const TOLERANCIA_M = 3;

describe('pin en el mapa frente a Python (1.000 puntos)', () => {
	it('carga las 2.443 secciones', () => {
		expect(poligonos.size).toBe(2443);
		expect(puntos).toHaveLength(1000);
	});

	it('la sección del punto coincide en ≥ 99,5 % (incluido «fuera de Madrid»)', () => {
		const distintos = puntos.filter((p) => seccionEnPunto(poligonos, p.punto) !== p.cusec);
		// Las diferencias solo pueden darse pegadas a un borde
		for (const p of distintos) expect(p.cercanas[1]?.d ?? 0).toBeLessThan(TOLERANCIA_M);
		console.log(`Sección del punto: ${1000 - distintos.length}/1000 iguales`);
		expect(distintos.length).toBeLessThanOrEqual(5);
	});

	it(`las distancias a las secciones cercanas difieren < ${TOLERANCIA_M} m`, () => {
		let maxDif = 0;
		for (const p of puntos) {
			for (const c of p.cercanas) maxDif = Math.max(maxDif, Math.abs(distanciaMetros(poligonos.get(c.cusec)!, p.punto) - c.d));
		}
		console.log(`Diferencia máxima de distancia: ${maxDif.toFixed(2)} m`);
		expect(maxDif).toBeLessThan(TOLERANCIA_M);
	});

	it(`horquilla: sección del punto + las más cercanas a ≤${RADIO_PIN_M} m, como mucho ${MAX_SECCIONES_PIN}`, () => {
		let distintos = 0;
		const t0 = performance.now();
		for (const p of puntos) {
			const r = seccionesDelPin(p.punto, poligonos, vecinas);
			if (p.cusec === null) {
				expect(r.estado).toBe('fuera');
				continue;
			}
			if (r.estado !== 'punto') continue;
			expect(r.cusecs.length).toBeLessThanOrEqual(MAX_SECCIONES_PIN);
			expect(r.cusecs[0]).toBe(r.cusec);
			expect(Object.values(r.distancias).every((d) => d <= RADIO_PIN_M)).toBe(true);

			// Python, con la sección del punto primero (en el borde puede estar a 0 m otra)
			const esperado = [p.cusec, ...p.cercanas.filter((c) => c.cusec !== p.cusec).map((c) => c.cusec)].slice(0, MAX_SECCIONES_PIN);
			// Secciones a 150 ± 3 m: según quién mida, quedan dentro o fuera del radio
			const frontera = (d: number) => Math.abs(d - RADIO_PIN_M) < TOLERANCIA_M;
			const dudosas = new Set([
				...p.cercanas.filter((c) => frontera(c.d)).map((c) => c.cusec),
				...Object.entries(r.distancias).filter(([, d]) => frontera(d)).map(([c]) => c)
			]);
			const igual = (a: string[], b: string[]) => a.filter((c) => !dudosas.has(c)).sort().join() === b.filter((c) => !dudosas.has(c)).sort().join();
			if (!igual(r.cusecs, esperado)) distintos++;
		}
		const msPorPin = (performance.now() - t0) / puntos.length;
		console.log(`Horquilla distinta: ${distintos}/1000 · ${msPorPin.toFixed(2)} ms por pin`);
		expect(distintos).toBe(0);
		expect(msPorPin).toBeLessThan(20);
	});
});
