/**
 * Textos del producto. Tono sobrio: cifras con fuente y fecha, sin adjetivos.
 * Reglas (CLAUDE.md): nunca «ilegal» ni «abusivo»; siempre enlace al valor oficial y
 * atribuciones. tests/textos.test.ts lo comprueba sobre todo lo que sale de este módulo.
 */
import type { MotivoSinDato } from '../motor';

/** Lema bajo el logotipo (diseño: el nombre manda, el lema acompaña) */
export const LEMA = '¿Tiene sentido este precio?';

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

export const NO_SON_PISOS_DISPONIBLES = 'No son pisos disponibles: es la referencia de alquileres registrados en cada sección.';

export interface Accion {
	id: 'negociar' | 'comparar' | 'oficial';
	titulo: string;
	detalle: string | null;
}

/** «Qué puedes hacer»: sin consejo jurídico */
export const QUE_PUEDES_HACER: readonly Accion[] = [
	{ id: 'negociar', titulo: 'Negociar con el dato', detalle: 'Un texto listo para enviar con la referencia' },
	{ id: 'comparar', titulo: 'Comparar con otro piso', detalle: null },
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
		frase: 'Con menos de 30\u00A0m² hay tan pocos alquileres registrados de ese tamaño que la referencia no sería fiable.',
		extra: 'Los estudios y pisos muy pequeños se comportan de otra forma: el precio por metro se dispara y no hay suficientes casos para medirlo bien.'
	},
	superficie_mayor: {
		titular: 'Más de 150\u00A0m²',
		frase: 'A partir de 150\u00A0m² hay tan pocos alquileres registrados que cualquier cifra sería un invento.',
		extra: 'Preferimos no darte un dato a darte uno que no se sostiene.'
	},
	obra_nueva: {
		titular: 'Obra nueva',
		frase: 'Es obra nueva y todavía no tiene historial: la referencia se construye con alquileres que ya llevan tiempo registrados.',
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
		frase: 'En esta zona hay muy pocos alquileres registrados para dar una referencia fiable.',
		extra: 'Pasa en barrios pequeños, muy nuevos o con pocas viviendas en alquiler. Prueba con una calle cercana si el piso está en el límite de la zona.'
	},
	sin_dato_seccion: {
		titular: 'Sin datos aquí',
		frase: 'SERPAVI no publica referencia para esta zona: no figuran alquileres registrados.',
		extra: 'Prueba con una calle cercana si el piso está en el límite de la zona.'
	},
	fuera_de_madrid: {
		titular: 'Fuera de Madrid',
		frase: 'Esta ubicación está fuera del municipio de Madrid y de momento solo cubrimos Madrid.',
		extra: 'Si el piso está en la ciudad, comprueba la dirección o márcalo en el mapa.'
	},
	habitacion: {
		titular: 'Una habitación',
		frase: 'La referencia mide viviendas completas. Las habitaciones no figuran en los registros, así que no hay con qué compararlas.',
		extra: 'Si vas a alquilar el piso entero con otras personas, puedes comprobar el precio total del piso.'
	}
};

export const TEXTO_OFICIAL_SIN_DATO = 'Puedes consultar el valor oficial en serpavi.mivau.gob.es.';

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
	'Compara el precio de un anuncio de alquiler en Madrid con la referencia de alquileres registrados en su zona.';

export const TITULAR_INICIO = ['El anuncio pide.', 'Los datos responden.'] as const;
export const SUBTITULAR_INICIO = 'Pon el precio y los metros del anuncio. En unos segundos sabrás si es lo que se paga en tu zona.';

export const ETIQUETA_NIVEL = {
	a: 'Dentro de la referencia',
	b: 'Por encima, explicable si es excelente',
	c: 'Por encima del techo para un piso excelente'
} as const;

export const FRASE_NIVEL = {
	a: 'No es barato, pero es lo que se paga aquí. Puedes respirar.',
	b: 'Si tiene ascensor, garaje, reforma reciente, piscina o vistas, puede cuadrar. Si no, pregunta qué lo justifica.',
	c: 'Ni con las mejores características la referencia llega a esta cifra.'
} as const;

export const ETIQUETA_SIN_REFERENCIA = 'Sin referencia para este caso';
export const BOTON_OFICIAL = 'Consultar el sistema oficial';
export const BOTON_OTRO_PISO = 'Comprobar otro piso';
export const BOTON_COMPARTIR = 'Compartir el resultado';

