/**
 * Autocompletado de calles y barrios, en el navegador: lo que se teclea no se envía a ningún sitio.
 *
 *  - Normalización: minúsculas, sin tildes; «c/», «cl», «avda», «av», «pº», «pza», «gta», «ctra» se
 *    expanden; «de», «del», «la», «las», «los», «el» se ignoran; el número del portal al final no cuenta.
 *  - Coincidencia por palabras: cada palabra escrita debe ser el comienzo de alguna palabra del nombre,
 *    en cualquier posición («moscardo» encuentra «General Moscardo»).
 *  - Orden: nombre completo > empieza por lo escrito > palabra interior > una errata (solo si no hay
 *    resultados de ningún tipo). Dentro de cada grupo manda el orden de entrada (más portales primero).
 *  - Sin calles que coincidan, se buscan barrios y distritos (con alias de nombres populares).
 */

/** [nombre, código de barrio, código postal más frecuente, otros códigos postales separados por comas] */
import { separarCodigoPostal } from './calle';

export type ViaEntrada = readonly [nombre: string, barrio: string, cp?: string, otrosCp?: string];

export interface Via {
	nombre: string;
	barrio: string;
	/** Código postal más frecuente de sus portales y los demás */
	cp: string;
	otrosCp: string[];
	/** Palabras normalizadas del nombre completo («calle», «alcala») */
	palabras: string[];
}

export interface Parte {
	texto: string;
	coincide: boolean;
}

export interface SugerenciaVia {
	clase: 'via';
	nombre: string;
	/** Tipo de vía tal como lo da CartoCiudad: «Calle», «Plaza», «Avenida»… */
	tipo: string;
	/** Barrio donde la vía tiene más secciones */
	barrio: string;
	/** Código postal más frecuente de sus portales («» si no se conoce) */
	cp: string;
	/** El nombre con lo coincidente marcado */
	partes: Parte[];
}

export interface SugerenciaZona {
	clase: 'barrio' | 'distrito';
	nombre: string;
	/** Distrito (en un distrito, él mismo) */
	distrito: string;
	/** Código de barrio (barrio) o de distrito (distrito) */
	codigo: string;
	/** Nombre popular por el que se ha encontrado («Malasaña»), si lo hay */
	alias: string | null;
	partes: Parte[];
}

export type Sugerencias =
	| { tipo: 'vias'; vias: SugerenciaVia[] }
	| { tipo: 'zonas'; zonas: SugerenciaZona[] }
	/** Un nombre popular («Malasaña») delante de las calles que también coinciden */
	| { tipo: 'mixto'; zonas: SugerenciaZona[]; vias: SugerenciaVia[] }
	| { tipo: 'nada' };

export interface BarrioNombre {
	nombre: string;
	cod_distrito: string;
	distrito: string;
}

export const MAXIMO_SUGERENCIAS = 8;

/** Tipos de vía: «calle moscardo» busca «moscardo» entre los barrios */
const TIPOS_DE_VIA = new Set(['calle', 'avenida', 'plaza', 'paseo', 'camino', 'glorieta', 'carretera', 'travesia', 'ronda', 'pasaje', 'cuesta', 'callejon']);

const PALABRAS_VACIAS = new Set(['de', 'del', 'la', 'las', 'los', 'el']);
const ABREVIATURAS: [RegExp, string][] = [
	[/(^|\s)c\/\s*/g, '$1calle '],
	[/(^|\s)(?:cl|c)\.?(?=\s|$)/g, '$1calle'],
	[/(^|\s)(?:avda|avd|av)\.?(?=\s|$)/g, '$1avenida'],
	[/(^|\s)p[º°o]\.?(?=\s|$)/g, '$1paseo'],
	[/(^|\s)(?:pza|pl)\.?(?=\s|$)/g, '$1plaza'],
	[/(^|\s)gta\.?(?=\s|$)/g, '$1glorieta'],
	[/(^|\s)ctra\.?(?=\s|$)/g, '$1carretera']
];

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Palabras comparables de un texto: minúsculas, sin tildes ni signos, sin palabras vacías */
export function palabras(texto: string): string[] {
	let t = texto.toLowerCase();
	for (const [patron, sustituto] of ABREVIATURAS) t = t.replace(patron, sustituto);
	return sinTildes(t)
		.replace(/[^a-z0-9ñ]+/g, ' ')
		.split(' ')
		.filter((p) => p && !PALABRAS_VACIAS.has(p));
}

/** Lo que se busca: las palabras de lo escrito, sin el número del portal del final */
export function palabrasBuscadas(texto: string): string[] {
	const p = palabras(texto);
	// «12 bis»: «bis» detrás de un número no es parte del nombre
	if (p.length > 2 && p[p.length - 1] === 'bis' && /^\d+$/.test(p[p.length - 2]!)) p.length -= 2;
	while (p.length > 1 && /^\d+[a-z]?$/.test(p[p.length - 1]!)) p.pop();
	// «nº» y «n» sueltos antes del número
	while (p.length > 1 && (p[p.length - 1] === 'n' || p[p.length - 1] === 'no')) p.pop();
	return p;
}

