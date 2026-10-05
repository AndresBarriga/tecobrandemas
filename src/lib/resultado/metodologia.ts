/**
 * Página «Cómo calculamos» (R8): método, fuentes, límites, quiénes somos y financiación.
 * El factor del IPC y su fecha salen de ipc_alquiler.json: aquí no hay cifras copiadas.
 * Mismas reglas de tono que textos.ts (lo comprueba tests/textos.test.ts).
 */
import { mesAnio, numero, porcentaje } from './formato';
import type { IpcJson } from './datos';
import { ATRIBUCIONES, AVISO_INDEPENDIENTE, ENLACE_OFICIAL, NOMBRE } from './textos';

export interface SeccionTexto {
	id: string;
	titulo: string;
	parrafos: string[];
	/** Lista con viñetas, tras los párrafos */
	puntos?: string[];
	/** Línea final con un enlace de correo */
	contacto?: { texto: string; correo: string };
}

export const CORREO = 'andresbarrigaru@gmail.com';

export interface Metodologia {
	titulo: string;
	intro: string;
	secciones: SeccionTexto[];
	atribuciones: readonly string[];
	aviso: string;
	enlaceOficial: string;
}

export const QUIENES_SOMOS: SeccionTexto = {
	id: 'quienes-somos',
	titulo: 'Quiénes somos',
	parrafos: [
		`${NOMBRE} es una iniciativa independiente para ayudar a las personas a entender mejor los precios de la vivienda.`,
		'Creamos esta herramienta porque, cuando buscas un alquiler, es difícil saber si el precio que aparece en un anuncio está dentro de lo razonable. Los portales muestran lo que se pide por una vivienda, pero eso no siempre permite saber cómo se compara con otras viviendas de la zona.',
		`${NOMBRE} pone ese precio en contexto utilizando datos públicos y una metodología basada en los datos y criterios publicados por el Ministerio de Vivienda y Agenda Urbana.`,
		'No somos una inmobiliaria, un portal de anuncios ni una administración pública. Tampoco determinamos cuál debería ser el precio de una vivienda. Nuestro objetivo es ofrecer una referencia independiente que ayude a cada persona a tomar sus propias decisiones.',
		'La herramienta es independiente de los propietarios, agencias inmobiliarias y portales de vivienda.'
	],
	contacto: { texto: 'Escríbenos a', correo: CORREO }
};

export const FINANCIACION: SeccionTexto = {
	id: 'financiacion',
	titulo: 'Financiación',
	parrafos: [
		`${NOMBRE} es una iniciativa independiente.`,
		'En esta primera etapa, el proyecto se desarrolla con recursos propios y no recibe financiación de partidos políticos, administraciones públicas, empresas inmobiliarias ni portales de vivienda.',
		'El objetivo es mantener la herramienta independiente de los intereses de quienes participan en el mercado del alquiler.',
		'Si en el futuro recibimos financiación externa, publicaremos quién la aporta y qué relación, si existe, tiene con el proyecto.'
	]
};

