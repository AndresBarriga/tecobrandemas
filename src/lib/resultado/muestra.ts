/**
 * Resultado de muestra de la portada («Así se ve un resultado», marcado EJEMPLO): un caso real de un barrio
 * cercano (Embajadores, 1.400 €, 45 m²) calculado por el motor con el último IPC y los anuncios recientes. No son
 * cifras del diseño: cambian si cambian los datos. Usa el mismo diseño que el resultado y sigue a la pestaña activa:
 * «Un anuncio» o «Mi alquiler». El ejemplo de «Cómo calculamos» es otro (metodologia.ts).
 */
import type { Comparativa } from './comparativa';
import type { Costura } from './costura';
import type { DatosMadrid } from './datos';
import type { Anuncio } from '../motor';
import { aInquilino } from './inquilino';
import { construirPantalla } from './resultado';
import type { Ubicacion } from './ubicacion';
import { COMPARATIVA } from './textos';
import type { Clase } from './vista';

export type ModoMuestra = 'mirando' | 'vivo';

export interface Muestra {
	modo: ModoMuestra;
	lugar: string;
	/** «90 m² · 2.690 €/mes · precio del anuncio» */
	contexto: string;
	clase: Clase;
	comparativa: Comparativa;
	costura: Costura;
}

/** Una zona de Embajadores (Centro): más cercana para la mayoría que un piso grande en Salamanca */
const CUSEC_MUESTRA = '2807901040';
const ANUNCIO_MUESTRA: Anuncio = { precio: 1400, superficie: 45, obraNueva: false, tipo: 'piso', largaDuracion: true };
const UBICACION: Ubicacion = {
	cusecs: [CUSEC_MUESTRA], aproximada: false, motivo: null, numerosUsados: [], punto: { lon: -3.703, lat: 40.406 }, via: null
};

export function construirMuestra(datos: DatosMadrid, modo: ModoMuestra = 'mirando'): Muestra | null {
	const p = construirPantalla(ANUNCIO_MUESTRA, UBICACION, datos);
	if (p.tipo !== 'resultado') return null;
	const v = p.vista;
	if (modo === 'vivo') {
		const q = aInquilino(p, ANUNCIO_MUESTRA, { firma: { reciente: false, mes: 1, ano: 2020 }, rentaFirma: null, somos: null });
		return { modo, lugar: v.lugar, contexto: q.inquilino!.pagas, clase: q.inquilino!.clase, comparativa: q.comparativa, costura: q.costura };
	}
	return { modo, lugar: v.lugar, contexto: `${v.m2} · ${v.precio}/mes · ${COMPARATIVA.cabecera.mirando}`, clase: v.clase, comparativa: p.comparativa, costura: p.costura };
}
