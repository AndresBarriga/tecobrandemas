/** Índice de calles para el autocompletado: se carga al enfocar la dirección y se queda en el navegador */
import { ALIAS_BARRIOS, construirIndiceVias, type Via, type Zonas } from '#lib/resultado';
import { cargarDatos } from './datos';

export interface Sugeridor {
	indice: Via[];
	zonas: Zonas;
	/** Código de barrio → nombre */
	barrios: Record<string, string>;
}

let cargado: Promise<Sugeridor> | null = null;

export function cargarSugeridor(): Promise<Sugeridor> {
	cargado ??= (async () => {
		const [r, datos] = await Promise.all([fetch('/data/viales_sugerencias.json'), cargarDatos()]);
		if (!r.ok) throw new Error(`viales_sugerencias: ${r.status}`);
		const filas = (await r.json()) as [string, string][];
		return {
			indice: construirIndiceVias(filas),
			zonas: { barrios: datos.barrios, alias: ALIAS_BARRIOS },
			barrios: Object.fromEntries(Object.entries(datos.barrios).map(([c, b]) => [c, b.nombre]))
		};
	})().catch((e) => {
		cargado = null;
		throw e;
	});
	return cargado;
}
