/**
 * Textos del producto. Tono sobrio: cifras con fuente y fecha, sin adjetivos.
 * Reglas (CLAUDE.md): nunca «ilegal» ni «abusivo»; siempre enlace al valor oficial y
 * atribuciones. tests/textos.test.ts lo comprueba sobre todo lo que sale de este módulo.
 */
import type { MotivoSinDato } from '../motor';
import { MINIMO_COMPARACION } from './habitacion';

/** Lema bajo el logotipo (diseño: el nombre manda, el lema acompaña) */
export const LEMA = 'Contratos reales, por zona.';

export const ENLACE_OFICIAL = 'https://serpavi.mivau.gob.es';

export const AVISO_INDEPENDIENTE =
	'Estimación independiente basada en la metodología SERPAVI; el valor oficial está en serpavi.mivau.gob.es.';

export const ATRIBUCIONES = [
	'Origen de los datos: Ministerio de Vivienda y Agenda Urbana',
	'Elaboración propia con datos extraídos del sitio web del INE: www.ine.es',
	'CartoCiudad CC-BY 4.0 scne.es',
	'Barrios: Ayuntamiento de Madrid',
	'© OpenStreetMap contributors'
] as const;

/** Etiqueta de la cifra principal cuando el precio supera la referencia */
export const ETIQUETA_BRECHA = 'Cuánto más te piden';

export const NO_SON_PISOS_DISPONIBLES = 'No son pisos disponibles: son contratos vigentes de cada zona.';

export interface Accion {
	id: 'negociar' | 'comparar' | 'oficial';
	titulo: string;
	detalle: string | null;
}

/** «Qué puedes hacer»: sin consejo jurídico */
export const QUE_PUEDES_HACER: readonly Accion[] = [
	{ id: 'negociar', titulo: 'Negociar con el dato', detalle: 'Un texto listo para enviar con los contratos de la zona' },
	{ id: 'comparar', titulo: 'Comparar con otro anuncio', detalle: null },
	{ id: 'oficial', titulo: 'Consultar el valor oficial', detalle: 'serpavi.mivau.gob.es' }
];

export const PRECIO_PEDIDO =
	'Es el precio que piden, no el que se firma: si se negocia, el precio final puede ser menor.';

export type MotivoPantalla = MotivoSinDato | 'fuera_de_madrid' | 'habitacion';

/** Una pantalla por caso; «superficie» se reparte en dos según el lado del límite */
export type ClaveSinDato =
	| Exclude<MotivoPantalla, 'superficie'>
	| 'superficie_menor'
	| 'superficie_mayor';

export interface TextoSinDato {
	/** En mayúsculas condensadas, de 2 a 4 palabras */
	titular: string;
	frase: string;
	extra: string;
}

/** R5: cada pantalla explica el motivo y enlaza a la app oficial; nunca lleva porcentaje */
export const SIN_DATO: Record<ClaveSinDato, TextoSinDato> = {
	superficie_menor: {
		titular: 'Menos de 30\u00A0m²',
		frase: 'Con menos de 30\u00A0m² hay tan pocos contratos de ese tamaño que la referencia no sería fiable.',
		extra: 'Los estudios y pisos muy pequeños se comportan de otra forma: el precio por metro se dispara y no hay suficientes casos para medirlo bien.'
	},
	superficie_mayor: {
		titular: 'Más de 150\u00A0m²',
		frase: 'A partir de 150\u00A0m² hay tan pocos contratos que cualquier cifra sería un invento.',
		extra: 'Preferimos no darte un dato a darte uno que no se sostiene.'
	},
	obra_nueva: {
		titular: 'Obra nueva',
		frase: 'Es obra nueva y todavía no tiene historial: la referencia se construye con contratos que ya llevan tiempo registrados.',
		extra: 'Las viviendas terminadas en 2022 o después aún no aparecen en los datos con los que se calcula la referencia de 2024.'
	},
	unifamiliar: {
		titular: 'Casa unifamiliar',
		frase: 'La referencia está hecha con pisos. Una casa unifamiliar tiene otro mercado y compararla no sería honesto.',
		extra: 'Jardín, parcela o varias plantas cambian tanto el precio que no hay una referencia comparable.'
	},
	temporal: {
		titular: 'Alquiler temporal',
		frase: 'La referencia solo mide alquileres de larga duración. Los de temporada o media estancia no se registran igual y no hay con qué compararlos.',
		extra: 'Si el anuncio ofrece un contrato de menos de un año, esta herramienta no puede compararlo.'
	},
	testigos: {
		titular: 'Pocos datos aquí',
		frase: 'En esta zona hay muy pocos contratos para dar una referencia fiable.',
		extra: 'Pasa en barrios pequeños, muy nuevos o con pocas viviendas en alquiler. Prueba con una calle cercana si el piso está en el límite de la zona.'
	},
	sin_dato_seccion: {
		titular: 'Sin datos aquí',
		frase: 'SERPAVI no publica referencia para esta zona: no figuran contratos.',
		extra: 'Prueba con una calle cercana si el piso está en el límite de la zona.'
	},
	fuera_de_madrid: {
		titular: 'Fuera de Madrid',
		frase: 'Esta ubicación está fuera del municipio de Madrid y de momento solo cubrimos Madrid.',
		extra: 'Si el piso está en la ciudad, comprueba la dirección o márcalo en el mapa.'
	},
	habitacion: {
		titular: 'Una habitación',
		frase: 'La referencia oficial no incluye habitaciones.',
		extra: 'Si compartes piso con un solo contrato, compara el piso entero; si no, solo podemos comparar con lo que aporten otras personas de tu barrio, cuando haya suficientes.'
	}
};

export const TEXTO_OFICIAL_SIN_DATO = 'Puedes consultar el valor oficial en serpavi.mivau.gob.es.';

/** «← Volver» en las pantallas sin dato abiertas desde «Lo que no calculamos» (/?motivo=…) */
export const VOLVER_LIMITES = { texto: '← Volver', href: '/como-calculamos#lo-que-no-calculamos' } as const;

export interface ContextoAviso {
	/** Secciones candidatas de la ubicación */
	n: number;
	/** Nombre de la calle cuando se buscó sin número */
	calle: string | null;
	/** Portales usados cuando el número no existe */
	usados: string;
	/** true si hay más de una sección con dato y se muestra horquilla */
	horquilla: boolean;
}

const HORQUILLA = ' Por eso te damos una horquilla.';

/** Aviso de ubicación aproximada según cómo se obtuvo la ubicación (el título «Ubicación aproximada.» va aparte) */
export const AVISO_UBICACION = {
	numero_inexistente: (c: ContextoAviso) =>
		`El número indicado no existe en el callejero: hemos usado el portal más cercano (${c.usados}).` + (c.horquilla ? HORQUILLA : ''),
	portal_en_varias_secciones: (c: ContextoAviso) =>
		`Ese portal está en el límite entre ${c.n} zonas con referencias distintas.` +
		(c.horquilla ? HORQUILLA : ' Solo en una hay datos suficientes.'),
	calle: (c: ContextoAviso) =>
		`${c.calle ?? 'Esta calle'}, sin número, cruza ${c.n} zonas con referencias distintas.` +
		(c.horquilla ? HORQUILLA : ' Solo en una hay datos suficientes.'),
	pin: (c: ContextoAviso) =>
		`El punto está a menos de 150\u00A0m de otras ${c.n - 1} zonas con referencias distintas.` +
		(c.horquilla ? HORQUILLA : ' Solo en una hay datos suficientes.')
} as const;

