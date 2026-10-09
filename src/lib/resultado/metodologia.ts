/**
 * Página «Cómo calculamos» (R8, diseño 7a/7b): lo que se escanea en 30 segundos, un ejemplo con el
 * mismo motor que el resultado, los tres niveles, el precio pedido, los datos que se guardan, lo que no
 * se calcula, las fuentes, quiénes somos y financiación.
 *
 * Nada de cifras copiadas: el factor y el mes del IPC salen de ipc_alquiler.json y el ejemplo se calcula
 * con los datos de la sección (Fuente del Berro, 90 m², 2.690 €). Si cambia el factor, cambia el ejemplo.
 * Mismas reglas de tono que textos.ts (lo comprueba tests/textos.test.ts).
 */
import { type Anuncio, BANDA_EN_LINEA, type Referencia, clasificar, referencia, tieneDato } from '../motor';
import { type DatosMadrid, type IpcJson, datosSeccion } from './datos';
import { euros, mesAnio, numero, porcentaje } from './formato';
import { ATRIBUCIONES, AVISO_INDEPENDIENTE, ENLACE_OFICIAL, ETIQUETA_NIVEL, ETIQUETA_POR_DEBAJO, OFERTA, type ClaveSinDato, NOMBRE } from './textos';

const NB = ' ';
export const CORREO = 'hola@asuprecio.com';

/** Portal de la calle de Fuente del Berro usado en el ejemplo (sección censal 2807904033, Goya) */
export const CUSEC_EJEMPLO = '2807904033';
export const ANUNCIO_EJEMPLO: Anuncio = { precio: 2690, superficie: 90, obraNueva: false, tipo: 'piso', largaDuracion: true };
const LUGAR_EJEMPLO = 'Fuente del Berro (Salamanca)';

export interface SeccionTexto {
	id: string;
	titulo: string;
	parrafos: string[];
}

export interface TramoEscala {
	/** Fracciones de la escala del ejemplo, de 0 a 1 */
	desde: number;
	hasta: number;
}

export interface PasoEjemplo {
	n: number;
	titulo: string;
	descripcion: string;
	aria: string;
	banda: TramoEscala;
	/** Referencia sin ajustar, en discontinua (paso 2) */
	anterior: TramoEscala | null;
	techo: (TramoEscala & { valor: string }) | null;
	/** Posición del precio y su etiqueta; la guía va del techo (o la parte alta) al punto */
	punto: { x: number; desde: number; delta: string | null } | null;
	/** Texto de la etiqueta «referencia …», alineado a la derecha del tramo en los pasos 3 y 4 */
	referencia: string;
	alinearDerecha: boolean;
	nivel: 'a' | 'b' | 'c' | null;
}

export interface Ejemplo {
	intro: string;
	escalaMax: number;
	precio: string;
	pasos: PasoEjemplo[];
}

export interface NivelMetodologia {
	clase: 'a' | 'b' | 'c';
	etiqueta: string;
	descripcion: string;
	/** Posición del punto en la mini-barra, de 0 a 1 */
	x: number;
	/** Icono distinto al de la clase («por debajo» lleva un chevron hacia abajo) */
	icono?: 'abajo';
}

export interface LimiteMetodologia {
	clave: ClaveSinDato;
	titulo: string;
	descripcion: string;
}

export interface FuenteMetodologia {
	nombre: string;
	host: string;
	url: string;
	uso: string;
	atribucion: string;
}

export interface Metodologia {
	titulo: string;
	intro: string;
	indice: { id: string; titulo: string }[];
	treintaSegundos: string[];
	ejemplo: Ejemplo | null;
	niveles: { intro: string | null; items: NivelMetodologia[]; mini: { banda: TramoEscala; techo: TramoEscala } } | null;
	precioPedido: { titulo: string; destacado: string; cuerpo: string; incluye: { titulo: string; items: string[] }; parteAlta: { titulo: string; texto: string } };
	/** Los anuncios recientes (serie 4.3.21.D) como segunda referencia: de dónde salen, cómo se estima y hasta dónde llegan */
	anuncios: {
		titulo: string;
		intro: string;
		fuentes: { titulo: string; items: string[] };
		estimacion: { titulo: string; parrafos: string[] };
		enLinea: { titulo: string; texto: string };
		diferencia: { titulo: string; texto: string };
		limites: { titulo: string; items: string[] };
	};
	mapa: { parrafos: string[]; muestra: string[]; noMuestra: string[] };
	datos: { parrafos: string[]; guardamos: string[]; noGuardamos: string[]; notas: { titulo: string; texto: string[]; ancha?: boolean }[] };
	limites: { intro: string; items: LimiteMetodologia[]; cierre: string };
	fuentes: { filas: FuenteMetodologia[]; ipc: string; validacion: string; nota: string; enlaceOficial: string };
	quienesSomos: { parrafos: string[]; contacto: { texto: string; correo: string } };
	financiacion: string[];
	cta: { pregunta: string; boton: string };
	atribuciones: readonly string[];
	aviso: string;
}

