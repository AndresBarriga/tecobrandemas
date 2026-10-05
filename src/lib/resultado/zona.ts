/**
 * «Tu zona»: las zonas a ≤ 1,5 km (y la tuya, aunque esté más lejos) coloreadas por la parte alta de su
 * referencia, V_sup·f en €/m² al mes para la superficie del usuario. Cortes fijos para toda la ciudad
 * (diseño 6a-6f): así el mismo color significa lo mismo en cualquier barrio. Las zonas sin dato o con
 * 20 testigos o menos van aparte (rayado). En los textos se dice «zona», nunca «sección».
 */
import { rangoInicialM2, motivoSeccion, tieneDato } from '../motor';
import type { Punto } from '../ubicacion/geocodificar';
import { type DatosMadrid, barrioDe, datosSeccion } from './datos';
import { RADIO_ZONA_M, distanciaM } from './geo';

/** Cortes entre tonos, en €/m² al mes: <15, 15–18, 18–21, 21–24, ≥24 */
export const CORTES_ZONA = [15, 18, 21, 24] as const;
export const N_CLASES = CORTES_ZONA.length + 1;

/** 0 (más barata) … 4 (más cara) */
export const claseZona = (eurosM2: number): number => CORTES_ZONA.filter((c) => eurosM2 >= c).length;

export interface CeldaZona {
	cusec: string;
	/** Código del barrio; sirve para las líneas gruesas entre barrios y para el nombre */
	barrio: string | null;
	/** V_sup·f en €/m²·mes; null si la zona no tiene dato elegible */
	eurosM2: number | null;
	/** 0 … 4; null si no hay dato */
	clase: number | null;
	esUsuario: boolean;
	distanciaM: number;
}

export interface Zona {
	celdas: CeldaZona[];
	cortes: readonly number[];
}

export function zona(
	superficie: number, origen: Punto, cusecsUsuario: string[], datos: DatosMadrid, centros: Map<string, Punto>
): Zona {
	const celdas: CeldaZona[] = [];
	for (const [cusec, centro] of centros) {
		const esUsuario = cusecsUsuario.includes(cusec);
		const d = distanciaM(origen, centro);
		if (!esUsuario && d > RADIO_ZONA_M) continue;
		const s = datosSeccion(datos, cusec);
		const conDato = motivoSeccion(s) === null && tieneDato(s);
		const eurosM2 = conDato ? rangoInicialM2(superficie, s).sup * datos.ipc.factor : null;
		celdas.push({
			cusec,
			barrio: barrioDe(datos, cusec)?.codigo ?? null,
			eurosM2,
			clase: eurosM2 === null ? null : claseZona(eurosM2),
			esUsuario,
			distanciaM: d
		});
	}
	celdas.sort((a, b) => a.cusec.localeCompare(b.cusec));
	return { celdas, cortes: CORTES_ZONA };
}