export function construirMetodologia(ipc: IpcJson): Metodologia {
	const factor = numero(ipc.factor, 3);
	const variacion = porcentaje(ipc.factor - 1, true);
	const hasta = mesAnio(ipc.ultimo_mes);

	return {
		titulo: 'Cómo calculamos',
		intro: `${NOMBRE} compara el precio de un anuncio con los alquileres registrados en su zona. Esto es lo que hacemos, con qué datos y qué límites tiene.`,
		secciones: [
			{
				id: 'referencia',
				titulo: 'La referencia',
				parrafos: [
					'Partimos del Sistema Estatal de Referencia del Precio del Alquiler de Vivienda (SERPAVI) del Ministerio de Vivienda y Agenda Urbana, con datos de 2024 por sección censal. Cada sección tiene un precio mediano, un percentil 25 y un percentil 75 del alquiler por m², y el número de alquileres registrados en que se basan.',
					'Con la superficie que indicas, aplicamos la fórmula de la metodología SERPAVI (apartado 5.3) para obtener un rango en euros al mes: desde la parte baja hasta la parte alta de lo que se paga en esa sección por un piso de ese tamaño.',
					'Comprobamos nuestro cálculo contra la aplicación oficial con 30 casos de prueba; la diferencia máxima es de 0,6 céntimos.'
				]
			},
			{
				id: 'ipc',
				titulo: 'Ajuste por el IPC',
				parrafos: [
					`Los datos de SERPAVI son de 2024. Para acercarlos al presente multiplicamos el rango por la variación del IPC del alquiler de vivienda entre la media de 2024 y el último mes publicado: factor ${factor} (${variacion}), con datos hasta ${hasta}.`,
					'Usamos el IPC del alquiler de vivienda principal porque mide lo que pagan las personas con contrato, igual que SERPAVI. No usamos índices de portales porque miden precios pedidos. El IPC es nacional: la serie del INE no distingue esta subclase por comunidad. El factor se actualiza cada mes.'
				]
			},
			{
				id: 'niveles',
				titulo: 'Los tres niveles',
				parrafos: [
					'La referencia no conoce las características de cada piso (reforma, calidad, servicios). Por eso, además de la parte alta, calculamos el techo que la propia metodología SERPAVI admite para un piso con las mejores características (apartado 5.4). Con ellos, el resultado tiene tres niveles:'
				],
				puntos: [
					'Dentro de la referencia: el precio no supera la parte alta de lo que se paga en la zona. Indicamos si está en la parte baja, media o alta.',
					'Explicable por las características: el precio supera la parte alta, pero no el techo para un piso excelente.',
					'Por encima del techo: el precio supera incluso el techo para un piso excelente. Mostramos cuánto supera la parte alta, en porcentaje y en euros al mes y al año.'
				]
			},
			{
				id: 'precio-pedido',
				titulo: 'Un precio pedido, no firmado',
				parrafos: [
					'Lo que comparamos es el precio que piden en el anuncio. No sabemos cuánto se acabará firmando: si se negocia, el precio final puede ser menor.',
					'SERPAVI, en cambio, recoge alquileres registrados. Compara lo que se pide con lo que ya se paga.'
				]
			},
			{
				id: 'limites',
				titulo: 'Límites',
				parrafos: ['Es una estimación y tiene límites que conviene conocer:'],
				puntos: [
					'Superficie: la introduces tú. Si el anuncio indica una superficie distinta de la real, el resultado cambia.',
					'Ubicación: ubicamos la dirección en una sección censal. Si la calle cruza varias secciones o no tenemos el número exacto, damos un rango y lo avisamos.',
					'Sin referencia: no calculamos viviendas de menos de 30 m² o más de 150 m², obra nueva, casas unifamiliares, alquileres de temporada o de media estancia, ni secciones con 20 o menos alquileres registrados.',
					'Actualidad: la referencia parte de 2024 y se ajusta con el IPC. No es una tasación ni sustituye al valor oficial.'
				]
			},
			{
				id: 'fuentes',
				titulo: 'Fuentes',
				parrafos: [
					'Origen de los datos: Ministerio de Vivienda y Agenda Urbana (SERPAVI, datos de 2024 por sección censal).',
					`IPC del alquiler de vivienda: INE, subclase 04.1.1.0, serie IPC291807, hasta ${hasta}.`,
					'Secciones censales y direcciones: INE (Censo 2021) y CartoCiudad (IGN). Barrios: Ayuntamiento de Madrid. Mapa base: © OpenStreetMap contributors, servido desde esta web.'
				]
			},
			{
				id: 'tus-datos',
				titulo: 'Tus datos',
				parrafos: [
					'Los datos del anuncio los escribes tú; no leemos páginas de portales. Nunca guardamos la dirección ni tu IP, y la web no usa cookies.',
					'Solo guardamos un análisis si marcas la casilla «Suma este piso a las estadísticas de tu barrio». Entonces guardamos el barrio, el mes, el precio, los metros y el nivel del resultado. En «¿Cuánto pagas tú?» guardamos el barrio, el mes, el precio, los metros, el año en que empezó el contrato y lo que incluye, también solo si aceptas. Los análisis y las aportaciones se guardan por separado y no se mezclan con los datos oficiales.',
					'Para no contar dos veces el mismo piso guardamos durante 30 días un código hecho con el precio, los metros y el barrio. Para limitar abusos usamos un código derivado de tu conexión que caduca a las 24 horas. Ninguno de los dos permite saber quién eres.',
					'Contamos pasos de uso (entrar, comprobar un piso, compartir) sin precio ni lugar, con un identificador aleatorio que se queda en tu navegador mientras dura la sesión. Si compartes una tarjeta, se guarda el barrio, el mes, el nivel y las proporciones de la barra, nunca el precio.',
					'La web se sirve desde Cloudflare, que, como cualquier alojamiento, ve la conexión. La lista de pisos comprobados en esta sesión se queda solo en tu navegador y se borra al cerrarlo.'
				]
			},
			QUIENES_SOMOS,
			FINANCIACION
		],
		atribuciones: ATRIBUCIONES,
		aviso: AVISO_INDEPENDIENTE,
		enlaceOficial: ENLACE_OFICIAL
	};
}
