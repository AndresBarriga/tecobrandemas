/**
 * Piloto de páginas de barrio (/alquiler/[slug]): 15 barrios de Madrid con la referencia de lo que pagan quienes ya viven
 * de alquiler, para 50, 70 y 90 m². Todo sale de los mismos datos y del mismo motor que la herramienta (SERPAVI 2024); no
 * hay cifras escritas a mano, así que cuando cambian los datos cambian solas.
 *
 * Método por barrio: para cada zona (sección censal) del barrio con más de 20 contratos se calcula la referencia con el
 * motor (`referencia`, con el ajuste por tamaño) y se toma la MEDIANA de las zonas, por separado para la parte
 * baja y para la parte alta. Dentro del barrio la cifra varía según la calle y las características de la vivienda.
 *
 * Reglas de contenido: sin evolución en el tiempo, sin comparar con anuncios, con la media de Madrid ni con otros barrios,
 * sin rankings (el índice va por distrito y en orden alfabético) y sin datos de análisis de usuarios.
 */
import { referencia, motivoSeccion } from '../motor';
import type { DatosMadrid } from './datos';
import { euros, numero } from './formato';
import type { Fuente } from './preguntas';
import { NOTA_DATOS } from './textos';
import { ESTADISTICA_SERPAVI_MADRID } from './enlaces';

/** AAAA-MM-DD: última revisión de las plantillas de texto. El `lastmod` del sitemap es esta misma fecha */
export const FECHA_BARRIOS = '2026-10-13';

export const TAMANOS_BARRIO = [50, 70, 90] as const;
export type TamanoBarrio = (typeof TAMANOS_BARRIO)[number];
/** El tamaño de la respuesta, el de la descripción y el del índice */
export const TAMANO_CLAVE: TamanoBarrio = 70;

export interface BarrioPiloto {
	/** Código de barrio de seccion_barrio.json */
	codigo: string;
	oficial: string;
	/** Nombre popular, si difiere del oficial */
	popular?: string;
	/** Nombre oficial anterior (el barrio se llamó Palos de Moguer hasta octubre de 2022): el slug conserva el nombre con el que se sigue buscando */
	antiguo?: string;
	/** Cómo se dice dentro de una frase si lleva artículo («el Barrio de las Letras») */
	enFrase?: string;
	slug: string;
}

/** Los 15 barrios del piloto. Sin tildes ni eñes en el slug */
export const BARRIOS_PILOTO: BarrioPiloto[] = [
	{ codigo: '012', oficial: 'Embajadores', popular: 'Lavapiés', slug: 'lavapies-embajadores' },
	{ codigo: '015', oficial: 'Universidad', popular: 'Malasaña', slug: 'malasana-universidad' },
	{ codigo: '014', oficial: 'Justicia', popular: 'Chueca', slug: 'chueca-justicia' },
	{ codigo: '013', oficial: 'Cortes', popular: 'Barrio de las Letras', enFrase: 'el Barrio de las Letras', slug: 'barrio-de-las-letras-cortes' },
	{ codigo: '092', oficial: 'Argüelles', slug: 'arguelles' },
	{ codigo: '073', oficial: 'Trafalgar', slug: 'trafalgar' },
	{ codigo: '072', oficial: 'Arapiles', slug: 'arapiles' },
	{ codigo: '042', oficial: 'Goya', slug: 'goya' },
	{ codigo: '025', oficial: 'Delicias', slug: 'delicias' },
	{ codigo: '062', oficial: 'Cuatro Caminos', slug: 'cuatro-caminos' },
	{ codigo: '052', oficial: 'Prosperidad', slug: 'prosperidad' },
	{ codigo: '102', oficial: 'Puerta del Ángel', slug: 'puerta-del-angel' },
	{ codigo: '114', oficial: 'Vista Alegre', slug: 'vista-alegre' },
	{ codigo: '152', oficial: 'Pueblo Nuevo', slug: 'pueblo-nuevo' },
	{ codigo: '026', oficial: 'Palos de la Frontera', antiguo: 'Palos de Moguer', slug: 'palos-de-moguer' }
];

