import { CORREO } from './metodologia';

/** Registro público de correcciones: una línea por cambio, la más reciente primero. Fecha en AAAA-MM-DD */
export interface Correccion {
	fecha: string;
	pagina: string;
	cambio: string;
}

export const CORRECCIONES: Correccion[] = [];

export const FECHA_CORRECCIONES = '2026-10-13';

export const TEXTO_CORRECCIONES = {
	titulo: 'Correcciones',
	descripcion: 'Cómo avisarnos de un error en un dato o un texto de A su precio, y el registro de lo que hemos corregido.',
	h1: 'Correcciones',
	intro: `Si encuentras un error en un dato o un texto, escríbenos a ${CORREO}. Aquí registramos lo que corregimos.`,
	formato: 'fecha · página · qué cambió',
	vacio: 'Todavía no hay correcciones registradas.'
} as const;