// ——— Marca y pantallas (diseño de 05/10/2026) ———

export const NOMBRE = 'A su precio';
export const DESCRIPCION =
	'Compara tu alquiler, o el de un anuncio en Madrid, con lo que pagan quienes ya viven de alquiler en la zona.';

export const TITULAR_INICIO = ['¿Cuánto pagan', 'los demás?'] as const;
export const SUBTITULAR_INICIO = 'Compara tu alquiler, o el de un anuncio, con lo que pagan quienes ya viven de alquiler en la zona.';

export const ETIQUETA_NIVEL = {
	a: 'Dentro de rango',
	b: 'Algo por encima',
	c: 'Se sale de lo habitual'
} as const;

/** Etiqueta del nivel «dentro» cuando el precio queda por debajo de la parte baja en todas las zonas posibles */
export const ETIQUETA_POR_DEBAJO = 'Por debajo';

export const FRASE_NIVEL = {
	a: 'Entrar aquí sale por lo mismo que estar dentro.',
	b: 'Solo cuadra si el piso es excelente (ascensor, garaje, reforma reciente, piscina o vistas). Si no lo es, pregunta qué lo justifica.',
	c: 'Ni para un piso excelente es habitual pagar esto aquí.'
} as const;

/** Resultado de «Un anuncio»: titulares y avisos del encuadre «entrar frente a estar dentro» */
export const MIRANDO = {
	/** Se sale de lo habitual: la frase y su línea pequeña van solo en el cuadro «Entrar vs. estar dentro» */
	pidenPct: (pct: string, zona: string) => `Piden un ${pct} más por entrar que lo que pagan los contratos actuales ${zona}`,
	pidenPctRango: (desde: string, hasta: string, zona: string) => `Piden entre un ${desde} y un ${hasta} más por entrar que lo que pagan los contratos actuales ${zona}`,
	pidenVeces: (veces: string, zona: string) => `Piden ${veces} el tramo alto de los contratos actuales ${zona}`,
	pidenVecesRango: (desde: string, hasta: string, zona: string) => `Piden entre ${desde} y ${hasta} veces el tramo alto de los contratos actuales ${zona}`,
	encuadre: (m2: string) => `frente al tramo alto de esos contratos, ajustado a ${m2}`,
	/** Franja habitual (la lleva la tarjeta) */
	habitual: (rango: string) => `Lo habitual aquí: ${rango}.`,
	/** Algo por encima: hasta ~3 % solo el titular; más, una línea con el % y la frase del piso excelente */
	limiteAlto: 'En el límite alto de lo habitual aquí.',
	algoPorEncima: (pct: string) => `Un ${pct} por encima de lo habitual aquí.`,
	algoPorEncimaHorquilla: 'Algo por encima de lo habitual aquí.',
	/** Dentro de rango y por debajo */
	dentro: 'Entrar aquí sale por lo mismo que estar dentro.',
	porDebajo: 'Entrar aquí sale más barato que estar dentro.',
	/** Nota bajo la cifra grande (ya no la usa «se sale de lo habitual») */
	notaCifra: (complemento: string, m2: string, varias: boolean) =>
		`${complemento} de lo habitual ${varias ? 'en estas zonas' : 'aquí'} (${m2})`,
	notaDentro: (inf: string, sup: string, m2: string, varias: boolean) =>
		`Lo habitual ${varias ? 'en estas zonas' : 'aquí'} para ${m2}: de ${inf} a ${sup} al mes.`,
	/** Aviso fijo junto a la cifra */
	aviso: 'Se compara con contratos vigentes, algunos de hace años. Por eso un anuncio suele salir por encima.'
} as const;

/** Línea de fuente de los dos modos; el mes sale del dato del IPC */
export const FUENTE = {
	una: (n: string, mes: string) =>
		`Basado en ${n} contratos vigentes en la zona, de propietarios particulares declarados a Hacienda (2024), ajustados por el IPC del alquiler hasta ${mes}. No incluye empresas ni fondos.`,
	varias: (n: string, zonas: string, mes: string) =>
		`Basado en ${n} contratos vigentes en ${zonas}, de propietarios particulares declarados a Hacienda (2024), ajustados por el IPC del alquiler hasta ${mes}. No incluye empresas ni fondos.`
} as const;

export const ETIQUETA_SIN_REFERENCIA = 'Sin referencia para este caso';
export const BOTON_OFICIAL = 'Consultar el sistema oficial';
export const BOTON_OTRO_PISO = { mirando: 'Comprobar otro anuncio', vivo: 'Comprobar otro alquiler' } as const;
export const BOTON_COMPARTIR = 'Compartir el resultado';

export const FORMULARIO = {
	titulo: 'Comprueba un anuncio',
	dondeEsta: '¿Dónde está el piso?',
	modos: { calle: 'Calle', mapa: 'En el mapa' },
	calle: {
		etiqueta: 'Calle',
		placeholder: 'Nombre de la calle o código postal',
		ayuda: 'Con el número sale una sola cifra.',
		numero: 'Nº',
		numeroEtiqueta: 'Número del portal (opcional)',
		numeroPlaceholder: 'Ej. 12',
		numeroInvalido: 'Escribe solo el número del portal, por ejemplo 12 o 12 bis.',
		sinCalle: 'Escribe el nombre de la calle.',
		quitar: (calle: string) => `Quitar ${calle}`,
		fijada: (calle: string) => `Calle elegida: ${calle}`,
		/** Línea de confirmación bajo los campos */
		entera: 'Calle entera: te daremos una horquilla.',
		portal: (calle: string, n: string, barrio: string, cp: string) => `${calle} ${n} · ${barrio} · ${cp}`,
		portalAprox: (calle: string, n: string, cercano: string, barrio: string, cp: string) =>
			`${calle} ${n}: no tiene ese número; usamos el ${cercano} (aproximado) · ${barrio} · ${cp}`,
		calleBarrio: (calle: string, barrio: string, cp: string) => `${calle} · ${barrio} · ${cp}`
	},
	precio: 'Precio al mes',
	superficie: 'Metros construidos',
	obraNueva: '¿Es obra nueva, de 2022 o después?',
	largaDuracion: '¿Es alquiler de larga duración?',
	tipo: '¿Piso o casa?',
	comprobar: 'Comprobar el precio',
	comprobarOtro: 'Comprobar otro anuncio',
	buscando: 'Buscando la dirección…',
	habitacion: '¿Es una habitación?'
} as const;

export const MAPA = {
	instruccion: 'Toca el punto del mapa donde está el piso. Las coordenadas no salen de tu dispositivo.',
	sinPunto: 'Todavía no has marcado ningún punto.',
	fuera: 'Ese punto está fuera del municipio de Madrid.',
	atribucion: '© OpenStreetMap contributors'
} as const;

/** «Mi alquiler»: formulario y resultado del inquilino (Fase 1) */
export const SITUACION = {
	etiqueta: 'Tu situación',
	mirando: 'Un anuncio',
	vivo: 'Mi alquiler'
} as const;

export const FORMULARIO_VIVO = {
	titulo: 'Comprueba tu alquiler',
	dondeEsta: '¿Dónde vives?',
	dondeEstaHabitacion: '¿Dónde está tu habitación?',
	precio: 'Lo que pagas al mes',
	precioHabitacion: 'Lo que pagas por tu habitación',
	firma: '¿Cuándo firmaste el contrato?',
	reciente: 'Hace menos de un año',
	mes: 'Mes',
	ano: 'Año',
	rentaFirma: '¿Cuánto pagabas al firmar?',
	opcional: '(opcional)',
	rentaFirmaPlaceholder: 'Si ha cambiado desde entonces',
	rentaFirmaAyuda: 'Sirve para ver cuánto ha cambiado tu renta. Déjalo vacío si no te acuerdas.',
	comprobar: 'Comprobar mi alquiler',
	comprobarOtro: 'Comprobar otro alquiler',
	errorFirma: 'Elige el mes y el año de la firma, o marca «Hace menos de un año».',
	errorRentaFirma: 'Escribe lo que pagabas al mes, o déjalo vacío.'
} as const;

