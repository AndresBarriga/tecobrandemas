/**
 * El resultado con dos referencias, ya formateado para pintar: contratos vigentes (SERPAVI, lo que se paga) y
 * anuncios recientes (serie del Ayuntamiento, lo que se pide). Lo comparten la pantalla de los dos modos, el
 * ejemplo de la portada y la tarjeta compartible. No calcula niveles: los recibe del motor.
 *
 * Reglas (rediseño del 09/10/2026):
 *  - cada cifra aparece una sola vez: el % de cada referencia en su tarjeta; los euros solo en las reglas, y el
 *    impacto (al mes, al año, meses) una vez y solo frente a los contratos;
 *  - el orden lo marca el modo: «Un anuncio», anuncios primero; «Mi alquiler», contratos primero;
 *  - «zona» solo para los contratos; para los anuncios, «barrio de X» o «distrito de Y»;
 *  - nunca se calcula ni se muestra la diferencia entre las dos referencias: cada una se compara solo con el precio.
 */
import type { ContraOferta } from '../motor';
import type { Barra } from './barra';
import { euros, mesAnio, numero, porcentaje } from './formato';
import type { PantallaOferta } from './oferta';
import { UMBRAL_VECES, partesRatio } from './ratio';
import { COMPARATIVA as T } from './textos';
import { type Clase, type Meses, mesesEquivalentes } from './vista';

export type ModoComparativa = 'mirando' | 'vivo';
/** El precio frente a los contratos: por encima de la parte alta, dentro de rango o por debajo de la parte baja */
export type FrenteContratos = 'encima' | 'dentro' | 'debajo';

export interface TarjetaContratos {
	clase: Clase;
	/** El icono de «por debajo» es un chevron hacia abajo */
	icono: Clase | 'abajo';
	/** El nivel: «Se sale de lo habitual», «Algo por encima»… */
	etiqueta: string;
	/** «+32 %», «−12 %», «2,3 veces» o, con zonas en niveles distintos, «+8 % a +20 %» */
	cifra: string;
	/** «sobre la parte alta de la zona» */
	nota: string;
}

export interface TarjetaAnuncios {
	/** «barrio de Goya» o «distrito de Moratalaz» */
	lugar: string;
	/** «+2 %» frente a la media de anuncios del barrio o del distrito */
	cifra: string;
	/** «Frente a la oferta estimada para una vivienda de 90 m² en el distrito de Moratalaz.» */
	nota: string;
	/** La misma nota sin los m², para la tarjeta compartible */
	notaCorta: string;
	/** «En línea», «Por encima», «Por debajo» */
	veredicto: string;
	contra: ContraOferta;
}

export interface Marca {
	/** Fracción del eje, de 0 a 1 */
	x: number;
	texto: string;
}

export interface Reglas {
	/** Eje común a las dos reglas: extremos y alguna marca intermedia, en euros redondeados */
	eje: { min: number; max: number; marcas: Marca[] };
	/** Posición del precio en el eje (la misma en las dos reglas) */
	punto: number;
	contratos: {
		/** Lo habitual: de la parte baja a la parte alta (la franja común a las zonas posibles) */
		banda: { desde: number; hasta: number };
		/** Con zonas en niveles distintos, el tramo de la parte alta entre las zonas */
		incertidumbre: { desde: number; hasta: number } | null;
		parteAlta: Marca;
		/** «Si fuera un piso excelente» (R_max) */
		techo: Marca;
	};
	anuncios: {
		/** La banda «en línea» (±10 %): solo sirve para clasificar; no se dibuja (no es un intervalo estadístico) */
		banda: { desde: number; hasta: number };
		/** La oferta estimada: «Oferta estimada · 1.543 €» (marcador vertical violeta) */
		media: Marca;
		/** El precio de la persona: «Tu alquiler · 1.400 €» (marcador circular amarillo) */
		precio: string;
		/** «1.400 €»: para rehacer la etiqueta en el otro modo */
		importe: string;
		/** «Estimación para una vivienda de 90 m² en el distrito de Moratalaz.» */
		estimacion: string;
		/** «Ayuntamiento de Madrid · junio de 2026» */
		fuente: string;
	} | null;
}

export interface Impacto {
	/** «+653 €» o «de +598 a +715 €» */
	mes: string;
	año: string;
	/** «Equivale a más de un mes de este alquiler al año.» */
	frase: string;
	meses: Meses;
}

