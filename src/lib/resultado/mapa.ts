/**
 * Página /mapa: Madrid entera coloreada, calculada en el navegador con el mismo motor y el factor IPC que
 * el resultado. Tres capas:
 *  - «Referencia»: parte alta (V_sup·f, €/m² al mes) para una superficie elegida, en 5 quintiles de las
 *    zonas con dato para esa superficie (iguales para toda la ciudad, recalculados al cambiar la superficie);
 *  - «Mi presupuesto»: lo que se puede pagar al mes frente al rango completo de la superficie elegida:
 *    por debajo (< R_inf), dentro (R_inf a R_sup) o con margen (> R_sup);
 *  - «Evolución 2015-2024»: subida de la mediana registrada, sin descontar la inflación.
 * Sin dato: 20 testigos o menos, sin datos de la zona o superficie fuera de 30-150 m². En los textos, «zona».
 */
import { SUPERFICIE_MAX, SUPERFICIE_MIN, motivoSeccion, rangoInicial, tieneDato } from '../motor';
import { type DatosMadrid, barrioDe, datosSeccion } from './datos';
import { euros, mesAnio, numero } from './formato';
import { MAPA_REFERENCIA as T } from './textos';

const NB = ' ';

export const SUPERFICIES_MAPA = [40, 55, 70, 90, 110] as const;
export const SUPERFICIE_MAPA_INICIAL = 70;
export const N_TONOS = 5;

export type CapaMapa = 'referencia' | 'presupuesto' | 'evolucion';
/** Posición del presupuesto frente al rango de la zona */
export type PosicionPresupuesto = 'debajo' | 'dentro' | 'margen';

export const superficieValida = (m2: number) => Number.isFinite(m2) && m2 >= SUPERFICIE_MIN && m2 <= SUPERFICIE_MAX;

export interface ZonaMapa {
	cusec: string;
	/** Código del barrio, para el nombre y las líneas entre barrios */
	barrio: string | null;
	/** Parte alta en €/m² al mes (con IPC); null = sin dato para esta superficie */
	supM2: number | null;
	/** R_inf y R_sup en €/mes (con IPC); null = sin dato */
	refInf: number | null;
	refSup: number | null;
	/** Alquileres registrados en la zona */
	n: number | null;
	/** Subida de la mediana registrada 2015-2024 (fracción); null = sin dato o con 20 testigos o menos */
	evolucion: number | null;
	med2015: number | null;
	med2024: number | null;
}

/** Datos de cada zona para una superficie. Sin superficie válida, todas quedan sin dato de referencia */
export function zonasDelMapa(datos: DatosMadrid, superficie: number): ZonaMapa[] {
	const valida = superficieValida(superficie);
	return Object.entries(datos.secciones).map(([cusec, s]) => {
		const d = datosSeccion(datos, cusec);
		const conDato = valida && motivoSeccion(d) === null && tieneDato(d);
		const r = conDato ? rangoInicial(superficie, d, datos.ipc.factor) : null;
		const testigosOk = s.n !== null && s.n >= 21;
		const conEvolucion = testigosOk && s.med2015 !== null && s.med2024 !== null && s.med2015 > 0;
		return {
			cusec,
			barrio: barrioDe(datos, cusec)?.codigo ?? null,
			supM2: r ? r.sup / superficie : null,
			refInf: r ? r.inf : null,
			refSup: r ? r.sup : null,
			n: s.n,
			evolucion: conEvolucion ? s.med2024! / s.med2015! - 1 : null,
			med2015: s.med2015,
			med2024: s.med2024
		};
	});
}

/** Cuatro cortes que dejan el mismo número de zonas (quintiles), redondeados a `decimales` */
export function quintiles(valores: number[], decimales: number): number[] {
	const v = valores.filter(Number.isFinite).sort((a, b) => a - b);
	if (v.length === 0) return [];
	const k = 10 ** decimales;
	return [1, 2, 3, 4].map((i) => {
		const pos = (v.length - 1) * (i / 5);
		const a = Math.floor(pos);
		const x = v[a]! + (v[Math.min(a + 1, v.length - 1)]! - v[a]!) * (pos - a);
		return Math.round(x * k) / k;
	});
}

/** 0 … 4 según los cortes; null si no hay valor */
export const claseCortes = (valor: number | null, cortes: readonly number[]): number | null =>
	valor === null ? null : cortes.filter((c) => valor >= c).length;