export const INDICE = [
	{ id: 'resumen', titulo: 'En 30 segundos' },
	{ id: 'ej', titulo: 'Un ejemplo' },
	{ id: 'niv', titulo: 'Los niveles' },
	{ id: 'ped', titulo: 'Contratos vigentes' },
	{ id: 'anu', titulo: 'Anuncios recientes' },
	{ id: 'map', titulo: 'El mapa' },
	{ id: 'dat', titulo: 'Tus datos' },
	{ id: 'lo-que-no-calculamos', titulo: 'Lo que no calculamos' },
	{ id: 'fue', titulo: 'Fuentes' },
	{ id: 'qui', titulo: 'Quiénes somos' },
	{ id: 'fin', titulo: 'Financiación' }
] as const;

export const QUIENES_SOMOS = [
	`${NOMBRE} es una iniciativa independiente para ayudar a las personas a entender mejor los precios de la vivienda.`,
	'Creamos esta herramienta porque, tanto si buscas piso como si ya vives de alquiler, es difícil saber cómo se compara tu precio con lo que paga la gente de tu zona. Los portales muestran lo que se pide por una vivienda, pero no lo que pagan quienes ya viven de alquiler allí.',
	`${NOMBRE} pone ese precio en contexto utilizando datos públicos y una metodología basada en los datos y criterios publicados por el Ministerio de Vivienda y Agenda Urbana.`,
	'No somos una inmobiliaria, un portal de anuncios ni una administración pública. Tampoco determinamos cuál debería ser el precio de una vivienda. Nuestro objetivo es ofrecer una referencia independiente que ayude a cada persona a tomar sus propias decisiones.',
	'La herramienta es independiente de los propietarios, agencias inmobiliarias y portales de vivienda.'
];

export const FINANCIACION = [
	`${NOMBRE} es una iniciativa independiente.`,
	'En esta primera etapa, el proyecto se desarrolla con recursos propios y no recibe financiación de partidos políticos, administraciones públicas, empresas inmobiliarias ni portales de vivienda.',
	'El objetivo es mantener la herramienta independiente de los intereses de quienes participan en el mercado del alquiler.',
	'Si en el futuro recibimos financiación externa, publicaremos quién la aporta y qué relación, si existe, tiene con el proyecto.'
];

const LIMITES: [ClaveSinDato, string, string][] = [
	['superficie_menor', `Menos de 30${NB}m²`, 'Hay pocos contratos de ese tamaño.'],
	['superficie_mayor', `Más de 150${NB}m²`, 'Hay tan pocos casos que la cifra no se sostendría.'],
	['obra_nueva', 'Obra nueva, de 2022 o después', 'Aún no tiene historial en los datos de 2024.'],
	['unifamiliar', 'Casa unifamiliar', 'La referencia está hecha con pisos.'],
	['temporal', 'Alquiler temporal o de media estancia', 'La referencia solo mide alquileres de larga duración.'],
	['testigos', 'Pocos datos en la zona', 'No hay suficientes contratos para dar una referencia fiable.'],
	['habitacion', 'Habitación', 'La referencia oficial no incluye habitaciones. Si compartes piso con un solo contrato, compara el piso entero; si no, solo podemos comparar con lo que aporten otras personas de tu barrio, cuando haya suficientes.']
];

const rango = (inf: number, sup: number) => `${numero(inf)}–${euros(sup)}`;

