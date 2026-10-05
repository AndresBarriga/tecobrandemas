/**
 * «Tu zona»: la sección del usuario resaltada y las secciones a ≤ 1,5 km coloreadas por
 * referencia. La referencia es V_sup·f en €/m² para la superficie del usuario. Las
 * secciones sin dato o con 20 testigos o menos van en gris. Clases por quintiles.
 */
import { rangoInicialM2, motivoSeccion, tieneDato } from '../motor';
import type { Punto } from '../ubicacion/geocodificar';
import { type DatosMadrid, datosSeccion } from './datos';
import { RADIO_ZONA_M, distanciaM } from './geo';

export const N_CLASES = 5;

export interface CeldaZona {
	cusec: string;
	/** V_sup·f en €/m²·mes; null si la sección no tiene dato elegible */
	eurosM2: number | null;
	/** 0 (más barata) … 4 (más cara); null si no hay dato */
	clase: number | null;
	esUsuario: boolean;
}

export interface Zona {
	celdas: CeldaZona[];
	/** Valores de corte entre clases (N_CLASES − 1), en €/m²·mes */
	cortes: number[];
}

function cuantil(ordenados: number[], q: number): number {
	const pos = (ordenados.length - 1) * q;
	const i = Math.floor(pos);
	return ordenados[i]! + (ordenados[Math.min(i + 1, ordenados.length - 1)]! - ordenados[i]!) * (pos - i);
}

export function zona(
	superficie: number, origen: Punto, cusecsUsuario: string[], datos: DatosMadrid, centros: Map<string, Punto>
): Zona {
	const celdas: CeldaZona[] = [];
	for (const [cusec, centro] of centros) {
		const esUsuario = cusecsUsuario.includes(cusec);
		if (!esUsuario && distanciaM(origen, centro) > RADIO_ZONA_M) continue;
		const s = datosSeccion(datos, cusec);
		const conDato = motivoSeccion(s) === null && tieneDato(s);
		celdas.push({
			cusec,
			eurosM2: conDato ? rangoInicialM2(superficie, s).sup * datos.ipc.factor : null,
			clase: null,
			esUsuario
		});
	}

	const valores = celdas.flatMap((c) => (c.eurosM2 === null ? [] : [c.eurosM2])).sort((a, b) => a - b);
	const cortes = valores.length ? Array.from({ length: N_CLASES - 1 }, (_, i) => cuantil(valores, (i + 1) / N_CLASES)) : [];
	for (const c of celdas) {
		if (c.eurosM2 !== null) c.clase = cortes.filter((corte) => c.eurosM2! > corte).length;
	}
	celdas.sort((a, b) => a.cusec.localeCompare(b.cusec));
	return { celdas, cortes };
}
