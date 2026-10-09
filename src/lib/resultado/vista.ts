/**
 * Lo que el diseño pinta en la pantalla de resultado, ya formateado. Sale del mismo análisis
 * del motor que el resto de la pantalla: los componentes solo lo muestran.
 *
 * Reglas de contenido (revisables):
 *  - nivel «por encima»: la cifra es el % sobre la parte alta; debajo, € al mes y al año;
 *  - nivel «explicable» y «dentro»: titular en lugar de cifra; en «explicable», el % va en la frase;
 *  - la referencia se presenta como lo que pagan quienes ya viven aquí (contratos vigentes),
 *    nunca como precio de mercado: «lo habitual aquí», «dentro de rango», «se sale de lo habitual»;
 *  - con horquilla (varias zonas posibles) manda el nivel más prudente. Si todas las zonas caen en el mismo nivel, las cifras
 *    (%, €, meses, parte alta) salen de UNA referencia, la media de las zonas, para que cuadren entre sí, y debajo del titular
 *    una aclaración dice entre qué valores se mueve según la zona exacta. Si caen en niveles distintos, se muestra el rango
 *    (la cifra depende de la zona). Las bandas «lo habitual» (P25-P75) se quedan siempre como rango.
 */
import type { Analisis, Anuncio, Nivel } from '../motor';
import { type Barra, mostrarMedia, referenciaMedia } from './barra';
import type { BarrioDeSeccion } from './datos';
import { euros, mesAnio, numero, porcentaje } from './formato';
import { partesRatio, UMBRAL_VECES } from './ratio';
import {
	ETIQUETA_NIVEL, ETIQUETA_POR_DEBAJO, FRASE_NIVEL, FUENTE, MIRANDO, NIVEL_CONTRATOS, type ContextoAviso, AVISO_UBICACION
} from './textos';
import type { Ubicacion } from './ubicacion';

const NB = ' ';

export type Clase = 'a' | 'b' | 'c';

export type Principal =
	/** `antes`: palabra pequeña sobre la cifra («Piden») */
	| { tipo: 'cifra'; texto: string; nota: string; antes?: string }
	| { tipo: 'rango'; desde: string; hasta: string; nota: string; antes?: string }
	/** `enFrase`: el titular es una frase (no un rótulo en mayúsculas condensadas) */
	| { tipo: 'titular'; texto: string; nota: string; enFrase?: boolean };

/** Hasta este exceso sobre la parte alta, «algo por encima» es solo «en el límite alto» (umbral de presentación) */
export const UMBRAL_LIMITE_ALTO = 0.03;

/**
 * Con varias zonas posibles, la aclaración («Media de las zonas cercanas; según la zona exacta, de +8 % a +20 %») solo sale
 * si la parte alta de las zonas difiere en este tanto del precio o más; por debajo, los extremos difieren poco y sobra.
 * Con los 951 puntos aleatorios de Madrid, el 8 % de las horquillas queda por debajo de 0,03 (docs/progreso.md).
 */
export const UMBRAL_ACLARACION = 0.03;

export interface Meses {
	/** «casi 3 meses» */
	frase: string;
	/** «+2,7 meses» */
	extra: string;
	/** Relleno de cada bloque coloreado, de 0 a 1: el último puede ser parcial */
	bloques: number[];
}

