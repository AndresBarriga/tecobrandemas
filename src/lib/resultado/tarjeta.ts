/**
 * Tarjeta compartible (R6): lo que se dibuja en el canvas de 1080×1350 y en la imagen OG de
 * 1200×630, y lo que guarda /t/:id. Lleva la cifra o el titular, el nivel, el barrio, la frase
 * y la barra en fracciones. Nunca lleva precio, superficie ni dirección: la barra va en
 * fracciones de su propia escala, de modo que no se puede volver al importe.
 */
import type { PantallaResultado } from './resultado';
import {
	ATRIBUCIONES, ETIQUETA_NIVEL, ETIQUETA_OG, FRASE_TARJETA, NOMBRE, NOTA_TARJETA, OG, TARJETA
} from './textos';
import type { Clase } from './vista';

export const TARJETA_ANCHO = 1080;
export const TARJETA_ALTO = 1350;
export const OG_ANCHO = 1200;
export const OG_ALTO = 630;

export type Hero =
	| { tipo: 'cifra'; texto: string }
	| { tipo: 'rango'; desde: string; hasta: string }
	| { tipo: 'titular'; texto: string };

export interface Tramo01 {
	desde: number;
	hasta: number;
}

export interface TarjetaDatos {
	clase: Clase;
	etiqueta: string;
	hero: Hero;
	/** Línea bajo la cifra o el titular */
	nota: string;
	frase: string;
	barrio: string | null;
	aproximada: boolean;
	/** Fracciones de la escala de la barra; la escala no se guarda */
	barra: {
		banda: Tramo01;
		/** Tramo de incertidumbre de la parte alta (solo con horquilla) */
		incertidumbre: Tramo01 | null;
		techo: Tramo01;
		/** Posición del punto «tu anuncio» en la escala; es una fracción, no un importe */
		punto: number;
		/** «baja», «media» o «alta» en el nivel «dentro» */
		tercio: 0 | 1 | 2 | null;
	};
}

export const CTA_TARJETA = 'Comprueba otro piso';
export const PIE_TARJETA = TARJETA.pie;

export function construirTarjeta(p: PantallaResultado): TarjetaDatos {
	const { vista, barra } = p;
	const aproximada = p.horquilla;
	const barrio = p.barrio;
	const lugar = barrio ?? 'Madrid';
	const principal = vista.principal;
	const hero: Hero =
		principal.tipo === 'rango'
			? { tipo: 'rango', desde: principal.desde, hasta: principal.hasta }
			: principal.tipo === 'cifra'
				? { tipo: 'cifra', texto: principal.texto }
				: { tipo: 'titular', texto: principal.texto };
	const pos = barra.posiciones;
	return {
		clase: vista.clase,
		etiqueta: ETIQUETA_NIVEL[vista.clase],
		hero,
		nota: vista.clase === 'c' ? NOTA_TARJETA.c(lugar, aproximada) : NOTA_TARJETA[vista.clase](lugar),
		frase: FRASE_TARJETA[vista.grado],
		barrio,
		aproximada,
		barra: {
			banda: barra.banda,
			incertidumbre: barra.horquilla && pos.sup.max > pos.sup.min ? { desde: pos.sup.min, hasta: pos.sup.max } : null,
			techo: { desde: pos.sup.max, hasta: pos.techo.max },
			punto: pos.precio,
			tercio: vista.barra.tercio
		}
	};
}

/** Título, descripción y textos de la vista previa del enlace: sin precio ni dirección */
export function textosEnlace(t: TarjetaDatos): { titulo: string; descripcion: string; og: { etiqueta: string; titular: string; nota: string; cta: string } } {
	const lugar = t.barrio ?? 'Madrid';
	const cifra = t.hero.tipo === 'cifra' ? t.hero.texto : t.hero.tipo === 'rango' ? `${t.hero.desde} a ${t.hero.hasta}` : t.hero.texto;
	return {
		titulo: `${NOMBRE} · Un piso en ${lugar}`,
		descripcion:
			t.clase === 'c'
				? `${cifra} sobre la parte alta de la referencia de alquileres registrados en la zona. Comprueba tu piso.`
				: `${ETIQUETA_NIVEL[t.clase]} en ${lugar}. Comprueba tu piso.`,
		og: {
			etiqueta: ETIQUETA_OG[t.clase],
			titular: OG.titular(t.barrio),
			nota: t.hero.tipo === 'titular' ? t.nota : OG.notaCifra,
			cta: OG.cta
		}
	};
}

/** Pie literal de la tarjeta: las atribuciones obligatorias */
export const ATRIBUCION_TARJETA = ATRIBUCIONES.slice(0, 2);

const esFraccion = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1.0001;
const esTramo = (x: unknown): x is Tramo01 =>
	!!x && typeof x === 'object' && esFraccion((x as Tramo01).desde) && esFraccion((x as Tramo01).hasta);
const texto = (x: unknown, max = 120): x is string => typeof x === 'string' && x.length > 0 && x.length <= max;

/**
 * Valida y limpia lo que llega al servidor: solo se guardan los campos de la tarjeta, con
 * límites de longitud y rangos. Cualquier otra cosa (precio, m², dirección) se descarta.
 */
export function validarTarjeta(x: unknown): TarjetaDatos | null {
	if (!x || typeof x !== 'object') return null;
	const t = x as Record<string, unknown>;
	const clase = t.clase;
	if (clase !== 'a' && clase !== 'b' && clase !== 'c') return null;
	if (t.etiqueta !== ETIQUETA_NIVEL[clase]) return null;
	const h = t.hero as Record<string, unknown> | undefined;
	let hero: Hero;
	if (h?.tipo === 'cifra' && texto(h.texto, 30)) hero = { tipo: 'cifra', texto: h.texto };
	else if (h?.tipo === 'titular' && texto(h.texto, 40)) hero = { tipo: 'titular', texto: h.texto };
	else if (h?.tipo === 'rango' && texto(h.desde, 30) && texto(h.hasta, 30)) hero = { tipo: 'rango', desde: h.desde, hasta: h.hasta };
	else return null;
	const b = t.barra as Record<string, unknown> | undefined;
	if (!b || !esTramo(b.banda) || !esTramo(b.techo) || !esFraccion(b.punto)) return null;
	if (b.incertidumbre !== null && !esTramo(b.incertidumbre)) return null;
	if (b.tercio !== null && b.tercio !== 0 && b.tercio !== 1 && b.tercio !== 2) return null;
	if (!texto(t.nota, 200) || !texto(t.frase, 200)) return null;
	if (t.barrio !== null && !texto(t.barrio, 80)) return null;
	if (typeof t.aproximada !== 'boolean') return null;
	return {
		clase,
		etiqueta: ETIQUETA_NIVEL[clase],
		hero,
		nota: t.nota,
		frase: t.frase,
		barrio: t.barrio as string | null,
		aproximada: t.aproximada,
		barra: {
			banda: { desde: b.banda.desde, hasta: b.banda.hasta },
			incertidumbre: b.incertidumbre ? { desde: b.incertidumbre.desde, hasta: b.incertidumbre.hasta } : null,
			techo: { desde: b.techo.desde, hasta: b.techo.hasta },
			punto: b.punto,
			tercio: b.tercio as 0 | 1 | 2 | null
		}
	};
}
