/** Lectura de tests/fixtures/tests_motor_serpavi.csv (sin comillas ni comas en los campos) */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Anuncio, SeccionConDato } from '../src/lib/motor';

export interface CasoFixture {
	caso: string;
	barrio: string;
	tipo: string;
	seccion: SeccionConDato;
	anuncio: Anuncio;
	rInfInicial: number | null;
	rSupInicial: number | null;
	appInf: number | null;
	appSup: number | null;
	calcInf: number | null;
	calcSup: number | null;
	motivoEsperado: string;
}

/**
 * El CSV no tiene columna de tipo de vivienda. A50 es la «casa adosada» del gate
 * (docs/decisiones.md, Gate A) y su motivo esperado es «unifamiliar».
 */
const CASAS = new Set(['A50']);

const numOrNull = (v: string | undefined) => (v === undefined || v === '' ? null : Number(v));

export function leerFixture(): CasoFixture[] {
	const ruta = fileURLToPath(new URL('./fixtures/tests_motor_serpavi.csv', import.meta.url));
	const [cabecera, ...lineas] = readFileSync(ruta, 'utf-8').trim().split('\n');
	const campos = cabecera!.split(',');
	return lineas.map((linea) => {
		const v = Object.fromEntries(linea.split(',').map((x, i) => [campos[i], x]));
		return {
			caso: v.caso!,
			barrio: v.barrio!,
			tipo: v.tipo!,
			seccion: {
				cusec: v.seccion!,
				smed: Number(v.Smed),
				p25: Number(v.P25),
				p75: Number(v.P75),
				n: Number(v.testigos)
			},
			anuncio: {
				precio: Number(v.precio),
				superficie: Number(v.superficie),
				obraNueva: v.obra_nueva === 'Sí',
				tipo: CASAS.has(v.caso!) ? 'casa' : 'piso',
				largaDuracion: true
			},
			rInfInicial: numOrNull(v.R_inf_inicial),
			rSupInicial: numOrNull(v.R_sup_inicial),
			appInf: numOrNull(v.app_inf),
			appSup: numOrNull(v.app_sup),
			calcInf: numOrNull(v.calc_inf),
			calcSup: numOrNull(v.calc_sup),
			motivoEsperado: v.motivo_esperado ?? ''
		};
	});
}
