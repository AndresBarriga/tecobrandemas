/**
 * «¿Cuánto pagas tú?» (R11): formulario corto de residentes. Se muestra aparte, nunca
 * mezclado con SERPAVI ni con anuncios. Cinco campos: ubicación (→ barrio), precio, m²,
 * año de inicio del contrato y consentimiento.
 *
 * El payload lleva el barrio, nunca la sección ni la dirección. Los límites de €/m² se
 * repiten en el servidor (Hito 5); aquí solo sirven para avisar antes de enviar.
 */
import { type BarrioDeSeccion } from './datos';
import { interpretarNumero } from './formulario';

export const EUROS_M2_MIN = 5;
export const EUROS_M2_MAX = 60;
export const ANIO_MIN = 1990;

export interface AportacionCrudo {
	precio: string;
	superficie: string;
	anioContrato: string;
	/** Código de barrio elegido; con una ubicación en varios barrios lo elige la persona */
	barrio: string;
	consentimiento: boolean;
	/** garaje, trastero, comunidad, amueblado */
	incluye?: string[];
}

export interface AportacionPayload {
	barrio: string;
	precio: number;
	m2: number;
	anioContrato: number;
	incluye: string[];
	/** AAAA-MM de la firma (opcional: el formulario aún no lo pide) */
	firmaMes?: string | null;
	/** Renta al firmar en €/mes (opcional: el formulario aún no lo pide) */
	rentaFirma?: number | null;
}

export type ErroresAportacion = Partial<Record<keyof AportacionCrudo, string>>;

export type ValidacionAportacion =
	| { ok: true; payload: AportacionPayload }
	| { ok: false; errores: ErroresAportacion };

export function validarAportacion(f: AportacionCrudo, barriosPosibles: BarrioDeSeccion[], anioActual: number): ValidacionAportacion {
	const errores: ErroresAportacion = {};
	const precio = interpretarNumero(f.precio);
	const m2 = interpretarNumero(f.superficie);
	const anio = interpretarNumero(f.anioContrato);

	if (!barriosPosibles.some((b) => b.codigo === f.barrio)) errores.barrio = 'Elige tu barrio.';
	if (precio === null || precio <= 0) errores.precio = 'Escribe lo que pagas al mes.';
	if (m2 === null || m2 <= 0) errores.superficie = 'Escribe los m² de tu vivienda.';
	if (anio === null || !Number.isInteger(anio) || anio < ANIO_MIN || anio > anioActual) {
		errores.anioContrato = `Escribe un año entre ${ANIO_MIN} y ${anioActual}.`;
	}
	if (!f.consentimiento) errores.consentimiento = 'Necesitamos tu consentimiento para guardar la aportación.';
	if (precio && m2 && !errores.precio && !errores.superficie) {
		const m = precio / m2;
		if (m < EUROS_M2_MIN || m > EUROS_M2_MAX) {
			errores.precio = `Con estos datos salen ${m.toFixed(1).replace('.', ',')}\u00A0€/m², fuera del rango habitual (${EUROS_M2_MIN}–${EUROS_M2_MAX}). Revisa precio y m².`;
		}
	}

	if (Object.keys(errores).length) return { ok: false, errores };
	return { ok: true, payload: { barrio: f.barrio, precio: precio!, m2: m2!, anioContrato: anio!, incluye: f.incluye ?? [] } };
}
