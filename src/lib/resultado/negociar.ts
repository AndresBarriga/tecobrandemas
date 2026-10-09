/**
 * «Negociar con el dato»: texto para copiar, con tuteo o tratamiento de usted. La web no envía
 * nada: el texto sale del dispositivo solo si la persona lo copia. Usa las cifras del resultado.
 * Habla de contratos vigentes, no de precio de mercado: no propone precio, pide margen o justificación.
 */
import type { PantallaResultado } from './resultado';
import { NIVEL_CONTRATOS } from './textos';

export type Tratamiento = 'tu' | 'usted';

export function textoNegociar(p: PantallaResultado, tratamiento: Tratamiento): string {
	const v = p.vista;
	const lugar = p.barrio ?? 'Madrid';
	// Con horquilla la parte alta es «entre 947 y 995 €»
	const hasta = v.barra.parteAlta.startsWith('entre') ? `una cifra ${v.barra.parteAlta}` : v.barra.parteAlta;
	// Con «Lo que se pide» y el precio por encima de los contratos no se dice «hoy se pide más por entrar»: los anuncios recientes pueden estar al mismo nivel
	const diferencia =
		p.oferta?.veredicto === true
			? NIVEL_CONTRATOS.negociar[tratamiento]
			: tratamiento === 'usted'
				? 'Entiendo que hoy se pide más por entrar. ¿Podría indicarme qué explica la diferencia, o si hay margen en el precio?'
				: 'Entiendo que hoy se pide más por entrar. ¿Me podrías decir qué explica la diferencia, o si hay margen en el precio?';
	return [
		'Hola:',
		`Me interesa la vivienda de ${v.m2} en ${lugar} que anuncian por ${v.precio} al mes.`,
		`He mirado lo que pagan quienes ya viven de alquiler en la zona. Para esta superficie, la mayoría de los contratos vigentes llegan hasta ${hasta} al mes.`,
		diferencia,
		'Fuente: contratos de alquiler declarados a Hacienda (2024, ajustados por el IPC del alquiler), publicados por el Ministerio de Vivienda y Agenda Urbana. Es una estimación independiente basada en la metodología SERPAVI; el valor oficial está en serpavi.mivau.gob.es.',
		'Un saludo.'
	].join('\n\n');
}