export const FORMULARIO = {
	titulo: 'Comprueba un piso',
	dondeEsta: '¿Dónde está el piso?',
	modos: { direccion: 'Dirección', calle: 'Solo calle', mapa: 'En el mapa' },
	etiquetaDireccion: { direccion: 'Dirección con número', calle: 'Calle (sin número)' },
	placeholderDireccion: { direccion: 'Calle y número del anuncio', calle: 'Nombre de la calle' },
	ayudaDireccion: { direccion: 'Si no sabes el número, elige «Solo calle».', calle: 'Con el número sale una sola cifra.' },
	precio: 'Precio al mes',
	superficie: 'Metros construidos',
	obraNueva: '¿Es obra nueva, de 2022 o después?',
	largaDuracion: '¿Es alquiler de larga duración?',
	tipo: '¿Piso o casa?',
	comprobar: 'Comprobar el precio',
	comprobarOtro: 'Comprobar otro piso',
	buscando: 'Buscando la dirección…',
	habitacion: '¿Es una habitación?'
} as const;

export const MAPA = {
	instruccion: 'Toca el punto del mapa donde está el piso. Las coordenadas no salen de tu dispositivo.',
	sinPunto: 'Todavía no has marcado ningún punto.',
	fuera: 'Ese punto está fuera del municipio de Madrid.',
	atribucion: '© OpenStreetMap contributors'
} as const;