export function construirIndiceVias(filas: readonly ViaEntrada[]): Via[] {
	return filas.map(([nombre, barrio, cp, otros]) => ({
		nombre, barrio, cp: cp ?? '', otrosCp: otros ? otros.split(',') : [], palabras: palabras(nombre)
	}));
}

const empiezaPor = (palabra: string, q: string) => palabra.startsWith(q);

/** Distancia de edición (inserción, borrado, sustitución o transposición), con corte */
function distancia(a: string, b: string, tope: number): number {
	if (Math.abs(a.length - b.length) > tope) return tope + 1;
	const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
	for (let j = 1; j <= b.length; j++) d[0]![j] = j;
	for (let i = 1; i <= a.length; i++) {
		for (let j = 1; j <= b.length; j++) {
			const coste = a[i - 1] === b[j - 1] ? 0 : 1;
			d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + coste);
			if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1);
		}
	}
	return d[a.length]![b.length]!;
}

/** Errata de una letra en una palabra escrita, comparada con el comienzo de una del nombre */
function erratas(q: string, palabra: string): number {
	if (q.length < 4) return Infinity;
	let mejor = Infinity;
	for (const largo of [q.length - 1, q.length, q.length + 1]) {
		if (largo < 1 || largo > palabra.length) continue;
		mejor = Math.min(mejor, distancia(q, palabra.slice(0, largo), 1));
	}
	return mejor <= 1 ? mejor : Infinity;
}

type Grupo = 0 | 1 | 2;

/** 0 = nombre completo, 1 = empieza por lo escrito, 2 = palabra interior; null = no coincide */
function grupoDe(q: string[], n: string[]): Grupo | null {
	if (!q.every((x) => n.some((p) => empiezaPor(p, x)))) return null;
	const nucleo = n.slice(1); // sin el tipo de vía: «alcala» cuenta como «Calle Alcala»
	const igual = (a: string[]) => a.length === q.length && a.every((p, i) => p === q[i]);
	if (igual(n) || igual(nucleo)) return 0;
	const desde = (a: string[]) => q.length <= a.length && q.every((x, i) => empiezaPor(a[i]!, x));
	if (desde(n) || desde(nucleo)) return 1;
	return 2;
}

/** Marca en el nombre el comienzo de cada palabra que coincide con lo escrito */
export function resaltar(nombre: string, escritas: string[]): Parte[] {
	const partes: Parte[] = [];
	const poner = (texto: string, coincide: boolean) => {
		if (!texto) return;
		const ultima = partes[partes.length - 1];
		if (ultima && ultima.coincide === coincide) ultima.texto += texto;
		else partes.push({ texto, coincide });
	};
	for (const trozo of nombre.split(/(\s+|-)/)) {
		const norm = sinTildes(trozo.toLowerCase());
		let largo = 0;
		for (const q of escritas) if (q && norm.startsWith(q) && q.length > largo) largo = q.length;
		poner(trozo.slice(0, largo), true);
		poner(trozo.slice(largo), false);
	}
	return partes;
}

const tipoDe = (nombre: string) => nombre.split(' ')[0] ?? '';

export function sugerirVias(indice: readonly Via[], texto: string, maximo = MAXIMO_SUGERENCIAS): SugerenciaVia[] {
	const q = palabrasBuscadas(texto);
	if (!q.length) return [];
	const grupos: Via[][] = [[], [], []];
	for (const v of indice) {
		const g = grupoDe(q, v.palabras);
		if (g !== null) grupos[g]!.push(v);
	}
	return [...grupos[0]!, ...grupos[1]!, ...grupos[2]!].slice(0, maximo).map((v) => aSugerencia(v, q));
}

/** Calles con una errata en lo escrito; solo se usan si no hay otra cosa que ofrecer */
export function sugerirViasConErrata(indice: readonly Via[], texto: string, maximo = MAXIMO_SUGERENCIAS): SugerenciaVia[] {
	const q = palabrasBuscadas(texto);
	if (!q.length) return [];
	const halladas: { v: Via; coste: number }[] = [];
	for (const v of indice) {
		let coste = 0;
		for (const x of q) {
			const mejor = Math.min(...v.palabras.map((p) => (empiezaPor(p, x) ? 0 : erratas(x, p))));
			if (!Number.isFinite(mejor)) {
				coste = Infinity;
				break;
			}
			coste += mejor;
		}
		if (Number.isFinite(coste) && coste > 0) halladas.push({ v, coste });
	}
	halladas.sort((a, b) => a.coste - b.coste);
	return halladas.slice(0, maximo).map(({ v }) => aSugerencia(v, q));
}

const aSugerencia = (v: Via, q: string[]): SugerenciaVia => ({
	clase: 'via',
	nombre: v.nombre,
	tipo: tipoDe(v.nombre),
	barrio: v.barrio,
	cp: v.cp,
	partes: resaltar(v.nombre, q)
});

