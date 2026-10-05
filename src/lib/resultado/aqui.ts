/**
 * «Este precio entra en la referencia de…»: hasta 5 zonas cercanas (≤ 1,5 km), una por barrio y por
 * distancia, donde el precio introducido quedaría dentro de la referencia (precio ≤ R_sup con la misma
 * superficie). Solo con elegibles. Se calcula en el navegador. No son pisos disponibles ni sugieren mudarse.
 */
import { type Anuncio, type Posicion, clasificar, motivoSeccion, referencia, tieneDato } from '../motor';
import type { Punto } from '../ubicacion/geocodificar';
import { type BarrioDeSeccion, type DatosMadrid, barrioDe, datosSeccion } from './datos';
import { RADIO_ZONA_M, distanciaM } from './geo';

export const MAX_OPCIONES = 5;

export interface OpcionDentro {
	cusec: string;
	barrio: BarrioDeSeccion | null;
	distanciaM: number;
	/** R_inf y R_sup en €/mes para la superficie del usuario */
	refInf: number;
	refSup: number;
	/** Dónde caería el precio entre las dos */
	posicion: Posicion;
}

export interface AquiEstariasDentro {
	opciones: OpcionDentro[];
}

export function aquiEstariasDentro(
	anuncio: Anuncio, origen: Punto, excluir: string[], datos: DatosMadrid, centros: Map<string, Punto>
): AquiEstariasDentro {
	const candidatas: OpcionDentro[] = [];
	for (const [cusec, centro] of centros) {
		if (excluir.includes(cusec)) continue;
		const d = distanciaM(origen, centro);
		if (d > RADIO_ZONA_M) continue;
		const s = datosSeccion(datos, cusec);
		if (motivoSeccion(s) !== null || !tieneDato(s)) continue;
		const ref = referencia(anuncio.superficie, s, datos.ipc.factor);
		const nivel = clasificar(anuncio.precio, ref);
		if (nivel.nivel !== 'dentro') continue;
		candidatas.push({ cusec, barrio: barrioDe(datos, cusec), distanciaM: d, refInf: ref.inf, refSup: ref.sup, posicion: nivel.posicion });
	}
	candidatas.sort((a, b) => a.distanciaM - b.distanciaM || a.cusec.localeCompare(b.cusec));

	// Una por barrio: la más cercana de cada uno
	const vistos = new Set<string>();
	const opciones: OpcionDentro[] = [];
	for (const o of candidatas) {
		const clave = o.barrio?.codigo ?? o.cusec;
		if (vistos.has(clave)) continue;
		vistos.add(clave);
		opciones.push(o);
		if (opciones.length === MAX_OPCIONES) break;
	}
	return { opciones };
}