export const UBICACION_ACTUAL = {
	boton: 'Usar mi ubicación',
	privacidad: 'Tu ubicación se usa solo en tu navegador; no se envía ni se guarda.',
	pidiendo: 'Pidiendo tu ubicación…',
	activa: (barrio: string, m: number) => `Mi ubicación · ${barrio} (±${m}\u00A0m)`,
	quitar: 'Quitar mi ubicación',
	denegado: 'No tenemos permiso para usar tu ubicación. Puedes escribir la dirección o marcarla en el mapa.',
	tiempo: 'No hemos podido obtener tu ubicación a tiempo. Puedes escribir la dirección o marcarla en el mapa.',
	sinGps: 'Este navegador no puede darnos tu ubicación. Puedes escribir la dirección o marcarla en el mapa.',
	fuera: 'Tu ubicación queda fuera del municipio de Madrid. Escribe la dirección o márcala en el mapa.',
	baja: (m: number) => `La ubicación es poco precisa (±${m}\u00A0m).`,
	bajaEscribir: 'Escribir la dirección',
	bajaMapa: 'Colocar en el mapa',
	bajaIgualmente: 'Usarla igualmente: te daremos una horquilla'
} as const;

export const MUESTRA = {
	titulo: 'Así se ve un resultado',
	ejemplo: 'Ejemplo',
	nota: 'Es un ejemplo con datos de una zona real. Al comprobar, tu resultado sustituye a este.'
} as const;

export const TIPO_VIVIENDA = {
	etiqueta: 'Tipo de vivienda',
	piso: 'Piso',
	habitacion: 'Habitación',
	casa: 'Casa'
} as const;

export const COMPARTIDO = {
	enlace: '¿Compartes piso con un solo contrato?',
	ayuda: 'Pon lo que paga el piso entero entre todos y los metros del piso.',
	somos: 'Personas en el contrato',
	opcional: '(opcional)',
	tuParte: 'Tu parte:',
	alMes: 'al mes',
	aviso: 'Solo se muestra en tu pantalla. Comparamos el piso entero; tu parte no se guarda ni se envía.'
} as const;

export const RESUMEN_FORMULARIO = {
	largaDuracion: 'Larga duración',
	temporal: 'No es de larga duración',
	obraNueva: 'obra nueva',
	noObraNueva: 'no obra nueva',
	cambiar: 'cambiar',
	listo: 'listo'
} as const;

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'] as const;

export const INQUILINO = {
	editar: 'Editar los datos',
	pagas: (precio: string, m2: string, contrato: string) => `Lo que pagas: ${precio}/mes · ${m2} · ${contrato}`,
	contratoDe: (ano: number) => `Contrato de ${ano}`,
	contratoReciente: 'Contrato de hace menos de un año',
	etiqueta: {
		debajo: 'Por debajo',
		dentro: 'Dentro de rango',
		encimab: 'Algo por encima',
		encima: 'Se sale de lo habitual'
	},
	titular: { debajo: 'Por debajo', baja: 'Parte baja', media: 'Parte media', alta: 'Parte alta', encimab: 'Algo por encima' },
	notaDebajo: (m2: string, varias = false) => `Tu renta queda por debajo de lo habitual para ${m2} en ${varias ? 'estas zonas' : 'esta zona'}.`,
	notaDentro: (inf: string, sup: string, m2: string, varias = false) =>
		`Lo habitual para ${m2} en ${varias ? 'estas zonas' : 'esta zona'}: de ${inf} a ${sup} al mes.`,
	notaEncimab: (pct: string) => `${pct} sobre lo más alto habitual en tu zona. Cuadraría si fuera un piso excelente.`,
	frase: {
		debajo: 'Pagas menos de lo que paga la gente de tu zona.',
		baja: 'Pagas como la parte baja de los contratos vigentes de tu zona.',
		media: 'Pagas lo habitual en tu zona.',
		alta: 'Estás en la parte alta de lo que paga la gente de tu zona, aún dentro de rango.',
		encimab:
			'Tu alquiler supera la parte alta de lo habitual en tu zona. Solo cuadra si fuera un piso excelente: depende de cómo sea el tuyo.',
		encima: 'Tu renta supera lo que paga la gente de tu zona, incluso si fuera un piso excelente.'
	},
	alMes: 'Al mes, sobre lo más alto habitual',
	alAno: 'Al año',
	contrato: {
		texto: ': la referencia mezcla contratos de distintas fechas.',
		detalle: 'Los contratos más antiguos suelen tener rentas más bajas.',
		cambio: (antes: string, pct: string) => `Al firmar pagabas ${antes}. Desde entonces, ${pct}.`,
		sinCambio: (antes: string) => `Al firmar pagabas ${antes}. Desde entonces, sin cambios.`
	},
	aportar: {
		titulo: 'Aporta tu alquiler a las estadísticas de tu barrio',
		texto: (barrio: string) => `Con rentas reales de vecinos se ve mejor lo que pagan hoy en ${barrio}, no solo lo que se declaró.`,
		/** Todo lo que se guarda: la renta al firmar solo si se ha escrito; sin mes si el contrato es de hace menos de un año */
		seGuarda: (conMes: boolean, conRentaFirma: boolean) =>
			`barrio, renta, metros, ${conMes ? 'mes y año de firma' : 'año de firma'}${conRentaFirma ? ' y lo que pagabas al firmar' : ''}.`,
		noSeGuarda: 'dirección, ubicación, nombre, correo ni IP.',
		tusDatos: 'Tus datos',
		boton: 'Aportar mi alquiler',
		enviando: 'Enviando…',
		nota: 'Es opcional. Si no pulsas, no se envía nada.',
		error: 'No hemos podido enviar tu alquiler. Inténtalo de nuevo.',
		limite: 'Hoy ya se han enviado muchas aportaciones desde esta conexión. Vuelve a intentarlo mañana.'
	},
	aportado: {
		etiqueta: 'Alquiler aportado',
		gracias: 'Gracias.',
		muchos: (barrio: string) => `alquileres aportados en ${barrio}`,
		pocos: (barrio: string) => `Todavía no hay 10 aportaciones en ${barrio} para ver la mediana.`,
		detalleMuchos: 'Tu renta ya cuenta en la mediana del barrio, sin tu nombre ni tu dirección.',
		detallePocos: 'Con 10 aportaciones mostraremos la mediana del barrio. Hasta entonces, nadie ve las rentas por separado.'
	},
	compartir: 'Compartir mi resultado',
	acciones: { titulo: 'Siguientes pasos', oficial: 'Consultar el valor oficial', mirando: 'Comprobar un anuncio' },
	servido: '¿Te ha servido?'
} as const;

/**
 * «Lo que se pide»: los anuncios recientes del Ayuntamiento junto a los contratos vigentes (solo con la flag de la
 * oferta encendida). Sin %, un número por frase, nunca la diferencia entre las dos referencias y sin el nombre del
 * barrio: el nivel (barrio o distrito) va siempre en la etiqueta. «Anuncios recientes» es solo esta serie.
 */
