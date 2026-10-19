/**
 * Página /como-consultar-serpavi: guía de cómo consultar el SERPAVI (Ministerio de Vivienda y Agenda Urbana) y de qué
 * hacer con el resultado. Todo el texto vive aquí; la página (src/routes/como-consultar-serpavi) solo lo pinta.
 * No afirma si la Comunidad de Madrid tiene zonas tensionadas declaradas: es una guía general.
 */
import { ENLACE_OFICIAL } from './textos';

/** AAAA-MM-DD: última revisión del texto; va en la página, en el JSON-LD y en el sitemap */
export const FECHA_SERPAVI = '2026-10-19';

export const RUTA_SERPAVI = '/como-consultar-serpavi';
export const URL_CATASTRO = 'https://www.sedecatastro.gob.es/';

/** El mismo texto y destino en el CTA de arriba, el del medio y el final; solo cambia el `utm_content` para saber cuál se pulsa */
export const CTA_SERPAVI = {
	texto: 'Compara tu alquiler en A su precio',
	nota: 'La herramienta cubre Madrid.',
	href: (donde: 'arriba' | 'medio' | 'final') => `/?utm_source=serpavi&utm_content=como-consultar-${donde}`
} as const;

export const TEXTO_SERPAVI = {
	// ≤60 caracteres y ≤155 la descripción
	titulo: 'Cómo consultar el SERPAVI: precio de alquiler (Madrid)',
	descripcion: 'Qué es el SERPAVI, cómo consultar el precio de referencia de tu piso y qué hacer con el resultado. Compáralo en un clic con A su precio.',
	h1: 'SERPAVI alquiler: cómo consultar el precio de referencia de tu piso',
	subtitulo:
		'El SERPAVI es la base de datos oficial del Ministerio de Vivienda con rangos de precio de alquiler por zona y por características de la vivienda.',
	pasos: {
		h2: 'Cómo consultarlo en 3 pasos',
		items: [
			{ h3: 'Indica la vivienda', texto: 'Escribe la dirección o, si la tienes a mano, la referencia catastral.' },
			{
				h3: 'Rellena sus características',
				texto: 'Estado de conservación, ascensor, garaje, año de construcción, planta y alguna más. Cuanto más exacto, mejor ajustado el rango.'
			},
			{
				h3: 'Lee el rango, no una cifra',
				texto: 'El resultado son dos importes, uno bajo y uno alto. Tu serpavi precio alquiler es esa horquilla, no un precio único.'
			}
		],
		fuente: 'La consulta se hace en la herramienta del Ministerio:',
		boton: 'Abrir el SERPAVI oficial (serpavi.mivau.gob.es)',
		url: `${ENLACE_OFICIAL}/`
	},
	catastral: {
		h2: 'Dónde encontrar tu referencia catastral',
		parrafo:
			'Es el código de 20 caracteres que identifica cada inmueble en el Catastro. Con él, el SERPAVI sitúa tu vivienda sin ambigüedades. Es el paso donde más gente se atasca.',
		donde: [
			{ h3: 'En el recibo del IBI', texto: 'Aparece impreso en el recibo o en la carta de pago del impuesto.' },
			{ h3: 'En la Sede Electrónica del Catastro', texto: 'Puedes buscar tu inmueble por dirección y consultar su referencia.', enlace: 'sedecatastro.gob.es' },
			{ h3: 'Sin ella también vale', texto: 'Si no la encuentras, introduce la dirección completa.' }
		]
	},
	resultado: {
		h2: 'Qué significa el resultado',
		parrafos: [
			'Es una horquilla orientativa: cuánto suelen pagar los alquileres de viviendas parecidas en tu zona. No es una tasación ni el precio justo de tu piso.',
			'Solo limita el precio en las zonas que la comunidad autónoma ha declarado tensionadas.'
		]
	},
	falta: {
		h2: 'Lo que el SERPAVI no te dice',
		parrafos: [
			'El SERPAVI te da un rango para una vivienda concreta. No te coloca de un vistazo frente a tu barrio ni frente a lo que pagan quienes ya viven allí.',
			'A su precio pone tu alquiler, o el de un anuncio, junto a los contratos de tu zona y te dice si queda dentro del rango, algo por encima o fuera de lo habitual. Es una estimación independiente: el valor oficial es el del Ministerio.'
		]
	},
	faq: {
		h2: 'Preguntas frecuentes',
		items: [
			{
				q: '¿Qué es el SERPAVI?',
				a: 'Es el Sistema Estatal de Referencia del Precio del Alquiler de Vivienda, del Ministerio de Vivienda y Agenda Urbana. Da un rango de precio según la zona y las características de la vivienda, a partir de contratos declarados a Hacienda.'
			},
			{
				q: '¿Es vinculante?',
				a: 'No en general: es una referencia orientativa. Solo condiciona el precio en las zonas declaradas tensionadas, en los casos que fija la norma.'
			},
			{
				q: '¿Qué es una zona tensionada?',
				a: 'Es una zona que la comunidad autónoma declara como mercado residencial tensionado, según la Ley 12/2023, de 24 de mayo, por el derecho a la vivienda. Solo en ellas el rango puede limitar el precio de un contrato nuevo.'
			},
			{
				q: '¿Qué hago si mi alquiler está por encima?',
				a: 'Comprueba que has indicado bien las características, mira el rango completo y consulta si tu zona está declarada tensionada. Si tienes dudas, pide asesoramiento profesional.'
			}
		]
	},
	mas: {
		h2: 'Mira tu zona',
		parrafo: 'Explora el mapa de Madrid o consulta la referencia de algunos barrios.',
		enlaces: [
			{ texto: 'Mapa de Madrid', href: '/mapa' },
			{ texto: 'Lavapiés', href: '/alquiler/lavapies-embajadores' },
			{ texto: 'Malasaña', href: '/alquiler/malasana-universidad' },
			{ texto: 'Argüelles', href: '/alquiler/arguelles' }
		]
	},
	fuente: 'Fuente: Ministerio de Vivienda y Agenda Urbana (SERPAVI).',
	cierre: '¿Está tu alquiler dentro del rango de tu zona?'
} as const;
