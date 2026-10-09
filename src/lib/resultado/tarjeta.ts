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
 */
import { type Comparativa, resumenComparativa } from './comparativa';
import { heroEnVeces } from './ratio';
import type { PantallaResultado } from './resultado';
import { COMPARATIVA, ETIQUETA_NIVEL, ETIQUETA_OG, ETIQUETA_POR_DEBAJO, NOMBRE, OFERTA, OG, TARJETA, TARJETA_INQUILINO } from './textos';
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

export type TarjetaDatos = TarjetaV1 | TarjetaV2;

export const esV2 = (t: TarjetaDatos): t is TarjetaV2 => t.v === 2;

/** ¿Es la tarjeta de «Mi alquiler»? (v2: el modo; v1: la posición del inquilino) */
export const esDeInquilino = (t: TarjetaDatos): boolean => (esV2(t) ? t.modo === 'vivo' : !!t.inquilino);

/** La tarjeta del resultado (los dos modos): sale de la comparativa, sin precio exacto, m² ni dirección */
export function construirTarjeta(p: PantallaResultado): TarjetaV2 {
	const c: Comparativa = p.comparativa;
	const r = c.reglas;
	return {
		v: 2,
		modo: c.modo,
		resumen: c.resumen,
		barrio: p.barrio,
		aproximada: p.horquilla,
		contratos: { ...c.contratos },
		anuncios: c.anuncios ? { lugar: c.anuncios.lugar, cifra: c.anuncios.cifra, nota: c.anuncios.nota, veredicto: c.anuncios.veredicto } : null,
		reglas: {
			marcas: r.eje.marcas.map((m) => ({ x: m.x, texto: m.texto })),
			punto: r.punto,
			contratos: {
				banda: { ...r.contratos.banda },
				incertidumbre: r.contratos.incertidumbre ? { ...r.contratos.incertidumbre } : null,
				parteAlta: r.contratos.parteAlta.x,
				techo: r.contratos.techo.x
			},
			anuncios: r.anuncios ? { banda: { ...r.anuncios.banda }, media: r.anuncios.media.x } : null
		}
	};
}

const notaPorEncima = (h: Hero): string =>
	(h.tipo === 'cifra' ? heroEnVeces(h.texto) : h.tipo === 'rango' && heroEnVeces(h.hasta)) ? 'la parte alta' : 'sobre la parte alta';

/**
 * Texto del mensaje al compartir (hoja del móvil o enlace): el barrio y la frase resumen, sin precio ni dirección.
 * Las tarjetas v1 conservan su texto de siempre.
 */