export const OFERTA = {
	/** Atribución de la serie; el mes lo pone quien construye el texto. Va en un párrafo propio, aparte de la de los contratos */
	fuente: (mes: string) =>
		`Anuncios recientes: Ayuntamiento de Madrid, Banco de Datos, serie 4.3.21.D (elaboración del Ayuntamiento a partir de datos de Idealista), ${mes}.`,
	/** Encabezado de la fuente de los contratos cuando la pantalla lleva también la de los anuncios (va delante de «Basado en N contratos…») */
	contratos: 'Contratos: SERPAVI (Ministerio de Vivienda), 2024.',
	/** Pie de la línea: de qué es media y de qué mes */
	pie: (nivel: 'barrio' | 'distrito', mes: string) => `Media del ${nivel}, ${mes}.`,
	/**
	 * «Un anuncio»: el bloque de oferta habla solo de la oferta, en una línea con la cifra. El titular, la píldora y el
	 * veredicto sobre los contratos los dice solo la parte de contratos. «Dentro» y «por debajo» solo informan.
	 */
	mirando: {
		dentro: (nivel: 'barrio' | 'distrito', x: string) => `Anuncios recientes en el ${nivel}: ≈${x}.`,
		debajo: (nivel: 'barrio' | 'distrito', x: string) => `Anuncios recientes en el ${nivel}: ≈${x}.`,
		encima_en_linea: (nivel: 'barrio' | 'distrito', x: string) => `En línea con los anuncios recientes del ${nivel} (≈${x}).`,
		encima_bajo_oferta: (nivel: 'barrio' | 'distrito', x: string) => `Por debajo de los anuncios recientes del ${nivel} (≈${x}).`,
		encima_ambas: (nivel: 'barrio' | 'distrito', x: string) => `También por encima de los anuncios recientes del ${nivel} (≈${x}).`
	},
	/** «Mi alquiler»: la misma línea en los cinco casos, sin veredicto */
	vivo: {
		linea: (nivel: 'barrio' | 'distrito', x: string) => `Si buscaras en el ${nivel}, los anuncios recientes rondan ${x} para tu piso.`
	},
	/** Tarjetas de compartir: sin la línea de oferta, pero con el titular explícito (para no parecer el veredicto completo) */
	tarjeta: {
		frente: 'frente a los contratos vigentes de la zona',
		nota: {
			a: (barrio: string) => `frente a los contratos vigentes de la zona, en ${barrio}`,
			b: (barrio: string) => `frente a los contratos vigentes de la zona, en ${barrio}`,
			c: (barrio: string, aproximada: boolean, complemento = 'sobre la parte alta') =>
				`${complemento} de los contratos vigentes de la zona, en ${barrio}` + (aproximada ? '. Ubicación aproximada.' : '')
		},
		habitual: (rango: string) => `Contratos vigentes de la zona: ${rango}.`,
		og: (barrio: string | null) => `Un piso en ${barrio ?? 'Madrid'}: lo que piden frente a los contratos vigentes de la zona.`,
		inquilino: {
			debajo: 'frente a los contratos vigentes de la zona',
			dentro: 'frente a los contratos vigentes de la zona',
			limite: 'frente a los contratos vigentes de la zona',
			encima: 'sobre la parte alta de los contratos vigentes de la zona',
			veces: 'la parte alta de los contratos vigentes de la zona'
		},
		ogInquilino: {
			debajo: (barrio: string) => `frente a los contratos vigentes de la zona, en ${barrio}`,
			dentro: (barrio: string) => `frente a los contratos vigentes de la zona, en ${barrio}`,
			encimab: (barrio: string) => `sobre la parte alta de los contratos vigentes de la zona, en ${barrio}`,
			encima: (barrio: string) => `sobre la parte alta de los contratos vigentes de la zona, en ${barrio}`
		}
	}
} as const;

/**
 * Textos de nivel de «Un anuncio» cuando el bloque de «Lo que se pide» lleva veredicto (el precio supera los contratos y la
 * flag está encendida). «Aquí» se vuelve «en los contratos de la zona»: la pantalla ya habla de dos referencias y el nivel
 * es solo el de los contratos. Con la flag apagada, o dentro y por debajo de contratos, valen los de siempre (MIRANDO, FRASE_NIVEL).
 */
export const NIVEL_CONTRATOS = {
	/** Se sale de lo habitual: la frase bajo la cifra */
	c: 'Ni para un piso excelente es habitual pagar esto en los contratos de la zona.',
	/** Algo por encima: el matiz (con la cifra o el límite alto delante) */
	b: 'Frente a los contratos, solo cuadra si el piso es excelente (ascensor, garaje, reforma reciente, piscina o vistas). Si no lo es, pregunta qué lo justifica.',
	limiteAlto: 'En el límite alto de los contratos de la zona.',
	algoPorEncima: (pct: string) => `Un ${pct} por encima de los contratos de la zona.`,
	algoPorEncimaHorquilla: 'Algo por encima de los contratos de la zona.',
	/** Título largo de la pantalla (`PantallaResultado.titular`) */
	titular: {
		b: 'Algo por encima de lo habitual: frente a los contratos, solo cuadra si el piso es excelente',
		c: 'Se sale de lo habitual: ni para un piso excelente es habitual pagar esto en los contratos de la zona'
	},
	/** Tarjeta compartible */
	tarjeta: {
		b: 'Entrar aquí sale más caro que estar dentro. Frente a los contratos, solo cuadra si el piso es excelente.',
		c: 'Ni para un piso excelente es habitual pagar esto en los contratos de la zona.'
	},
	/** «Negociar con el dato»: sin «hoy se pide más por entrar» (los anuncios recientes pueden estar al mismo nivel) */
	negociar: {
		tu: '¿Me podrías decir qué explica la diferencia, o si hay margen en el precio?',
		usted: '¿Podría indicarme qué explica la diferencia, o si hay margen en el precio?'
	}
} as const;

