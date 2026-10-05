/**
 * Lo que el diseño pinta en la pantalla de resultado, ya formateado. Sale del mismo análisis
 * del motor que el resto de la pantalla: los componentes solo lo muestran.
 *
 * Reglas de contenido (revisables):
 *  - nivel «por encima»: la cifra es el % sobre la parte alta; debajo, € al mes y al año;
 *  - nivel «explicable» y «dentro»: titular en lugar de cifra, sin porcentaje;
 *  - con horquilla manda el nivel más prudente; el % y los € solo salen si ese nivel es
 *    «por encima», y como intervalo.
 */
import type { Analisis, Anuncio, Nivel } from '../motor';
import type { Barra } from './barra';
import type { BarrioDeSeccion } from './datos';
import { euros, mesAnio, numero, porcentaje } from './formato';
import {
	ETIQUETA_NIVEL, FRASE_NIVEL, type ContextoAviso, AVISO_UBICACION
} from './textos';
import type { Ubicacion } from './ubicacion';

const NB = ' ';

export type Clase = 'a' | 'b' | 'c';

export type Principal =
	| { tipo: 'cifra'; texto: string; nota: string }
	| { tipo: 'rango'; desde: string; hasta: string; nota: string }
	| { tipo: 'titular'; texto: string; nota: string };

export interface Meses {
	/** «casi 3 meses» */
	frase: string;
	/** «+2,7 meses» (con «al menos» en horquilla) */
	extra: string;
	/** Relleno de cada bloque coloreado, de 0 a 1: el último puede ser parcial */
	bloques: number[];
}

export interface Vista {
	clase: Clase;
	/** Variante de la frase: la tarjeta usa la suya con la misma clave */
	grado: 'a' | 'b' | 'c' | 'c_casi_doble' | 'c_mas_doble';
	/** «Fuente del Berro, Salamanca» */
	lugar: string;
	/** «90 m², 2.200 €/mes» */
	contexto: string;
	/** «90 m²» y «2.200 €» */
	m2: string;
	precio: string;
	etiqueta: string;
	principal: Principal;
	frase: string;
	/** Aviso de ubicación aproximada (cuerpo; el título va aparte) */
	aviso: string | null;
	/** Solo en «por encima»: al mes y al año */
	brecha: { mes: string; año: string } | null;
	meses: Meses | null;
	/** Textos de las etiquetas directas de la barra */
	barra: { precio: string; parteAlta: string; techo: string; delta: string | null; tercio: 0 | 1 | 2 | null };
	/** «Basado en N alquileres registrados…» */
	fuente: string;
}

/** «de 3,4» → «casi 3 meses» / «más de 3 meses» / «unos 3 meses» */
export function mesesEquivalentes(m: number, alMenos: boolean): Meses {
	const n = Math.floor(m);
	const f = m - n;
	let frase: string;
	if (n === 0) frase = f >= 0.75 ? 'casi 1 mes' : 'menos de 1 mes';
	else if (f >= 0.75) frase = `casi ${n + 1}${NB}meses`;
	else if (f >= 0.25) frase = `más de ${n}${NB}${n === 1 ? 'mes' : 'meses'}`;
	else frase = `unos ${n}${NB}${n === 1 ? 'mes' : 'meses'}`;

	// Truncado, no redondeado: «+5,9 meses» para 5,98, para no contradecir «casi 6 meses»
	const truncado = (Math.floor(m * 10) / 10).toFixed(1).replace('.', ',');
	const bloques = Array.from({ length: Math.ceil(m) }, (_, i) => Math.min(1, m - i));
	return { frase, extra: `${alMenos ? 'al menos ' : ''}+${truncado}${NB}meses`, bloques };
}

/** «1.691 €» o, si los extremos difieren, «entre 947 y 995 €» */
export function rangoEuros(min: number, max: number): string {
	return numero(min) === numero(max) ? euros(min) : `entre ${numero(min)} y ${euros(max)}`;
}

const intervalo = (min: number, max: number, f: (x: number) => string) =>
	f(min) === f(max) ? f(min) : `${f(min)} a ${f(max)}`;

function claseDe(n: Nivel): Clase {
	return n.nivel === 'dentro' ? 'a' : n.nivel === 'explicable' ? 'b' : 'c';
}

export interface EntradaVista {
	anuncio: Anuncio;
	ubicacion: Ubicacion;
	analisis: Extract<Analisis, { tipo: 'resultado' }>;
	barra: Barra;
	barrio: BarrioDeSeccion | null;
	/** AAAA-MM del último dato del IPC */
	ipcMes: string;
}