export const barrioPilotoPorSlug = (slug: string): BarrioPiloto | undefined => BARRIOS_PILOTO.find((b) => b.slug === slug);
export const barrioPilotoPorCodigo = (codigo: string): BarrioPiloto | undefined => BARRIOS_PILOTO.find((b) => b.codigo === codigo);

/** Nombre del barrio dentro de una frase: el popular (con su artículo si lo lleva) o el oficial */
export const nombreEnFrase = (b: BarrioPiloto): string => b.enFrase ?? b.popular ?? b.oficial;

/** «Lavapiés (Embajadores)»; si el popular y el oficial coinciden, solo el oficial */
export const nombreCompleto = (b: BarrioPiloto): string => (b.popular ? `${nombreEnFrase(b)} (${b.oficial})` : b.oficial);

/** Nombre para listas y enlaces que empiezan por él: sin el artículo («Barrio de las Letras (Cortes)») */
export const nombreListado = (b: BarrioPiloto): string => (b.popular ? `${b.popular} (${b.oficial})` : b.oficial);

/** H1 de la página de un barrio */
export const h1Barrio = (b: BarrioPiloto): string => `Precio de referencia del alquiler en ${nombreCompleto(b)}, Madrid`;

const SUFIJO_TITULO = ' · A su precio';

/**
 * <title> (≤60): «Alquiler en [Popular]: precio de referencia». Si no cabe con el nombre popular se prueba con el oficial y, si
 * tampoco, con la forma corta «Alquiler en [nombre]: referencia»
 */
export function tituloBarrio(b: BarrioPiloto): string {
	const nombres = [b.popular, b.oficial].filter((n): n is string => !!n);
	for (const cola of [': precio de referencia', ': referencia']) {
		for (const nombre of nombres) {
			const t = `Alquiler en ${nombre}${cola}${SUFIJO_TITULO}`;
			if (t.length <= 60) return t;
		}
	}
	return `Alquiler en ${b.oficial}: referencia${SUFIJO_TITULO}`;
}

export const H1_INDICE_BARRIOS = 'Precio de referencia del alquiler por barrios de Madrid';
export const TITULO_INDICE_BARRIOS = 'Alquiler por barrios de Madrid: referencia';

// ——— Cálculo ———

export type VecinasJson = Record<string, Record<string, number>>;

export interface DatosBarrios extends Pick<DatosMadrid, 'secciones' | 'barrios'> {
	/** vecinas.json: para cada sección, las secciones cercanas; 0 = comparten límite */
	vecinas: VecinasJson;
}

