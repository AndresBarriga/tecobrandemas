/** Índice de calles para el autocompletado: se carga al enfocar la dirección y se queda en el navegador */
import { ALIAS_BARRIOS, construirIndiceVias, type GrupoPortales, type Via, type ViaEntrada, type Zonas } from '#lib/resultado';
import { cargarDatos } from './datos';
import rutas from './datos-rutas.json';

export interface Sugeridor {
	indice: Via[];
	zonas: Zonas;
	/** Código de barrio → nombre */
	barrios: Record<string, string>;
}

let cargado: Promise<Sugeridor> | null = null;

export function cargarSugeridor(): Promise<Sugeridor> {
	cargado ??= (async () => {
		const [r, datos] = await Promise.all([fetch(rutas.viales_sugerencias), cargarDatos()]);
		if (!r.ok) throw new Error(`viales_sugerencias: ${r.status}`);
		const filas = (await r.json()) as ViaEntrada[];
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

let zonasDeVias: Promise<Record<string, string[]>> | null = null;

/** Zonas (cusec) por las que pasa una vía; el fichero se descarga al elegir la primera calle */
export async function zonasDeVia(nombre: string): Promise<string[]> {
	zonasDeVias ??= fetch(rutas.viales_zonas)
		.then((r) => {
			if (!r.ok) throw new Error(`viales_zonas: ${r.status}`);
			return r.json() as Promise<Record<string, string[]>>;
		})
		.catch((e) => {
			zonasDeVias = null;
			throw e;
		});
	return (await zonasDeVias)[nombre] ?? [];
}

let portalesDeVias: Promise<Record<string, GrupoPortales[]>> | null = null;

/** Los portales de cada calle (≈135 kB comprimidos): se descargan al escribir el primer número de portal */
export function cargarPortales(): Promise<Record<string, GrupoPortales[]>> {
	portalesDeVias ??= fetch(rutas.viales_portales)
		.then((r) => {
			if (!r.ok) throw new Error(`viales_portales: ${r.status}`);
			return r.json() as Promise<Record<string, GrupoPortales[]>>;
		})
		.catch((e) => {
			portalesDeVias = null;
			throw e;
		});
	return portalesDeVias;
}