export interface Comparativa {
	modo: ModoComparativa;
	/** Una o dos frases cortas, en el orden del modo */
	resumen: string;
	/** El orden de las tarjetas y de las reglas */
	orden: ('contratos' | 'anuncios')[];
	contratos: TarjetaContratos;
	anuncios: TarjetaAnuncios | null;
	/** Subtítulo de la tarjeta de anuncios: «lo que se pide» o, en «Mi alquiler», «si te mudaras» */
	subAnuncios: string;
	explicacion: string;
	reglas: Reglas;
	impacto: Impacto | null;
	/** Lo que hace falta para rehacer la comparativa en el otro modo */
	direcciones: { contratos: FrenteContratos; anuncios: ContraOferta | null };
}

const VEREDICTO: Record<ContraOferta, string> = { por_encima: T.veredicto.encima, en_linea: T.veredicto.enLinea, por_debajo: T.veredicto.debajo };

/** El resumen: dos frases cortas o, si los dos veredictos van en la misma dirección, una sola */
export function resumenComparativa(modo: ModoComparativa, contratos: FrenteContratos, anuncios: ContraOferta | null): string {
	const c = T.resumen.contratos[contratos];
	if (anuncios === null) return c;
	if (contratos === 'encima' && anuncios === 'por_encima') return T.resumen.ambas.encima[modo];
	if (contratos === 'debajo' && anuncios === 'por_debajo') return T.resumen.ambas.debajo[modo];
	const a = T.resumen.anuncios[anuncios];
	return modo === 'mirando' ? `${a} ${c}` : `${c} ${a}`;
}

const redondear50 = (v: number, arriba: boolean) => (arriba ? Math.ceil(v / 50) : Math.floor(v / 50)) * 50;

/** Marcas intermedias «redondas» del eje: entre 1 y 4, lejos de los extremos para que las etiquetas no se pisen */
function marcasIntermedias(min: number, max: number): number[] {
	const paso = [50, 100, 200, 250, 500, 1000, 2000, 2500, 5000].find((p) => (max - min) / p <= 4) ?? 10000;
	const xs: number[] = [];
	for (let v = Math.ceil(min / paso) * paso; v < max; v += paso) {
		const f = (v - min) / (max - min);
		if (f > 0.2 && f < 0.8) xs.push(v);
	}
	return xs;
}

export interface EntradaComparativa {
	modo: ModoComparativa;
	precio: number;
	/** m² de la vivienda (para el texto de la estimación de oferta) */
	superficie: number;
	barra: Barra;
	/** La parte alta de la que salen las cifras: la media de las zonas si están en el mismo nivel; si no, la prudente */
	parteAlta: number;
	frente: FrenteContratos;
	clase: Clase;
	etiqueta: string;
	porDebajo: boolean;
	/** Con zonas en niveles distintos: precio / parte alta en la zona más prudente y en la menos */
	rango: { min: number; max: number } | null;
	oferta: PantallaOferta | null;
}

function cifraContratos(ratio: number, rango: EntradaComparativa['rango']): { cifra: string; nota: string } {
	if (rango) {
		const veces = rango.min >= UMBRAL_VECES;
		const f = (r: number) => (veces ? numero(r, 1) : porcentaje(r - 1, true));
		const [d, h] = [f(rango.min), f(rango.max)];
		if (d !== h) return { cifra: veces ? `${d} a ${h} veces` : `${d} a ${h}`, nota: T.contratos.notaRango };
	}
	const p = partesRatio(ratio);
	if (ratio < 1) return { cifra: porcentaje(ratio - 1, true), nota: T.contratos.notaBajo };
	return { cifra: p.cifra.replace(' veces', ' veces'), nota: p.enVeces ? T.contratos.notaVeces : T.contratos.notaSobre };
}

