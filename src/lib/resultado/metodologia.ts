/**
 * Página «Cómo calculamos» (R8): lo que se escanea en 30 segundos, cómo se lee el resultado (las palabras de cada
 * referencia), un ejemplo paso a paso con el mismo motor y la misma escala que el resultado, las dos referencias,
 * el mapa y «Tu zona», los datos que se guardan, lo que no se calcula, las fuentes, quiénes somos y financiación.
 *
 * Nada de cifras copiadas: el factor y el mes del IPC salen de ipc_alquiler.json, la oferta de oferta_madrid.json y el
 * ejemplo se calcula con los datos de la zona (Embajadores, 45 m², 1.400 €; el mismo de la portada). Si cambian los
 * datos, cambia el ejemplo. Mismas reglas de tono que textos.ts (lo comprueba tests/textos.test.ts).
 */
import { type Anuncio, BANDA_EN_LINEA, type Referencia, referencia, tieneDato } from '../motor';
import { type Costura, escalaCostura } from './costura';
import { type DatosMadrid, type IpcJson, datosSeccion } from './datos';
import { euros, mesAnio, numero, porcentaje } from './formato';
import { construirPantalla } from './resultado';
import { ATRIBUCIONES, AVISO_INDEPENDIENTE, ENLACE_OFICIAL, ANIO_SERPAVI, COSTURA, OFERTA, type ClaveSinDato, NOMBRE } from './textos';
import type { Ubicacion } from './ubicacion';

const NB = ' ';
export const CORREO = 'hola@asuprecio.com';

/** Una zona de Embajadores (Centro): el ejemplo de la portada y de «Cómo calculamos» */
export const CUSEC_EJEMPLO = '2807901040';
export const ANUNCIO_EJEMPLO: Anuncio = { precio: 1400, superficie: 45, obraNueva: false, tipo: 'piso', largaDuracion: true };
export const UBICACION_EJEMPLO: Ubicacion = {
	cusecs: [CUSEC_EJEMPLO], aproximada: false, motivo: null, numerosUsados: [], punto: { lon: -3.703, lat: 40.406 }, via: null
};

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

/** Un carril como los de la costura: contratos (negro) u oferta (claro). Todo en fracciones de la misma escala */
export interface CarrilEjemplo {
	fuente: 'contratos' | 'oferta';
	/** Lo habitual (contratos) */
	banda: TramoEscala | null;
	/** La referencia sin ajustar, con contorno discontinuo (paso 2) */
	anterior: TramoEscala | null;
	/** Hasta el máximo si fuera un piso excelente */
	excelente: TramoEscala | null;
	/** La oferta estimada: marca vertical ciruela */
	marca: number | null;
	/** El margen «en línea»: línea fina bajo el carril */
	margen: TramoEscala | null;
	/** El precio: círculo amarillo */
	punto: number | null;
}

/** Bajo el carril: qué es cada cosa y su valor («lo habitual · 685–987 €») */
export interface LeyendaEjemplo {
	clave: 'banda' | 'anterior' | 'excelente' | 'marca' | 'margen';
	texto: string;
	valor: string;
}

export interface PasoEjemplo {
	n: number;
	fuente: 'contratos' | 'oferta' | 'precio';
	titulo: string;
	descripcion: string;
	aria: string;
	/** null en el último paso: allí va el resultado (la costura) */
	carril: CarrilEjemplo | null;
	leyenda: LeyendaEjemplo[];
}

export interface Ejemplo {
	intro: string;
	pasos: PasoEjemplo[];
	/** El resultado del ejemplo, tal y como lo ve la persona («Un anuncio») */
	costura: Costura;
}

/** Una palabra del resultado: su explicación y dónde caería el precio */
export interface PalabraLectura {
	palabra: string;
	texto: string;
	carril: CarrilEjemplo;
}

export interface GrupoLectura {
	fuente: 'contratos' | 'oferta';
	etiqueta: string;
	pregunta: string;
	items: PalabraLectura[];
}

