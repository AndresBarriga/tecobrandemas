/**
 * Centro de preguntas (/preguntas): cuatro páginas con la misma estructura. Todo el texto está aquí, en un solo sitio,
 * para revisarlo y para que un test compruebe longitudes, vocabulario y JSON-LD.
 *
 * Reglas: sin cifras de análisis de usuarios, sin pisos reales, sin opinar sobre leyes ni partidos. Los números de las
 * tablas y los ejemplos son hipotéticos y van marcados «Ejemplo». «Caro» solo sale en preguntas y títulos, tal como se
 * busca. Nuestro cálculo es una estimación independiente; el valor oficial es el de SERPAVI.
 */

/** Autor de todas las páginas (artículo y JSON-LD): el mismo que nombra «Quiénes somos» */
export const AUTOR = 'Andres Barriga';
export const AUTOR_PUESTO = 'Product Manager';

/** Última actualización de los textos (AAAA-MM-DD); se enseña como DD/MM/AAAA y va en el JSON-LD y en el sitemap */
export const FECHA_PREGUNTAS = '2026-10-13';

export interface Fuente {
	texto: string;
	url: string;
	/** Se abre en pestaña nueva con rel="noopener" */
	nuevaPestana?: boolean;
}

export interface TablaEjemplo {
	/** Siempre «Ejemplo» (los números son hipotéticos) */
	titulo: string;
	cabecera: string[];
	filas: string[][];
}

export interface SeccionPregunta {
	/** H2: una pregunta real */
	h2: string;
	parrafos: string[];
	tabla?: TablaEjemplo;
	/** Cita textual de una norma, con su enlace */
	cita?: { texto: string[]; fuente: Fuente };
	/** Enlaces destacados justo después del primer párrafo (pasos con una herramienta oficial) */
	enlaces?: Fuente[];
	/** Párrafos después de la tabla o la cita */
	despues?: string[];
}

export interface PaginaPregunta {
	slug: string;
	/** Valor de utm_content del botón de la herramienta (hasta 40 caracteres; así lo admite la analítica) */
	utm: string;
	/** Modo con el que se abre la herramienta */
	modo: 'mirando' | 'vivo';
	boton: string;
	/** <title>, sin « · A su precio» (se añade al final) */
	titulo: string;
	descripcion: string;
	h1: string;
	/** Las dos primeras frases: la respuesta, que se entiende sola */
	respuesta: string[];
	/** Aviso destacado debajo de la respuesta (opcional) */
	aviso?: string;
	/** Párrafos destacados justo después del aviso (opcional) */
	avisoExtra?: string[];
	secciones: SeccionPregunta[];
	faq: { q: string; a: string }[];
	fuentes: Fuente[];
	/** Slugs de las dos preguntas relacionadas */
	relacionadas: [string, string];
}

