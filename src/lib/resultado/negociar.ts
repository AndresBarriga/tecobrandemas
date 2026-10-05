/**
 * «Negociar con el dato»: texto para copiar, con tuteo o tratamiento de usted. La web no envía
 * nada: el texto sale del dispositivo solo si la persona lo copia. Usa las cifras del resultado.
 */
import type { PantallaResultado } from './resultado';

export type Tratamiento = 'tu' | 'usted';

export function textoNegociar(p: PantallaResultado, tratamiento: Tratamiento): string {
	const v = p.vista;
	const lugar = p.barrio ?? 'Madrid';
	const peticion =
		tratamiento === 'usted'
			? 'le agradecería que me lo indicaran.'
			: 'te agradecería que me lo indicaras.';
	return [
		'Hola:',
		`Me interesa la vivienda de ${v.m2} en ${lugar} que anuncian por ${v.precio} al mes.`,
		`He consultado la referencia de alquileres registrados en la zona. Para esta superficie, la parte alta de la referencia es de ${v.barra.parteAlta} al mes, y el techo para una vivienda de características excelentes, de ${v.barra.techo}.`,
		`¿Habría margen para ajustar el precio? Si la vivienda tiene algo que lo explique, como ascensor, garaje, reforma reciente, piscina o vistas, ${peticion}`,
		'Fuente: estimación independiente basada en la metodología SERPAVI, con datos del Ministerio de Vivienda y Agenda Urbana (referencia 2024 ajustada por el IPC del alquiler). Valor oficial: serpavi.mivau.gob.es.',
		'Un saludo.'
	].join('\n\n');
}
