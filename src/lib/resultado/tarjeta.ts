/**
 * Tarjeta compartible (R6): lo que se dibuja en el canvas de 1080×1350 y en la imagen OG de 1200×630, y lo que
 * guarda /t/:id.
 *
 * Versión 2 (rediseño del 09/10/2026): la frase resumen en el orden del modo, los dos porcentajes (contratos y
 * anuncios) y las dos reglas con el mismo eje, con los valores del eje en euros redondeados a 50. Nunca lleva el
 * precio exacto, la superficie ni la dirección; el punto va en fracción del eje, sin etiqueta. Como el eje sí lleva
 * euros, la posición del punto permite deducir el precio aproximado: el diálogo de compartir lo dice.
 *
 * Versión 1 (antes del rediseño): solo se lee y se dibuja, para que los enlaces ya compartidos sigan funcionando.
 * La versión 2 también queda solo de lectura desde la versión 3.
 *
 * Versión 3 («La costura», 10/10/2026): tres formatos que elige la persona («Dos veredictos», «La costura» y «La
 * cifra»), con las palabras y los % del resultado. Sin euros en ningún sitio: los carriles de «La costura» van en
 * fracciones de una escala sin rotular. La vista previa del enlace es siempre «Dos veredictos».
 */
import type { ClaveContratos, ClaveOferta, Costura, Veredicto } from './costura';
import { heroEnVeces } from './ratio';
import type { PantallaResultado } from './resultado';
import { COSTURA, ETIQUETA_OG, ETIQUETA_POR_DEBAJO, NOMBRE, OFERTA, OG, TARJETA, TARJETA_COSTURA, TARJETA_INQUILINO } from './textos';
import type { Clase } from './vista';

export const TARJETA_ANCHO = 1080;
export const TARJETA_ALTO = 1350;
export const OG_ANCHO = 1200;
export const OG_ALTO = 630;

export const CTA_TARJETA = 'Comprueba otro anuncio';
export const PIE_TARJETA = TARJETA.pie;

// ——— Versión 1: solo lectura ———

export type Hero =
	| { tipo: 'cifra'; texto: string }
	| { tipo: 'rango'; desde: string; hasta: string }
	| { tipo: 'titular'; texto: string };

export interface Tramo01 {
	desde: number;
	hasta: number;
}

/** Posición del inquilino en su tarjeta v1: por debajo, dentro de rango, algo por encima o se sale de lo habitual */
export type PosicionTarjeta = 'debajo' | 'dentro' | 'encimab' | 'encima';

/** Tarjeta guardada antes del rediseño: solo se lee y se dibuja */
export interface TarjetaV1 {
	v?: undefined;
	/** Tarjeta del inquilino («Mi alquiler»): su posición. Nunca lleva la renta ni la fecha de firma */
	inquilino?: { posicion: PosicionTarjeta };
	/** Con «Lo que se pide»: el titular decía «frente a los contratos vigentes de la zona» */
	contratos?: true;
	clase: Clase;
	etiqueta: string;
	hero: Hero;
	nota: string;
	frase: string;
	barrio: string | null;
	aproximada: boolean;
	barra: { banda: Tramo01; incertidumbre: Tramo01 | null; techo: Tramo01; punto: number; tercio: 0 | 1 | 2 | null };
}

// ——— Versión 2 ———

/** Tarjeta del rediseño: dos referencias, la frase resumen y las dos reglas con el mismo eje */
export interface TarjetaV2 {
	v: 2;
	modo: 'mirando' | 'vivo';
	/** La frase resumen, en el orden del modo (una de un conjunto cerrado) */
	resumen: string;
	barrio: string | null;
	aproximada: boolean;
	contratos: { clase: Clase; icono: Clase | 'abajo'; etiqueta: string; cifra: string; nota: string };
	anuncios: { lugar: string; cifra: string; nota: string; veredicto: string } | null;
	/** Todo en fracciones del eje; solo las marcas del eje llevan euros (redondeados a 50) */
	reglas: {
		marcas: { x: number; texto: string }[];
		punto: number;
		contratos: { banda: Tramo01; incertidumbre: Tramo01 | null; parteAlta: number; techo: number };
		anuncios: { banda: Tramo01; media: number } | null;
	};
}

// ——— Versión 3: «La costura» ———

export type TipoTarjeta = 'veredictos' | 'costura' | 'cifra';
export const TIPOS_TARJETA: readonly TipoTarjeta[] = ['veredictos', 'costura', 'cifra'];