/** Habitaciones (F1): sin referencia oficial, sin nivel ni veredicto */
export const HABITACION = {
	insignia: 'Habitaciones: datos aportados por vecinos',
	intro: 'La referencia oficial no cubre habitaciones, así que no te damos nivel ni veredicto. Solo comparamos con lo que aportan otras personas de tu barrio.',
	tuHabitacion: 'Tu habitación',
	/** «Un anuncio»: no es tuya */
	laHabitacion: 'La habitación',
	/** Estado vacío al mirar: ofrece pasar a «Mi alquiler» con los datos prellenados */
	ofrecerVivo: '¿Vives en una habitación? Aporta la tuya',
	otras: (barrio: string) => `Otras habitaciones en ${barrio}`,
	alMes: (gastos: boolean) => `al mes, ${gastos ? 'con' : 'sin'} gastos`,
	mediana: (n: number) => `mediana, ${n} aportaciones`,
	mismoGastos: (gastos: boolean) =>
		`Solo cuentan habitaciones que también ${gastos ? 'incluyen' : 'no incluyen'} gastos. La mediana deja la mitad de las aportaciones por encima y la mitad por debajo.`,
	pocas: (barrio: string, n: number) => `Aún no hay suficientes habitaciones en ${barrio} (${n} de ${MINIMO_COMPARACION}). Aporta la tuya y suma.`,
	pocasMirando: (barrio: string, n: number) => `Aún no hay suficientes habitaciones en ${barrio} (${n} de ${MINIMO_COMPARACION}) para comparar.`,
	cargando: 'Buscando habitaciones aportadas en tu barrio…',
	sinConexion: 'No hemos podido consultar las habitaciones del barrio. Inténtalo de nuevo más tarde.',
	aportar: {
		titulo: 'Aporta tu habitación a las estadísticas de tu barrio',
		seGuarda: 'barrio, renta, habitaciones del piso, tamaño aproximado, si incluye gastos y el mes.',
		noSeGuarda: 'dirección, ubicación, nombre, correo ni IP.',
		boton: 'Aportar mi habitación',
		nota: 'Es opcional. Si no pulsas, no se envía nada.'
	},
	aportada: {
		etiqueta: 'Habitación aportada',
		faltan: (n: number) => `Gracias. Faltan ${n} para ver tu barrio.`,
		hay: (n: number, barrio: string) => `Gracias. ${n} aportaciones en ${barrio}.`,
		detalle: `Nadie ve las rentas por separado: solo la mediana, y solo desde ${MINIMO_COMPARACION} aportaciones.`
	},
	acciones: {
		titulo: 'Siguientes pasos',
		compartis: '¿Compartes piso con un solo contrato?',
		compartisDetalle: 'Compara el piso entero con la referencia oficial',
		porQue: 'Por qué no hay referencia para habitaciones',
		suma: 'Suma las habitaciones del piso',
		sumaDetalle: 'Compara la suma con la referencia del piso entero'
	},
	suma: {
		titulo: 'Suma de las habitaciones del piso',
		intro: 'Escribe lo que cuesta cada habitación (con la tuya prellenada) y el tamaño del piso. Lo comparamos con la referencia del piso entero. Todo se calcula en tu navegador y no se guarda nada.',
		habitacion: (n: number) => `Habitación ${n}`,
		metros: 'Metros del piso',
		metrosAyuda: 'Entre 30 y 150\u00A0m².',
		tramo: (texto: string, a: number, b: number) => `Tamaño del piso: ${texto}. Calculamos con sus dos extremos: ${a} y ${b}\u00A0m².`,
		calcular: 'Calcular la suma',
		errorPrecio: 'Escribe lo que cuesta cada habitación, en €/mes.',
		errorMetros: 'Escribe los metros del piso, entre 30 y 150.',
		sinDato: 'No hay referencia suficiente para el piso entero en esta zona, así que no podemos calcular la comparación.',
		suma: 'Suma de las habitaciones',
		referencia: (m: number) => `Referencia del piso entero para ${m}\u00A0m²`,
		rango: (inf: string, sup: string) => `${inf} a ${sup} al mes`,
		encima: (n: string) => `La suma queda ${n} al mes por encima de la parte alta.`,
		debajo: (n: string) => `La suma queda ${n} al mes por debajo de la parte baja.`,
		dentro: 'La suma queda dentro del rango.',
		aclaracionesTitulo: 'Para leerlo bien',
		aclaraciones: [
			'Gastos: la referencia es del alquiler del piso. Si las habitaciones incluyen gastos (luz, agua, internet), la suma incluye algo que la referencia no cuenta.',
			'Amueblado: la referencia no recoge si el piso está amueblado, y las habitaciones suelen alquilarse con muebles.',
			'Contratos más recientes: las habitaciones que se alquilan hoy son contratos recientes, y la referencia mezcla contratos de distintas fechas.',
			'La referencia oficial no cubre habitaciones: esto es una comparación orientativa, no un nivel ni un veredicto.'
		]
	},
	pie: 'Habitaciones: datos aportados por personas usuarias, sin verificar. No es una referencia oficial.'
} as const;

/** Autocompletado de la dirección */
export const AUTOCOMPLETAR = {
	lista: 'Sugerencias de calles',
	vacio: { titulo: 'No encontramos esa calle.', texto: 'Prueba con otro nombre o ubica el piso en el mapa.' },
	zona: { barrio: 'barrio', distrito: 'distrito', pista: 'elige una calle o toca el mapa' },
	con: {
		barrioCp: (barrio: string, cp: string) => (barrio && cp ? `${barrio} · ${cp}` : barrio || cp),
		sinPortal: (n: string, cercano: string) => `sin nº ${n}; el más cercano es el ${cercano} (aproximado)`
	},
	anuncio: {
		vias: (n: number) => (n === 1 ? '1 sugerencia' : `${n} sugerencias`),
		zonas: (n: number) => (n === 1 ? 'Sin calles que coincidan: 1 barrio o distrito' : `Sin calles que coincidan: ${n} barrios o distritos`),
		nada: 'Sin resultados. Prueba con otro nombre o con el mapa.',
		uso: 'Usa las flechas para moverte y Intro para elegir.'
	}
} as const;

export const ERRORES = {
	noEncontrada: {
		titulo: 'No encontramos esa dirección en Madrid.',
		texto: 'Puede que esté escrita de otra forma.',
		queriasDecir: '¿Querías decir…?',
		otraForma: 'O ubícalo de otra forma',
		enMapa: 'En el mapa'
	},
	demasiadas: {
		titulo: 'Demasiadas búsquedas.',
		texto: 'Espera un momento. Mientras tanto, puedes ubicarlo de otra forma.'
	},
	pedirNumero: (calle: string, n: number) => ({
		titulo: `${calle} cruza ${n} zonas con referencias distintas.`,
		texto: 'Escribe el número del portal o márcalo en el mapa.',
		escribirNumero: 'Escribir el número'
	}),
	sinConexion: {
		titulo: 'Sin conexión',
		frase: 'Se ha cortado la conexión mientras buscábamos la dirección.',
		texto: 'Tus datos siguen aquí: no tienes que volver a escribirlos.',
		reintentar: 'Reintentar',
		editar: 'Editar los datos'
	}
} as const;

export const AVISO_APROXIMADA_TITULO = 'Ubicación aproximada.';
export const AFINAR = {
	etiqueta: 'Añade el número para afinar',
	placeholder: 'Número del portal',
	boton: 'Afinar',
	afinando: 'Afinando…',
	invalido: 'Escribe solo el número del portal, por ejemplo 14.',
	noEncontrado: (numero: string, via: string) => `No encontramos el número ${numero} en ${via}. Prueba con otro.`,
	demasiadas: 'Demasiadas búsquedas. Espera un momento.',
	fallo: 'No hemos podido afinar el resultado. Inténtalo de nuevo.'
} as const;

/** «¿Qué vas a hacer con este resultado?»: sustituye a «¿Te ha servido?». Los valores son las categorías de analítica. */
export type RespuestaQueHaras = 'negociar' | 'descartar' | 'seguir' | 'curiosidad' | 'hablar_casero' | 'asesoramiento' | 'nada';
export const QUE_HARAS = {
	pregunta: '¿Qué vas a hacer con este resultado?',
	opcional: 'Opcional',
	gracias: 'Gracias por contestar.',
	mirando: [
		{ valor: 'negociar', etiqueta: 'Intentar negociar el precio' },
		{ valor: 'descartar', etiqueta: 'Descartar este piso' },
		{ valor: 'seguir', etiqueta: 'Seguir adelante igual' },
		{ valor: 'curiosidad', etiqueta: 'Nada, solo tenía curiosidad' }
	],
	vivo: [
		{ valor: 'hablar_casero', etiqueta: 'Hablar con mi casero' },
		{ valor: 'asesoramiento', etiqueta: 'Pedir asesoramiento a un profesional o a una organización' },
		{ valor: 'nada', etiqueta: 'Nada por ahora' },
		{ valor: 'curiosidad', etiqueta: 'Nada, solo tenía curiosidad' }
	]
} as const satisfies Record<string, unknown>;

