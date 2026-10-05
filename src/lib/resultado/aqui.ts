/**
 * «Aquí estarías dentro»: hasta 5 secciones cercanas (≤ 1,5 km) y elegibles donde el
 * precio introducido quedaría dentro de la referencia, es decir precio ≤ R_sup con la
 * misma superficie. Se calcula en el navegador. No son pisos disponibles.
 */
import { type Anuncio, motivoSeccion, referencia, tieneDato } from '../motor';
import type { Punto } from '../ubicacion/geocodificar';
import { type BarrioDeSeccion, type DatosMadrid, barrioDe, datosSeccion } from './datos';
import { RADIO_ZONA_M, distanciaM } from './geo';
import { NO_SON_PISOS_DISPONIBLES } from './textos';

export const MAX_OPCIONES = 5;

export interface OpcionDentro {
	cusec: string;
	barrio: BarrioDeSeccion | null;
	distanciaM: number;
	/** R_sup en €/mes para la superficie del usuario */
	refSup: number;
}

export interface AquiEstariasDentro {
	opciones: OpcionDentro[];
	/** Siempre presente: «no son pisos disponibles» */
	aviso: string;
	/** Solo si la lista está vacía */
	mensajeVacio: string | null;
}

export const MENSAJE_VACIO = 'Con este precio, no hay secciones a menos de 1,5\u00A0km donde quedara dentro de la referencia.';

export function aquiEstariasDentro(
	anuncio: Anuncio, origen: Punto, excluir: string[], datos: DatosMadrid, centros: Map<string, Punto>
): AquiEstariasDentro {
	const opciones: OpcionDentro[] = [];
	for (const [cusec, centro] of centros) {
		if (excluir.includes(cusec)) continue;
		const d = distanciaM(origen, centro);
		if (d > RADIO_ZONA_M) continue;
		const s = datosSeccion(datos, cusec);
		if (motivoSeccion(s) !== null || !tieneDato(s)) continue;
		const ref = referencia(anuncio.superficie, s, datos.ipc.factor);
		if (anuncio.precio > ref.sup) continue;
		opciones.push({ cusec, barrio: barrioDe(datos, cusec), distanciaM: d, refSup: ref.sup });
	}
	opciones.sort((a, b) => a.distanciaM - b.distanciaM);
	const elegidas = opciones.slice(0, MAX_OPCIONES);
	return {
		opciones: elegidas,
		aviso: NO_SON_PISOS_DISPONIBLES,
		mensajeVacio: elegidas.length === 0 ? MENSAJE_VACIO : null
	};
}
