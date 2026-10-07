/**
 * Textos del producto. Tono sobrio: cifras con fuente y fecha, sin adjetivos.
 * Reglas (CLAUDE.md): nunca «ilegal» ni «abusivo»; siempre enlace al valor oficial y
 * atribuciones. tests/textos.test.ts lo comprueba sobre todo lo que sale de este módulo.
 */
import type { MotivoSinDato } from '../motor';
import { MINIMO_COMPARACION } from './habitacion';

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
		frase: 'La referencia oficial no incluye habitaciones.',
		extra: 'Si compartís con un solo contrato, compara el piso entero; si no, solo podemos comparar con lo que aporten otras personas de tu barrio, cuando haya suficientes.'
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

/** «Ya vivo aquí»: formulario y resultado del inquilino (Fase 1) */
export const SITUACION = {
	etiqueta: 'Tu situación',
	mirando: 'Estoy mirando un piso',
	vivo: 'Ya vivo aquí'
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
	enlace: '¿Compartís piso con un solo contrato?',
	ayuda: 'Pon lo que paga el piso entero entre todos y los metros del piso.',
	somos: 'Somos',
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
		debajo: 'Por debajo de la referencia',
		dentro: 'Dentro de la referencia',
		encimab: 'Por encima, explicable si es excelente',
		encima: 'Por encima del techo para un piso excelente'
	},
	titular: { debajo: 'Por debajo', baja: 'Parte baja', media: 'Parte media', alta: 'Parte alta', encimab: 'Cerca del techo' },
	notaDebajo: (m2: string, varias = false) => `Tu renta queda por debajo de la referencia para ${m2} en ${varias ? 'estas zonas' : 'esta zona'}.`,
	notaDentro: (inf: string, sup: string, m2: string, varias = false) =>
		`Entre ${inf} y ${sup} al mes para ${m2} en ${varias ? 'estas zonas' : 'esta zona'}.`,
	notaEncimab: (pct: string) => `${pct} sobre la parte alta, por debajo del techo para un piso excelente.`,
	frase: {
		debajo: 'Pagas menos de lo que registran los contratos de tu zona.',
		baja: 'Pagas como la parte baja de los alquileres registrados en tu zona.',
		media: 'Pagas lo que se suele pagar en tu zona.',
		alta: 'Estás en la parte alta de lo que se paga en tu zona, aún dentro de la referencia.',
		encimab:
			'Tu alquiler supera la parte alta de la referencia, pero queda por debajo del techo para un piso excelente. Depende de cómo sea el tuyo.',
		encima: 'Tu renta supera lo que registran los contratos de tu zona, incluso para un piso excelente.'
	},
	alMes: 'Al mes, sobre la parte alta',
	alAno: 'Al año',
	contrato: {
		texto: ': la referencia mezcla contratos de distintas fechas.',
		detalle: 'Los contratos más antiguos suelen tener rentas más bajas.',
		cambio: (antes: string, pct: string) => `Al firmar pagabas ${antes}. Desde entonces, ${pct}.`,
		sinCambio: (antes: string) => `Al firmar pagabas ${antes}. Desde entonces, sin cambios.`
	},
	aportar: {
		titulo: 'Aporta tu alquiler a las estadísticas de tu barrio',
		texto: (barrio: string) => `Con rentas reales de vecinos se ve mejor lo que se paga hoy en ${barrio}, no solo lo que se registró.`,
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
	acciones: { titulo: 'Qué puedes hacer', oficial: 'Consultar el valor oficial', mirando: 'Comprobar un piso que estás mirando' },
	servido: '¿Te ha servido?'
} as const;

