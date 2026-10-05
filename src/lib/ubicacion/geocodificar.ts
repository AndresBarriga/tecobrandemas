/**
 * Dirección en texto libre → sección o secciones censales (R2).
 *
 *   exacta                  portal encontrado, una sección
 *   aproximada              el número no existe (portal más cercano de la misma paridad)
 *                           o el portal cae en varias secciones → horquilla
 *   calle                   sin número: secciones de la calle, si son ≤ 6 → horquilla
 *   demasiadas_secciones    sin número y la calle cruza más de 6: hay que pedir el
 *                           número o un punto en el mapa
 *   no_encontrada           con sugerencias de viales parecidos
 *
 * No guarda ni registra el texto: solo lo transforma. El acceso a datos se inyecta
 * (D1 en el Worker, SQLite local en los tests).
 */
import { type Coincidencia, IndiceViales, UMBRAL_SIMILITUD, type Vial } from './indice';
import { type Interpretacion, parsearDireccion } from './parser';

export interface Portal {
	numero: number;
	extension: string;
	lon: number;
	lat: number;
	cusec: string | null;
}

export interface AlmacenCallejero {
	portales(vialId: number): Promise<Portal[]>;
}

export interface Punto {
	lon: number;
	lat: number;
}

export interface VialEncontrado {
	id: number;
	nombre: string;
}

export type Geocodificacion =
	| { estado: 'exacta'; vial: VialEncontrado; numero: number; cusecs: string[]; punto: Punto }
	| {
			estado: 'aproximada';
			motivo: 'numero_inexistente' | 'portal_en_varias_secciones';
			vial: VialEncontrado;
			numero: number;
			numerosUsados: number[];
			cusecs: string[];
			punto: Punto;
	  }
	| { estado: 'calle'; vial: VialEncontrado; cusecs: string[]; punto: Punto }
	| { estado: 'demasiadas_secciones'; vial: VialEncontrado; nSecciones: number }
	| { estado: 'no_encontrada'; sugerencias: VialEncontrado[] };

/** Tope de secciones de la horquilla para una calle sin número (decidido el 05/10/2026) */
export const MAX_SECCIONES_CALLE = 6;
/** Viales con puntuación a menos de esto del mejor se consideran empatados */
const EMPATE = 0.02;
const UMBRAL_SUGERENCIA = 0.4;

const unicos = (xs: string[]) => [...new Set(xs)].sort();
const publico = (v: Vial): VialEncontrado => ({ id: v.id, nombre: v.visible });

function resolverNumero(vial: Vial, portales: Portal[], numero: number, extension: string | null): Geocodificacion {
	const mismos = portales.filter((p) => p.numero === numero);
	if (mismos.length) {
		const conExtension = extension ? mismos.filter((p) => p.extension === extension.toUpperCase()) : [];
		const sinExtension = mismos.filter((p) => p.extension === '');
		const elegidos = conExtension.length ? conExtension : sinExtension.length ? sinExtension : mismos;
		const cusecs = unicos(elegidos.map((p) => p.cusec!));
		const punto = { lon: elegidos[0]!.lon, lat: elegidos[0]!.lat };
		if (cusecs.length === 1) return { estado: 'exacta', vial: publico(vial), numero, cusecs, punto };
		return {
			estado: 'aproximada', motivo: 'portal_en_varias_secciones', vial: publico(vial),
			numero, numerosUsados: [numero], cusecs, punto
		};
	}

	const mismaParidad = portales.filter((p) => p.numero % 2 === numero % 2);
	const candidatos = mismaParidad.length ? mismaParidad : portales;
	const distancia = Math.min(...candidatos.map((p) => Math.abs(p.numero - numero)));
	const cercanos = candidatos.filter((p) => Math.abs(p.numero - numero) === distancia);
	return {
		estado: 'aproximada', motivo: 'numero_inexistente', vial: publico(vial), numero,
		numerosUsados: [...new Set(cercanos.map((p) => p.numero))].sort((a, b) => a - b),
		cusecs: unicos(cercanos.map((p) => p.cusec!)),
		punto: { lon: cercanos[0]!.lon, lat: cercanos[0]!.lat }
	};
}

function resolverCalle(vial: Vial, portales: Portal[]): Geocodificacion {
	const cusecs = unicos(portales.map((p) => p.cusec!));
	if (cusecs.length > MAX_SECCIONES_CALLE) {
		return { estado: 'demasiadas_secciones', vial: publico(vial), nSecciones: cusecs.length };
	}
	const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
	const punto = { lon: media(portales.map((p) => p.lon)), lat: media(portales.map((p) => p.lat)) };
	return { estado: 'calle', vial: publico(vial), cusecs, punto };
}

async function resolver(
	interp: Interpretacion, empatadas: Coincidencia[], almacen: AlmacenCallejero
): Promise<Geocodificacion | null> {
	let primero: Geocodificacion | null = null;
	for (const { vial } of empatadas) {
		const portales = (await almacen.portales(vial.id)).filter((p) => p.cusec !== null);
		if (!portales.length) continue;
		const r = interp.numero === null
			? resolverCalle(vial, portales)
			: resolverNumero(vial, portales, interp.numero, interp.extension);
		// Entre viales empatados (AVENIDA AGUILAS / AVENIDA LAS AGUILAS) gana el que tiene el portal
		if (r.estado === 'exacta') return r;
		primero ??= r;
	}
	return primero;
}

export async function geocodificar(
	texto: string, indice: IndiceViales, almacen: AlmacenCallejero
): Promise<Geocodificacion> {
	let sugerencias: Coincidencia[] = [];
	let primero: Geocodificacion | null = null;
	// Se prueban todas las interpretaciones: en «Prov Ahijones 18, nº 133» el 18 es parte
	// del nombre. Gana la primera que da un portal exacto; si ninguna, la primera que resuelve.
	for (const interp of parsearDireccion(texto)) {
		const coincidencias = indice.buscar(interp.nombre, interp.tipo);
		const mejor = coincidencias[0];
		if (!mejor || mejor.puntuacion < UMBRAL_SIMILITUD) {
			if (!sugerencias.length) sugerencias = coincidencias;
			continue;
		}
		const empatadas = coincidencias.filter((c) => c.puntuacion >= mejor.puntuacion - EMPATE);
		const r = await resolver(interp, empatadas, almacen);
		if (r?.estado === 'exacta') return r;
		primero ??= r;
	}
	if (primero) return primero;
	return {
		estado: 'no_encontrada',
		sugerencias: sugerencias.filter((c) => c.puntuacion >= UMBRAL_SUGERENCIA).slice(0, 3).map((c) => publico(c.vial))
	};
}