/** Tarjeta de «La costura»: palabras, % y carriles en fracciones. Nunca euros, renta, m², dirección ni fecha */
export interface TarjetaV3 {
	v: 3;
	modo: 'mirando' | 'vivo';
	/** El formato que eligió la persona (la vista previa del enlace es siempre «Dos veredictos») */
	tipo: TipoTarjeta;
	/** «Embajadores, Centro» */
	lugar: string;
	barrio: string | null;
	aproximada: boolean;
	contratos: { clave: ClaveContratos; palabra: string; cifra: string; texto: string };
	/** null: sin dato de oferta para la zona */
	oferta: { clave: ClaveOferta; palabra: string; cifra: string; texto: string; nivel: 'barrio' | 'distrito' } | null;
	/** «La costura»: fracciones de una escala sin rotular */
	carriles: {
		punto: number;
		contratos: { banda: Tramo01; incertidumbre: Tramo01 | null; excelente: Tramo01 };
		oferta: { marca: number; margen: Tramo01 } | null;
	};
}

export type TarjetaDatos = TarjetaV1 | TarjetaV2 | TarjetaV3;

export const esV2 = (t: TarjetaDatos): t is TarjetaV2 => t.v === 2;
export const esV3 = (t: TarjetaDatos): t is TarjetaV3 => t.v === 3;

/** ¿Es la tarjeta de «Mi alquiler»? (v2 y v3: el modo; v1: la posición del inquilino) */
export const esDeInquilino = (t: TarjetaDatos): boolean => (esV2(t) || esV3(t) ? t.modo === 'vivo' : !!t.inquilino);

/** «La cifra» solo se ofrece con un % (o veces) frente a los contratos: algo por encima o por encima */
export const tieneCifra = (t: TarjetaV3): boolean => !!t.contratos.cifra && (t.contratos.clave === 'algo' || t.contratos.clave === 'encima');

/** Los formatos que se ofrecen para esta tarjeta, en orden */
export const tiposDe = (t: TarjetaV3): TipoTarjeta[] => TIPOS_TARJETA.filter((x) => x !== 'cifra' || tieneCifra(t));

const T = TARJETA_COSTURA;
const POSICIONES = ['baja', 'media', 'alta'] as const;

function textoContratos(v: Veredicto): string {
	if (v.clave === 'debajo') return T.contratos.debajo;
	if (v.clave === 'dentro') return T.contratos.dentro(POSICIONES.find((x) => v.texto.includes(`parte ${x}`)) ?? 'media');
	return /veces/.test(v.cifra) ? T.contratos.veces : T.contratos.sobre;
}

/**
 * La tarjeta del resultado (los dos modos): sale de la costura, sin euros, precio, m² ni dirección. Si el formato
 * pedido no se ofrece (la cifra sin %), queda «Dos veredictos».
 */
export function construirTarjeta(p: PantallaResultado, tipo: TipoTarjeta = 'veredictos'): TarjetaV3 {
	const c: Costura = p.costura;
	const mC = c.mitades.find((m) => m.fuente === 'contratos')!;
	const mO = c.mitades.find((m) => m.fuente === 'oferta');
	const vC = mC.veredicto!;
	const vO = mO?.veredicto ?? null;
	const nivel = p.entradaCostura.oferta?.nivel ?? 'distrito';
	const k = c.contratos;
	const t: TarjetaV3 = {
		v: 3,
		modo: c.modo,
		tipo,
		lugar: c.lugar,
		barrio: p.barrio,
		aproximada: p.horquilla,
		contratos: { clave: vC.clave as ClaveContratos, palabra: vC.palabra, cifra: vC.cifra, texto: textoContratos(vC) },
		oferta: vO && c.oferta ? { clave: vO.clave as ClaveOferta, palabra: vO.palabra, cifra: vO.cifra, texto: T.oferta(nivel), nivel } : null,
		carriles: {
			punto: c.punto,
			contratos: { banda: { ...k.banda }, incertidumbre: k.incertidumbre ? { ...k.incertidumbre } : null, excelente: { ...k.excelente } },
			oferta: vO && c.oferta ? { marca: c.oferta.x, margen: { ...c.oferta.margen } } : null
		}
	};
	if (!tiposDe(t).includes(tipo)) t.tipo = 'veredictos';
	return t;
}

/** «por encima (+35 %)», «dentro, en la parte media de lo habitual»: una referencia en una frase corta */
function frase(palabra: string, cifra: string, texto: string): string {
	return cifra ? `${palabra.toLowerCase()} (${cifra})` : `${palabra.toLowerCase()}, ${texto}`;
}

/** Las dos referencias en dos frases, para el texto del mensaje y la descripción del enlace */
function resumenV3(t: TarjetaV3): string {
	const c = `${T.frenteContratos}: ${frase(t.contratos.palabra, t.contratos.cifra, t.contratos.texto)}.`;
	if (!t.oferta) return c;
	const o = t.oferta.clave === 'pidenmas' ? T.cifra.pidenMas(t.oferta.cifra.replace(/^[+−]/, '')) : frase(t.oferta.palabra, t.oferta.cifra, t.oferta.texto);
	return `${c} ${T.frenteOferta}: ${o}.`;
}