function construirEjemplo(datos: DatosMadrid): Ejemplo | null {
	const s = datosSeccion(datos, CUSEC_EJEMPLO);
	if (!tieneDato(s)) return null;
	const a = ANUNCIO_EJEMPLO;
	const f = datos.ipc.factor;
	const sin: Referencia = referencia(a.superficie, s, 1);
	const con: Referencia = referencia(a.superficie, s, f);
	const nivel = clasificar(a.precio, con);
	const clase = nivel.nivel === 'dentro' ? 'a' : nivel.nivel === 'explicable' ? 'b' : 'c';

	// Misma escala en las cuatro barras: de 0 a 1,15 × max(precio, techo)
	const max = Math.round((Math.max(a.precio, con.max) * 1.15) / 10) * 10;
	const X = (v: number) => v / max;
	const tramo = (r: Referencia | { inf: number; sup: number }): TramoEscala => ({ desde: X(r.inf), hasta: X(r.sup) });
	const m2 = `${numero(a.superficie)}${NB}m²`;
	const pct = porcentaje(a.precio / con.sup - 1, true);
	const sobre = a.precio - con.sup;
	const precio = euros(a.precio);

	const textoCuatro =
		nivel.nivel === 'por_encima'
			? `Tu precio, ${precio}, supera la parte alta en ${euros(sobre)} al mes (${pct}), incluso si fuera un piso excelente: nivel «${ETIQUETA_NIVEL.c.toLowerCase()}».`
			: nivel.nivel === 'explicable'
				? `Tu precio, ${precio}, supera la parte alta en ${euros(sobre)} al mes (${pct}), pero cuadraría si fuera un piso excelente: nivel «${ETIQUETA_NIVEL.b.toLowerCase()}».`
				: `Tu precio, ${precio}, queda dentro de lo habitual: nivel «${ETIQUETA_NIVEL.a.toLowerCase()}», en la parte ${nivel.posicion}.`;

	const pasos: PasoEjemplo[] = [
		{
			n: 1, titulo: 'Referencia sin ajustar',
			descripcion: `Con los contratos vigentes de esta zona para ${m2}, lo habitual va de ${numero(sin.inf)} a ${euros(sin.sup)} al mes.`,
			aria: `Referencia sin ajustar, de ${numero(sin.inf)} a ${euros(sin.sup)}`,
			banda: tramo(sin), anterior: null, techo: null, punto: null,
			referencia: rango(sin.inf, sin.sup), alinearDerecha: false, nivel: null
		},
		{
			n: 2, titulo: `Con el ajuste del IPC (×${numero(f, 3)})`,
			descripcion: `Multiplicamos por ${numero(f, 3)} (${porcentaje(f - 1, true)} hasta ${mesAnio(datos.ipc.ultimo_mes)}): la referencia pasa a ir de ${numero(con.inf)} a ${euros(con.sup)} al mes. La línea discontinua marca la de antes.`,
			aria: `Referencia ajustada, de ${numero(con.inf)} a ${euros(con.sup)}`,
			banda: tramo(con), anterior: tramo(sin), techo: null, punto: null,
			referencia: rango(con.inf, con.sup), alinearDerecha: false, nivel: null
		},
		{
			n: 3, titulo: 'Si fuera un piso excelente',
			descripcion: `El margen para las mejores características: ${euros(sin.max)} sin ajustar y ${euros(con.max)} con el ajuste. Hay contratos por encima: no es un máximo.`,
			aria: `Si fuera un piso excelente, ${numero(con.max)} euros`,
			banda: tramo(con), anterior: null, techo: { desde: X(con.sup), hasta: X(con.max), valor: euros(con.max) }, punto: null,
			referencia: rango(con.inf, con.sup), alinearDerecha: true, nivel: null
		},
		{
			n: 4, titulo: 'Comparación con tu precio',
			descripcion: textoCuatro,
			aria: `Tu precio, ${numero(a.precio)} euros, ${ETIQUETA_NIVEL[clase].toLowerCase()}`,
			banda: tramo(con), anterior: null, techo: { desde: X(con.sup), hasta: X(con.max), valor: euros(con.max) },
			punto: { x: X(a.precio), desde: X(Math.max(con.max, 0)), delta: nivel.nivel === 'por_encima' ? `+${euros(sobre)}` : null },
			referencia: rango(con.inf, con.sup), alinearDerecha: true, nivel: clase
		}
	];
	return {
		intro: `Un piso de ${m2} en ${LUGAR_EJEMPLO} que se anuncia por ${precio} al mes. Todas las barras usan la misma escala, de 0 a ${euros(max)}.`,
		escalaMax: max,
		precio,
		pasos
	};
}

