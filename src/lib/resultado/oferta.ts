/**
 * «Lo que se pide» en el resultado: los anuncios recientes del Ayuntamiento como segunda referencia, ya
 * formateados para pintar. Solo existe con la flag de la oferta encendida (sin `datos.oferta` no hay nada).
 *
 *  - «Un anuncio»: el titular de uno de los cinco casos (contratos × anuncios) y, en dos, la línea con la cifra;
 *  - «Mi alquiler»: el titular contra contratos no cambia; la oferta es una línea sin veredicto;
 *  - nunca la diferencia entre las dos referencias, ni el nombre del barrio, ni un porcentaje;
 *  - sin dato de la zona o con menos de 30 m²: ni línea ni error (null).
 */
import { type CasoOferta, type ContraOferta, type NivelOferta, type PosicionContratos, type ZonaOferta, type Anuncio, casoOferta, compararConOferta, ofertaDeZonas } from '../motor';
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
	/** Solo en «Un anuncio» */
	caso: CasoOferta | null;
	/** Frase del caso; null en «Mi alquiler» (ahí manda el titular contra contratos) */
	titular: string | null;
	/** Línea con la cifra: «Anuncios recientes en el barrio: ≈1.028 €.»; null en los casos que ya van en el titular */
	linea: string | null;
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
	if (caso === null) return { titular: null, linea: OFERTA.vivo.linea(nivel, x), pie, fuente };
	if (caso === 'dentro') return { titular: OFERTA.mirando.dentro.titular, linea: OFERTA.mirando.dentro.linea(nivel, x), pie, fuente };
	if (caso === 'debajo') return { titular: OFERTA.mirando.debajo.titular, linea: OFERTA.mirando.debajo.linea(nivel, x), pie, fuente };
	return { titular: OFERTA.mirando[caso].titular(nivel), linea: null, pie, fuente };
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
	return { contraOferta: r.contraOferta, nivel: r.oferta.nivel, mes: r.oferta.mes, estimada, caso, ...textos(r.oferta.nivel, r.oferta.mes, estimada, caso) };
}

/** «Mi alquiler»: la misma referencia como línea secundaria, sin veredicto */
export function ofertaInquilino(o: PantallaOferta): PantallaOferta {
	return { ...o, caso: null, ...textos(o.nivel, o.mes, o.estimada, null) };
}