// ——— Barrios, distritos y alias ———

/** Nombres populares → nombre oficial del barrio (o del distrito) */
export type Alias = Record<string, string[]>;

export interface Zonas {
	barrios: Record<string, BarrioNombre>;
	alias: Alias;
}

function zonasCandidatas({ barrios, alias }: Zonas) {
	const lista: { clase: 'barrio' | 'distrito'; nombre: string; distrito: string; codigo: string }[] = [];
	const distritos = new Map<string, string>();
	for (const [codigo, b] of Object.entries(barrios)) {
		lista.push({ clase: 'barrio', nombre: b.nombre, distrito: b.distrito, codigo });
		distritos.set(b.cod_distrito, b.distrito);
	}
	for (const [codigo, nombre] of distritos) lista.push({ clase: 'distrito', nombre, distrito: nombre, codigo });
	const porNombre = new Map(lista.map((z) => [palabras(z.nombre).join(' '), z]));
	return { lista, porNombre, alias };
}

export function sugerirZonas(zonas: Zonas, texto: string, maximo = MAXIMO_SUGERENCIAS): SugerenciaZona[] {
	const escritas = palabrasBuscadas(texto);
	if (!escritas.length) return [];
	const q = escritas.length > 1 && TIPOS_DE_VIA.has(escritas[0]!) ? escritas.slice(1) : escritas;
	const { lista, porNombre } = zonasCandidatas(zonas);
	const salida: { z: SugerenciaZona; grupo: Grupo }[] = [];
	const vistos = new Set<string>();
	const anadir = (z: (typeof lista)[number], alias: string | null, grupo: Grupo, nombreBuscado: string) => {
		const clave = `${z.clase}:${z.codigo}`;
		if (vistos.has(clave)) return;
		vistos.add(clave);
		salida.push({ z: { ...z, alias, partes: resaltar(nombreBuscado, q) }, grupo });
	};

	// Los nombres populares primero: «Malasaña» es lo que la persona escribe
	for (const [popular, oficiales] of Object.entries(zonas.alias)) {
		const g = grupoDe(q, palabras(popular));
		if (g === null) continue;
		for (const oficial of oficiales) {
			const z = porNombre.get(palabras(oficial).join(' '));
			if (z) anadir(z, popular, g, popular);
		}
	}
	for (const z of lista) {
		const g = grupoDe(q, palabras(z.nombre));
		if (g !== null) anadir(z, null, g, z.nombre);
	}
	// Mejor grupo primero; nombres populares antes que oficiales; barrios antes que distritos
	salida.sort((a, b) => a.grupo - b.grupo || (a.z.alias ? 0 : 1) - (b.z.alias ? 0 : 1) || (a.z.clase === b.z.clase ? 0 : a.z.clase === 'barrio' ? -1 : 1));
	return salida.slice(0, maximo).map((s) => s.z);
}

/**
 * Lo que se ofrece al teclear:
 *  - calles (y, delante, el barrio que corresponde a un nombre popular que se está escribiendo);
 *  - si no hay ninguna calle, barrios o distritos;
 *  - si tampoco, calles con una errata;
 *  - y si no hay nada, `nada` (la pantalla ofrece el mapa). Nunca queda vacío.
 */
export function sugerir(indice: readonly Via[], zonas: Zonas, texto: string): Sugerencias {
	// Un código postal («28038») lista sus calles, de más a menos portales; con parte del nombre, las filtra
	const postal = separarCodigoPostal(texto);
	if (postal) {
		// Primero las calles cuyo código postal más frecuente es ése; se muestra el código buscado
		const delCp = [...indice.filter((v) => v.cp === postal.cp), ...indice.filter((v) => v.cp !== postal.cp && v.otrosCp.includes(postal.cp))];
		const q = postal.resto ? palabrasBuscadas(postal.resto) : [];
		const vias = (q.length ? delCp.filter((v) => grupoDe(q, v.palabras) !== null) : delCp).slice(0, MAXIMO_SUGERENCIAS);
		return vias.length ? { tipo: 'vias', vias: vias.map((v) => ({ ...aSugerencia(v, q), cp: postal.cp })) } : { tipo: 'nada' };
	}
	const vias = sugerirVias(indice, texto);
	if (vias.length) {
		const populares = sugerirZonas(zonas, texto).filter((z) => z.alias !== null);
		if (populares.length) return { tipo: 'mixto', zonas: populares, vias: vias.slice(0, MAXIMO_SUGERENCIAS - populares.length) };
		return { tipo: 'vias', vias };
	}
	const z = sugerirZonas(zonas, texto);
	if (z.length) return { tipo: 'zonas', zonas: z };
	const erratas = sugerirViasConErrata(indice, texto);
	if (erratas.length) return { tipo: 'vias', vias: erratas };
	return { tipo: 'nada' };
}