function mediana(valores: number[]): number {
	const s = [...valores].sort((a, b) => a - b);
	const m = s.length >> 1;
	return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/** Secciones del barrio con dato suficiente: más de 20 contratos y superficie mediana de 30 a 150 m² (los criterios del motor) */
export function seccionesConDato(datos: Pick<DatosMadrid, 'secciones'>, codigo: string): string[] {
	return Object.entries(datos.secciones)
		.filter(([c, s]) => s.barrio === codigo && motivoSeccion({ cusec: c, smed: s.smed, p25: s.p25, p75: s.p75, n: s.n }) === null)
		.map(([c]) => c)
		.sort();
}

export interface RangoBarrio {
	/** €/mes, sin redondear: parte baja y parte alta de la referencia (mediana de las zonas del barrio) */
	inf: number;
	sup: number;
}

/** La referencia de un barrio para `m2`, con el mismo motor, y los mismos datos que la herramienta */
export function rangoBarrio(datos: DatosBarrios, codigo: string, m2: number): RangoBarrio | null {
	const cusecs = seccionesConDato(datos, codigo);
	if (!cusecs.length) return null;
	const refs = cusecs.map((c) => {
		const s = datos.secciones[c]!;
		return referencia(m2, { cusec: c, smed: s.smed!, p25: s.p25!, p75: s.p75!, n: s.n! });
	});
	return { inf: mediana(refs.map((r) => r.inf)), sup: mediana(refs.map((r) => r.sup)) };
}

/** Redondeo a 10 € al mes, que es como se escribe */
export const redondear10 = (n: number): number => Math.round(n / 10) * 10;

export interface FilaBarrio {
	m2: TamanoBarrio;
	inf: number;
	sup: number;
	/** €/m² al mes */
	infM2: number;
	supM2: number;
}

/** Las tres filas (50, 70 y 90 m²); null si el barrio no tiene dato suficiente para alguna */
export function filasBarrio(datos: DatosBarrios, codigo: string): FilaBarrio[] | null {
	const filas: FilaBarrio[] = [];
	for (const m2 of TAMANOS_BARRIO) {
		const r = rangoBarrio(datos, codigo, m2);
		if (!r || !Number.isFinite(r.inf) || !Number.isFinite(r.sup) || r.inf <= 0 || r.sup <= r.inf) return null;
		filas.push({ m2, inf: redondear10(r.inf), sup: redondear10(r.sup), infM2: r.inf / m2, supM2: r.sup / m2 });
	}
	return filas;
}

/** ¿Tiene el barrio dato suficiente para 50, 70 y 90 m²? Si no, no se publica */
export const barrioPublicable = (datos: DatosBarrios, codigo: string): boolean => filasBarrio(datos, codigo) !== null;

/** El barrio del piloto al que pertenece una sección, para el enlace «Ver la referencia de…» del mapa; null si no es del piloto */
export function barrioPilotoDeSeccion(datos: Pick<DatosMadrid, 'secciones'>, cusec: string): { slug: string; nombre: string } | null {
	const codigo = datos.secciones[cusec]?.barrio;
	const b = codigo ? barrioPilotoPorCodigo(codigo) : undefined;
	return b ? { slug: b.slug, nombre: b.oficial } : null;
}

/** Barrios que comparten límite con éste (alguna sección suya toca otra del otro barrio), por nombre y sin repetir */
export function barriosVecinos(datos: DatosBarrios, codigo: string): { codigo: string; nombre: string }[] {
	const propias = new Set(Object.entries(datos.secciones).filter(([, s]) => s.barrio === codigo).map(([c]) => c));
	const vistos = new Set<string>();
	for (const c of propias) {
		for (const [otra, d] of Object.entries(datos.vecinas[c] ?? {})) {
			const b = datos.secciones[otra]?.barrio;
			if (d === 0 && b && b !== codigo) vistos.add(b);
		}
	}
	return [...vistos]
		.map((b) => ({ codigo: b, nombre: datos.barrios[b]?.nombre ?? b }))
		.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

// ——— Página de un barrio ———

export interface PaginaBarrio {
	slug: string;
	codigo: string;
	h1: string;
	titulo: string;
	descripcion: string;
	/** AAAA-MM-DD: última revisión de la página (FECHA_BARRIOS); va en el JSON-LD y en el sitemap */
	modificado: string;
	respuesta: string[];
	boton: string;
	utm: { source: 'barrio'; content: string };
	tabla: { cabecera: string[]; filas: string[][] };
	comoLeer: { h2: string; parrafos: string[]; enlaces: Fuente[] };
	donde: { h2: string; parrafos: string[]; vecinos: { slug: string; nombre: string }[] };
	faq: { q: string; a: string }[];
	fuentes: Fuente[];
	contratos: number;
	zonas: number;
}

const SERPAVI: Fuente = { texto: 'Ministerio de Vivienda y Agenda Urbana: SERPAVI, sistema estatal de referencia del precio del alquiler', url: 'https://serpavi.mivau.gob.es' };
export const CALCULADORA_MINISTERIO: Fuente = {
	texto: 'Calculadora oficial del Ministerio de Vivienda y Agenda Urbana para actualizar la renta',
	url: 'https://www.mivau.gob.es/vivienda/calculadora-precio-alquiler'
};

const NB = ' ';
const al_mes = (inf: number, sup: number) => `${numero(inf)} a ${numero(sup)}${NB}€`;
const rangoMensual = (f: FilaBarrio) => `de ${al_mes(f.inf, f.sup)} al mes`;
const rangoM2 = (f: FilaBarrio) => `de ${numero(f.infM2, 1)} a ${numero(f.supM2, 1)}${NB}€/m²`;

/** Meta description (≤155): con el nombre completo y, si no cabe, con el nombre corto */
function descripcionBarrio(completo: string, corto: string, rango: string, m2: string): string {
	const cola = `: ${rango} para ${m2}, según contratos vigentes. Compruébalo con tu dirección.`;
	for (const nombre of [completo, corto]) {
		const d = `Referencia del alquiler en ${nombre}${cola}`;
		if (d.length <= 155) return d;
	}
	return `Alquiler en ${corto}${cola}`.slice(0, 155);
}

export function enlaceHerramientaBarrio(slug: string): string {
	return `/?utm_source=barrio&utm_content=${slug}`;
}

export function construirBarrio(datos: DatosBarrios, slug: string): PaginaBarrio | null {
	const b = barrioPilotoPorSlug(slug);
	if (!b) return null;
	const filas = filasBarrio(datos, b.codigo);
	if (!filas) return null;
	const f70 = filas.find((f) => f.m2 === TAMANO_CLAVE)!;
	const info = datos.barrios[b.codigo]!;
	const cusecs = seccionesConDato(datos, b.codigo);
	const contratos = cusecs.reduce((t, c) => t + (datos.secciones[c]!.n ?? 0), 0);
	const nombre = nombreEnFrase(b);
	const completo = nombreCompleto(b);
	const m2 = (n: number) => `${n}${NB}m²`;

	const vecinosTodos = barriosVecinos(datos, b.codigo);
	// Los vecinos del piloto, en orden alfabético, hasta tres
	const vecinosPiloto = vecinosTodos
		.map((v) => barrioPilotoPorCodigo(v.codigo))
		.filter((v): v is BarrioPiloto => !!v)
		.sort((x, y) => x.oficial.localeCompare(y.oficial, 'es'))
		.slice(0, 3)
		.map((v) => ({ slug: v.slug, nombre: nombreCompleto(v) }));
	const limita = vecinosTodos.map((v) => v.nombre);
	const listaLimita = limita.length > 1 ? `${limita.slice(0, -1).join(', ')} y ${limita.at(-1)}` : (limita[0] ?? '');

	return {
		slug,
		codigo: b.codigo,
		h1: h1Barrio(b),
		titulo: tituloBarrio(b).replace(SUFIJO_TITULO, ''),
		descripcion: descripcionBarrio(completo, nombre, rangoMensual(f70), m2(TAMANO_CLAVE)),
		modificado: FECHA_BARRIOS,
		respuesta: [
			`Para un piso de ${m2(TAMANO_CLAVE)} en ${completo}, la referencia de lo que pagan quienes ya viven de alquiler va de ${euros(f70.inf)} (parte baja) a ${euros(f70.sup)} (parte alta) al mes.`,
			'Fuente: SERPAVI (Ministerio de Vivienda y Agenda Urbana), rentas declaradas en 2024; los alquileres han subido desde entonces.'
		],
		boton: `Comprobar mi alquiler en ${nombre}`,
		utm: { source: 'barrio', content: slug },
		tabla: {
			cabecera: ['Tamaño', 'Parte baja a parte alta, al mes', 'Por metro cuadrado, al mes'],
			filas: filas.map((f) => [m2(f.m2), `${al_mes(f.inf, f.sup)}`, `${numero(f.infM2, 1)} a ${numero(f.supM2, 1)}${NB}€/m²`])
		},
		comoLeer: {
			h2: 'Cómo leer estos datos',
			parrafos: [
				`Es lo que pagan quienes ya viven de alquiler en ${info.nombre}, según contratos declarados a Hacienda. No es lo que se pide en los anuncios.`,
				`La cifra del barrio es la mediana de ${numero(cusecs.length)} zonas con dato, con ${numero(contratos)} contratos registrados. Dentro del barrio varía según la calle y las características de la vivienda.`,
				'Es una estimación independiente. El valor oficial está en SERPAVI (serpavi.mivau.gob.es) y, para saber cuánto puede subir una renta, en la calculadora oficial del Ministerio de Vivienda.'
			],
			enlaces: [SERPAVI, CALCULADORA_MINISTERIO, { ...ESTADISTICA_SERPAVI_MADRID, nuevaPestana: true }]
		},
		donde: {
			h2: 'Dónde está',
			parrafos: [
				`${info.nombre} es un barrio del distrito de ${info.distrito}, en Madrid.${limita.length ? ` Limita con ${listaLimita}.` : ''}`,
				b.popular
					? `Los datos corresponden al barrio oficial de ${info.nombre}, al que se conoce popularmente como ${b.popular}.`
					: b.antiguo
						? `Los datos corresponden al barrio oficial de ${info.nombre}, que hasta octubre de 2022 se llamó ${b.antiguo}.`
						: `Los datos corresponden al barrio oficial de ${info.nombre}.`
			],
			vecinos: vecinosPiloto
		},
		faq: [
			{ q: `¿Cuánto se paga por un piso de ${m2(50)} en ${nombre}?`, a: `La referencia para ${m2(50)} en ${info.nombre} va ${rangoMensual(filas[0]!)}, ${rangoM2(filas[0]!)}.` },
			{ q: `¿Y por un piso de ${m2(90)} en ${nombre}?`, a: `Para ${m2(90)}, la referencia va ${rangoMensual(filas[2]!)}, ${rangoM2(filas[2]!)}.` },
			{
				q: `¿Qué contratos hay detrás de la referencia de ${nombre}?`,
				a: `${numero(contratos)} contratos de propietarios particulares declarados a Hacienda, repartidos en ${numero(cusecs.length)} zonas del barrio de ${info.nombre}.`
			}
		],
		fuentes: [SERPAVI, CALCULADORA_MINISTERIO],
		contratos,
		zonas: cusecs.length
	};
}

// ——— Índice /alquiler ———

export interface IndiceBarrios {
	/** Por distrito, en orden alfabético; dentro, los barrios en orden alfabético (nunca por precio) */
	distritos: { distrito: string; barrios: { slug: string; nombre: string; rango70: string }[] }[];
}

export function construirIndiceBarrios(datos: DatosBarrios): IndiceBarrios {
	const porDistrito = new Map<string, { b: BarrioPiloto; rango70: string }[]>();
	for (const b of BARRIOS_PILOTO) {
		const filas = filasBarrio(datos, b.codigo);
		if (!filas) continue;
		const f70 = filas.find((f) => f.m2 === TAMANO_CLAVE)!;
		const d = datos.barrios[b.codigo]!.distrito;
		porDistrito.set(d, [...(porDistrito.get(d) ?? []), { b, rango70: rangoMensual(f70) }]);
	}
	return {
		distritos: [...porDistrito.entries()]
			.sort(([a], [b]) => a.localeCompare(b, 'es'))
			.map(([distrito, lista]) => ({
				distrito,
				barrios: lista
					.sort((x, y) => x.b.oficial.localeCompare(y.b.oficial, 'es'))
					.map(({ b, rango70 }) => ({ slug: b.slug, nombre: nombreListado(b), rango70 }))
			}))
	};
}

export const TEXTO_INDICE_BARRIOS = {
	titulo: TITULO_INDICE_BARRIOS,
	h1: H1_INDICE_BARRIOS,
	descripcion: 'Referencia del alquiler en 15 barrios de Madrid, por distrito: lo que pagan quienes ya viven de alquiler. Compruébalo con tu dirección, gratis.',
	intro: 'Estas páginas dan, para cada barrio, la referencia de lo que pagan quienes ya viven de alquiler: contratos declarados a Hacienda en 2024. Los barrios van por distrito y en orden alfabético.',
	boton: 'Comprobar mi alquiler',
	utm: 'indice',
	nota: `Los rangos son para un piso de 70${NB}m², en euros al mes. ${NOTA_DATOS}`,
	/** Para «Alquiler por barrios» en el pie y en los enlaces */
	enlace: 'Alquiler por barrios'
} as const;

/** Todo el texto visible de una página de barrio, para revisar el vocabulario y contar palabras */
export function textoDeBarrio(p: PaginaBarrio): string[] {
	return [
		p.h1, ...p.respuesta, p.boton, ...p.tabla.cabecera, ...p.tabla.filas.flat(),
		p.comoLeer.h2, ...p.comoLeer.parrafos, ...p.comoLeer.enlaces.map((e) => e.texto),
		p.donde.h2, ...p.donde.parrafos, ...p.donde.vecinos.map((v) => v.nombre),
		'Preguntas frecuentes', ...p.faq.flatMap((f) => [f.q, f.a]), ...p.fuentes.map((f) => f.texto)
	];
}
