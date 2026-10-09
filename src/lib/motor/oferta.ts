/**
 * «Lo que se pide»: los anuncios recientes (€/m²) de la serie del Ayuntamiento de Madrid, como segundo punto de
 * referencia junto a los contratos vigentes de SERPAVI. Módulo independiente: no toca los niveles contra
 * contratos ni el factor IPC, y solo se enciende con la flag de compilación (la decide quien carga los datos).
 *
 *   estimada = €/m² de la zona × m² del usuario        (solo con m² ≥ 30 y zona con dato)
 *
 * Regla: cada referencia se compara solo con el precio de la persona. Aquí nunca se calcula ni se devuelve la
 * diferencia entre los anuncios y los contratos.
 *
 * Nivel de la zona: el barrio, si tiene dato (dos meses seguidos; lo resuelve el script de datos); si no, el
 * distrito, nunca otro barrio. Con varias zonas posibles (calle sin número): el barrio solo si es uno; si no, el
 * distrito si es uno; si son de distritos distintos no hay referencia.
 */
import config from '../../../config/oferta.json';
import { SUPERFICIE_MIN } from './elegibilidad';

/** Banda de «en línea» alrededor de la estimación (fracción). Se recalibra con `resultado_oferta` tras el soft launch */
export const BANDA_EN_LINEA: number = config.banda_en_linea;

export type NivelOferta = 'barrio' | 'distrito';
export type ContraOferta = 'por_debajo' | 'en_linea' | 'por_encima';

/** Una entrada de oferta_madrid.json: €/m² al mes y el mes del dato (AAAA-MM) */
export interface ValorOferta {
	v: number;
	mes: string;
}

export interface TablaOferta {
	/** Solo los barrios con dato en los dos últimos meses */
	barrios: Record<string, ValorOferta>;
	distritos: Record<string, ValorOferta>;
}

/** Barrio y distrito (códigos) de una de las zonas posibles del anuncio */
export interface ZonaOferta {
	barrio: string;
	distrito: string;
}

export interface DatoOferta {
	eurosM2: number;
	/** AAAA-MM */
	mes: string;
	nivel: NivelOferta;
}

export interface Oferta extends DatoOferta {
	/** €/m² × m² del usuario, €/mes */
	estimada: number;
}

export interface ResultadoOferta {
	contraOferta: ContraOferta;
	oferta: Oferta;
}

const unicos = (xs: readonly string[]): string[] => [...new Set(xs)];

/** El €/m² de las zonas posibles: el del barrio si hay uno y tiene dato; si no, el del distrito si hay uno */
export function ofertaDeZonas(zonas: readonly ZonaOferta[], tabla: TablaOferta): DatoOferta | null {
	const barrios = unicos(zonas.map((z) => z.barrio));
	const distritos = unicos(zonas.map((z) => z.distrito));
	if (barrios.length === 1) {
		const b = tabla.barrios[barrios[0]!];
		if (b) return { eurosM2: b.v, mes: b.mes, nivel: 'barrio' };
	}
	if (distritos.length === 1) {
		const d = tabla.distritos[distritos[0]!];
		if (d) return { eurosM2: d.v, mes: d.mes, nivel: 'distrito' };
	}
	return null;
}

/** Precio frente a la estimación: por debajo de la banda, en línea (límites incluidos) o por encima. Null si no hay línea que mostrar */
export function compararConOferta(
	precio: number, superficie: number, dato: DatoOferta | null, banda: number = BANDA_EN_LINEA
): ResultadoOferta | null {
	if (!dato || !(superficie >= SUPERFICIE_MIN) || !(precio > 0)) return null;
	const estimada = dato.eurosM2 * superficie;
	const contraOferta: ContraOferta =
		precio < estimada * (1 - banda) ? 'por_debajo' : precio > estimada * (1 + banda) ? 'por_encima' : 'en_linea';
	return { contraOferta, oferta: { ...dato, estimada } };
}

/** Dónde queda el precio frente a los contratos: por debajo de la parte baja, dentro de rango o por encima de la parte alta */
export type PosicionContratos = 'debajo' | 'dentro' | 'encima';

/** Los cinco casos de «Un anuncio»; «encima» agrupa «algo por encima» y «se sale de lo habitual» */
export type CasoOferta = 'dentro' | 'debajo' | 'encima_en_linea' | 'encima_bajo_oferta' | 'encima_ambas';

export function casoOferta(contraContratos: PosicionContratos, contraOferta: ContraOferta): CasoOferta {
	if (contraContratos === 'dentro') return 'dentro';
	if (contraContratos === 'debajo') return 'debajo';
	return contraOferta === 'en_linea' ? 'encima_en_linea' : contraOferta === 'por_debajo' ? 'encima_bajo_oferta' : 'encima_ambas';
}
