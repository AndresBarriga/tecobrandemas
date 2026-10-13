/**
 * Texto de /mapa para buscadores y lectores, debajo del mapa (el mapa sigue siendo lo primero). Se pinta en el
 * servidor. El H1 es el de la cabecera de la página (`MAPA_REFERENCIA.titulo`): aquí no hay otro.
 * Reglas: ninguna cifra de zonas concretas, ninguna lista de barrios ni distritos, nada de «más caro» o «más barato»
 * y ningún dato de análisis de usuarios.
 */

/** Fecha de la última revisión del texto (AAAA-MM-DD); va en el sitemap y en el JSON-LD */
export const FECHA_MAPA = '2026-10-13';

export const TEXTO_MAPA = {
	/** Las dos frases que responden: qué muestra el mapa y de dónde salen los datos */
	respuesta: [
		'Este mapa muestra, por zonas de Madrid, la referencia de lo que pagan quienes ya viven de alquiler.',
		'Los datos salen de los contratos declarados a Hacienda que recoge el índice SERPAVI del Ministerio de Vivienda y Agenda Urbana.'
	],
	boton: 'Comparar mi alquiler',
	/** utm_source=mapa: la portada, con la campaña */
	enlaceHerramienta: '/?utm_source=mapa',
	secciones: [
		{
			h2: 'Cómo leer el mapa',
			parrafos: [
				'Cada zona se colorea según la parte alta de lo que pagan quienes ya viven allí, en euros por metro cuadrado al mes. Los cinco colores reparten las zonas con dato en cinco grupos del mismo tamaño, y la leyenda indica el tramo de cada color. Los cortes son iguales para toda la ciudad.',
				'El mapa se calcula para un tamaño de vivienda (40, 55, 70, 90 o 110 m²) porque los pisos pequeños suelen tener un precio mayor por metro cuadrado. Si cambias el tamaño, los colores se recalculan.',
				'La parte alta de la referencia es el valor por debajo del cual está la mayoría de los contratos de la zona. No es un máximo: hay contratos por encima.',
				'El mapa tiene tres capas. «Referencia» muestra los contratos; «Mi presupuesto» compara tu presupuesto con los anuncios recientes; «Evolución» muestra cuánto han subido los contratos entre 2015 y 2024.'
			]
		},
		{
			h2: 'De dónde salen los datos',
			parrafos: [
				'La referencia sale del sistema SERPAVI del Ministerio de Vivienda y Agenda Urbana: contratos de alquiler de propietarios particulares declarados a Hacienda (2024). Los importes se actualizan con el IPC del alquiler del INE.',
				'Es una estimación independiente. El valor oficial está en serpavi.mivau.gob.es.'
			]
		},
		{
			h2: 'Qué no muestra',
			parrafos: [
				'Los contratos no son precios de anuncios: son alquileres ya firmados, de fechas distintas. Los anuncios recientes, que usan la fuente «Oferta» y la capa «Mi presupuesto», vienen del Ayuntamiento de Madrid, se señalan aparte y nunca se mezclan con los contratos.',
				'Tampoco dice si un alquiler cumple la ley. Las zonas con 20 contratos o menos, o los tamaños fuera de 30 a 150 m², salen como «sin dato».'
			]
		}
	],
	faq: [
		{ q: '¿Qué significa «sin dato» en el mapa?', a: 'Que esa zona tiene 20 contratos o menos, o que el tamaño elegido queda fuera de 30 a 150 m². En esos casos no damos una cifra.' },
		{ q: '¿Por qué cambia el mapa al elegir otro tamaño?', a: 'Porque la referencia se calcula por tamaño: los pisos pequeños suelen tener un precio mayor por metro cuadrado. Cada tamaño tiene sus propios cortes de color.' },
		{ q: '¿El mapa me dice si mi alquiler cumple la ley?', a: 'No. Es una referencia informativa y una estimación independiente; el valor oficial está en SERPAVI.' }
	],
	enlaces: [
		{ texto: '¿Qué es el índice de referencia del alquiler (SERPAVI)?', href: '/preguntas/que-es-el-indice-de-referencia-del-alquiler' },
		{ texto: 'Cómo calculamos', href: '/como-calculamos' }
	]
} as const;

/** Todo el texto visible del bloque, con el H1 de la cabecera, para contar palabras y revisar el vocabulario */
export function textoMapaVisible(h1: string): string[] {
	const t: string[] = [h1, ...TEXTO_MAPA.respuesta, TEXTO_MAPA.boton];
	for (const s of TEXTO_MAPA.secciones) t.push(s.h2, ...s.parrafos);
	t.push('Preguntas frecuentes');
	for (const f of TEXTO_MAPA.faq) t.push(f.q, f.a);
	t.push(...TEXTO_MAPA.enlaces.map((e) => e.texto));
	return t;
}