/** Enlace junto al resultado: solo un mailto, sin evento ni datos del anuncio */
export const ALGO_NO_CUADRA = { texto: '¿Algo no cuadra? Escríbenos', correo: 'hola@asuprecio.com' } as const;

export const EQUIVALENCIA = {
	titulo: 'Entrar vs. estar dentro',
	alMes: 'Al mes',
	alAño: 'Al año',
	bloques: '12 meses de alquiler'
} as const;

export const SESION = {
	titulo: 'Comprobados en esta sesión',
	nota: 'Solo en este navegador. Se borran al cerrar la pestaña.'
} as const;

export const NEGOCIAR = {
	titulo: 'Negociar con el dato',
	intro: 'Copia el texto y envíalo tú por donde prefieras. Esta web no envía nada ni guarda tu mensaje.',
	tratamiento: 'Tratamiento',
	tu: 'Tú',
	usted: 'Usted',
	etiquetaMensaje: 'Tu mensaje (puedes editarlo)',
	copiar: 'Copiar el texto',
	copiado: 'Texto copiado',
	nota: 'El dato es una referencia estadística, no una obligación. Úsalo para preguntar, no para exigir.',
	volver: 'Volver al resultado'
} as const;

export const TARJETA = {
	titulo: 'Tu tarjeta para compartir',
	ampliar: 'Ver en grande',
	ampliadaTitulo: 'Tu tarjeta, en grande',
	cerrar: 'Cerrar',
	detalle: 'Sin dirección ni el precio que piden. Solo el barrio, la cifra, lo habitual aquí y la fuente.',
	pie: 'Estimación independiente. Origen de los datos: Ministerio de Vivienda y Agenda Urbana. Elaboración propia con datos extraídos del sitio web del INE: www.ine.es',
	/** Dentro de la imagen: las capturas viajan sin enlace */
	dominio: 'asuprecio.com',
	generando: 'Preparando la tarjeta…',
	compartirTitulo: 'Mira mi resultado',
	descargada: 'Tarjeta descargada.',
	enlaceCopiado: 'Enlace copiado.',
	canales: { whatsapp: 'WhatsApp', x: 'X', copiar: 'Copiar enlace', descarga: 'Descargar imagen' },
	canalesAviso:
		'Al elegir WhatsApp, X o copiar el enlace se guarda la tarjeta (sin precio ni dirección) para que el enlace funcione. En WhatsApp la imagen sale como vista previa del enlace; si prefieres adjuntarla tú, descárgala.',
	descargaHecha: 'Imagen descargada. No se ha guardado nada.',
	error: 'No hemos podido preparar la tarjeta. Inténtalo de nuevo.'
} as const;

/** Tarjeta del inquilino (F1e): tres o cuatro textos por posición (dos en «por encima»); la persona elige uno. Nunca lleva la renta. */
export const TARJETA_INQUILINO = {
	// Textos por tramo (umbrales de presentación en resultado/inquilino.ts, el motor no cambia). El primero de cada
	// tramo es el que sale elegido por defecto; el último, el mismo en todos
	textos: {
		debajo: ['Pago menos que lo habitual en mi zona. ¿Y\u00A0tú?', '¿Y\u00A0tú? Compruébalo con el tuyo.'],
		dentro: ['Pago lo habitual en mi zona. ¿Y\u00A0tú?', '¿Y\u00A0tú? Compruébalo con el tuyo.'],
		limite: ['Estoy en el límite alto de mi zona. ¿Y\u00A0tú?', '¿Y\u00A0tú? Compruébalo con el tuyo.'],
		// El primero (null) se escribe con el %
		encima: [
			null,
			'La mayoría de mi zona paga menos que yo. ¿Y\u00A0tú?',
			'Mi alquiler se sale de lo habitual en mi zona. Mira el tuyo.',
			'¿Y\u00A0tú? Compruébalo con el tuyo.'
		],
		// El primero (null) se escribe con las veces
		doble: ['Pago el doble de lo habitual en mi zona', '¿Y\u00A0tú? Compruébalo con el tuyo.'],
		veces: [null, '¿Y\u00A0tú? Compruébalo con el tuyo.']
	},
	/** Texto factual de «por encima»: el %; con horquilla, «al menos» (el ratio menor) */
	encimaCifra: (pct: string, alMenos = false) => `Pago ${alMenos ? 'al menos ' : ''}un ${pct} más que lo habitual en mi zona. ¿Y\u00A0tú?`,
	encimaVeces: (veces: string, alMenos = false) => `Pago ${alMenos ? 'al menos ' : ''}${veces} lo habitual en mi zona`,
	/** Titular corto de «límite alto» (sin cifra grande) */
	tituloLimite: 'Límite alto',
	/** Línea bajo la cifra o el titular */
	nota: {
		debajo: 'de lo que paga la gente de mi zona',
		dentro: 'de lo que paga la gente de mi zona',
		limite: 'de lo habitual en mi zona',
		encima: 'sobre lo más alto habitual en mi zona',
		veces: 'lo más alto habitual en mi zona'
	},
	/** Vista previa del enlace: en tercera persona */
	notaOg: {
		debajo: (barrio: string) => `de lo que paga la gente de su zona en ${barrio}`,
		dentro: (barrio: string) => `de lo que paga la gente de su zona en ${barrio}`,
		encimab: (barrio: string) => `sobre lo más alto habitual en ${barrio}`,
		encima: (barrio: string) => `sobre lo más alto habitual en ${barrio}`
	},
	miAlquilerEn: (barrio: string) => `Mi alquiler en ${barrio}`,
	cta: 'Comprueba tu alquiler',
	titulo: 'Tu tarjeta para compartir',
	detalle: 'Sin tu renta ni tu dirección. Solo la posición y el barrio.',
	elige: 'Elige el texto de la tarjeta'
} as const;

export const PAGINA_TARJETA = {
	intro: (barrio: string | null) =>
		barrio
			? `Alguien ha comprobado un piso en ${barrio} y te ha enviado su resultado.`
			: 'Alguien ha comprobado un piso en Madrid y te ha enviado su resultado.',
	introInquilino: (barrio: string | null) =>
		`Alguien ha comprobado su alquiler en ${barrio ?? 'Madrid'} y te ha enviado su resultado.`,
	explicacionInquilino:
		'Esta herramienta compara un alquiler de Madrid con lo que pagan quienes ya viven de alquiler en la zona: contratos vigentes declarados a Hacienda (2024, datos del Ministerio de Vivienda), ajustados por el IPC del alquiler.',
	notaInquilino: 'La tarjeta no incluye la dirección ni la renta.',
	titular: '¿Y el tuyo?',
	explicacion:
		'Esta herramienta compara lo que piden en un anuncio de alquiler en Madrid con lo que pagan quienes ya viven de alquiler en la zona: contratos vigentes declarados a Hacienda (2024, datos del Ministerio de Vivienda), ajustados por el IPC del alquiler.',
	boton: 'Comprueba tu piso',
	nota: 'La tarjeta no incluye la dirección ni el precio exacto del anuncio.',
	noExiste: { titulo: 'Esta tarjeta no existe', texto: 'Puede que el enlace esté incompleto o que ya no esté disponible.' }
} as const;

/** Contadores de uso: reales o no se muestran; por barrio, solo desde 10 */
export const UMBRAL_CONTADOR_BARRIO = 10;
export const CONTADOR_BARRIO = 'personas han comprobado pisos en este barrio.';

export const NAVEGACION = { inicio: 'Inicio', otroPiso: { mirando: 'Otro anuncio', vivo: 'Otro alquiler' }, madrid: 'Madrid', mapa: 'Mapa' } as const;

