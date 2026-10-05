/** Historial de comprobaciones de la sesión (escritorio): solo en sessionStorage, se borra al cerrar la pestaña */
import type { Pantalla } from '#lib/resultado';

const CLAVE = 'asp:historial';
const MAX = 20;

export interface Entrada {
	id: string;
	pantalla: Pantalla;
	/** Lo escrito en el formulario, para restaurarlo al volver a la fila */
	formulario: Record<string, unknown>;
}

export function leerHistorial(): Entrada[] {
	try {
		const v = sessionStorage.getItem(CLAVE);
		return v ? (JSON.parse(v) as Entrada[]) : [];
	} catch {
		return [];
	}
}

export function guardarHistorial(lista: Entrada[]): void {
	try {
		sessionStorage.setItem(CLAVE, JSON.stringify(lista.slice(0, MAX)));
	} catch {
		// sin almacenamiento (ventana privada, bloqueo): el historial vive solo en memoria
	}
}
