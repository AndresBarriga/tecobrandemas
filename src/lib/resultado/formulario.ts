/**
 * Formulario de análisis (R1): lectura de números escritos a mano y validación.
 * Los límites de la metodología (30–150 m²) no se aplican aquí: fuera de ese rango el
 * motor da la pantalla «sin dato». Aquí solo se descarta lo imposible.
 */
import type { Anuncio } from '../motor';

export const PRECIO_MIN = 50;
export const PRECIO_MAX = 50_000;
export const SUPERFICIE_MIN_FORM = 10;
export const SUPERFICIE_MAX_FORM = 500;

/**
 * «1.650» → 1650 · «1650,5» → 1650.5 · «1.650,50» → 1650.5 · «1,650» → 1.65.
 * El punto es de miles si lo siguen exactamente tres cifras; la coma es siempre decimal.
 */
export function interpretarNumero(texto: string): number | null {
	const t = texto.trim().replace(/[€\s]|m2|m²/gi, '');
	if (!/^\d+([.,]\d+)*$/.test(t)) return null;
	const sinMiles = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t) ? t.replace(/\./g, '') : t;
	if ((sinMiles.match(/[.,]/g) ?? []).length > 1) return null;
	const n = Number(sinMiles.replace(',', '.'));
	return Number.isFinite(n) ? n : null;
}

/**
 * Cómo se muestra un número ya aceptado al salir del campo: «2200» → «2.200», «65,5» → «65,5».
 * Devuelve null si no se entiende (se deja lo escrito y la validación avisa).
 */
export function normalizarNumero(texto: string): string | null {
	const n = interpretarNumero(texto);
	if (n === null) return null;
	const [entero, dec] = n.toString().split('.');
	return entero!.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (dec ? `,${dec}` : '');
}

export interface FormularioCrudo {
	precio: string;
	superficie: string;
	obraNueva: boolean;
	largaDuracion: boolean;
	tipo: 'piso' | 'casa';
}

export type ErroresFormulario = Partial<Record<'precio' | 'superficie', string>>;

export type ValidacionFormulario =
	| { ok: true; anuncio: Anuncio }
	| { ok: false; errores: ErroresFormulario };

export function validarFormulario(f: FormularioCrudo): ValidacionFormulario {
	const errores: ErroresFormulario = {};
	const precio = interpretarNumero(f.precio);
	const superficie = interpretarNumero(f.superficie);

	if (precio === null) errores.precio = 'Escribe el precio al mes, por ejemplo 1.650.';
	else if (precio < PRECIO_MIN || precio > PRECIO_MAX) errores.precio = `El precio debe estar entre ${PRECIO_MIN} y ${PRECIO_MAX.toLocaleString('es-ES')}\u00A0€ al mes.`;

	if (superficie === null || superficie < SUPERFICIE_MIN_FORM || superficie > SUPERFICIE_MAX_FORM) {
		errores.superficie = `Escribe los m²\u00A0del anuncio, entre ${SUPERFICIE_MIN_FORM} y ${SUPERFICIE_MAX_FORM}.`;
	}

	if (Object.keys(errores).length) return { ok: false, errores };
	return {
		ok: true,
		anuncio: {
			precio: precio!, superficie: superficie!, obraNueva: f.obraNueva, tipo: f.tipo, largaDuracion: f.largaDuracion
		}
	};
}

// ——— «Ya vivo aquí»: fecha de firma, renta al firmar y «Somos N» ———

export interface FirmaCruda {
	reciente: boolean;
	mes: string;
	ano: string;
}

/** Fecha de firma: mes y año, o solo el año actual si «hace menos de un año» (sin mes) */
export interface Firma {
	reciente: boolean;
	mes: number | null;
	ano: number;
}

export const ANIO_FIRMA_MIN = 1990;

export type ValidacionFirma = { ok: true; firma: Firma } | { ok: false };

export function validarFirma(c: FirmaCruda, hoy: { ano: number; mes: number }): ValidacionFirma {
	if (c.reciente) return { ok: true, firma: { reciente: true, mes: null, ano: hoy.ano } };
	const mes = Number(c.mes);
	const ano = Number(c.ano);
	if (!Number.isInteger(mes) || mes < 1 || mes > 12) return { ok: false };
	if (!Number.isInteger(ano) || ano < ANIO_FIRMA_MIN || ano > hoy.ano) return { ok: false };
	if (ano === hoy.ano && mes > hoy.mes) return { ok: false };
	return { ok: true, firma: { reciente: false, mes, ano } };
}

/** Lo que se pagaba al firmar: vacío = no se sabe (null); un número válido; o 'error' */
export function interpretarRentaFirma(texto: string): number | null | 'error' {
	if (!texto.trim()) return null;
	const n = interpretarNumero(texto);
	return n !== null && n >= PRECIO_MIN && n <= PRECIO_MAX ? n : 'error';
}

/** «Somos N»: vacío o fuera de 2-12 = sin dato */
export function interpretarSomos(texto: string): number | null {
	const n = Number(texto.trim());
	return Number.isInteger(n) && n >= 2 && n <= 12 ? n : null;
}

export const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'] as const;