const notaPorEncima = (h: Hero): string =>
	(h.tipo === 'cifra' ? heroEnVeces(h.texto) : h.tipo === 'rango' && heroEnVeces(h.hasta)) ? 'la parte alta' : 'sobre la parte alta';

/**
 * Texto del mensaje al compartir (hoja del móvil o enlace): el barrio y la frase resumen, sin precio ni dirección.
 * Las tarjetas v1 conservan su texto de siempre.
 */
export function textoCompartir(t: TarjetaDatos): string {
	if (esV3(t)) return `${t.lugar}. ${resumenV3(t)}`;
	if (esV2(t)) return `${t.barrio ?? 'Madrid'}: ${t.resumen}`;
	if (t.inquilino) return t.frase;
	const h = t.hero;
	const cifra = h.tipo === 'rango' ? `entre ${h.desde} y ${h.hasta}` : h.texto;
	return `${t.etiqueta}: ${cifra} ${t.nota}.`;
}

export interface TextosEnlace {
	titulo: string;
	descripcion: string;
	/** Textos de la vista previa v1 (la v2 se dibuja con los datos de la tarjeta) */
	og: { etiqueta: string; titular: string; nota: string; cta: string };
}

/** Título, descripción y textos de la vista previa del enlace: sin precio ni dirección */
export function textosEnlace(t: TarjetaDatos): TextosEnlace {
	const lugar = t.barrio ?? 'Madrid';
	if (esV3(t)) {
		const titulo = `${NOMBRE} · ${t.modo === 'vivo' ? 'Un alquiler' : 'Un anuncio'} en ${lugar}`;
		return { titulo, descripcion: `${resumenV3(t)} ${TARJETA.cierre}`, og: { etiqueta: t.contratos.palabra, titular: resumenV3(t), nota: '', cta: TARJETA.cierre } };
	}
	if (esV2(t)) {
		return {
			titulo: `${NOMBRE} · ${t.modo === 'vivo' ? 'Un alquiler' : 'Un anuncio'} en ${lugar}`,
			descripcion: `${t.resumen} ${TARJETA.cierre}`,
			og: { etiqueta: t.contratos.etiqueta, titular: t.resumen, nota: '', cta: TARJETA.cierre }
		};
	}
	if (t.inquilino) {
		const pos = t.inquilino.posicion;
		const titular = t.hero.tipo === 'titular' ? t.hero.texto : t.hero.tipo === 'cifra' ? t.hero.texto : `${t.hero.desde} a ${t.hero.hasta}`;
		return {
			titulo: `${titular} en ${lugar} · ${NOMBRE}`,
			descripcion: `${t.frase} Comprueba tu alquiler.`,
			og: { etiqueta: t.etiqueta, titular: t.frase, nota: (t.contratos ? OFERTA.tarjeta.ogInquilino : TARJETA_INQUILINO.notaOg)[pos](lugar), cta: TARJETA_INQUILINO.cta }
		};
	}
	const cifra = t.hero.tipo === 'cifra' ? t.hero.texto : t.hero.tipo === 'rango' ? `${t.hero.desde} a ${t.hero.hasta}` : t.hero.texto;
	return {
		titulo: `${NOMBRE} · Un piso en ${lugar}`,
		descripcion:
			t.clase === 'c'
				? `${cifra} ${notaPorEncima(t.hero)} de lo que pagan quienes ya viven en la zona. Comprueba tu piso.`
				: `${t.etiqueta} en ${lugar}. Comprueba tu piso.`,
		og: {
			etiqueta: t.etiqueta === ETIQUETA_POR_DEBAJO ? ETIQUETA_POR_DEBAJO : ETIQUETA_OG[t.clase],
			titular: t.contratos ? OFERTA.tarjeta.og(t.barrio) : OG.titular(t.barrio),
			nota: t.hero.tipo === 'titular' ? t.nota : OG.notaCifra(notaPorEncima(t.hero) === 'la parte alta'),
			cta: OG.cta
		}
	};
}

// ——— Validación de lo que llega al servidor (solo v3: las tarjetas nuevas) ———

const esFraccion = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1.0001;
const esTramo = (x: unknown): x is Tramo01 =>
	!!x && typeof x === 'object' && esFraccion((x as Tramo01).desde) && esFraccion((x as Tramo01).hasta);
/** Nombres de lugar: letras, espacios y signos; sin cifras (nada que parezca un número de portal) */
const esLugar = (x: unknown): x is string => typeof x === 'string' && x.length >= 2 && x.length <= 80 && !/\d/.test(x);

