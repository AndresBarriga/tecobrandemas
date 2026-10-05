/**
 * Punto de entrada del motor: anuncio + secciones candidatas → resultado o motivo sin dato.
 *
 * Con una sola sección es el cálculo directo. Con varias (ubicación aproximada) es la
 * horquilla: se excluyen las secciones sin dato o con ≤20 testigos, se calcula cada una y
 * se muestra el nivel más prudente con el intervalo de % entre todas.
 */
import { referencia } from './correccion';
import { motivoAnuncio, motivoSeccion } from './elegibilidad';
import { brecha, clasificar, rangoNivel } from './niveles';
import type { Anuncio, Brecha, DatosSeccion, MotivoSinDato, Nivel, Referencia, SeccionConDato } from './tipos';

export interface ResultadoSeccion {
	seccion: SeccionConDato;
	referencia: Referencia;
	nivel: Nivel;
	brecha: Brecha | null;
	/** precio / R_sup − 1, también cuando es negativo; sirve para el intervalo */
	pct: number;
}

export type Analisis =
	| { tipo: 'sin_dato'; motivo: MotivoSinDato }
	| {
			tipo: 'resultado';
			/** Sección de nivel más prudente (a igual nivel, la de menor %) */
			prudente: ResultadoSeccion;
			/** Todas las secciones calculadas, ordenadas de menor a mayor % */
			secciones: ResultadoSeccion[];
			excluidas: { cusec: string; motivo: MotivoSinDato }[];
			pctMin: number;
			pctMax: number;
			horquilla: boolean;
	  };

export function calcularSeccion(a: Anuncio, s: SeccionConDato, factorIpc: number): ResultadoSeccion {
	const ref = referencia(a.superficie, s, factorIpc);
	return {
		seccion: s,
		referencia: ref,
		nivel: clasificar(a.precio, ref),
		brecha: brecha(a.precio, ref),
		pct: a.precio / ref.sup - 1
	};
}

export function analizar(a: Anuncio, candidatas: DatosSeccion[], factorIpc: number): Analisis {
	const motivo = motivoAnuncio(a);
	if (motivo) return { tipo: 'sin_dato', motivo };

	const validas: SeccionConDato[] = [];
	const excluidas: { cusec: string; motivo: MotivoSinDato }[] = [];
	for (const s of candidatas) {
		const m = motivoSeccion(s);
		// motivoSeccion devuelve null solo si la sección tiene los cuatro valores
		if (m === null) validas.push(s as SeccionConDato);
		else excluidas.push({ cusec: s.cusec, motivo: m });
	}

	if (validas.length === 0) {
		const porTestigos = excluidas.some((e) => e.motivo === 'testigos');
		return { tipo: 'sin_dato', motivo: porTestigos ? 'testigos' : 'sin_dato_seccion' };
	}

	const secciones = validas.map((s) => calcularSeccion(a, s, factorIpc)).sort((x, y) => x.pct - y.pct);
	const prudente = secciones.reduce((mejor, r) => (rangoNivel(r.nivel) < rangoNivel(mejor.nivel) ? r : mejor));

	return {
		tipo: 'resultado',
		prudente,
		secciones,
		excluidas,
		pctMin: secciones[0]!.pct,
		pctMax: secciones[secciones.length - 1]!.pct,
		horquilla: secciones.length > 1
	};
}
