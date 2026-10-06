/**
 * Habitaciones (F1): la referencia oficial no las cubre, así que no hay nivel ni veredicto. Solo se
 * compara con lo que aportan otras personas del barrio, y la mediana únicamente desde 10 aportaciones
 * con el mismo «incluye gastos». Nada de m² exactos: el tamaño del piso va en tramos.
 */
import type { DatosMadrid } from './datos';
import { euros } from './formato';
import { interpretarNumero } from './formulario';

/** €/mes de una habitación que se acepta; fuera de este rango se pide revisar el precio */
export const HABITACION_PRECIO_MIN = 150;
export const HABITACION_PRECIO_MAX = 1500;
export const MINIMO_COMPARACION = 10;

export type TramoPiso = 'hasta60' | '60-90' | '90-120' | 'mas120' | 'nose';

export const TRAMO_TEXTO: Record<TramoPiso, string> = {
	hasta60: 'hasta 60 m²',
	'60-90': '60-90 m²',
	'90-120': '90-120 m²',
	mas120: 'más de 120 m²',
	nose: 'tamaño desconocido'
};

/** Cuerpo de POST /api/habitacion: barrio, renta, habitaciones, tramo y gastos; nada más */
export interface HabitacionPayload {
	barrio: string;
	precio: number;
	habitaciones: number;
	tramo: TramoPiso;
	gastos: boolean;
}

export interface PantallaHabitacion {
	tipo: 'habitacion';
	/** «Ya vivo aquí» (puede aportar) o «Estoy mirando» (solo compara) */
	vivo: boolean;
	/** «Fuente del Berro, Salamanca» */
	lugar: string;
	barrio: string;
	barrioCodigo: string;
	/** «Habitación en un piso de 4 · 90-120 m² · con gastos» */
	contexto: string;
	/** «450 €» */
	precio: string;
	gastos: boolean;
	habitaciones: number;
	aporte: HabitacionPayload | null;
}

export interface ErroresHabitacion {
	precio?: string;
	habitacion?: string;
}

export type ValidacionHabitacion =
	| { ok: true; datos: Omit<HabitacionPayload, 'barrio'> }
	| { ok: false; errores: ErroresHabitacion };

export function validarHabitacion(f: { precio: string; habitaciones: number; tamano: string; gastos: boolean }): ValidacionHabitacion {
	const errores: ErroresHabitacion = {};
	const precio = interpretarNumero(f.precio);
	if (precio === null || precio < HABITACION_PRECIO_MIN || precio > HABITACION_PRECIO_MAX) {
		errores.precio = `Escribe lo que cuesta la habitación al mes, entre ${HABITACION_PRECIO_MIN} y ${HABITACION_PRECIO_MAX.toLocaleString('es-ES')} €.`;
	}
	if (!(['hasta60', '60-90', '90-120', 'mas120', 'nose'] as const).includes(f.tamano as TramoPiso)) {
		errores.habitacion = 'Elige el tamaño aproximado del piso, o «No lo sé».';
	}
	if (Object.keys(errores).length) return { ok: false, errores };
	return {
		ok: true,
		datos: { precio: Math.round(precio!), habitaciones: Math.min(6, Math.max(1, Math.round(f.habitaciones))), tramo: f.tamano as TramoPiso, gastos: f.gastos }
	};
}

export function construirPantallaHabitacion(
	datos: Omit<HabitacionPayload, 'barrio'>, barrioCodigo: string, vivo: boolean, madrid: DatosMadrid
): PantallaHabitacion | null {
	const barrio = madrid.barrios[barrioCodigo];
	if (!barrio) return null;
	const piso = datos.habitaciones >= 6 ? '6 o más' : String(datos.habitaciones);
	return {
		tipo: 'habitacion',
		vivo,
		lugar: `${barrio.nombre}, ${barrio.distrito}`,
		barrio: barrio.nombre,
		barrioCodigo,
		contexto: `Habitación en un piso de ${piso} · ${TRAMO_TEXTO[datos.tramo]} · ${datos.gastos ? 'con gastos' : 'sin gastos'}`,
		precio: euros(datos.precio),
		gastos: datos.gastos,
		habitaciones: datos.habitaciones,
		aporte: vivo ? { barrio: barrioCodigo, ...datos } : null
	};
}