/** «Anuncios recientes»: el mes sale de oferta_madrid.json (sin el fichero, se habla del último mes publicado) y la banda, de config/oferta.json */
function construirAnuncios(datos: DatosMadrid | undefined, mesIpc: string): Metodologia['anuncios'] {
	const mes = datos?.oferta ? mesAnio(datos.oferta.mes) : null;
	const banda = numero(BANDA_EN_LINEA * 100);
	return {
		titulo: 'Anuncios recientes',
		intro: 'Junto a los contratos mostramos lo que se pide en los anuncios recientes de la zona. Son dos referencias distintas y cada una se compara solo con tu precio. Los anuncios recientes no son contratos firmados.',
		fuentes: {
			titulo: 'De dónde sale cada una',
			items: [
				`Contratos: SERPAVI 2024 (Ministerio de Vivienda y Agenda Urbana, con datos de Hacienda; propietarios particulares), puestos al día con el IPC del alquiler del INE hasta ${mesIpc}.`,
				`Anuncios recientes: serie 4.3.21.D del Banco de Datos del Ayuntamiento de Madrid, que el Ayuntamiento elabora a partir de datos de Idealista${mes ? `. Datos de ${mes}` : ''}. No usamos Idealista directamente.`
			]
		},
		estimacion: {
			titulo: 'Cómo calculamos la estimación',
			parrafos: [
				'Multiplicamos el €/m² de la zona por tus metros cuadrados. Usamos la media del barrio si tiene datos en los dos últimos meses; si no, la media del distrito. Solo lo calculamos con 30\u00A0m² o más.',
				'Si la dirección cae en varias zonas posibles, solo damos la cifra cuando todas son del mismo barrio o, si no, del mismo distrito.'
			]
		},
		enLinea: {
			titulo: 'Qué significa «en línea»',
			texto: `Tu precio está «en línea» si queda dentro de ±${banda}\u00A0% de la estimación de los anuncios recientes. Por debajo o por encima de esa banda, lo decimos así.`
		},
		diferencia: {
			titulo: 'Por qué los contratos y los anuncios difieren',
			texto: 'Miden cosas distintas. Los contratos recogen lo que paga quien ya vive de alquiler, firmado en distintos años. Los anuncios recientes recogen lo que se pide ahora por un piso en el mercado, antes de cerrar el precio. Por eso no restamos una referencia de la otra ni las comparamos entre sí: cada una se compara solo con tu precio.'
		},
		limites: {
			titulo: 'Hasta dónde llegan los anuncios recientes',
			items: [
				'La resolución es de barrio o de distrito, no de calle ni de zona: dentro de cada uno, los precios pueden variar mucho.',
				'Hay barrios sin datos suficientes; en ese caso usamos la media de su distrito y lo indicamos (en el mapa, con punteado).',
				'Dentro de un distrito los barrios varían bastante: la media del distrito puede quedar lejos de la de tu barrio.',
				'El dato de un barrio varía más de un mes a otro que el de un distrito, porque se apoya en menos anuncios.',
				'La serie deriva de Idealista: refleja lo que se anuncia allí, no todo el mercado.',
				'Se publica con un retraso de unos 3-4 meses.',
				'El IPC con el que ajustamos los contratos es nacional, no de Madrid, y no se aplica a los anuncios.'
			]
		}
	};
}