export function construirComparativa(e: EntradaComparativa): Comparativa {
	const { barra, precio } = e;
	const o = e.oferta;
	const ratio = precio / e.parteAlta;
	const contratos: TarjetaContratos = {
		clase: e.clase,
		icono: e.porDebajo ? 'abajo' : e.clase,
		etiqueta: e.etiqueta,
		...cifraContratos(ratio, e.rango)
	};
	const anuncios: TarjetaAnuncios | null = o
		? {
				lugar: o.lugar,
				cifra: Math.abs(precio / o.estimada - 1) < 0.0005 ? '0 %' : porcentaje(precio / o.estimada - 1, true),
				nota: T.anuncios.nota(numero(e.superficie), o.lugar),
				notaCorta: T.anuncios.notaCorta(o.nivel),
				veredicto: VEREDICTO[o.contraOferta],
				contra: o.contraOferta
			}
		: null;

	// Eje común: de 0,6 × el valor más bajo a 1,1 × el más alto, redondeados a 50 €
	const bajaAnuncios = o ? o.estimada * (1 - o.banda) : Infinity;
	const altaAnuncios = o ? o.estimada * (1 + o.banda) : -Infinity;
	const bajo = Math.min(barra.inf.min, precio, bajaAnuncios);
	const alto = Math.max(barra.techo.max, precio, altaAnuncios);
	const min = redondear50(0.6 * bajo, false);
	const max = redondear50(1.1 * alto, true);
	const X = (v: number) => (v - min) / (max - min);
	const marca = (v: number): Marca => ({ x: X(v), texto: euros(v) });
	const hayIncertidumbre = barra.horquilla && barra.sup.max > barra.sup.min;
	const reglas: Reglas = {
		eje: { min, max, marcas: [marca(min), ...marcasIntermedias(min, max).map(marca), marca(max)] },
		punto: X(precio),
		contratos: {
			banda: { desde: X(barra.inf.max), hasta: X(Math.max(barra.inf.max, barra.sup.min)) },
			incertidumbre: hayIncertidumbre ? { desde: X(barra.sup.min), hasta: X(barra.sup.max) } : null,
			parteAlta: {
				x: X(barra.sup.max),
				texto: numero(barra.sup.min) === numero(barra.sup.max) ? euros(barra.sup.min) : `${numero(barra.sup.min)}–${euros(barra.sup.max)}`
			},
			techo: { x: X(barra.techo.max), texto: euros(barra.techo.max) }
		},
		anuncios: o
			? {
					banda: { desde: X(bajaAnuncios), hasta: X(altaAnuncios) },
					media: { x: X(o.estimada), texto: T.reglas.oferta(euros(o.estimada)) },
					precio: T.reglas.tuPrecio[e.modo](euros(precio)),
					importe: euros(precio),
					estimacion: T.reglas.estimacion(numero(e.superficie), o.lugar),
					fuente: T.reglas.fuenteOferta(mesAnio(o.mes))
				}
			: null
	};

	// Impacto: solo frente a los contratos y solo por encima de la parte alta
	let impacto: Impacto | null = null;
	if (e.frente === 'encima' && precio > barra.sup.min) {
		const tramo = e.rango && barra.sup.max > barra.sup.min;
		const [mesMin, mesMax] = tramo ? [Math.max(0, precio - barra.sup.max), precio - barra.sup.min] : [precio - e.parteAlta, precio - e.parteAlta];
		const intervalo = (a: number, b: number) => (numero(a) === numero(b) ? `+${euros(a)}` : `de +${numero(a)} a +${euros(b)}`);
		const meses = mesesEquivalentes((mesMin * 12) / precio, !!tramo);
		impacto = { mes: intervalo(mesMin, mesMax), año: intervalo(mesMin * 12, mesMax * 12), frase: T.impacto.frase(meses.frase, e.modo), meses };
	}

	const direcciones = { contratos: e.frente, anuncios: o ? o.contraOferta : null };
	return { ...textosDelModo(e.modo, direcciones), contratos, anuncios, reglas, impacto, direcciones };
}

function textosDelModo(modo: ModoComparativa, d: Comparativa['direcciones']) {
	return {
		modo,
		resumen: resumenComparativa(modo, d.contratos, d.anuncios),
		orden: (modo === 'mirando' ? ['anuncios', 'contratos'] : ['contratos', 'anuncios']) as Comparativa['orden'],
		subAnuncios: T.anuncios.sub[modo],
		explicacion: T.explicacion[modo]
	};
}

/** La misma comparativa vista desde el otro modo: cambian el orden, el resumen, la explicación y el impacto */
export function comparativaEnModo(c: Comparativa, modo: ModoComparativa): Comparativa {
	const impacto = c.impacto ? { ...c.impacto, frase: T.impacto.frase(c.impacto.meses.frase, modo) } : null;
	const a = c.reglas.anuncios;
	const reglas = a ? { ...c.reglas, anuncios: { ...a, precio: T.reglas.tuPrecio[modo](a.importe) } } : c.reglas;
	return { ...c, ...textosDelModo(modo, c.direcciones), impacto, reglas };
}

/** Descripción de las reglas para lectores de pantalla (sin repetir el precio, que va en la cabecera) */
export function descripcionReglas(c: Comparativa): string {
	const r = c.reglas;
	const contratos = T.reglas.aria.contratos(r.contratos.parteAlta.texto, r.contratos.techo.texto);
	const anuncios = r.anuncios && c.anuncios ? ` ${T.reglas.aria.anuncios(c.anuncios.lugar, r.anuncios.media.texto)}` : '';
	return `${contratos}${anuncios}`;
}
