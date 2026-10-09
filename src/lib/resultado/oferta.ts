/**
 * «Lo que se pide» en el resultado: los anuncios recientes del Ayuntamiento como segunda referencia, ya
 * formateados para pintar. Solo existe con la flag de la oferta encendida (sin `datos.oferta` no hay nada).
 *
 *  - «Un anuncio»: una línea con la cifra que habla solo de la oferta (el veredicto sobre contratos lo dice la parte de contratos);
 *  - «Mi alquiler»: el titular contra contratos no cambia; la oferta es una línea sin veredicto;
 *  - nunca la diferencia entre las dos referencias, ni el nombre del barrio, ni un porcentaje;
 *  - sin dato de la zona o con menos de 30 m²: ni línea ni error (null).
 */
import { BANDA_EN_LINEA, type CasoOferta, type ContraOferta, type NivelOferta, type PosicionContratos, type ZonaOferta, type Anuncio, casoOferta, compararConOferta, ofertaDeZonas } from '../motor';
import type { DatosMadrid } from './datos';
import { euros, mesAnio } from './formato';
import { OFERTA } from './textos';

export interface PantallaOferta {
	/** Para la analítica y para recalibrar la banda: solo la categoría */
	contraOferta: ContraOferta;
	nivel: NivelOferta;
	/** AAAA-MM */
	mes: string;
	/** €/m² × m², redondeado al euro */
	estimada: number;
	/** «barrio de Goya» o «distrito de Moratalaz»: de qué es media (nunca «zona», que es de los contratos) */
	lugar: string;
	/** Banda de «en línea» (fracción, de config/oferta.json) */
	banda: number;
	/** Solo en «Un anuncio» */
	caso: CasoOferta | null;
	/**
	 * El bloque lleva un veredicto sobre la oferta (el precio supera los contratos): la pantalla oculta entonces el aviso
	 * «Se compara con contratos vigentes… Por eso un anuncio suele salir por encima», que el bloque ya cuantifica
	 */
	veredicto: boolean;
	/** Una línea con la cifra: «Anuncios recientes en el barrio: ≈1.028 €.»; en «Mi alquiler», «Si buscaras en el barrio, …» */
	linea: string;
	/** «Media del barrio, junio de 2026.» */
	pie: string;
	/** «Fuente: Ayuntamiento de Madrid, Banco de Datos, serie 4.3.21.D (…), junio de 2026.» */
	fuente: string;
}

/** Barrio y distrito de cada sección (códigos); las secciones que no están en las tablas no cuentan */
function zonasDe(datos: DatosMadrid, cusecs: readonly string[]): ZonaOferta[] {
	const zonas: ZonaOferta[] = [];
	for (const c of cusecs) {
		const barrio = datos.secciones[c]?.barrio;
		const distrito = barrio ? datos.barrios[barrio]?.cod_distrito : undefined;
		if (barrio && distrito) zonas.push({ barrio, distrito });
	}
	return zonas;
}

function textos(nivel: NivelOferta, mes: string, estimada: number, caso: CasoOferta | null) {
	const x = euros(estimada);
	const m = mesAnio(mes);
	const pie = OFERTA.pie(nivel, m);
	const fuente = OFERTA.fuente(m);
	return { linea: caso === null ? OFERTA.vivo.linea(nivel, x) : OFERTA.mirando[caso](nivel, x), pie, fuente };
}

/** «Un anuncio»: el caso según dónde queda el precio frente a los contratos y frente a la estimación */
export function construirOferta(
	anuncio: Pick<Anuncio, 'precio' | 'superficie'>, cusecs: readonly string[], contraContratos: PosicionContratos, datos: DatosMadrid
): PantallaOferta | null {
	if (!datos.oferta) return null;
	const r = compararConOferta(anuncio.precio, anuncio.superficie, ofertaDeZonas(zonasDe(datos, cusecs), datos.oferta));
	if (!r) return null;
	const caso = casoOferta(contraContratos, r.contraOferta);
	const estimada = Math.round(r.oferta.estimada);
	const zona = zonasDe(datos, cusecs)[0]!;
	const b = datos.barrios[zona.barrio];
	const lugar = r.oferta.nivel === 'barrio' ? `barrio de ${b?.nombre ?? 'Madrid'}` : `distrito de ${b?.distrito ?? 'Madrid'}`;
	return { contraOferta: r.contraOferta, nivel: r.oferta.nivel, mes: r.oferta.mes, estimada, lugar, banda: BANDA_EN_LINEA, caso, veredicto: caso.startsWith('encima'), ...textos(r.oferta.nivel, r.oferta.mes, estimada, caso) };
}

/** «Mi alquiler»: la misma referencia como línea secundaria, sin veredicto */
export function ofertaInquilino(o: PantallaOferta): PantallaOferta {
	return { ...o, caso: null, veredicto: false, ...textos(o.nivel, o.mes, o.estimada, null) };
}