export function construirMetodologia(ipc: IpcJson, datos?: DatosMadrid): Metodologia {
	const factor = numero(ipc.factor, 3);
	const pct = porcentaje(ipc.factor - 1, true);
	const mes = mesAnio(ipc.ultimo_mes);
	const ejemplo = datos ? construirEjemplo({ ...datos, ipc }) : null;

	const mesOferta = datos?.oferta ? mesAnio(datos.oferta.mes) : null;

	let niveles: Metodologia['niveles'] = null;
	if (datos) {
		const s = datosSeccion(datos, CUSEC_EJEMPLO);
		if (tieneDato(s)) {
			const con = referencia(ANUNCIO_EJEMPLO.superficie, s, ipc.factor);
			const max = Math.round((Math.max(ANUNCIO_EJEMPLO.precio, con.max) * 1.15) / 10) * 10;
			const X = (v: number) => v / max;
			niveles = {
				intro: null,
				mini: { banda: { desde: X(con.inf), hasta: X(con.sup) }, techo: { desde: X(con.sup), hasta: X(con.max) } },
				items: [
					{ clase: 'a', icono: 'abajo', etiqueta: ETIQUETA_POR_DEBAJO, descripcion: 'El precio queda por debajo de lo habitual en la zona: entrar sale más barato que estar dentro.', x: X(con.inf / 2) },
					{ clase: 'a', etiqueta: ETIQUETA_NIVEL.a, descripcion: 'El precio está entre la parte baja y la parte alta. Te decimos si cae en la parte baja, media o alta.', x: X((con.inf + con.sup) / 2) },
					{ clase: 'b', etiqueta: ETIQUETA_NIVEL.b, descripcion: 'Supera la parte alta, pero cuadraría si fuera un piso excelente: ascensor, garaje, reforma reciente, piscina o vistas.', x: X((con.sup + con.max) / 2) },
					{ clase: 'c', etiqueta: ETIQUETA_NIVEL.c, descripcion: 'Supera lo habitual incluso si fuera un piso excelente. Te mostramos cuánto: al mes, al año y en porcentaje.', x: X((con.max + max) / 2) }
				]
			};
		}
	}

	return {
		titulo: 'Cómo calculamos',
		intro: 'Qué datos usamos, qué hacemos con ellos y hasta dónde llegan.',
		indice: INDICE.map((i) => ({ ...i })),
		treintaSegundos: [
			'Comparamos el precio de un anuncio, o de tu alquiler, con lo que pagan quienes ya viven de alquiler en su zona (contratos vigentes declarados a Hacienda, 2024) y con lo que se pide en los anuncios recientes del barrio o del distrito.',
			`Ajustamos los contratos con el IPC del alquiler: ${pct} hasta ${mes}. Los anuncios recientes no se ajustan.`,
			'Los contratos ya están firmados, algunos hace años; los anuncios recientes son precios pedidos que aún pueden cambiar. Son dos referencias distintas y cada una se compara solo con tu precio.',
			'No sabemos qué se firmará ni cómo es el piso por dentro: por eso damos niveles y no una cifra exacta.',
			'No somos una tasación ni sustituimos al valor oficial.'
		],
		ejemplo,
		niveles,
		precioPedido: {
			titulo: 'Contratos vigentes, no anuncios',
			destacado:
				'La referencia sale de contratos vigentes: lo que paga hoy quien ya vive de alquiler, con contratos firmados en distintos años. Un anuncio muestra lo que se pide hoy por entrar.',
			cuerpo: 'Que un anuncio salga por encima no lo hace incorrecto: mide cuánto más se pide por entrar que lo que pagan quienes ya están dentro. Por eso nunca hablamos de precios correctos o incorrectos.',
			incluye: {
				titulo: 'Qué incluye la referencia',
				items: [
					'Contratos de alquiler de propietarios particulares, declarados en el IRPF de 2024.',
					'No incluye empresas, fondos ni contratos no declarados.'
				]
			},
			parteAlta: {
				titulo: 'Qué es la «parte alta»',
				texto: 'El valor por debajo del cual está la mayoría de los contratos de pisos como el tuyo (ajustado a la superficie). No es un máximo: hay contratos por encima.'
			}
		},
		anuncios: construirAnuncios(datos, mes),
		mapa: {
			parrafos: [
				'El mapa de Madrid pinta cada zona con la parte alta de su referencia en €/m² al mes, para la superficie que elijas (40, 55, 70, 90 o 110\u00A0m²). Lo calcula tu navegador con el mismo método y el mismo ajuste del IPC que el resultado.',
				'Los cinco colores reparten las zonas con dato en cinco grupos del mismo tamaño, con cortes iguales para toda la ciudad, y se recalculan al cambiar la superficie. Las zonas con 20 contratos o menos, y las superficies fuera de 30-150\u00A0m², salen como «sin dato».',
				'En «Mi presupuesto» comparamos tu presupuesto al mes con el rango de lo que pagan los contratos de cada zona para tus metros: por debajo de la parte baja, dentro del rango o por encima de la parte alta. En «Evolución 2015-2024» se ve cuánto ha subido la mediana de los contratos de cada zona, sin descontar la inflación.',
				`Con el selector «Contratos | Anuncios» de «Referencia» y «Mi presupuesto» ves una fuente u otra, nunca las dos a la vez. Con «Anuncios», «Referencia» pinta el €/m² medio de los anuncios recientes del barrio (o del distrito, con punteado, si el barrio no tiene dato) y «Mi presupuesto» compara tu presupuesto con la estimación (€/m² × tus metros): «No llega» por debajo del ${numero((1 - BANDA_EN_LINEA) * 100)}\u00A0%, «En línea» dentro de ±${numero(BANDA_EN_LINEA * 100)}\u00A0% y «Te sobra» por encima del ${numero((1 + BANDA_EN_LINEA) * 100)}\u00A0%. «Evolución» solo usa contratos.`
			],
			muestra: [
				'Con «Contratos»: lo que pagan quienes ya viven de alquiler, en contratos vigentes de distintas fechas, de propietarios particulares declarados a Hacienda (2024), ajustados por el IPC',
				'Con «Anuncios»: lo que se pide en los anuncios recientes de cada barrio o distrito, con su mes y la aclaración «no son contratos firmados»',
				'Cuánto ha subido la renta de los contratos entre 2015 y 2024',
				'Dónde llega tu presupuesto frente a esa referencia'
			],
			noMuestra: [
				'Pisos disponibles: ni los contratos ni la media de anuncios son pisos concretos que puedas alquilar a ese precio',
				'Las dos fuentes a la vez, ni la diferencia entre ellas',
				'Una ordenación de barrios: el color describe la referencia de cada zona, no su valor',
				'Tu ubicación: «Mi ubicación» se resuelve en tu navegador y no enviamos ni guardamos las coordenadas'
			]
		},
		datos: {
			parrafos: [
				'Los datos del anuncio los escribes tú; no leemos páginas de portales. Para situar el piso, la dirección se envía a nuestro servidor; no se guarda. Solo guardamos un análisis de anuncio si marcas la casilla, y guardamos el barrio, el mes, el precio, los metros y el nivel del resultado: nunca la dirección ni tu IP.',
				'Si vives de alquiler y pulsas «Aportar mi alquiler», guardamos el barrio, la renta, los metros, el mes y el año de la firma (y lo que pagabas al firmar, si lo has escrito). Si pulsas «Aportar mi habitación», guardamos el barrio, la renta, cuántas habitaciones tiene el piso, un tramo de tamaño (nunca los metros exactos), si incluye gastos y el mes. Ninguna aportación se envía sin pulsar, y nunca guardamos la dirección, la ubicación, tu nombre ni tu correo. Si compartes piso con un solo contrato y escribes cuántas personas sois, ese número solo se usa en tu pantalla (para enseñarte tu parte) y no se guarda ni se envía. «Usar mi ubicación» se queda en tu navegador: las coordenadas no se envían ni se guardan. Los análisis, las aportaciones de alquiler y las de habitaciones se guardan por separado y no se mezclan con los datos oficiales.',
				'Para limitar abusos usamos un código derivado de tu conexión que caduca a las 24 horas, y para no contar dos veces el mismo piso, otro hecho con el precio, los metros y el barrio que se guarda 30 días. Ninguno permite saber quién eres. La web se sirve desde Cloudflare, que, como cualquier alojamiento, ve la conexión. La lista de pisos comprobados en esta sesión vive solo en tu navegador (almacenamiento de sesión): guarda lo que escribiste en cada comprobación, con la dirección, y el resultado. Al comprobar, la dirección sí se envía a nuestro servidor para calcular el resultado, aunque no se guarda; lo que no sale de tu dispositivo es esta lista, que se borra al cerrar la pestaña.',
				'Si compartes una tarjeta, guardamos su imagen y los textos que ves (porcentaje, nivel y barrio) para que el enlace siga funcionando. No caducan automáticamente: si quieres que borremos una, escríbenos con su enlace.'
			],
			guardamos: ['El barrio', 'El mes', 'El precio o la renta', 'Los metros', 'El nivel del resultado', 'El mes y año de firma, si aportas tu alquiler', 'Habitaciones del piso, tramo de tamaño y gastos, si aportas una habitación'],
			noGuardamos: ['La dirección', 'Tu ubicación ni tus coordenadas', 'Tu IP', 'Nada si no pulsas «Aportar» o no marcas la casilla', 'Tu lista de pisos de esta sesión, dirección incluida: solo vive en tu navegador y se borra al cerrar la pestaña'],
			notas: [
				{ titulo: 'Código antiabuso', texto: ['Se deriva de tu conexión y caduca a las 24 horas.'] },
				{ titulo: 'Cloudflare', texto: ['Sirve la web y, como cualquier alojamiento, ve la conexión.'] },
				{
					titulo: 'Pasos de uso',
					ancha: true,
					texto: [
						'Para saber si la herramienta sirve, contamos pasos como empezar, obtener un resultado o compartir, junto con el tipo de resultado, el distrito, la capa del mapa que miras y desde dónde llegaste.',
						'Usamos PostHog, con servidores en la UE. Para medir no usa cookies ni guarda nada en tu navegador: para contar visitas recibe tu IP y los datos de tu navegador (su user agent, el idioma y el tamaño de pantalla), los usa para generar un identificador anónimo que cambia cada día y no los guarda. De las direcciones web solo enviamos la ruta y los parámetros de campaña, nunca la dirección, el precio ni los metros.'
					]
				}
			]
		},
		limites: {
			intro: 'En estos casos no hay una referencia fiable, así que no damos cifra oficial. Cada uno tiene su pantalla con la explicación.',
			items: LIMITES.map(([clave, titulo, descripcion]) => ({ clave, titulo, descripcion })),
			cierre: 'Y aunque haya cifra, no vemos el piso: su estado, su luz o su distribución pueden explicar diferencias. Si solo conocemos la calle, damos una horquilla. Los anuncios recientes tampoco se calculan con menos de 30\u00A0m² ni si la zona no tiene dato.'
		},
		fuentes: {
			filas: [
				{
					nombre: 'Sistema Estatal de Referencia del Precio del Alquiler de Vivienda (SERPAVI)', host: 'serpavi.mivau.gob.es', url: ENLACE_OFICIAL,
					uso: 'La referencia por zona y superficie, con datos de 2024.', atribucion: 'Origen de los datos: Ministerio de Vivienda y Agenda Urbana'
				},
				{
					nombre: 'Banco de Datos del Ayuntamiento de Madrid, serie 4.3.21.D (precio de oferta de alquiler, €/m²)', host: 'madrid.es', url: 'https://www.madrid.es',
					uso: `Los anuncios recientes por barrio y distrito${mesOferta ? `, ${mesOferta}` : ''}. Serie elaborada por el Ayuntamiento a partir de datos de Idealista; no usamos Idealista directamente.`,
					atribucion: OFERTA.fuente(mesOferta ?? 'último mes publicado')
				},
				{
					nombre: 'Índice de Precios de Consumo, alquiler de vivienda (INE)', host: 'ine.es', url: 'https://www.ine.es',
					uso: 'Poner la referencia al día hasta el último mes publicado. Serie IPC291807, subclase 04.1.1.0.', atribucion: 'Elaboración propia con datos extraídos del sitio web del INE: www.ine.es'
				},
				{
					nombre: 'CartoCiudad', host: 'cartociudad.es', url: 'https://www.cartociudad.es',
					uso: 'Situar la dirección en su zona y dibujar el mapa.', atribucion: 'CartoCiudad CC-BY 4.0 scne.es'
				},
				{
					nombre: 'Barrios del Ayuntamiento de Madrid y mapa de OpenStreetMap', host: 'openstreetmap.org', url: 'https://www.openstreetmap.org/copyright',
					uso: 'Los límites de los barrios y el mapa de fondo, servido desde esta web.', atribucion: 'Barrios: Ayuntamiento de Madrid. © OpenStreetMap contributors'
				}
			],
			ipc: `Último dato del IPC del alquiler: ${mes}, factor ${factor} (${pct}).`,
			validacion: 'Comprobamos nuestro cálculo contra la aplicación oficial con 30 casos: la diferencia máxima es de 0,6 céntimos al mes.',
			nota: AVISO_INDEPENDIENTE,
			enlaceOficial: ENLACE_OFICIAL
		},
		quienesSomos: { parrafos: QUIENES_SOMOS, contacto: { texto: 'Correcciones y contacto:', correo: CORREO } },
		financiacion: FINANCIACION,
		cta: { pregunta: '¿Lo pruebas con un anuncio?', boton: 'Comprobar un piso' },
		atribuciones: ATRIBUCIONES,
		aviso: AVISO_INDEPENDIENTE
	};
}
