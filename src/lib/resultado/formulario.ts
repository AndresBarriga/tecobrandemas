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