export interface EtiquetaEscala {
	/** Índice del tono; null = sin dato */
	tono: number | null;
	etiqueta: string;
}

/** «< 15,2», «15,2–17,9», …, «≥ 24,1» */
export function etiquetasEscala(cortes: readonly number[], fmt: (n: number) => string): EtiquetaEscala[] {
	if (cortes.length !== N_TONOS - 1) return [];
	const f = cortes.map(fmt);
	return [
		{ tono: 0, etiqueta: `<${NB}${f[0]}` },
		{ tono: 1, etiqueta: `${f[0]}–${f[1]}` },
		{ tono: 2, etiqueta: `${f[1]}–${f[2]}` },
		{ tono: 3, etiqueta: `${f[2]}–${f[3]}` },
		{ tono: 4, etiqueta: `≥${NB}${f[3]}` }
	];
}

export interface CapaCalculada {
	/** Por cusec: índice de tono (0-4) o null (sin dato). En «presupuesto»: 0 debajo, 1 dentro, 2 margen */
	tonos: Map<string, number | null>;
	leyenda: EtiquetaEscala[];
	/** Nota bajo la leyenda */
	nota: string;
}

const fmtM2 = (n: number) => numero(n, 1);

/** Capa «Referencia»: quintiles de la parte alta entre las zonas con dato para esa superficie */
export function capaReferencia(zonas: ZonaMapa[], superficie: number): CapaCalculada {
	const cortes = quintiles(zonas.flatMap((z) => (z.supM2 === null ? [] : [z.supM2])), 1);
	return {
		tonos: new Map(zonas.map((z) => [z.cusec, claseCortes(z.supM2 === null ? null : Math.round(z.supM2 * 10) / 10, cortes)])),
		leyenda: etiquetasEscala(cortes, fmtM2),
		nota: T.notaCortes(numero(superficie))
	};
}