/** Habitaciones (F1): sin referencia oficial, sin nivel ni veredicto */
export const HABITACION = {
	insignia: 'Habitaciones: datos aportados por vecinos',
	intro: 'La referencia oficial no cubre habitaciones, así que no te damos nivel ni veredicto. Solo comparamos con lo que aportan otras personas de tu barrio.',
	tuHabitacion: 'Tu habitación',
	/** «Estoy mirando un piso»: no es tuya */
	laHabitacion: 'La habitación',
	/** Estado vacío al mirar: ofrece pasar a «Ya vivo aquí» con los datos prellenados */
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
		titulo: 'Qué puedes hacer',
		compartis: '¿Compartís piso con un solo contrato?',
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
	ampliar: 'Ver en grande',
	ampliadaTitulo: 'Tu tarjeta, en grande',
	cerrar: 'Cerrar',
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

/** Tarjeta del inquilino (F1e): tres o cuatro textos por posición (dos en «por encima»); la persona elige uno. Nunca lleva la renta. */
export const TARJETA_INQUILINO = {
	// El primero de cada posición es el factual y el que sale elegido por defecto; el último, el mismo en todas
	textos: {
		debajo: [
			'Mi alquiler queda por debajo de lo que registran los contratos de mi zona.',
			'Pago menos que la referencia de mi barrio. Con este mercado, casi es noticia.',
			'Por debajo de la referencia. ¿Y el tuyo, dónde queda?',
			'¿Y tú? Compruébalo con el tuyo.'
		],
		dentro: [
			'Pago lo que se paga aquí. Ni más ni menos.',
			'Lo normal en mi barrio. Lo normal ya es mucho.',
			'Dentro de la referencia de mi zona. ¿Y el tuyo?',
			'¿Y tú? Compruébalo con el tuyo.'
		],
		encimab: [
			'Por encima de la parte alta, por debajo del techo. Depende de cómo sea el piso.',
			'El techo existe. El mercado ya lo roza.',
			'Cerca del techo de mi zona. ¿Y el tuyo?',
			'¿Y tú? Compruébalo con el tuyo.'
		],
		// El primero (null) se escribe con el % o las veces sobre la parte alta
		encima: [null, '¿Y tú? Compruébalo con el tuyo.']
	},
	/** Texto factual de «por encima»: el % o las veces sobre la parte alta; con horquilla, «al menos» (el ratio menor) */
	encimaCifra: (pct: string, alMenos = false) => `Pago ${alMenos ? 'al menos ' : ''}un ${pct} más que la parte alta de la referencia de mi zona.`,
	encimaVeces: (veces: string, alMenos = false) => `Pago ${alMenos ? 'al menos ' : ''}${veces} la parte alta de la referencia de mi zona.`,
	/** Línea bajo la cifra */
	nota: {
		debajo: 'de la referencia de alquileres de mi zona',
		dentro: 'de la referencia de alquileres de mi zona',
		encimab: 'por encima de la parte alta de la referencia de mi zona',
		encima: 'sobre la parte alta de la referencia de mi zona'
	},
	/** Vista previa del enlace: en tercera persona */
	notaOg: {
		debajo: (barrio: string) => `de la referencia de su zona en ${barrio}`,
		dentro: (barrio: string) => `de la referencia de su zona en ${barrio}`,
		encimab: (barrio: string) => `por encima de la parte alta de la referencia de su zona en ${barrio}`,
		encima: (barrio: string) => `sobre la parte alta de la referencia de su zona en ${barrio}`
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
		'Esta herramienta compara lo que se paga de alquiler en Madrid con la referencia de alquileres registrados en cada zona: datos del Ministerio de Vivienda (SERPAVI 2024) ajustados por el IPC del alquiler.',
	notaInquilino: 'La tarjeta no incluye la dirección ni la renta.',
	titular: '¿Y el tuyo?',
	explicacion:
		'Esta herramienta compara el precio de un anuncio de alquiler en Madrid con la referencia de alquileres registrados en su zona: datos del Ministerio de Vivienda (SERPAVI 2024) ajustados por el IPC del alquiler.',
	boton: 'Comprueba tu piso',
	nota: 'La tarjeta no incluye la dirección ni el precio exacto del anuncio.',
	noExiste: { titulo: 'Esta tarjeta no existe', texto: 'Puede que el enlace esté incompleto o que ya no esté disponible.' }
} as const;

/** Contadores de uso: reales o no se muestran; por barrio, solo desde 10 */
export const UMBRAL_CONTADOR_BARRIO = 10;
export const CONTADOR_BARRIO = 'personas han comprobado pisos en este barrio.';

export const NAVEGACION = { inicio: 'Inicio', otroPiso: 'Otro piso', madrid: 'Madrid', mapa: 'Mapa' } as const;

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
	tusZonas: 'tus zonas',
	/** Con horquilla: cuántas zonas afecta y por qué */
	cruce: {
		calle: (n: number) => `Tu calle cruza ${n} zonas`,
		pin: (n: number) => `Tu ubicación toca ${n} zonas`,
		otro: (n: number) => `Tu dirección puede estar en ${n} zonas`
	},
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
	contextoInquilino: 'Así es la referencia en las zonas que te rodean. Las zonas con contorno grueso son las que puede ocupar tu vivienda.',
	fallo: 'No hemos podido cargar el mapa de la zona.'
} as const;

/** Página /mapa: Madrid entera por zonas. Tono neutral: nada ordena barrios en mejores o peores */
export const MAPA_REFERENCIA = {
	titulo: 'Mapa',
	intro: 'Madrid por zonas, coloreada por la parte alta de la referencia en €/m² al mes.',
	introPresupuesto: 'Madrid por zonas, según cómo queda tu presupuesto frente a la referencia de cada una.',
	introEvolucion: 'Madrid por zonas, según lo que ha subido la renta registrada entre 2015 y 2024.',
	mapa: 'Mapa de Madrid por zonas',
	cargando: 'Cargando el mapa de Madrid…',
	fallo: 'No hemos podido cargar el mapa. Prueba de nuevo en un momento.',
	reintentar: 'Reintentar',
	capas: { etiqueta: 'Qué mostrar', referencia: 'Referencia', presupuesto: 'Mi presupuesto', evolucion: 'Evolución' },
	superficie: { etiqueta: 'Superficie', unidad: 'm²' },
	leyenda: 'Parte alta de la referencia, en €/m² al mes',
	leyendaEvolucion: 'Subida de la mediana registrada 2015-2024',
	leyendaPresupuesto: 'Tu presupuesto frente a la referencia',
	notaCortes: (m2: string) => `Cortes calculados para ${m2}\u00A0m²; iguales para toda la ciudad. Las líneas gruesas separan barrios.`,
	avisoEvolucion: 'Cada zona tiene pocos alquileres: las diferencias entre zonas vecinas pueden ser ruido.',
	notaEvolucion: 'Sin descontar la inflación. Cortes iguales para toda la ciudad. Las líneas gruesas separan barrios.',
	sinDato: 'Sin dato',
	notaSinDato: 'Sin dato: zonas con 20 alquileres registrados o menos, o superficie fuera de 30-150\u00A0m².',
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
		campoPresupuesto: 'Lo que puedes pagar al mes (€)',
		campoMetros: 'Metros (m²)',
		debajo: 'Por debajo',
		dentro: 'Dentro',
		margen: 'Con margen',
		nota: 'Por debajo: menos que el mínimo de la referencia. Dentro: entre el mínimo y el máximo. Con margen: más que el máximo.',
		aviso: 'No son pisos disponibles. La referencia son contratos registrados; lo que se pide hoy puede ser más alto, así que «dentro» es orientativo.',
		resumen: (porcentaje: string, llega: string, conDato: string) =>
			`En el ${porcentaje}\u00A0% de las zonas con dato (${llega} de ${conDato}) tu presupuesto llega a la referencia.`,
		notaPoblacion: 'Cada zona tiene una población parecida; por eso el mapa, donde las zonas rurales son enormes, puede parecer distinto al porcentaje.',
		cercanas: {
			titulo: (donde: string) => `Las 5 zonas más cercanas ${donde} donde llega tu presupuesto`,
			aTuUbicacion: 'a tu ubicación',
			a: (nombre: string) => `a ${nombre}`,
			zona: (barrio: string) => `Una zona de ${barrio}`,
			metros: (m: string) => `${m}\u00A0m`,
			km: (km: string) => `${km}\u00A0km`
		},
		pideDatos: 'Escribe lo que puedes pagar al mes y los metros para verlo en el mapa.',
		metrosFuera: 'Los metros tienen que estar entre 30 y 150.',
		metrosFueraMapa: 'Con otros metros, el mapa no tiene referencia: la calculamos entre 30 y 150\u00A0m².',
		ninguna: {
			titulo: 'Tu presupuesto no llega a la referencia de ninguna zona.',
			texto: 'Con estos metros, la referencia de todas las zonas es mayor. Prueba con menos metros o con otro presupuesto.'
		}
	},
	hoja: {
		cerrar: 'Cerrar',
		zonaDe: 'Una zona de',
		referencia: (m2: string, inf: string, sup: string) => `Referencia para ${m2}: de ${inf} a ${sup} al mes`,
		parteAlta: (m2: string) => `Parte alta: ${m2}\u00A0€/m² al mes`,
		procedencia: (n: string, mes: string) =>
			`${n} alquileres registrados · IRPF 2024, propietarios personas físicas, contratos vigentes de distintas fechas · ajustado por el IPC hasta ${mes}`,
		presupuesto: {
			debajo: (e: string) => `Tu presupuesto (${e} al mes) queda por debajo del mínimo de la referencia.`,
			dentro: (e: string) => `Tu presupuesto (${e} al mes) queda dentro de la referencia.`,
			margen: (e: string) => `Tu presupuesto (${e} al mes) queda por encima del máximo de la referencia.`
		},
		evolucion: (antes: string, despues: string, variacion: string) =>
			`Mediana registrada: de ${antes}\u00A0€/m² en 2015 a ${despues}\u00A0€/m² en 2024 (${variacion}). Sin descontar la inflación.`,
		sinDatoZona: 'Esta zona no tiene dato de referencia.',
		sinDatoTestigos: (n: string) => `Esta zona tiene ${n} alquileres registrados, pocos para dar una referencia.`,
		sinDatoSuperficie: 'La referencia solo se calcula entre 30 y 150\u00A0m².',
		vacia: 'Toca una zona para ver su referencia.',
		comprobar: 'Comprueba un piso aquí'
	},
	enlaceTuZona: 'Ver el mapa de Madrid',
	enlacePortada: 'Mapa de Madrid'
} as const;