export interface Vista {
	clase: Clase;
	/** «Fuente del Berro, Salamanca» */
	lugar: string;
	/** «90 m², 2.200 €/mes» */
	contexto: string;
	/** «90 m²» y «2.200 €» */
	m2: string;
	precio: string;
	etiqueta: string;
	principal: Principal;
	/** Puede ir vacía (en el límite alto el titular ya lo dice todo) */
	frase: string;
	/** Segunda línea bajo la frase («Solo cuadra si el piso es excelente») */
	matiz: string | null;
	/** Solo en «se sale de lo habitual»: la frase del cuadro «Entrar vs. estar dentro» («Piden un 23 % más por entrar…») */
	pidenFrase: string | null;
	/** Su línea pequeña: contra qué se compara («frente al tramo alto de esos contratos, ajustado a 90 m²») */
	encuadre: string | null;
	/** «En el límite alto»: hasta ~3 % sobre la parte alta */
	limiteAlto: boolean;
	/** Rótulo corto para la tarjeta cuando el titular de la pantalla es una frase */
	tituloCorto: string | null;
	/** «de 588 a 767 €»: la franja habitual (parte baja a parte alta) */
	habitual: string;
	/** Aviso fijo junto a la cifra: se compara con contratos vigentes */
	avisoContratos: string;
	/** Aviso de ubicación aproximada (cuerpo; el título va aparte). Ya no se pinta: lo sustituye `aclaracion` */
	aviso: string | null;
	/** Bajo el titular, con varias zonas que difieren: «Media de las zonas cercanas; según la zona exacta, de +8 % a +20 %.» */
	aclaracion: string | null;
	/** Solo en «por encima»: al mes y al año */
	brecha: { mes: string; año: string } | null;
	meses: Meses | null;
	/** Textos de las etiquetas directas de la barra */
	barra: { precio: string; parteAlta: string; techo: string; delta: string | null; tercio: 0 | 1 | 2 | null };
	/** «Basado en N contratos vigentes…» */
	fuente: string;
}

/** «de 3,4» → «casi 3 meses» / «más de 3 meses» / «unos 3 meses» */
export function mesesEquivalentes(m: number, alMenos: boolean): Meses {
	const n = Math.floor(m);
	const f = m - n;
	// «un mes», no «1 mes»; «unos 2 meses»
	const cuenta = (k: number) => (k === 1 ? 'un mes' : `${k}${NB}meses`);
	let frase: string;
	if (n === 0) frase = f >= 0.75 ? 'casi un mes' : 'menos de un mes';
	else if (f >= 0.75) frase = `casi ${cuenta(n + 1)}`;
	else if (f >= 0.25) frase = `más de ${cuenta(n)}`;
	else frase = n === 1 ? 'un mes' : `unos ${cuenta(n)}`;

	// Truncado, no redondeado: «+5,9 meses» para 5,98, para no contradecir «casi 6 meses»
	const truncado = (Math.floor(m * 10) / 10).toFixed(1).replace('.', ',');
	const bloques = Array.from({ length: Math.ceil(m) }, (_, i) => Math.min(1, m - i));
	return { frase, extra: `${alMenos ? 'al menos ' : ''}+${truncado}${NB}meses`, bloques };
}

/** «1.691 €» o, si los extremos difieren, «entre 947 y 995 €» */
export function rangoEuros(min: number, max: number): string {
	return numero(min) === numero(max) ? euros(min) : `entre ${numero(min)} y ${euros(max)}`;
}

/**
 * La cifra principal del nivel «por encima», a partir del ratio precio / R_sup. Con horquilla
 * (`ratioMax` no nulo) la unidad la marca el ratio menor, el prudente: si ese ya es de 2 veces o
 * más, ambos extremos van en «veces»; si no, ambos en porcentaje.
 */
export function principalPorEncima(ratio: number, ratioMax: number | null, m2: string, varias = ratioMax !== null): Principal {
	const p = partesRatio(ratio);
	// Con varias zonas posibles se habla de «estas zonas»
	const nota = `${p.enVeces ? '' : 'sobre '}lo más alto habitual en ${varias ? 'estas zonas' : 'tu zona'} (${m2})`;
	if (ratioMax !== null) {
		const veces = ratio >= UMBRAL_VECES;
		const formato = (r: number) => (veces ? partesRatio(r).cifra : porcentaje(r - 1, true));
		const [desde, hasta] = [formato(ratio), formato(ratioMax)];
		if (desde !== hasta) return { tipo: 'rango', desde, hasta, nota };
	}
	return { tipo: 'cifra', texto: p.cifra, nota };
}