export function construirVista({ anuncio, ubicacion, analisis, barra, barrio, ipcMes }: EntradaVista): Vista {
	const { prudente, secciones, horquilla } = analisis;
	const nivel = prudente.nivel;
	const clase = claseDe(nivel);
	const m2 = `${numero(anuncio.superficie)}${NB}m²`;
	const conBrecha = secciones.filter((s) => s.brecha !== null);

	let principal: Principal;
	let brecha: Vista['brecha'] = null;
	let meses: Meses | null = null;
	let delta: string | null = null;

	if (nivel.nivel === 'por_encima') {
		const pcts = [analisis.pctMin, analisis.pctMax];
		const nota = `sobre la parte alta de la referencia para ${m2} en esta zona`;
		principal =
			horquilla && porcentaje(pcts[0]!, true) !== porcentaje(pcts[1]!, true)
				? { tipo: 'rango', desde: porcentaje(pcts[0]!, true), hasta: porcentaje(pcts[1]!, true), nota }
				: { tipo: 'cifra', texto: porcentaje(horquilla ? pcts[0]! : prudente.pct, true), nota };

		const mes = conBrecha.map((s) => s.brecha!.euroMes);
		const año = conBrecha.map((s) => s.brecha!.euroAño);
		const conSigno = (x: number) => `+${numero(x)}`;
		brecha = horquilla && intervalo(Math.min(...mes), Math.max(...mes), conSigno).includes(' a ')
			? {
					mes: `de ${intervalo(Math.min(...mes), Math.max(...mes), conSigno)}${NB}€`,
					año: `de ${intervalo(Math.min(...año), Math.max(...año), conSigno)}${NB}€`
				}
			: { mes: `+${euros(Math.min(...mes))}`, año: `+${euros(Math.min(...año))}` };
		delta = `${intervalo(Math.min(...mes), Math.max(...mes), conSigno)}${NB}€`;

		// Meses de alquiler al año que supone la brecha; en horquilla, la menor
		const mesesMin = Math.min(...conBrecha.map((s) => s.brecha!.euroAño / anuncio.precio));
		meses = mesesEquivalentes(mesesMin, horquilla && brecha.mes.startsWith('de '));
	} else if (nivel.nivel === 'explicable') {
		const t = (prudente.referencia.max - prudente.referencia.sup);
		const cerca = (anuncio.precio - prudente.referencia.sup) / t >= 0.5;
		principal = {
			tipo: 'titular',
			texto: cerca ? 'Cerca del techo' : 'Sobre la parte alta',
			nota: horquilla
				? 'Por encima de la parte alta de la referencia, pero por debajo del techo para un piso excelente.'
				: `+${euros(prudente.brecha!.euroMes)} al mes sobre la parte alta, por debajo del techo para un piso excelente.`
		};
	} else {
		principal = {
			tipo: 'titular',
			texto: `Parte ${nivel.posicion}`,
			nota: `Entre ${numero(barra.inf.max)} y ${euros(barra.sup.min)} al mes para ${m2} en esta zona.`
		};
	}

	const grado = clase === 'c' ? (analisis.pctMin >= 1 ? 'c_mas_doble' : analisis.pctMin >= 0.9 ? 'c_casi_doble' : 'c') : clase;
	const frase = FRASE_NIVEL[grado];

	const suma = secciones.reduce((t, s) => t + s.seccion.n, 0);
	const ref = `referencia 2024 ajustada por el IPC del alquiler (hasta ${mesAnio(ipcMes)})`;
	const zonas = ubicacion.motivo === 'calle' ? 'las zonas que cruza la calle' : 'las zonas posibles';
	const fuente = horquilla
		? `Basado en ${numero(suma)} alquileres registrados en ${zonas}, ${ref}.` +
			(numero(barra.inf.min) !== numero(barra.inf.max)
				? ` La referencia empieza entre ${numero(barra.inf.min)} y ${euros(barra.inf.max)}.`
				: '')
		: `Basado en ${numero(suma)} alquileres registrados en la zona, ${ref}.`;

	return {
		clase,
		grado,
		lugar: barrio ? `${barrio.nombre}, ${barrio.distrito}` : 'Madrid',
		contexto: `${m2}, ${euros(anuncio.precio)}/mes`,
		m2,
		precio: euros(anuncio.precio),
		etiqueta: ETIQUETA_NIVEL[clase],
		principal,
		frase,
		aviso: avisoUbicacion(ubicacion, secciones.length, horquilla),
		brecha,
		meses,
		barra: {
			precio: euros(anuncio.precio),
			parteAlta: rangoEuros(barra.sup.min, barra.sup.max),
			techo: rangoEuros(barra.techo.min, barra.techo.max),
			delta,
			tercio: nivel.nivel === 'dentro' ? ({ baja: 0, media: 1, alta: 2 } as const)[nivel.posicion] : null
		},
		fuente
	};
}

function avisoUbicacion(u: Ubicacion, conDato: number, horquilla: boolean): string | null {
	if (!u.aproximada || !u.motivo) return null;
	const ctx: ContextoAviso = {
		n: u.cusecs.length || conDato,
		calle: u.via,
		usados: u.numerosUsados.join(' y ') || 'el más cercano',
		horquilla
	};
	return AVISO_UBICACION[u.motivo](ctx);
}