/** Frases de la tarjeta compartible (más cortas que las de la pantalla) */
export const FRASE_TARJETA = {
	a: 'Entrar aquí sale por lo mismo que estar dentro.',
	b: 'Entrar aquí sale más caro que estar dentro. Solo cuadra si el piso es excelente.',
	c: 'Ni para un piso excelente es habitual pagar esto aquí.'
} as const;

/** «Algo por encima» hasta ~3 %: en el límite alto */
export const FRASE_TARJETA_LIMITE = 'Entrar aquí sale un poco más caro que estar dentro.';
/** «Por debajo»: la tarjeta de «dentro» con el precio bajo la parte baja */
export const FRASE_TARJETA_POR_DEBAJO = 'Entrar aquí sale más barato que estar dentro.';

export const NOTA_TARJETA = {
	a: (barrio: string) => `de lo habitual en ${barrio}`,
	b: (barrio: string) => `de lo habitual en ${barrio}`,
	/** `complemento` es «sobre la parte alta» o «la parte alta», según la cifra vaya en % o en veces */
	c: (barrio: string, aproximada: boolean, complemento = 'sobre la parte alta') =>
		`${complemento} de lo habitual en ${barrio}` + (aproximada ? '. Ubicación aproximada.' : '')
} as const;

/** Vista previa del enlace (1200×630) */
export const ETIQUETA_OG = { a: 'Dentro de rango', b: 'Algo por encima', c: 'Se sale de lo habitual' } as const;
export const OG = {
	titular: (barrio: string | null) => `Un piso en ${barrio ?? 'Madrid'}: lo que piden frente a lo que pagan quienes ya viven allí.`,
	notaCifra: (enVeces: boolean) => `${enVeces ? 'la' : 'sobre la'} parte alta de lo habitual`,
	cta: 'Comprueba tu piso'
} as const;

/** Etiqueta corta de una fila del historial de la sesión */
export const ETIQUETA_HISTORIAL = { a: 'Dentro', b: 'Algo por encima', sinDato: 'Sin dato' } as const;

// ——— «¿Cuánto pagas tú?» (R11) ———

/** Casilla de consentimiento del registro anónimo de análisis (R7), bajo el resultado */
/** Aviso antes del resultado cuando el precio supera `UMBRAL_ERROR_TECLEO` veces la parte alta */
export const CONFIRMAR_PRECIO = {
	titulo: (veces: number) => `¿Seguro? Es más de ${veces} veces la parte alta de lo habitual aquí`,
	texto: 'Por si ha sido un error al teclear. Si es correcto, te mostramos el resultado.',
	escrito: (precio: string, m2: string) => `Has escrito ${precio} al mes para ${m2}.`,
	corregir: 'Corregir',
	confirmar: 'Sí, es correcto'
} as const;

export const REGISTRO = {
	casilla: 'Suma este piso a las estadísticas de tu barrio (anónimo)',
	enlace: 'Tus datos',
	sumado: 'Sumado, gracias. Es anónimo, así que no podemos retirarlo después.'
} as const;

export const APORTACION = {
	titulo: '¿Cuánto pagas tú?',
	intro: 'Si ya alquilas, cuéntanos tu renta. Ayuda a que esto sea más fiable para todos.',
	anonimo: 'Es anónimo y se tarda menos de un minuto.',
	cerrar: 'Cerrar',
	calle: 'Tu calle, sin número',
	ayudaCalle: 'Solo la usamos para saber el barrio. No se guarda.',
	placeholderCalle: 'Nombre de tu calle',
	renta: 'Renta al mes',
	superficie: 'Metros construidos',
	anio: 'Año en que empezó tu contrato',
	incluye: 'La renta incluye (marca las que correspondan)',
	opcionesIncluye: { garaje: 'Garaje', trastero: 'Trastero', comunidad: 'Gastos de comunidad', amueblado: 'Amueblado' },
	barrio: 'Tu calle cruza varios barrios. Elige el tuyo',
	consentimiento: 'Acepto que mi aportación se guarde, sin datos que me identifiquen, para mejorar la referencia.',
	seGuarda:
		'la zona (barrio) a la que pertenece la calle, los metros, la renta, el año del contrato, lo que incluye y el mes de la aportación.',
	noSeGuarda: 'la calle, el número, tu nombre, tu correo, tu IP ni nada que permita saber quién eres o dónde vives exactamente.',
	sinMarcar: 'Sin marcar la casilla no se envía nada. Puedes seguir usando la web igual.',
	botonDesactivado: 'Marca la casilla para enviar',
	enviar: 'Enviar mi aportación',
	enviando: 'Enviando…',
	calleLarga: 'Esa calle cruza demasiadas zonas. Escribe también el número del portal (no se guarda).',
	calleNoEncontrada: 'No encontramos esa calle en Madrid. Revisa cómo está escrita.',
	errorEnvio: 'No hemos podido enviar tu aportación. Inténtalo de nuevo.',
	limite: 'Hoy ya se han enviado muchas aportaciones desde este dispositivo. Vuelve mañana.',
	enviado: {
		etiqueta: 'Aportación guardada',
		titular: 'Gracias, ya cuenta',
		frase: 'Tu renta se suma, sin tu nombre ni tu dirección, a la de otras personas de tu barrio.',
		nota: 'No se muestra por separado: solo se usa agregada cuando hay suficientes aportaciones en el mismo barrio.',
		noGuardada: 'Hemos recibido tu aportación, pero estos datos no cuadran con lo habitual y no se han guardado. Revisa renta y metros.',
		boton: 'Comprobar un piso'
	}
} as const;

/** «Tu zona» (diseño 6a-6f). En todos los textos, «zona»; nunca «sección» */
export const TU_ZONA = {
	titulo: 'Tu zona',
	intro: 'Tu zona y las que están a 1,5 km o menos, coloreadas por la parte alta de lo que pagan quienes ya viven en cada una, en €/m².',
	introNumeros: 'Los números señalan dónde este precio es habitual.',
	mapa: 'Mapa de tu zona y las zonas a 1,5 km o menos, coloreadas por la parte alta de lo que pagan quienes ya viven en cada una',
	cargando: 'Cargando el mapa de la zona…',
	circulo: 'círculo: 1,5 km',
	tuZona: 'tu zona',
	tusZonas: 'tus zonas',
	/** Con horquilla: cuántas zonas afecta y por qué */
	cruce: {
		calle: (n: number) => `Tu calle cruza ${n} zonas`,
		pin: (n: number) => `Tu ubicación toca ${n} zonas`,
		otro: (n: number) => `Tu dirección puede estar en ${n} zonas`
	},
	leyenda: 'Parte alta de lo que pagan quienes ya viven aquí, en €/m² al mes',
	notaLeyenda: 'Sin dato: zonas con pocos contratos. Cortes iguales para toda la ciudad. Las líneas gruesas separan barrios.',
	sinDato: 'Sin dato',
	lista: {
		titulo: 'Zonas cercanas donde este precio es habitual',
		subtitulo: 'Zonas cercanas donde este precio queda dentro de lo que paga la gente',
		aviso: 'No son pisos disponibles: son zonas donde este precio quedaría dentro de lo que pagan los contratos vigentes.',
		pie: 'Ordenadas por distancia. Toca una zona para verla en el mapa.'
	},
	vacia: {
		titulo: 'Zonas cercanas donde este precio es habitual: ninguna',
		texto: (precioM2: string) => `Este precio (${precioM2}) supera lo habitual en todas las zonas a 1,5\u00A0km o menos.`
	},
	contexto: 'Tu precio está dentro de lo habitual aquí. Aquí ves cómo es en las zonas de alrededor.',
	contextoInquilino: 'Así es lo habitual en las zonas que te rodean.',
	contextoInquilinoVarias: 'Así es lo habitual en las zonas que te rodean. Las zonas con contorno grueso son las que puede ocupar tu vivienda.',
	fallo: 'No hemos podido cargar el mapa de la zona.'
} as const;