/** Capa «Evolución»: quintiles de la subida (en %) entre las zonas con dato; los mismos para toda la ciudad */
export function capaEvolucion(zonas: ZonaMapa[]): CapaCalculada {
	const pct = zonas.flatMap((z) => (z.evolucion === null ? [] : [z.evolucion * 100]));
	const cortes = quintiles(pct, 0);
	const signo = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${numero(Math.abs(n))}`;
	return {
		tonos: new Map(zonas.map((z) => [z.cusec, claseCortes(z.evolucion === null ? null : Math.round(z.evolucion * 100), cortes)])),
		leyenda: etiquetasEscala(cortes, signo).map((e) => ({ ...e, etiqueta: e.etiqueta.replace(/(\d)$/, '$1 %') })),
		nota: T.notaEvolucion
	};
}

/** Frente al rango completo: por debajo (< R_inf), dentro (R_inf a R_sup) o con margen (> R_sup) */
export function posicionPresupuesto(presupuesto: number, z: Pick<ZonaMapa, 'refInf' | 'refSup'>): PosicionPresupuesto | null {
	if (z.refInf === null || z.refSup === null) return null;
	return presupuesto < z.refInf ? 'debajo' : presupuesto <= z.refSup ? 'dentro' : 'margen';
}

export interface ResumenPresupuesto {
	/** Zonas con dato para esa superficie */
	conDato: number;
	/** Zonas donde llega a la referencia: dentro o con margen */
	llega: number;
	/** Porcentaje entero de las zonas con dato */
	porcentaje: number;
}

export function resumenPresupuesto(posiciones: Iterable<PosicionPresupuesto | null>): ResumenPresupuesto {
	let conDato = 0;
	let llega = 0;
	for (const p of posiciones) {
		if (p === null) continue;
		conDato++;
		if (p !== 'debajo') llega++;
	}
	return { conDato, llega, porcentaje: conDato ? Math.round((llega / conDato) * 100) : 0 };
}

const INDICE_POSICION = { debajo: 0, dentro: 1, margen: 2 } as const;

/** Capa «Mi presupuesto»: tres tramos, escala en grises (trama, Piedra, Tinta) */
export function capaPresupuesto(zonas: ZonaMapa[], presupuesto: number): CapaCalculada & { resumen: ResumenPresupuesto } {
	const pos = new Map(zonas.map((z) => [z.cusec, posicionPresupuesto(presupuesto, z)]));
	return {
		tonos: new Map([...pos].map(([c, p]) => [c, p === null ? null : INDICE_POSICION[p]])),
		leyenda: [
			{ tono: 0, etiqueta: T.presupuesto.debajo },
			{ tono: 1, etiqueta: T.presupuesto.dentro },
			{ tono: 2, etiqueta: T.presupuesto.margen }
		],
		nota: T.presupuesto.nota,
		resumen: resumenPresupuesto(pos.values())
	};
}

export interface HojaZona {
	titulo: string;
	/** «Referencia para 70 m²: de 1.080 a 1.540 € al mes» */
	referencia: string | null;
	/** «Parte alta: 22,0 €/m² al mes» */
	parteAlta: string | null;
	procedencia: string | null;
	/** Capa «Mi presupuesto»: dónde queda el presupuesto en esta zona */
	presupuesto: string | null;
	/** Capa «Evolución» */
	evolucion: string | null;
	/** Por qué no hay dato */
	sinDato: string | null;
}

/** Lo que dice la hoja al tocar una zona, según la capa */
export function hojaDeZona(
	z: ZonaMapa, datos: DatosMadrid, capa: CapaMapa, superficie: number, presupuesto: number | null
): HojaZona {
	const barrio = barrioDe(datos, z.cusec);
	const titulo = `${T.hoja.zonaDe} ${barrio?.nombre ?? 'Madrid'}`;
	const m2 = `${numero(superficie)}${NB}m²`;
	const hoja: HojaZona = { titulo, referencia: null, parteAlta: null, procedencia: null, presupuesto: null, evolucion: null, sinDato: null };

	if (capa !== 'evolucion' && z.refInf !== null && z.refSup !== null && z.supM2 !== null) {
		hoja.referencia = T.hoja.referencia(m2, numero(z.refInf), euros(z.refSup));
		hoja.parteAlta = T.hoja.parteAlta(numero(z.supM2, 1));
		hoja.procedencia = T.hoja.procedencia(numero(z.n ?? 0), mesAnio(datos.ipc.ultimo_mes));
		if (capa === 'presupuesto' && presupuesto !== null) {
			const p = posicionPresupuesto(presupuesto, z)!;
			hoja.presupuesto = T.hoja.presupuesto[p](euros(presupuesto));
		}
	} else if (capa !== 'evolucion') {
		hoja.sinDato = !superficieValida(superficie)
			? T.hoja.sinDatoSuperficie
			: z.n !== null && z.n <= 20 ? T.hoja.sinDatoTestigos(numero(z.n)) : T.hoja.sinDatoZona;
	}

	if (capa === 'evolucion') {
		if (z.evolucion !== null && z.med2015 !== null && z.med2024 !== null) {
			hoja.evolucion = T.hoja.evolucion(numero(z.med2015, 1), numero(z.med2024, 1), subida(z.evolucion));
		} else hoja.sinDato = z.n !== null && z.n <= 20 ? T.hoja.sinDatoTestigos(numero(z.n)) : T.hoja.sinDatoZona;
	}
	return hoja;
}

/** 0,49 → «+49 %»; −0,04 → «−4 %» */
export function subida(fraccion: number): string {
	const n = Math.round(fraccion * 100);
	return `${n > 0 ? '+' : n < 0 ? '−' : ''}${numero(Math.abs(n))}${NB}%`;
}

/** «Interpretar» el campo de euros o metros: entero positivo, o null */
export function numeroDelCampo(texto: string): number | null {
	const limpio = texto.replace(/[^\d,]/g, '').replace(',', '.');
	const n = Number(limpio);
	return limpio !== '' && Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Colores de cada capa. «Referencia»: la escala de Paja de «Tu zona». «Evolución»: Acero, otra familia.
 * «Mi presupuesto»: grises (trama diagonal, Piedra, Tinta), distinta de la de Paja.
 * En «presupuesto», el tono 0 es una trama: el componente la pinta con un patrón, no con este color.
 */
export const TONOS_MAPA: Record<CapaMapa, readonly string[]> = {
	referencia: ['#F3E4B0', '#E2BE55', '#BF962F', '#8E6B1D', '#5A4413'],
	evolucion: ['#E3ECF4', '#B5CADD', '#7FA1C2', '#3F6C98', '#1F3F5E'],
	presupuesto: ['#F6F4EE', '#857F74', '#1C1B19']
};