const CALCULADORA: Fuente = { texto: 'Calculadora oficial del Ministerio de Vivienda y Agenda Urbana para actualizar la renta', url: 'https://www.mivau.gob.es/vivienda/calculadora-precio-alquiler' };
const SERPAVI: Fuente = { texto: 'Ministerio de Vivienda y Agenda Urbana: SERPAVI, sistema estatal de referencia del precio del alquiler', url: 'https://serpavi.mivau.gob.es' };
const LEY_VIVIENDA: Fuente = { texto: 'BOE: Ley 12/2023, de 24 de mayo, por el derecho a la vivienda', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2023-12203' };
const RDL: Fuente = { texto: 'BOE: Real Decreto-ley 29/2026, de 6 de octubre (BOE núm. 249, de 07/10/2026)', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2026-20823' };
const MADRID: Fuente = { texto: 'Ayuntamiento de Madrid: serie 4.3.21.D de precios de oferta (elaboración a partir de datos de Idealista)', url: 'https://servpub.madrid.es/CSEBD_WBINTER/seleccionSerie.html?numSerie=0504030000214' };

const P1 = 'como-saber-si-un-alquiler-es-caro-en-madrid';
const P2 = 'que-es-el-indice-de-referencia-del-alquiler';
const P3 = 'por-que-los-anuncios-son-mas-caros-que-los-contratos';
const P4 = 'supera-mi-alquiler-el-indice-de-referencia';

const PAGINAS: PaginaPregunta[] = [
	{
		slug: P1,
		utm: 'comparar-alquiler',
		modo: 'mirando',
		boton: 'Comprobar un anuncio',
		titulo: 'Alquiler caro en Madrid: cómo saberlo',
		descripcion: 'Compara tu alquiler con lo que pagan quienes ya viven de alquiler en tu zona, ajustado a tu tamaño. Compruébalo gratis en un minuto.',
		h1: '¿Cómo saber si un alquiler está caro en Madrid?',
		respuesta: [
			'Compáralo con lo que pagan quienes ya viven de alquiler en la zona: los contratos declarados a Hacienda que recoge el índice de referencia del Ministerio de Vivienda (SERPAVI).',
			'La referencia se ajusta al tamaño de la vivienda; los contratos son de 2024 y los alquileres han subido desde entonces.'
		],
		secciones: [
			{
				h2: '¿Qué hay que comparar?',
				parrafos: [
					'Tres datos bastan: la zona, los metros cuadrados y el tipo de vivienda. La zona importa porque el alquiler cambia mucho de una calle a otra. Los metros importan porque los pisos pequeños suelen costar más por metro cuadrado.',
					'El tipo de vivienda también cuenta: un piso, una casa y una habitación no se comparan entre sí. Con la dirección exacta se sitúa el piso en su sección censal, la unidad más pequeña de la referencia.',
					'Si dudas de algún dato, míralo en el anuncio o en tu contrato: ahí figuran los metros y el tipo de vivienda.'
				]
			},
			{
				h2: '¿Por qué no basta con mirar otros anuncios?',
				parrafos: [
					'Los anuncios muestran lo que se pide ahora, no lo que acaba firmándose. Pueden bajar, negociarse o llevar meses publicados. Además, cada portal tiene su propia muestra de pisos.',
					'Un piso parecido en otra calle puede anunciarse a otro precio sin que eso diga nada del tuyo.',
					'Los contratos vigentes miden otra cosa: lo que pagan quienes ya viven allí. Las dos cifras sirven, pero responden a preguntas distintas y no se mezclan.'
				]
			},
			{
				h2: '¿Cómo se comprueba en un minuto?',
				parrafos: [
					'Escribe la dirección, el precio al mes y los metros, y elige si es tu alquiler o un anuncio. La herramienta responde con una palabra (POR DEBAJO, DENTRO, ALGO POR ENCIMA o POR ENCIMA) y una barra que muestra dónde cae el precio.'
				],
				tabla: {
					titulo: 'Ejemplo (hipotético): un piso de 70 m² en una zona imaginaria, donde la parte baja de lo que pagan quienes ya viven allí es 700 € y la parte alta, 900 €. Si fuera un piso excelente, el margen llegaría a 1.050 €',
					cabecera: ['Precio al mes', 'Resultado'],
					filas: [
						['650 €', 'POR DEBAJO'],
						['800 €', 'DENTRO'],
						['950 €', 'ALGO POR ENCIMA'],
						['1.150 €', 'POR ENCIMA']
					]
				}
			},
			{
				h2: '¿Qué hago con el resultado?',
				parrafos: [
					'Si estás buscando piso, úsalo para decidir si negocias o sigues buscando. Puedes pedir al propietario que explique la diferencia, por ejemplo qué incluye el precio. Si ya vives de alquiler, te dice dónde estás frente a tu zona.',
					'Con «DENTRO», tu precio está entre la parte baja y la parte alta de lo que pagan quienes ya viven allí. Con «POR ENCIMA», conviene preguntar por qué: puede haber una razón, como un piso excelente o una reforma reciente.',
					'El resultado es una estimación independiente. El valor oficial es el de SERPAVI (serpavi.mivau.gob.es), que se consulta con los datos de la vivienda.'
				]
			},
			{
				h2: '¿Qué límites tiene la comparación?',
				parrafos: [
					'No vemos el piso por dentro. Una reforma reciente, unas buenas vistas o un edificio con ascensor y garaje pueden justificar un precio más alto. Por eso damos una palabra y un margen, no una cifra exacta.',
					'Tampoco sabemos qué se firmará al final: un anuncio puede cambiar de precio.'
				]
			}
		],
		faq: [
			{ q: '¿Esto me dice si pago demasiado?', a: 'No. Te dice dónde queda tu precio frente a lo que pagan quienes ya viven de alquiler en tu zona, no si el precio es adecuado.' },
			{ q: '¿Sirve para cualquier barrio de Madrid?', a: 'Sirve para la ciudad de Madrid, donde hay datos suficientes. Si una zona tiene muy pocos contratos, te lo decimos en lugar de dar una cifra.' },
			{ q: '¿Hace falta registrarse?', a: 'No. Es gratis y no se guarda tu dirección.' },
			{ q: '¿Qué datos se usan?', a: 'Los contratos de 2024 del Ministerio de Vivienda, tal como los publica el SERPAVI. Los alquileres han subido desde entonces.' }
		],
		fuentes: [SERPAVI, LEY_VIVIENDA],
		relacionadas: [P2, P3]
	},
	{
		slug: P2,
		utm: 'indice-referencia',
		modo: 'vivo',
		boton: 'Comprobar mi alquiler',
		titulo: 'Índice de referencia del alquiler (SERPAVI)',
		descripcion: 'El índice de referencia (SERPAVI) da un rango de alquiler por zona según contratos declarados a Hacienda. Qué es y cómo comprobar el tuyo gratis.',
		h1: '¿Qué es el índice de referencia del alquiler (SERPAVI)?',
		respuesta: [
			'Es el sistema del Ministerio de Vivienda y Agenda Urbana (SERPAVI) que da un rango de precio por zona y tipo de vivienda a partir de contratos de alquiler declarados a Hacienda.',
			'La ley lo usa como límite en algunos casos, y cualquiera puede consultarlo para ver qué pagan quienes ya viven de alquiler en su zona.'
		],
		secciones: [
			{
				h2: '¿De dónde salen los datos?',
				parrafos: [
					'De los contratos de alquiler de vivienda que los propietarios particulares declaran a Hacienda en el IRPF. Son contratos ya firmados, de fechas distintas. No son anuncios ni precios pedidos.',
					'Declarar el alquiler en el IRPF es una obligación del propietario, así que la fuente es administrativa y no depende de lo que se anuncie.',
					'Una zona solo tiene dato si hay contratos suficientes. En A su precio, una zona con pocos contratos aparece como «sin dato».'
				]
			},
			{
				h2: '¿Qué información da?',
				parrafos: [
					'Un rango de precio para cada zona (sección censal) y tipo de vivienda, con una parte baja y una parte alta. Después se ajusta según las características de la vivienda, como el tamaño, la antigüedad o si tiene ascensor.',
					'Para un mismo lugar, el rango cambia con el tamaño y con el tipo de vivienda. Por eso dos pisos de la misma calle pueden tener referencias distintas.',
					'La parte alta no es un máximo: hay contratos por encima. Es el valor por debajo del cual está la mayoría.'
				],
				tabla: {
					titulo: 'Ejemplo (hipotético): una vivienda de 70 m² en una zona imaginaria',
					cabecera: ['Dato', 'Valor al mes'],
					filas: [
						['Parte baja de lo que pagan quienes ya viven allí', '700 €'],
						['Parte alta', '900 €']
					]
				}
			},
			{
				h2: '¿Para qué se usa por ley?',
				parrafos: [
					'La Ley 12/2023, de 24 de mayo, por el derecho a la vivienda, prevé el índice como límite de la renta inicial en zonas declaradas tensionadas cuando el arrendador es gran tenedor. Esa regla está en el apartado 7 del artículo 17 de la Ley de Arrendamientos Urbanos.',
					'El Real Decreto-ley 29/2026 lo usa además para la actualización anual de la renta hasta el 31/12/2027 y para graduar una reducción fiscal del propietario en el IRPF. Es un decreto-ley pendiente de convalidación, y la actualización anual se explica en otra pregunta.',
					'Que la ley lo use no lo convierte en un precio fijo: fuera de esos casos es solo una referencia informativa.'
				]
			},
			{
				h2: '¿En qué se diferencia de los precios de los portales?',
				parrafos: [
					'Los portales publican lo que se pide ahora por viviendas disponibles. El índice recoge lo que pagan quienes ya tienen contrato. Son cosas distintas y pueden dar cifras distintas.',
					'En A su precio mostramos las dos referencias por separado y nunca las mezclamos.'
				]
			},
			{
				h2: '¿Cómo se consulta?',
				parrafos: [
					'La consulta oficial está en serpavi.mivau.gob.es: introduces la dirección y las características de la vivienda. Ese es el valor oficial.',
					'Ten a mano la dirección, los metros y datos como el año de construcción, el estado de conservación y la altura del piso.',
					'En A su precio puedes hacer una estimación rápida para Madrid en un minuto. Es independiente: si hay diferencia, vale el dato oficial.'
				]
			}
		],
		faq: [
			{ q: '¿Es el índice un precio máximo?', a: 'No en general: es la parte alta de lo que pagan quienes ya viven allí, y hay contratos por encima. Solo tiene efecto legal en los casos que fija la norma.' },
			{ q: '¿Cómo se actualiza?', a: 'A su precio no actualiza los contratos: usa los datos de 2024 tal como los publica el Ministerio, y los alquileres han subido desde entonces. El valor oficial depende de la versión que publique el Ministerio.' },
			{ q: '¿Quién puede consultarlo?', a: 'Cualquier persona, en la web del Ministerio de Vivienda y Agenda Urbana.' },
			{ q: '¿Cubre toda España?', a: 'El sistema es estatal y las comunidades autónomas pueden tener el suyo. A su precio solo calcula para la ciudad de Madrid.' }
		],
		fuentes: [SERPAVI, LEY_VIVIENDA, RDL],
		relacionadas: [P1, P4]
	},
	{
		slug: P3,
		utm: 'anuncios-contratos',
		modo: 'mirando',
		boton: 'Comprobar un anuncio',
		titulo: 'Anuncios de alquiler vs. contratos firmados',
		descripcion: 'Los anuncios piden más porque son precios nuevos; los contratos reflejan alquileres firmados antes. Entiende la diferencia y comprueba tu caso gratis.',
		h1: '¿Por qué los anuncios piden más de lo que pagan los inquilinos actuales?',
		respuesta: [
			'Porque miden cosas distintas: un anuncio es el precio que se pide ahora por un piso libre, y un contrato refleja lo que se acordó al firmarlo, a veces hace años.',
			'Los alquileres nuevos suelen salir por encima de los contratos vigentes de la misma zona.'
		],
		secciones: [
			{
				h2: '¿Qué es la oferta y qué es el conjunto de contratos?',
				parrafos: [
					'La oferta es lo que se pide ahora en los anuncios. El conjunto de contratos son todos los alquileres vigentes, firmados en momentos distintos. Cuando un piso sale al mercado, entra en la oferta con el precio de este momento.',
					'Los contratos incluyen alquileres de hace años, que se han ido actualizando poco a poco.',
					'Piensa en un edificio: quien firmó hace cuatro años y quien firma ahora pueden pagar cifras distintas por pisos casi iguales.'
				]
			},
			{
				h2: '¿Por qué los alquileres nuevos suelen salir por encima de la referencia?',
				parrafos: [
					'Quien anuncia fija el precio mirando lo que ve ahora. Quien lleva años en su piso paga una renta pactada antes y actualizada con los límites que fija cada contrato y la ley. Además, un anuncio es un precio pedido: puede bajar al negociar.',
					'Esto no significa que el anuncio sea un error ni que el contrato antiguo sea mejor: son momentos distintos del mercado.'
				],
				tabla: {
					titulo: 'Ejemplo (hipotético): una zona imaginaria, piso de 70 m²',
					cabecera: ['Referencia', 'Qué mide', 'Rango al mes'],
					filas: [
						['Contratos vigentes', 'Lo que pagan quienes ya viven allí', '700 € a 900 €'],
						['Anuncios recientes', 'Lo que se pide ahora', '950 € a 1.200 €']
					]
				},
				despues: ['Las dos cifras son ciertas. Responden a preguntas distintas.']
			},
			{
				h2: '¿Qué significa esto al leer tu resultado?',
				parrafos: [
					'A su precio compara tu precio con cada referencia por separado. Un resultado «POR ENCIMA» de los contratos y «EN LÍNEA» con los anuncios significa que ese precio se parece a lo que se pide ahora, aunque supere lo que pagan quienes ya viven allí.',
					'Eso te da un argumento para preguntar y negociar, no una sentencia. No es un veredicto sobre el propietario ni sobre el piso: es un dato más para decidir.'
				]
			},
			{
				h2: '¿Qué datos usa A su precio para cada referencia?',
				parrafos: [
					'Los contratos salen de SERPAVI (Ministerio de Vivienda), con datos de 2024 que no actualizamos: los alquileres han subido desde entonces. Los anuncios recientes salen de la serie 4.3.21.D del Ayuntamiento de Madrid, elaborada a partir de datos de Idealista.',
					'Los anuncios ya son recientes, pero se ajustan por tamaño: los pisos pequeños suelen anunciarse con un precio mayor por metro cuadrado.'
				]
			},
			{
				h2: '¿Estar por encima dice si algo cumple la ley?',
				parrafos: [
					'No. Estar por encima de una referencia no indica si un precio cumple o incumple la ley. Eso depende de cada caso: la zona, el tipo de arrendador y la fecha del contrato.',
					'Para saber qué te aplica, consulta el valor oficial en SERPAVI o pide asesoramiento profesional. Cuentan el valor oficial y, en su caso, la norma que se aplique a tu contrato.'
				]
			}
		],
		faq: [
			{ q: '¿Los anuncios siempre piden más que los contratos?', a: 'No siempre. Depende de la zona y del momento, por eso comparamos cada piso con su zona.' },
			{ q: '¿Se puede negociar el precio de un anuncio?', a: 'Sí, el precio pedido puede cambiar. Un dato concreto de tu zona ayuda a explicar tu propuesta.' },
			{ q: '¿Los contratos antiguos pagan siempre menos?', a: 'No siempre. Depende de cuándo se firmaron y de cómo se han actualizado, por eso miramos la referencia de cada zona.' },
			{ q: '¿Por qué A su precio no mezcla anuncios y contratos?', a: 'Porque miden cosas distintas. Mostramos cada referencia por separado y cada una se compara solo con tu precio.' }
		],
		fuentes: [SERPAVI, MADRID],
		relacionadas: [P1, P2]
	},
	{
		slug: P4,
		utm: 'subida-alquiler',
		modo: 'vivo',
		boton: 'Comprobar mi alquiler',
		titulo: 'Subida del alquiler e índice de referencia',
		descripcion: 'Según el Real Decreto-ley 29/2026, si tu renta supera el límite del índice no procede subirla; si no, el 2 % sin acuerdo. Comprueba tu caso.',
		h1: '¿Supera mi alquiler el índice de referencia? Cómo comprobarlo',
		respuesta: [
			'Según el Real Decreto-ley 29/2026 (BOE de 07/10/2026), mientras esté vigente la medida (hasta el 31/12/2027), si tu renta supera el límite máximo del sistema de índices de referencia no procede ningún incremento en la actualización anual.',
			'Si no lo supera, el incremento es el que pacten las partes y, sin acuerdo, no puede ser superior al 2 %.'
		],
		aviso: 'Pendiente de convalidación por la Diputación Permanente del Congreso. El plazo constitucional vence hacia el 5 de noviembre de 2026. Estado a 13/10/2026. No es asesoramiento legal.',
		avisoExtra: [
			'El texto de la disposición final sexta no exige que la vivienda esté en una zona tensionada, y el Ministerio de Vivienda ha incorporado el índice estatal a su calculadora de actualización de la renta. Aun así, no hay una aclaración oficial expresa sobre cómo se determina el “límite máximo aplicable” fuera de esas zonas, como la ciudad de Madrid. No des por hecho ni que se aplica ni que no se aplica a tu contrato: consulta la calculadora oficial y, si dudas, pide asesoramiento.'
		],
		secciones: [
			{
				h2: '¿Qué dice el decreto?',
				parrafos: [
					'La disposición final sexta limita la actualización anual de la renta de los alquileres de vivienda sujetos a la Ley de Arrendamientos Urbanos. Se aplica a las actualizaciones que toquen desde el 08/10/2026 hasta el 31/12/2027. Dice literalmente:'
				],
				cita: {
					texto: [
						'«a) En el caso de que la renta sea superior al límite máximo del precio aplicable conforme al sistema de índices de precios de referencia, no procederá la aplicación de incremento alguno de la renta.',
						'b) En los demás casos, el incremento de la renta será el que resulte del nuevo pacto entre las partes. En ausencia de este nuevo pacto entre las partes, el incremento de la renta a aplicar no podrá ser superior al dos por ciento.»'
					],
					fuente: { texto: 'Real Decreto-ley 29/2026, disposición final sexta (BOE)', url: RDL.url }
				},
				despues: ['Cuando corresponda, también se aplica el límite general de actualización del IRAV (Índice de Referencia de Arrendamientos de Vivienda) del INE.']
			},
			{
				h2: '¿A qué contratos afecta y qué no queda claro?',
				parrafos: [
					'El texto habla de contratos de alquiler de vivienda sujetos a la Ley 29/1994. No lo limita a zonas tensionadas ni a una comunidad concreta. El propio decreto-ley dice que se aplica sin perjuicio de los regímenes civiles forales y de las competencias autonómicas en vivienda.',
					'El texto de la disposición final sexta no exige que la vivienda esté en una zona tensionada, y el Ministerio de Vivienda ha incorporado el índice estatal a su calculadora de actualización de la renta. Aun así, no hay una aclaración oficial expresa sobre cómo se determina el “límite máximo aplicable” fuera de esas zonas, como la ciudad de Madrid. No des por hecho ni que se aplica ni que no se aplica a tu contrato: consulta la calculadora oficial y, si dudas, pide asesoramiento.',
					'La actualización anual toca en la fecha en que tu contrato cumple un año más. Si esa fecha cae entre el 08/10/2026 y el 31/12/2027, la regla de arriba es la que importa.'
				]
			},
			{
				h2: '¿Cómo compruebo mi caso?',
				enlaces: [CALCULADORA],
				parrafos: [
					'Primero, usa la calculadora oficial del Ministerio de Vivienda: calcula la actualización de la renta que corresponde a tu contrato. Después, consulta el valor oficial en SERPAVI (serpavi.mivau.gob.es) con la dirección y las características de tu vivienda. Por último, para una estimación rápida en Madrid, usa A su precio.',
					'Nuestra estimación es independiente; si difiere del valor oficial, vale el oficial.'
				],
				tabla: {
					titulo: 'Ejemplo (hipotético): una renta de 900 € al mes en una zona imaginaria. El «límite oficial» de la tabla es inventado y puede no existir para tu zona',
					cabecera: ['Límite oficial (hipotético)', 'Tu renta frente al límite', 'Qué dice el decreto'],
					filas: [
						['950 €', 'No lo supera', 'El pacto entre las partes; sin pacto, hasta 18 € más (el 2 %)'],
						['850 €', 'Lo supera', 'Ningún incremento']
					]
				}
			},
			{
				h2: '¿Qué significa estar por encima o por debajo?',
				parrafos: [
					'«Por encima» del límite oficial es el caso del apartado a): no procede subir la renta. «Por debajo» es el del apartado b): lo que se pacte o, sin pacto, hasta el 2 %.',
					'Si tu renta es igual al límite, no es «superior»: encaja en el apartado b). El resultado de A su precio («DENTRO», «ALGO POR ENCIMA»…) es una orientación, no el cálculo legal.'
				]
			}
		],
		faq: [
			{
				q: '¿Y en Madrid?',
				a: 'El texto de la disposición final sexta no exige que la vivienda esté en una zona tensionada, y el Ministerio de Vivienda ha incorporado el índice estatal a su calculadora de actualización de la renta. Aun así, no hay una aclaración oficial expresa sobre cómo se determina el «límite máximo aplicable» fuera de esas zonas, como la ciudad de Madrid, así que no des por hecho que se aplica ni que no: consulta la calculadora oficial.'
			},
			{ q: '¿Cuánto es el 2 % de mi renta?', a: 'Multiplica tu renta mensual por 0,02: 18 € con 900 € (ejemplo).' },
			{ q: '¿Qué pasa si el Congreso no lo convalida?', a: 'Si no se convalida, deja de estar en vigor; si se convalida, sigue vigente y puede modificarse.' }
		],
		fuentes: [CALCULADORA, RDL, SERPAVI, LEY_VIVIENDA],
		relacionadas: [P2, P1]
	}
];

/** Los espacios de las cifras («2 %», «900 €», «70 m²») no se parten */
const unir = (s: string) => s.replace(/(\d) (€|%|m²)/g, '$1 $2');

function unirTodo<T>(valor: T): T {
	if (typeof valor === 'string') return unir(valor) as T;
	if (Array.isArray(valor)) return valor.map(unirTodo) as T;
	if (valor && typeof valor === 'object') return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, unirTodo(v)])) as T;
	return valor;
}