/** Página /mapa: Madrid entera por zonas. Tono neutral: nada ordena barrios en mejores o peores */
export const MAPA_REFERENCIA = {
	titulo: 'Mapa',
	intro: 'Lo que pagan los inquilinos en cada zona de Madrid',
	introPresupuesto: 'Madrid por zonas, según cómo queda tu presupuesto frente a lo que pagan quienes ya viven de alquiler en cada una.',
	introEvolucion: 'Madrid por zonas, según lo que ha subido la mediana de los contratos vigentes entre 2015 y 2024.',
	mapa: 'Mapa de Madrid por zonas',
	cargando: 'Cargando el mapa de Madrid…',
	fallo: 'No hemos podido cargar el mapa. Prueba de nuevo en un momento.',
	reintentar: 'Reintentar',
	capas: { etiqueta: 'Qué mostrar', referencia: 'Referencia', presupuesto: 'Mi presupuesto', evolucion: 'Evolución' },
	superficie: { etiqueta: 'Superficie', unidad: 'm²' },
	leyenda: 'Parte alta de lo que pagan quienes ya viven aquí, en €/m² al mes',
	leyendaEvolucion: 'Subida de la mediana de contratos vigentes 2015-2024',
	leyendaPresupuesto: 'Tu presupuesto frente a lo que pagan quienes ya viven aquí',
	notaCortes: (m2: string) => `Cortes calculados para ${m2}\u00A0m²; iguales para toda la ciudad. Las líneas gruesas separan barrios.`,
	avisoEvolucion: 'Cada zona tiene pocos alquileres: las diferencias entre zonas vecinas pueden ser ruido.',
	notaEvolucion: 'Mediana de contratos vigentes registrados, sin descontar la inflación. Datos hasta 2024. Cortes iguales para toda la ciudad. Las líneas gruesas separan barrios.',
	sinDato: 'Sin dato',
	notaSinDato: 'Sin dato: zonas con 20 contratos o menos, o superficie fuera de 30-150\u00A0m².',
	buscador: {
		etiqueta: 'Barrio o calle',
		placeholder: 'Barrio o calle (por ejemplo, Malasaña)',
		lista: 'Sugerencias de barrios y calles',
		sinResultados: 'No encontramos ese barrio ni esa calle.',
		sinResultadosTexto: 'Prueba con otro nombre o toca el mapa.',
		calleEn: (calle: string, barrio: string) => `${calle} está en ${barrio}.`,
		calleVarias: (calle: string, n: string) => `${calle} pasa por ${n}\u00A0zonas, marcadas en el mapa.`,
		barrio: (nombre: string) => `Mostrando ${nombre}.`
	},
	ubicacion: {
		boton: 'Mi ubicación',
		buscando: 'Buscando tu ubicación…',
		nota: 'Se usa en tu navegador; no enviamos tus coordenadas.',
		denegada: 'No hemos podido usar tu ubicación. Puedes buscar un barrio o una calle.',
		fuera: 'Tu ubicación está fuera de Madrid.'
	},
	presupuesto: {
		titulo: 'Mi presupuesto',
		campoPresupuesto: 'Tu presupuesto al mes (€)',
		campoMetros: 'Metros (m²)',
		debajo: 'No llega',
		dentro: 'Dentro',
		margen: 'Te sobra',
		nota: 'No llega: menos que la parte baja de lo habitual. Dentro: entre la parte baja y la parte alta. Te sobra: más que la parte alta.',
		aviso: 'Son contratos vigentes, no anuncios ni pisos disponibles. Hoy se suele pedir más.',
		resumen: (porcentaje: string, llega: string, conDato: string) =>
			`En el ${porcentaje}\u00A0% de las zonas con dato (${llega} de ${conDato}) tu presupuesto llega a lo que paga la gente de la zona.`,
		notaPoblacion: 'Ojo: las zonas grandes de la periferia ocupan más espacio en el mapa, pero cada zona cuenta igual en el porcentaje.',
		cercanas: {
			titulo: (donde: string) => `Las 5 zonas más cercanas ${donde} donde tu presupuesto llega a lo habitual`,
			aTuUbicacion: 'a tu ubicación',
			a: (nombre: string) => `a ${nombre}`,
			zona: (barrio: string) => `Una zona de ${barrio}`,
			metros: (m: string) => `${m}\u00A0m`,
			km: (km: string) => `${km}\u00A0km`
		},
		pideDatos: 'Escribe tu presupuesto y mira en qué zonas queda dentro de lo que pagan hoy los inquilinos.',
		metrosFuera: 'Los metros tienen que estar entre 30 y 150.',
		metrosFueraMapa: 'Con otros metros, el mapa no tiene referencia: la calculamos entre 30 y 150\u00A0m².',
		ninguna: {
			titulo: 'Tu presupuesto no llega a lo habitual en ninguna zona.',
			texto: 'Con estos metros, lo que pagan los contratos vigentes de todas las zonas es mayor. Prueba con menos metros o con otro presupuesto.'
		},
		extremo: {
			sobra: 'Tu presupuesto llega a casi todas las zonas con estos metros. Prueba con más metros para ver dónde se ajusta.',
			pocas: 'Tu presupuesto llega a muy pocas zonas con estos metros. Prueba con menos metros para ver dónde se ajusta.'
		}
	},
	hoja: {
		cerrar: 'Cerrar',
		zonaDe: 'Una zona de',
		referencia: (m2: string, inf: string, sup: string) => `Lo habitual para ${m2}: de ${inf} a ${sup} al mes`,
		parteAlta: (m2: string) => `Parte alta: ${m2}\u00A0€/m² al mes`,
		procedencia: (n: string, mes: string) =>
			`${n} contratos vigentes de distintas fechas · propietarios particulares declarados a Hacienda (2024), sin empresas ni fondos · ajustado por el IPC hasta ${mes}`,
		presupuesto: {
			debajo: (e: string) => `Tu presupuesto (${e} al mes) no llega a lo que pagan los contratos vigentes de esta zona.`,
			dentro: (e: string) => `Tu presupuesto (${e} al mes) queda dentro de lo que pagan los contratos vigentes de esta zona. No significa que haya pisos a ese precio.`,
			margen: (e: string) => `Tu presupuesto (${e} al mes) supera la parte alta de lo que pagan los contratos vigentes de esta zona. No significa que haya pisos a ese precio.`
		},
		evolucion: (antes: string, despues: string, variacion: string) =>
			`Mediana de contratos vigentes: de ${antes}\u00A0€/m² en 2015 a ${despues}\u00A0€/m² en 2024 (${variacion}). Sin descontar la inflación.`,
		sinDatoZona: 'Esta zona no tiene dato de contratos.',
		sinDatoTestigos: (n: string) => `Esta zona tiene ${n} contratos, pocos para dar una referencia.`,
		sinDatoSuperficie: 'La referencia solo se calcula entre 30 y 150\u00A0m².',
		vacia: 'Toca una zona para ver lo que pagan quienes ya viven allí.',
		comprobar: 'Comprueba un anuncio aquí'
	},
	enlaceTuZona: 'Ver el mapa de Madrid',
	enlacePortada: 'Mapa de Madrid'
} as const;