const P = COSTURA.palabras;
const PALABRAS_CONTRATOS: Record<ClaveContratos, string> = { debajo: P.debajo, dentro: P.dentro, algo: P.algo, encima: P.encima };
const PALABRAS_OFERTA: Record<ClaveOferta, string> = { enlinea: P.enLinea, encima: P.encima, debajo: P.debajo, pidenmas: P.pidenMas };
const TEXTOS_CONTRATOS = new Set<string>([T.contratos.debajo, ...POSICIONES.map((x) => T.contratos.dentro(x)), T.contratos.sobre, T.contratos.veces]);
/** El espacio antes del % es duro (U+00A0), como lo escribe `porcentaje` */
const PCT = '[+−]?\\d{1,4}(?:,\\d)?\\u00A0%';
/** «+32 %», «−4,5 %», «2,3 veces», «+8 % a +20 %», «2,1 a 2,4 veces» */
const CIFRA = new RegExp(`^(?:${PCT}|\\d{1,3},\\d veces|${PCT} a ${PCT}|\\d{1,3},\\d a \\d{1,3},\\d veces)$`);
const CIFRA_OFERTA = new RegExp(`^${PCT}$`);
const tramo = (x: Tramo01) => ({ desde: x.desde, hasta: x.hasta });

/**
 * Valida y limpia lo que llega al servidor: solo se guardan los campos de la tarjeta v3, con palabras y textos de
 * conjuntos cerrados, cifras con formato fijo y fracciones. Cualquier otra cosa (precio, m², dirección) se descarta.
 */
export function validarTarjeta(x: unknown): TarjetaV3 | null {
	if (!x || typeof x !== 'object') return null;
	const t = x as Record<string, unknown>;
	if (t.v !== 3 || (t.modo !== 'mirando' && t.modo !== 'vivo')) return null;
	if (typeof t.tipo !== 'string' || !(TIPOS_TARJETA as readonly string[]).includes(t.tipo)) return null;
	if (!esLugar(t.lugar) || (t.barrio !== null && !esLugar(t.barrio)) || typeof t.aproximada !== 'boolean') return null;

	const c = t.contratos as Record<string, unknown> | undefined;
	if (!c || typeof c.clave !== 'string' || !(c.clave in PALABRAS_CONTRATOS)) return null;
	const claveC = c.clave as ClaveContratos;
	if (c.palabra !== PALABRAS_CONTRATOS[claveC] || typeof c.texto !== 'string' || !TEXTOS_CONTRATOS.has(c.texto)) return null;
	const conCifra = claveC === 'algo' || claveC === 'encima';
	if (typeof c.cifra !== 'string' || (conCifra ? !CIFRA.test(c.cifra) : c.cifra !== '')) return null;

	const o = t.oferta as Record<string, unknown> | null | undefined;
	let oferta: TarjetaV3['oferta'] = null;
	if (o !== null) {
		if (!o || typeof o.clave !== 'string' || !(o.clave in PALABRAS_OFERTA) || (o.nivel !== 'barrio' && o.nivel !== 'distrito')) return null;
		const claveO = o.clave as ClaveOferta;
		if (o.palabra !== PALABRAS_OFERTA[claveO] || o.texto !== T.oferta(o.nivel)) return null;
		if (typeof o.cifra !== 'string' || !CIFRA_OFERTA.test(o.cifra)) return null;
		if (claveO === 'pidenmas' && t.modo !== 'vivo') return null;
		oferta = { clave: claveO, palabra: o.palabra, cifra: o.cifra, texto: o.texto, nivel: o.nivel };
	}

	const r = t.carriles as Record<string, unknown> | undefined;
	if (!r || !esFraccion(r.punto)) return null;
	const rc = r.contratos as Record<string, unknown> | undefined;
	if (!rc || !esTramo(rc.banda) || !esTramo(rc.excelente) || (rc.incertidumbre !== null && !esTramo(rc.incertidumbre))) return null;
	const ro = r.oferta as Record<string, unknown> | null | undefined;
	if (ro !== null && (!ro || !esFraccion(ro.marca) || !esTramo(ro.margen))) return null;
	if ((ro === null) !== (oferta === null)) return null;

	const limpia: TarjetaV3 = {
		v: 3,
		modo: t.modo,
		tipo: t.tipo as TipoTarjeta,
		lugar: t.lugar,
		barrio: t.barrio as string | null,
		aproximada: t.aproximada,
		contratos: { clave: claveC, palabra: c.palabra as string, cifra: c.cifra, texto: c.texto },
		oferta,
		carriles: {
			punto: r.punto,
			contratos: {
				banda: tramo(rc.banda),
				incertidumbre: rc.incertidumbre ? tramo(rc.incertidumbre as Tramo01) : null,
				excelente: tramo(rc.excelente)
			},
			oferta: ro ? { marca: ro.marca as number, margen: tramo(ro.margen as Tramo01) } : null
		}
	};
	// «La cifra» sin % no existe
	if (!tiposDe(limpia).includes(limpia.tipo)) return null;
	return limpia;
}