export interface Lectura {
	intro: string;
	color: string;
	grupos: GrupoLectura[];
	asuPrecio: { titulo: string; texto: string };
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
	/** null sin datos de la zona del ejemplo */
	lectura: Lectura | null;
	ejemplo: Ejemplo | null;
	precioPedido: { titulo: string; destacado: string; cuerpo: string; incluye: { titulo: string; items: string[] }; tramos: { titulo: string; texto: string }[] };
	/** La oferta (serie 4.3.21.D) como segunda referencia: tabla de las dos fuentes y dos desplegables */
	anuncios: {
		titulo: string;
		intro: string;
		tabla: { columnas: [string, string]; filas: { etiqueta: string; contratos: string; anuncios: string }[] };
		enLinea: string;
		estimacion: { titulo: string; texto: string };
		limites: { titulo: string; items: string[] };
	};
	mapa: { titulo: string; parrafos: string[]; tuZona: { titulo: string; parrafos: string[] }; muestra: string[]; noMuestra: string[] };
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
	{ id: 'leer', titulo: 'Cómo se lee el resultado' },
	{ id: 'ej', titulo: 'Paso a paso' },
	{ id: 'ped', titulo: 'Contratos' },
	{ id: 'anu', titulo: 'Oferta' },
	{ id: 'map', titulo: 'El mapa y Tu zona' },
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
const carril = (fuente: CarrilEjemplo['fuente'], c: Partial<Omit<CarrilEjemplo, 'fuente'>>): CarrilEjemplo => ({
	fuente, banda: null, anterior: null, excelente: null, marca: null, margen: null, punto: null, ...c
});

interface Base {
	sin: Referencia;
	con: Referencia;
	oferta: { estimada: number; eurosM2: number; banda: number; nivel: 'barrio' | 'distrito'; mes: string } | null;
	costura: Costura;
	lugar: string;
	X: (v: number) => number;
}

/** Los datos del ejemplo, con el motor y la misma escala que la costura */
function baseEjemplo(datos: DatosMadrid): Base | null {
	const s = datosSeccion(datos, CUSEC_EJEMPLO);
	if (!tieneDato(s)) return null;
	const p = construirPantalla(ANUNCIO_EJEMPLO, UBICACION_EJEMPLO, datos);
	if (p.tipo !== 'resultado') return null;
	const a = ANUNCIO_EJEMPLO;
	const sin = referencia(a.superficie, s, 1);
	const con = referencia(a.superficie, s, datos.ipc.factor);
	const o = p.entradaCostura.oferta;
	const oferta = o ? { estimada: o.estimada, eurosM2: o.eurosM2, banda: o.banda, nivel: o.nivel, mes: o.mes } : null;
	const { X } = escalaCostura([con.inf, a.precio, con.max, ...(oferta ? [oferta.estimada * (1 - oferta.banda), oferta.estimada * (1 + oferta.banda)] : [])]);
	return { sin, con, oferta, costura: p.costura, lugar: p.vista.lugar, X };
}

function construirEjemplo(b: Base, f: number, ultimoMes: string): Ejemplo {
	const { sin, con, oferta, X } = b;
	const a = ANUNCIO_EJEMPLO;
	const tramo = (inf: number, sup: number): TramoEscala => ({ desde: X(inf), hasta: X(sup) });
	const m2 = `${numero(a.superficie)}${NB}m²`;
	const habitual = (r: Referencia): LeyendaEjemplo => ({ clave: 'banda', texto: COSTURA.contratos.banda, valor: rango(r.inf, r.sup) });
	const excelente: LeyendaEjemplo = { clave: 'excelente', texto: 'máximo si fuera un piso excelente', valor: euros(con.max) };

	const pasos: PasoEjemplo[] = [
		{
			n: 1, fuente: 'contratos', titulo: 'Lo que pagan en la zona',
			descripcion: `Con los contratos vigentes de esta zona para ${m2}, lo habitual va de ${numero(sin.inf)} a ${euros(sin.sup)} al mes. Son datos de ${ANIO_SERPAVI}.`,
			aria: `Referencia sin ajustar, de ${numero(sin.inf)} a ${euros(sin.sup)}`,
			carril: carril('contratos', { banda: tramo(sin.inf, sin.sup) }),
			leyenda: [habitual(sin)]
		},
		{
			n: 2, fuente: 'contratos', titulo: `Con el ajuste del IPC (×${numero(f, 3)})`,
			descripcion: `Multiplicamos por ${numero(f, 3)} (${porcentaje(f - 1, true)} hasta ${mesAnio(ultimoMes)}): lo habitual pasa a ir de ${numero(con.inf)} a ${euros(con.sup)} al mes. El contorno discontinuo marca lo de antes.`,
			aria: `Referencia ajustada, de ${numero(con.inf)} a ${euros(con.sup)}`,
			carril: carril('contratos', { banda: tramo(con.inf, con.sup), anterior: tramo(sin.inf, sin.sup) }),
			leyenda: [habitual(con), { clave: 'anterior', texto: 'sin ajustar', valor: rango(sin.inf, sin.sup) }]
		},
		{
			n: 3, fuente: 'contratos', titulo: 'Si fuera un piso excelente',
			descripcion: `La referencia deja margen para las mejores características (ascensor, garaje, reforma reciente, piscina o vistas): hasta ${euros(con.max)}. Es el máximo de la referencia, no del mercado: hay contratos por encima.`,
			aria: `Lo habitual, de ${numero(con.inf)} a ${euros(con.sup)}; máximo si fuera un piso excelente, ${euros(con.max)}`,
			carril: carril('contratos', { banda: tramo(con.inf, con.sup), excelente: tramo(con.sup, con.max) }),
			leyenda: [habitual(con), excelente]
		}
	];
	if (oferta) {
		const lo = oferta.estimada * (1 - oferta.banda);
		const hi = oferta.estimada * (1 + oferta.banda);
		pasos.push({
			n: 4, fuente: 'oferta', titulo: 'Lo que se pide ahora',
			descripcion: `Los anuncios del ${oferta.nivel} piden de media ${numero(oferta.eurosM2, 2)}${NB}€/m² (${mesAnio(oferta.mes)}). Por ${m2}: ≈${euros(oferta.estimada)} al mes. «En línea» es ±${numero(oferta.banda * 100)}${NB}% de esa cifra: de ${numero(lo)} a ${euros(hi)}.`,
			aria: `Lo que se pide ahora, ≈${euros(oferta.estimada)}; en línea, de ${numero(lo)} a ${euros(hi)}`,
			carril: carril('oferta', { marca: X(oferta.estimada), margen: tramo(lo, hi) }),
			leyenda: [
				{ clave: 'marca', texto: 'se pide', valor: `≈${euros(oferta.estimada)}` },
				{ clave: 'margen', texto: 'en línea', valor: rango(lo, hi) }
			]
		});
	}
	pasos.push({
		n: pasos.length + 1, fuente: 'precio', titulo: 'Tu precio, frente a cada una',
		descripcion: `${euros(a.precio)} se compara con cada referencia por separado, nunca una con otra. Así queda el resultado: arriba, lo que se pide, porque es un anuncio; abajo, los contratos.`,
		aria: '', carril: null, leyenda: []
	});
	return {
		intro: `Un anuncio de ${m2} en ${b.lugar} por ${euros(a.precio)} al mes. Las barras usan la misma escala que el resultado.`,
		pasos,
		costura: b.costura
	};
}

function construirLectura(b: Base): Lectura {
	const { con, oferta, X } = b;
	const banda = `${numero(BANDA_EN_LINEA * 100)}${NB}%`;
	const P = COSTURA.palabras;
	const contratos = (x: number) => carril('contratos', { banda: { desde: X(con.inf), hasta: X(con.sup) }, excelente: { desde: X(con.sup), hasta: X(con.max) }, punto: X(x) });
	const grupos: GrupoLectura[] = [
		{
			fuente: 'contratos', etiqueta: 'Contratos', pregunta: COSTURA.contratos.pregunta,
			items: [
				{ palabra: P.debajo, texto: 'Por debajo de la parte baja de lo habitual.', carril: contratos(con.inf * 0.9) },
				{ palabra: P.dentro, texto: 'Entre la parte baja y lo más alto de lo habitual. Te decimos si cae en la parte baja, media o alta.', carril: contratos((con.inf + con.sup) / 2) },
				{ palabra: P.algo, texto: 'Supera lo más alto de lo habitual, pero no el máximo si fuera un piso excelente: puede cuadrar si el piso lo es.', carril: contratos((con.sup + con.max) / 2) },
				{ palabra: P.encima, texto: 'Supera incluso el máximo si fuera un piso excelente. La cifra dice cuánto pasa de lo más alto de lo habitual: en %, o en veces desde el doble.', carril: contratos(con.max * 1.15) }
			]
		}
	];
	if (oferta) {
		const e = oferta.estimada;
		const ofe = (x: number) => carril('oferta', { marca: X(e), margen: { desde: X(e * (1 - oferta.banda)), hasta: X(e * (1 + oferta.banda)) }, punto: X(x) });
		grupos.push({
			fuente: 'oferta', etiqueta: 'Oferta', pregunta: '¿Cuánto se pide ahora por entrar?',
			items: [
				{ palabra: P.enLinea, texto: `A menos de un ${banda} de lo que se pide, por arriba o por abajo.`, carril: ofe(e * 1.04) },
				{ palabra: P.encima, texto: `Más de un ${banda} por encima de lo que se pide.`, carril: ofe(e * 1.22) },
				{ palabra: P.debajo, texto: `Más de un ${banda} por debajo de lo que se pide. Solo en «Un anuncio».`, carril: ofe(e * 0.8) },
				{ palabra: P.pidenMas, texto: `Solo en «Mi alquiler»: pagas más de un ${banda} menos de lo que se pide. Si buscaras piso ahora, te pedirían más.`, carril: ofe(e * 0.8) }
			]
		});
	}
	return {
		intro: 'El resultado tiene dos mitades, una por referencia, y cada una se compara solo con tu precio. Arriba va la que más importa en tu caso: los contratos en «Mi alquiler»; lo que se pide en «Un anuncio». Cada mitad da una palabra y, si hace falta, una cifra.',
		color: 'El color dice de dónde sale cada cosa, no si está bien o mal: negro para los contratos, morado para lo que se pide y amarillo para tu precio.',
		grupos,
		asuPrecio: {
			titulo: COSTURA.titular.asuPrecio,
			texto: 'Abre el titular solo cuando la referencia que más importa en tu caso lo confirma: en «Mi alquiler», si estás DENTRO de lo habitual en los contratos; en «Un anuncio», si estás EN LÍNEA con lo que se pide.'
		}
	};
}

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * «Anuncios recientes»: el mes y la serie salen de oferta_madrid.json y los del IPC de ipc_alquiler.json; la banda de
 * «en línea», de config/oferta.json. Sin el fichero de oferta (solo en pruebas) se habla del último mes publicado.
 */
function construirAnuncios(datos: DatosMadrid | undefined, mesIpc: string): Metodologia['anuncios'] {
	const mes = datos?.oferta ? mayuscula(mesAnio(datos.oferta.mes)) : 'El último mes publicado';
	const serie = datos?.oferta?.serie ?? '4.3.21.D';
	const banda = numero(BANDA_EN_LINEA * 100);
	return {
		titulo: 'Oferta',
		intro: 'Junto a los contratos mostramos lo que se pide ahora en los anuncios del barrio o del distrito: la oferta. Son dos referencias distintas y cada una se compara solo con tu precio.',
		tabla: {
			columnas: ['Contratos', 'Oferta'],
			filas: [
				{ etiqueta: 'Qué mide', contratos: 'Lo que paga quien ya vive de alquiler, con contratos firmados en distintos años', anuncios: 'Lo que se pide por pisos anunciados, antes de cerrar el precio' },
				{
					etiqueta: 'Fuente',
					contratos: `SERPAVI ${ANIO_SERPAVI} (Ministerio de Vivienda y Agenda Urbana, con datos de Hacienda)`,
					anuncios: `Serie ${serie} del Ayuntamiento de Madrid, elaborada a partir de Idealista`
				},
				{ etiqueta: 'Datos de', contratos: `${ANIO_SERPAVI}, puestos al día con el IPC del alquiler hasta ${mesIpc}`, anuncios: mes },
				{ etiqueta: 'Ten en cuenta', contratos: 'Solo propietarios particulares', anuncios: 'Es lo que se anuncia, no lo que se firma' }
			]
		},
		enLinea: `«En línea» significa que tu precio queda dentro de ±${banda}\u00A0% de la estimación: lo que se pide de media por un piso de tus metros.`,
		estimacion: {
			titulo: 'Cómo calculamos la estimación',
			texto: 'Multiplicamos el €/m² de la zona por tus metros cuadrados. Usamos la media del barrio si tiene datos en los dos últimos meses; si no, la del distrito. Solo lo calculamos con 30\u00A0m² o más. Si tu dirección cae en varias zonas posibles, solo damos la cifra cuando todas son del mismo barrio o distrito.'
		},
		limites: {
			titulo: 'Límites de la oferta',
			items: [
				'La resolución es de barrio o distrito: dentro de cada uno, los precios pueden variar mucho. El dato de un barrio cambia más de un mes a otro que el de un distrito.',
				'Si un barrio no tiene datos suficientes, usamos la media de su distrito y lo marcamos con punteado en el mapa.',
				'La serie viene de Idealista: refleja lo que se anuncia allí, no todo el mercado. Se publica con unos 3-4 meses de retraso.',
				'El IPC con el que ajustamos los contratos es nacional, no de Madrid, y no se aplica a los anuncios.'
			]
		}
	};
}

export function construirMetodologia(ipc: IpcJson, datos?: DatosMadrid): Metodologia {
	const factor = numero(ipc.factor, 3);
	const pct = porcentaje(ipc.factor - 1, true);
	const mes = mesAnio(ipc.ultimo_mes);
	const base = datos ? baseEjemplo({ ...datos, ipc }) : null;
	const ejemplo = base ? construirEjemplo(base, ipc.factor, ipc.ultimo_mes) : null;
	const lectura = base ? construirLectura(base) : null;

	const mesOferta = datos?.oferta ? mesAnio(datos.oferta.mes) : null;

	return {
		titulo: 'Cómo calculamos',
		intro: 'Qué datos usamos, qué hacemos con ellos y hasta dónde llegan.',
		indice: INDICE.map((i) => ({ ...i })),
		treintaSegundos: [
			'Comparamos el precio de un anuncio, o de tu alquiler, con dos referencias: lo que pagan quienes ya viven de alquiler en la zona (contratos vigentes declarados a Hacienda, 2024) y lo que se pide ahora en los anuncios del barrio o del distrito.',
			`Ajustamos los contratos con el IPC del alquiler: ${pct} hasta ${mes}. Lo que se pide no se ajusta: ya es reciente.`,
			'Los contratos ya están firmados, algunos hace años; los anuncios son precios pedidos que aún pueden cambiar. Miden cosas distintas: cada referencia se compara solo con tu precio, nunca una con otra.',
			'No vemos el piso por dentro ni sabemos qué se firmará: por eso damos una palabra y un margen, no una cifra exacta.',
			'No somos una tasación ni sustituimos al valor oficial.'
		],
		lectura,
		ejemplo,
		precioPedido: {
			titulo: 'Contratos vigentes',
			destacado:
				'Lo que paga quien ya vive de alquiler en la zona, con contratos firmados en distintos años. Los datos son del sistema de referencia del Ministerio de Vivienda y Agenda Urbana (SERPAVI), con datos de Hacienda; el cálculo es nuestro.',
			cuerpo: 'Que un anuncio salga por encima no lo hace incorrecto: mide cuánto más se pide por entrar que lo que pagan quienes ya están dentro. Por eso nunca hablamos de precios correctos o incorrectos.',
			incluye: {
				titulo: 'Qué incluye la referencia',
				items: [
					'Contratos de alquiler de propietarios particulares, declarados en el IRPF de 2024.',
					'No incluye empresas, fondos ni contratos no declarados.'
				]
			},
			tramos: [
				{
					titulo: 'Lo habitual y lo más alto de lo habitual',
					texto: 'Lo habitual es la franja en la que está la mayoría de los contratos de pisos como el tuyo, ajustada a la superficie: va de la parte baja a lo más alto de lo habitual.'
				},
				{
					titulo: 'Máximo si fuera un piso excelente',
					texto: 'El margen que da la referencia a los pisos con las mejores características: ascensor, garaje, reforma reciente, piscina o vistas. Es el máximo de la referencia, no del mercado: hay contratos por encima.'
				}
			]
		},
		anuncios: construirAnuncios(datos, mes),
		mapa: {
			titulo: 'El mapa y Tu zona',
			parrafos: [
				'El mapa de Madrid pinta cada zona con lo más alto de lo habitual de su referencia, en €/m² al mes, para la superficie que elijas (40, 55, 70, 90 o 110\u00A0m²). Lo calcula tu navegador con el mismo método y el mismo ajuste del IPC que el resultado.',
				'Los cinco colores reparten las zonas con dato en cinco grupos del mismo tamaño, con cortes iguales para toda la ciudad, y se recalculan al cambiar la superficie. Las zonas con 20 contratos o menos, y las superficies fuera de 30-150\u00A0m², salen como «sin dato».',
				'En «Mi presupuesto» comparamos tu presupuesto al mes con el rango de lo que pagan los contratos de cada zona para tus metros: por debajo de la parte baja, dentro de lo habitual o por encima de lo más alto de lo habitual. En «Evolución 2015-2024» se ve cuánto ha subido la mediana de los contratos de cada zona, sin descontar la inflación.',
				`Con el selector «Contratos | Oferta» de «Referencia» y «Mi presupuesto» ves una fuente u otra, nunca las dos a la vez. Con «Oferta», «Referencia» pinta el €/m² medio de los anuncios recientes del barrio (o del distrito, con punteado, si el barrio no tiene dato) y «Mi presupuesto» compara tu presupuesto con la estimación (€/m² × tus metros): «No llega» por debajo del ${numero((1 - BANDA_EN_LINEA) * 100)}\u00A0%, «En línea» dentro de ±${numero(BANDA_EN_LINEA * 100)}\u00A0% y «Te sobra» por encima del ${numero((1 + BANDA_EN_LINEA) * 100)}\u00A0%. «Evolución» solo usa contratos.`
			],
			tuZona: {
				titulo: 'Tu zona',
				parrafos: [
					'Bajo cada resultado, «Tu zona» dibuja tu zona y las que hay a 1,5\u00A0km o menos, con los mismos colores que el mapa de Madrid. Con «Contratos | Oferta» eliges qué pinta: empieza en «Contratos» en «Mi alquiler» y en «Oferta» en «Un anuncio».',
					'Si en alguna zona cercana tu precio entraría en lo habitual, te las enseñamos (hasta cinco), con su referencia y la distancia. Si no hay ninguna, no se muestra la lista.'
				]
			},
			muestra: [
				'Con «Contratos»: lo que pagan quienes ya viven de alquiler, en contratos vigentes de distintas fechas, de propietarios particulares declarados a Hacienda (2024), ajustados por el IPC',
				'Con «Oferta»: lo que se pide en los anuncios recientes de cada barrio o distrito, con su mes y la aclaración «no son contratos firmados»',
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
