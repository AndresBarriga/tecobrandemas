/** Fila del historial de la sesión (escritorio): se guarda solo en el navegador y se borra al cerrar la pestaña */
import type { Pantalla } from './resultado';
import { ETIQUETA_HISTORIAL } from './textos';
import type { Clase } from './vista';

export interface FilaHistorial {
	titulo: string;
	/** «1.400 €, 75 m²» */
	detalle: string;
	/** «Dentro», «Explicable», «+30 %» o «Sin dato» */
	etiqueta: string;
	/** Color de la fila; null en «sin dato» */
	clase: Clase | null;
}

export function filaHistorial(p: Pantalla): FilaHistorial {
	if (p.tipo === 'sin_dato') {
		return { titulo: p.lugar ?? p.titular, detalle: p.contexto ?? '', etiqueta: ETIQUETA_HISTORIAL.sinDato, clase: null };
	}
	const v = p.vista;
	const etiqueta =
		v.clase === 'a' ? ETIQUETA_HISTORIAL.a
		: v.clase === 'b' ? ETIQUETA_HISTORIAL.b
		: v.principal.tipo === 'cifra' ? v.principal.texto
		: v.principal.tipo === 'rango' ? `${v.principal.desde} a ${v.principal.hasta}`
		: '';
	return { titulo: p.barrio ?? 'Madrid', detalle: `${v.precio}, ${v.m2}`, etiqueta, clase: v.clase };
}