export function textoCompartir(t: TarjetaDatos): string {
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

// ——— Validación de lo que llega al servidor (solo v2: las tarjetas nuevas) ———

const esFraccion = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1.0001;
const esTramo = (x: unknown): x is Tramo01 =>
	!!x && typeof x === 'object' && esFraccion((x as Tramo01).desde) && esFraccion((x as Tramo01).hasta);
const texto = (x: unknown, max = 120): x is string => typeof x === 'string' && x.length > 0 && x.length <= max;

/** Todas las frases resumen posibles: la tarjeta solo puede llevar una de ellas */
const RESUMENES = new Set(
	(['mirando', 'vivo'] as const).flatMap((m) =>
		(['encima', 'dentro', 'debajo'] as const).flatMap((c) =>
			([null, 'por_encima', 'en_linea', 'por_debajo'] as const).map((a) => resumenComparativa(m, c, a))
		)
	)
);
const NOTAS_CONTRATOS = new Set<string>(
	[COMPARATIVA.contratos.notaSobre, COMPARATIVA.contratos.notaVeces, COMPARATIVA.contratos.notaBajo, COMPARATIVA.contratos.notaRango]
);
const NOTAS_ANUNCIOS = new Set<string>([COMPARATIVA.anuncios.nota('barrio'), COMPARATIVA.anuncios.nota('distrito')]);
const VEREDICTOS = new Set<string>(Object.values(COMPARATIVA.veredicto));
const ETIQUETAS = new Set<string>([...Object.values(ETIQUETA_NIVEL), ETIQUETA_POR_DEBAJO]);
const PCT = '[+−]?\\d{1,4}(?:,\\d)? %';
/** «+32 %», «−4,5 %», «2,3 veces», «+8 % a +20 %», «2,1 a 2,4 veces» */
const CIFRA = new RegExp(`^(?:${PCT}|\\d{1,3},\\d veces|${PCT} a ${PCT}|\\d{1,3},\\d a \\d{1,3},\\d veces)$`);
const CIFRA_ANUNCIOS = new RegExp(`^${PCT}$`);
/** «1.250 €»: euros redondeados, sin decimales */
const EUROS = /^\d{1,3}(?:\.\d{3})* €$/;

/**
 * Valida y limpia lo que llega al servidor: solo se guardan los campos de la tarjeta v2, con textos de conjuntos
 * cerrados, formatos fijos y fracciones. Cualquier otra cosa (precio, m², dirección) se descarta.
 */
export function validarTarjeta(x: unknown): TarjetaV2 | null {
	if (!x || typeof x !== 'object') return null;
	const t = x as Record<string, unknown>;
	if (t.v !== 2 || (t.modo !== 'mirando' && t.modo !== 'vivo')) return null;
	if (typeof t.resumen !== 'string' || !RESUMENES.has(t.resumen)) return null;
	if (t.barrio !== null && !texto(t.barrio, 80)) return null;
	if (typeof t.aproximada !== 'boolean') return null;
	const c = t.contratos as Record<string, unknown> | undefined;
	if (!c || (c.clase !== 'a' && c.clase !== 'b' && c.clase !== 'c')) return null;
	if (c.icono !== 'a' && c.icono !== 'b' && c.icono !== 'c' && c.icono !== 'abajo') return null;
	if (typeof c.etiqueta !== 'string' || !ETIQUETAS.has(c.etiqueta)) return null;
	if (typeof c.cifra !== 'string' || !CIFRA.test(c.cifra) || typeof c.nota !== 'string' || !NOTAS_CONTRATOS.has(c.nota)) return null;
	const a = t.anuncios as Record<string, unknown> | null | undefined;
	let anuncios: TarjetaV2['anuncios'] = null;
	if (a !== null) {
		if (!a || typeof a.lugar !== 'string' || !/^(barrio|distrito) de .{1,60}$/.test(a.lugar)) return null;
		if (typeof a.cifra !== 'string' || !CIFRA_ANUNCIOS.test(a.cifra)) return null;
		if (typeof a.nota !== 'string' || !NOTAS_ANUNCIOS.has(a.nota) || typeof a.veredicto !== 'string' || !VEREDICTOS.has(a.veredicto)) return null;
		anuncios = { lugar: a.lugar, cifra: a.cifra, nota: a.nota, veredicto: a.veredicto };
	}
	const r = t.reglas as Record<string, unknown> | undefined;
	if (!r || !Array.isArray(r.marcas) || r.marcas.length < 2 || r.marcas.length > 8 || !esFraccion(r.punto)) return null;
	const marcas: TarjetaV2['reglas']['marcas'] = [];
	for (const m of r.marcas as Record<string, unknown>[]) {
		if (!m || !esFraccion(m.x) || typeof m.texto !== 'string' || !EUROS.test(m.texto)) return null;
		marcas.push({ x: m.x, texto: m.texto });
	}
	const rc = r.contratos as Record<string, unknown> | undefined;
	if (!rc || !esTramo(rc.banda) || !esFraccion(rc.parteAlta) || !esFraccion(rc.techo)) return null;
	if (rc.incertidumbre !== null && !esTramo(rc.incertidumbre)) return null;
	const ra = r.anuncios as Record<string, unknown> | null | undefined;
	if (ra !== null && (!ra || !esTramo(ra.banda) || !esFraccion(ra.media))) return null;
	if ((ra === null) !== (anuncios === null)) return null;
	const tramo = (x: Tramo01) => ({ desde: x.desde, hasta: x.hasta });
	return {
		v: 2,
		modo: t.modo,
		resumen: t.resumen,
		barrio: t.barrio as string | null,
		aproximada: t.aproximada,
		contratos: { clase: c.clase, icono: c.icono, etiqueta: c.etiqueta, cifra: c.cifra, nota: c.nota },
		anuncios,
		reglas: {
			marcas,
			punto: r.punto,
			contratos: {
				banda: tramo(rc.banda),
				incertidumbre: rc.incertidumbre ? tramo(rc.incertidumbre as Tramo01) : null,
				parteAlta: rc.parteAlta,
				techo: rc.techo
			},
			anuncios: ra ? { banda: tramo(ra.banda as Tramo01), media: ra.media as number } : null
		}
	};
}