export const ERRORES = {
	noEncontrada: {
		titulo: 'No encontramos esa dirección en Madrid.',
		texto: 'Puede que esté escrita de otra forma.',
		queriasDecir: '¿Querías decir…?',
		otraForma: 'O ubícalo de otra forma',
		soloCalle: 'Solo la calle',
		enMapa: 'En el mapa'
	},
	demasiadas: {
		titulo: 'Demasiadas búsquedas.',
		texto: 'Espera un momento. Mientras tanto, puedes ubicarlo de otra forma.'
	},
	pedirNumero: (calle: string, n: number) => ({
		titulo: `${calle} cruza ${n} zonas con referencias distintas.`,
		texto: 'Escribe el número del portal o márcalo en el mapa.'
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
export const BOTON_AÑADIR_NUMERO = 'Añadir el número del portal';

export const SERVIDO = { pregunta: '¿Te ha servido?', si: 'Sí', no: 'No', gracias: 'Gracias por contestar.' } as const;

export const EQUIVALENCIA = { alMes: 'Al mes', alAño: 'Al año', bloques: '12 meses de alquiler' } as const;

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
	detalle: 'Sin dirección ni precio exacto. Solo el barrio, la cifra y la fuente.',
	pie: 'Estimación independiente. Origen de los datos: Ministerio de Vivienda y Agenda Urbana. Elaboración propia con datos extraídos del sitio web del INE: www.ine.es',
	generando: 'Preparando la tarjeta…',
	compartirTitulo: 'Mira mi resultado',
	descargada: 'Tarjeta descargada.',
	enlaceCopiado: 'Enlace copiado.',
	canales: { whatsapp: 'WhatsApp', x: 'X', copiar: 'Copiar enlace', descarga: 'Descargar imagen' },
	canalesAviso: 'Al elegir WhatsApp, X o copiar el enlace se guarda la tarjeta (sin precio ni dirección) para que el enlace funcione.',
	descargaHecha: 'Imagen descargada. No se ha guardado nada.',
	error: 'No hemos podido preparar la tarjeta. Inténtalo de nuevo.'
} as const;

export const PAGINA_TARJETA = {
	intro: (barrio: string | null) =>
		barrio
			? `Alguien ha comprobado un piso en ${barrio} y te ha enviado su resultado.`
			: 'Alguien ha comprobado un piso en Madrid y te ha enviado su resultado.',
	titular: '¿Y el tuyo?',
	explicacion:
		'Esta herramienta compara el precio de un anuncio de alquiler en Madrid con la referencia de alquileres registrados en su zona: datos del Ministerio de Vivienda (SERPAVI 2024) ajustados por el IPC del alquiler.',
	boton: 'Comprueba tu piso',
	nota: 'La tarjeta no incluye la dirección ni el precio exacto del anuncio.',
	noExiste: { titulo: 'Esta tarjeta no existe', texto: 'Puede que el enlace esté incompleto o que ya no esté disponible.' }
} as const;

/** Contadores de uso: reales o no se muestran; por barrio, solo desde 10 */
export const UMBRAL_CONTADOR_BARRIO = 10;
export const UMBRAL_CONTADOR_GRANDE = 100;
export const CONTADOR_CERO = 'Sé de los primeros en comprobar un piso en Madrid';
export const CONTADOR_POCOS = 'pisos comprobados. Esto acaba de empezar y el tuyo cuenta.';
export const CONTADOR_MUCHOS = 'pisos comprobados en Madrid. No eres el único que se lo pregunta.';
export const CONTADOR_BARRIO = 'personas han comprobado pisos en este barrio.';

export const NAVEGACION = { inicio: 'Inicio', otroPiso: 'Otro piso', madrid: 'Madrid' } as const;

/** Frases de la tarjeta compartible (más cortas que las de la pantalla) */
export const FRASE_TARJETA = {
	a: 'No es barato, pero es lo que se paga aquí.',
	b: 'Solo se explica si el piso es excelente.',
	c: 'Ni con las mejores características la referencia llega a esta cifra.'
} as const;

export const NOTA_TARJETA = {
	a: (barrio: string) => `de la referencia en ${barrio}`,
	b: (barrio: string) => `para la referencia en ${barrio}`,
	/** `complemento` es «sobre la parte alta» o «la parte alta», según la cifra vaya en % o en veces */
	c: (barrio: string, aproximada: boolean, complemento = 'sobre la parte alta') =>
		`${complemento} de la referencia en ${barrio}` + (aproximada ? '. Ubicación aproximada.' : '')
} as const;

/** Vista previa del enlace (1200×630) */
export const ETIQUETA_OG = { a: 'Dentro de la referencia', b: 'Por encima, explicable', c: 'Por encima del techo' } as const;
export const OG = {
	titular: (barrio: string | null) => `Un piso en ${barrio ?? 'Madrid'}, frente a los alquileres registrados de su zona.`,
	notaCifra: (enVeces: boolean) => `${enVeces ? 'la' : 'sobre la'} parte alta de la referencia`,
	cta: 'Comprueba tu piso'
} as const;

/** Etiqueta corta de una fila del historial de la sesión */
export const ETIQUETA_HISTORIAL = { a: 'Dentro', b: 'Explicable', sinDato: 'Sin dato' } as const;

// ——— «¿Cuánto pagas tú?» (R11) ———

/** Casilla de consentimiento del registro anónimo de análisis (R7), bajo el resultado */
/** Aviso antes del resultado cuando el precio supera `UMBRAL_ERROR_TECLEO` veces la parte alta */
export const CONFIRMAR_PRECIO = {
	titulo: (veces: number) => `¿Seguro? Es más de ${veces} veces la parte alta de la referencia`,
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
	intro: 'Tu zona y las que están a 1,5 km o menos, coloreadas por la parte alta de su referencia en €/m².',
	introNumeros: 'Los números señalan dónde la referencia llega a este precio.',
	mapa: 'Mapa de tu zona y las zonas a 1,5 km o menos, coloreadas por la parte alta de su referencia',
	cargando: 'Cargando el mapa de la zona…',
	circulo: 'círculo: 1,5 km',
	tuZona: 'tu zona',
	leyenda: 'Parte alta de la referencia, en €/m² al mes',
	notaLeyenda: 'Sin dato: zonas con pocos alquileres registrados. Cortes iguales para toda la ciudad. Las líneas gruesas separan barrios.',
	sinDato: 'Sin dato',
	lista: {
		titulo: 'Este precio entra en la referencia de…',
		subtitulo: 'Zonas cercanas donde la referencia llega a este precio',
		aviso: 'No son pisos disponibles: son zonas donde este precio quedaría dentro de lo que pagan los alquileres registrados.',
		pie: 'Ordenadas por distancia. Toca una zona para verla en el mapa.'
	},
	vacia: {
		titulo: 'Zonas cercanas donde la referencia llega a este precio: ninguna',
		texto: (precioM2: string) => `Este precio (${precioM2}) supera la referencia de todas las zonas a 1,5\u00A0km o menos.`
	},
	contexto: 'Tu precio ya está dentro de la referencia, así que aquí solo tienes el contexto: cómo es la referencia en las zonas que te rodean.',
	fallo: 'No hemos podido cargar el mapa de la zona.'
} as const;
