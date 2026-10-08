/**
 * Resultado de muestra de la portada de escritorio («Así se ve un resultado», marcado EJEMPLO): un caso
 * real (Fuente del Berro, 2.690 €, 90 m²) calculado por el motor con el IPC de hoy. No son cifras del
 * diseño: cambian si cambia el IPC. Sigue a la pestaña activa: «Un anuncio» o «Mi alquiler».
 */
import type { DatosMadrid } from './datos';
import { ANUNCIO_EJEMPLO, CUSEC_EJEMPLO } from './metodologia';
import { aInquilino } from './inquilino';
import { construirPantalla } from './resultado';
import type { Ubicacion } from './ubicacion';
import type { Clase, Vista } from './vista';
import type { Barra } from './barra';

export type ModoMuestra = 'mirando' | 'vivo';

export interface Muestra {
	modo: ModoMuestra;
	lugar: string;
	/** «90 m², 2.690 €/mes · precio del anuncio» */
	contexto: string;
	clase: Clase;
	/** El icono de «por debajo» es un chevron hacia abajo */
	icono: Clase | 'abajo';
	etiqueta: string;
	principal: { tipo: 'cifra'; texto: string; nota: string } | { tipo: 'titular'; texto: string; nota: string };
	frase: string;
	vista: Vista;
	barra: Barra;
	/** Rótulo del punto de la barra: «tu anuncio» o «lo que pagas» */
	etiquetaPrecio: string;
}

const UBICACION: Ubicacion = {
	cusecs: [CUSEC_EJEMPLO], aproximada: false, motivo: null, numerosUsados: [], punto: { lon: -3.67, lat: 40.425 }, via: null
};

export function construirMuestra(datos: DatosMadrid, modo: ModoMuestra = 'mirando'): Muestra | null {
	const p = construirPantalla(ANUNCIO_EJEMPLO, UBICACION, datos);
	if (p.tipo !== 'resultado') return null;
	const v = p.vista;
	if (modo === 'vivo') {
		const t = aInquilino(p, ANUNCIO_EJEMPLO, { firma: { reciente: false, mes: 1, ano: 2020 }, rentaFirma: null, somos: null }).inquilino!;
		return {
			modo, lugar: v.lugar, contexto: `${v.contexto} · contrato de ${t.firma.ano}`, clase: t.clase, icono: t.icono, etiqueta: t.etiqueta,
			principal: t.cifra ? { tipo: 'cifra', texto: t.cifra, nota: t.nota } : { tipo: 'titular', texto: t.titular, nota: t.nota },
			frase: t.frase, vista: v, barra: p.barra, etiquetaPrecio: 'lo que pagas'
		};
	}
	return {
		modo, lugar: v.lugar, contexto: `${v.contexto} · precio del anuncio`, clase: v.clase, icono: v.clase, etiqueta: v.etiqueta,
		principal: v.principal.tipo === 'cifra' ? { tipo: 'cifra', texto: v.principal.texto, nota: v.principal.nota } : v.principal.tipo === 'titular' ? { tipo: 'titular', texto: v.principal.texto, nota: v.principal.nota } : { tipo: 'titular', texto: `${v.principal.desde} a ${v.principal.hasta}`, nota: v.principal.nota },
		frase: v.frase, vista: v, barra: p.barra, etiquetaPrecio: 'tu anuncio'
	};
}