export const PREGUNTAS: PaginaPregunta[] = unirTodo(PAGINAS);

export const HUB_PREGUNTAS = unirTodo({
	titulo: 'Preguntas sobre alquiler en Madrid',
	descripcion: 'Respuestas claras sobre el precio del alquiler en Madrid: cómo compararlo, qué es el índice de referencia y qué dice la norma. Comprueba el tuyo gratis.',
	h1: 'Preguntas sobre el precio del alquiler en Madrid',
	intro: 'Respuestas cortas sobre cómo comparar un alquiler con lo que pagan quienes ya viven de alquiler en su zona.',
	boton: 'Comprobar mi alquiler',
	utm: 'hub',
	grupos: [
		{ titulo: 'Si estás buscando piso', paginas: [P1, P3] },
		{ titulo: 'Si ya vives de alquiler', paginas: [P4, P1] },
		{ titulo: 'Sobre los datos', paginas: [P2], extra: { texto: 'Cómo calculamos', href: '/como-calculamos' } }
	]
});

export const preguntaPorSlug = (slug: string): PaginaPregunta | undefined => PREGUNTAS.find((p) => p.slug === slug);

/** Enlace de la herramienta desde una página de preguntas: portada, con el modo y la campaña */
export const enlaceHerramienta = (modo: 'mirando' | 'vivo', utm: string): string => `/?modo=${modo}&utm_source=preguntas&utm_content=${utm}`;

/** «2026-10-13» → «13/10/2026» */
export const fechaLegible = (iso: string): string => iso.split('-').reverse().join('/');

/** Todo el texto visible de una página, para contar palabras y revisar el vocabulario */
export function textoDePagina(p: PaginaPregunta, conFuentes = false): string[] {
	const t: string[] = [p.h1, ...p.respuesta];
	if (p.aviso) t.push(p.aviso);
	if (p.avisoExtra) t.push(...p.avisoExtra);
	for (const s of p.secciones) {
		t.push(s.h2, ...s.parrafos);
		if (s.enlaces) t.push(...s.enlaces.map((e) => e.texto));
		if (s.tabla) t.push(s.tabla.titulo, ...s.tabla.cabecera, ...s.tabla.filas.flat());
		if (s.cita) t.push(...s.cita.texto, s.cita.fuente.texto);
		if (s.despues) t.push(...s.despues);
	}
	for (const f of p.faq) t.push(f.q, f.a);
	if (conFuentes) t.push(...p.fuentes.map((f) => f.texto));
	return t;
}