/** La frase del cuadro «Entrar vs. estar dentro»: una sola cifra (o un intervalo con horquilla) */
export function pidenFrase(ratio: number, ratioMax: number | null, varias = ratioMax !== null): string {
	const zona = varias ? 'de estas zonas' : 'de la zona';
	if (ratio >= UMBRAL_VECES) {
		const [d, h] = [numero(ratio, 1), ratioMax !== null ? numero(ratioMax, 1) : null];
		return h !== null && h !== d ? MIRANDO.pidenVecesRango(d, h, zona) : MIRANDO.pidenVeces(`${d}${NB}veces`, zona);
	}
	const [d, h] = [porcentaje(ratio - 1), ratioMax !== null ? porcentaje(ratioMax - 1) : null];
	return h !== null && h !== d ? MIRANDO.pidenPctRango(d, h, zona) : MIRANDO.pidenPct(d, zona);
}

/** «de +8 % a +20 %» o «de 2,1 a 3,4 veces» (la unidad la marca el ratio menor); null si los dos extremos salen iguales */
export function rangoDeRatios(min: number, max: number): string | null {
	const veces = min >= UMBRAL_VECES;
	const f = (r: number) => (veces ? numero(r, 1) : porcentaje(r - 1, true));
	const [desde, hasta] = [f(min), f(max)];
	return desde === hasta ? null : `de ${desde} a ${hasta}${veces ? `${NB}veces` : ''}`;
}

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
	/** El bloque de «Lo que se pide» lleva veredicto: los textos de nivel hablan expresamente de los contratos de la zona */
	conVeredicto?: boolean;
}

export function construirVista({ anuncio, ubicacion, analisis, barra, barrio, ipcMes, conVeredicto = false }: EntradaVista): Vista {
	const { prudente, secciones, horquilla } = analisis;
	const nivel = prudente.nivel;
	const clase = claseDe(nivel);
	const m2 = `${numero(anuncio.superficie)}${NB}m²`;

	// Las cifras salen de una sola referencia: la media de las zonas posibles si todas están en el mismo nivel; si no, la de la
	// zona más prudente (no se usa para cifras: con niveles distintos no hay cifra de «por encima» y se muestra el rango)
	const usarMedia = mostrarMedia(analisis);
	const media = usarMedia ? referenciaMedia(secciones.map((s) => s.referencia)) : prudente.referencia;
	const ratio = anuncio.precio / media.sup;
	const euroMes = anuncio.precio - media.sup;

	// Franja que comparten todas las zonas posibles: de la mayor parte baja a la menor parte alta
	const habitual = `de ${numero(barra.inf.max)} a ${euros(barra.sup.min)}`;
	// «Por debajo»: bajo la parte baja en todas las zonas posibles (el mismo criterio que «Mi alquiler»); es del nivel, no de la media
	const porDebajo = nivel.nivel === 'dentro' && anuncio.precio < Math.min(...secciones.map((s) => s.referencia.inf));

	let principal: Principal;
	let frase: string = clase === 'c' && conVeredicto ? NIVEL_CONTRATOS.c : FRASE_NIVEL[clase];
	let matiz: string | null = null;
	let encuadre: string | null = null;
	let pidenFraseCaja: string | null = null;
	let tituloCorto: string | null = null;
	let brecha: Vista['brecha'] = null;
	let meses: Meses | null = null;
	let delta: string | null = null;

	if (nivel.nivel === 'por_encima') {
		principal = principalPorEncima(ratio, null, m2, horquilla);
		brecha = { mes: `+${euros(euroMes)}`, año: `+${euros(euroMes * 12)}` };
		delta = `+${numero(euroMes)}${NB}€`;
		// Meses de alquiler al año que supone la brecha
		meses = mesesEquivalentes((euroMes * 12) / anuncio.precio, false);
		// Bajo la cifra grande va «sobre lo más alto habitual…»; «Piden un X % más…» solo en el cuadro «Entrar vs. estar dentro»
		pidenFraseCaja = pidenFrase(ratio, null, horquilla);
		encuadre = MIRANDO.encuadre(m2);
	} else if (nivel.nivel === 'explicable') {
		// Sin rango ni «+1 €»: «algo por encima» no debe leerse como fuera de la franja ni repetir la cifra
		const limiteAlto = (horquilla && !usarMedia ? prudente.brecha!.pct : ratio - 1) <= UMBRAL_LIMITE_ALTO;
		if (limiteAlto) {
			principal = { tipo: 'titular', texto: conVeredicto ? NIVEL_CONTRATOS.limiteAlto : MIRANDO.limiteAlto, nota: '', enFrase: true };
			frase = '';
			tituloCorto = 'Límite alto';
		} else {
			principal = {
				tipo: 'titular',
				texto: horquilla && !usarMedia
					? (conVeredicto ? NIVEL_CONTRATOS : MIRANDO).algoPorEncimaHorquilla
					: (conVeredicto ? NIVEL_CONTRATOS : MIRANDO).algoPorEncima(porcentaje(ratio - 1)),
				nota: '',
				enFrase: true
			};
			frase = '';
			matiz = conVeredicto ? NIVEL_CONTRATOS.b : FRASE_NIVEL.b;
			tituloCorto = 'Sobre la parte alta';
		}
	} else {
		principal = {
			tipo: 'titular',
			texto: porDebajo ? ETIQUETA_POR_DEBAJO : `Parte ${nivel.posicion}`,
			nota: MIRANDO.notaDentro(numero(barra.inf.max), euros(barra.sup.min), m2, horquilla)
		};
		frase = porDebajo ? MIRANDO.porDebajo : MIRANDO.dentro;
	}

	const suma = secciones.reduce((t, s) => t + s.seccion.n, 0);
	const mes = mesAnio(ipcMes);
	const zonas = ubicacion.motivo === 'calle' ? 'las zonas que cruza la calle' : 'las zonas posibles';
	const fuente = horquilla
		? FUENTE.varias(numero(suma), zonas, mes) +
			(numero(barra.inf.min) !== numero(barra.inf.max)
				? ` La parte baja de lo habitual va de ${numero(barra.inf.min)} a ${euros(barra.inf.max)}.`
				: '')
		: FUENTE.una(numero(suma), mes);

	// Aclaración: solo con una cifra en pantalla (por encima) y si las zonas difieren de verdad
	const sups = secciones.map((s) => s.referencia.sup);
	const ancho = (Math.max(...sups) - Math.min(...sups)) / anuncio.precio;
	const rango = usarMedia && nivel.nivel !== 'dentro' && ancho >= UMBRAL_ACLARACION ? rangoDeRatios(analisis.pctMin + 1, analisis.pctMax + 1) : null;

	return {
		clase,
		lugar: barrio ? `${barrio.nombre}, ${barrio.distrito}` : 'Madrid',
		contexto: `${m2}, ${euros(anuncio.precio)}/mes`,
		m2,
		precio: euros(anuncio.precio),
		etiqueta: porDebajo ? ETIQUETA_POR_DEBAJO : ETIQUETA_NIVEL[clase],
		principal,
		frase,
		matiz,
		pidenFrase: pidenFraseCaja,
		encuadre,
		limiteAlto: nivel.nivel === 'explicable' && (horquilla && !usarMedia ? prudente.brecha!.pct : ratio - 1) <= UMBRAL_LIMITE_ALTO,
		tituloCorto,
		habitual,
		avisoContratos: MIRANDO.aviso,
		aviso: avisoUbicacion(ubicacion, secciones.length, horquilla),
		aclaracion: rango ? MIRANDO.aclaracion(rango) : horquilla && !usarMedia ? MIRANDO.aclaracionRango : null,
		brecha,
		meses,
		barra: {
			precio: euros(anuncio.precio),
			parteAlta: rangoEuros(barra.sup.min, barra.sup.max),
			techo: rangoEuros(barra.techo.min, barra.techo.max),
			delta,
			tercio: nivel.nivel === 'dentro' && !porDebajo ? ({ baja: 0, media: 1, alta: 2 } as const)[nivel.posicion] : null
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
