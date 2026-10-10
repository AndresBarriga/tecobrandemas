/**
 * El resultado «La costura» (docs/design/new design handoff): un bloque partido en dos, contratos en negro y oferta en
 * claro, con la misma escala; los dos carriles se tocan en la costura, donde va el precio en amarillo. Todo llega ya
 * calculado y formateado: el componente solo pinta. No cambia el motor ni los niveles: los recibe.
 *
 * Reglas (README del handoff, con las decisiones del 10/10/2026):
 *  - color = fuente, nunca juicio: negro = contratos, ciruela = oferta, paja = el precio;
 *  - orden según el modo: «Mi alquiler», contratos arriba; «Un anuncio», oferta arriba (si hay oferta);
 *  - cada referencia se compara solo con el precio; nunca contratos con oferta;
 *  - «A su precio.» abre el titular solo si la referencia principal del modo lo confirma: «Mi alquiler» dentro de los
 *    contratos, «Un anuncio» en línea con la oferta;
 *  - «ahora» en lugar de «hoy»; la oferta es del barrio si tiene dato y, si no, del distrito (el texto lo dice);
 *  - «Mi alquiler» claramente por debajo de la oferta no se celebra: «PIDEN MÁS», con el mismo % que el resto;
 *  - la escala va de 0,85 × el valor más bajo a 1,10 × el más alto, redondeada a 100 €, y no se rotula;
 *  - el margen «en línea» (±10 %) es una línea fina bajo el carril de oferta, no una banda de precios.
 */
import type { Nivel } from '../motor';
import type { Barra } from './barra';
import { euros, mesAnio, numero, porcentaje } from './formato';
import type { PantallaOferta } from './oferta';
import { UMBRAL_VECES } from './ratio';
import { COSTURA as T } from './textos';

export type ModoCostura = 'mirando' | 'vivo';
export type ClaveContratos = 'debajo' | 'dentro' | 'algo' | 'encima';
export type ClaveOferta = 'enlinea' | 'encima' | 'debajo' | 'pidenmas';

export interface Veredicto {
	clave: ClaveContratos | ClaveOferta;
	/** «POR ENCIMA», «EN LÍNEA»… */
	palabra: string;
	/** «+30 %», «−9,3 %» o vacío (dentro y por debajo de los contratos) */
	cifra: string;
	texto: string;
}

export interface Mitad {
	fuente: 'contratos' | 'oferta';
	pregunta: string;
	aclaracion: string;
	/** Nota destacada bajo la aclaración (contrato de hace menos de un año) */
	nota: string | null;
	/** null: sin dato de oferta en la zona */
	veredicto: Veredicto | null;
	/** Bajo el veredicto de oferta: cómo se calcula la estimación */
	estimacion: string | null;
}

/** Fracciones de la escala (0-1) */
export interface CarrilContratos {
	/** Lo habitual: de la parte baja a lo más alto (la franja común a las zonas posibles) */
	banda: { desde: number; hasta: number };
	/** Con zonas en niveles distintos: el tramo de lo más alto entre las zonas */
	incertidumbre: { desde: number; hasta: number } | null;
	/** Hasta el máximo si fuera un piso excelente */
	excelente: { desde: number; hasta: number };
	etiquetas: { bajo: string; alto: string; maximo: string };
}

export interface CarrilOferta {
	/** La oferta estimada */
	x: number;
	/** El margen «en línea» (±10 %): se dibuja como una línea fina bajo el carril */
	margen: { desde: number; hasta: number };
	etiqueta: string;
}

export interface Plegable {
	clave: 'porque' | 'datos';
	titulo: string;
	parrafos: string[];
}

export interface Costura {
	modo: ModoCostura;
	/** «Vinateros, Moratalaz» */
	lugar: string;
	/** «Mi alquiler · 90 m² · » y «1.400 €/mes» (en negrita) */
	contexto: [string, string];
	/** Una o dos frases, en el orden del modo; la de oferta va en ciruela. «A su precio.» puede abrirlo */
	titular: { texto: string; fuente: 'contratos' | 'oferta' }[];
	/** Las dos mitades en el orden del modo; si no hay oferta en la web, solo contratos */
	mitades: Mitad[];
	contratos: CarrilContratos;
	/** null: sin dato de oferta (la mitad clara se queda sin carril) */
	oferta: CarrilOferta | null;
	/** Posición del precio en la escala (la misma en los dos carriles) */
	punto: number;
	/** «Tu alquiler · 1.400 €» */
	pastilla: string;
	plegables: Plegable[];
	/** Una línea corta de fuentes, siempre visible (el detalle va en «De dónde salen los datos») */
	fuentes: string;
}

export interface EntradaCostura {
	modo: ModoCostura;
	precio: number;
	superficie: number;
	/** «Vinateros, Moratalaz» */
	lugar: string;
	barra: Barra;
	/** Lo más alto de lo habitual del que salen las cifras (la media de las zonas si están en el mismo nivel) */
	parteAlta: number;
	nivel: Nivel;
	porDebajo: boolean;
	/** Con zonas en niveles distintos: precio / lo más alto en la zona más prudente y en la menos */
	rango: { min: number; max: number } | null;
	oferta: PantallaOferta | null;
	/** ¿La web tiene anuncios recientes cargados? (si no, no hay mitad de oferta, ni siquiera «sin dato») */
	ofertaEnLaWeb: boolean;
	/** Textos de fuentes completos (los de siempre) */
	fuenteContratos: string;
	fuenteOferta: string | null;
	/** Solo «Mi alquiler»: contrato de hace menos de un año */
	firmaReciente?: boolean;
}

const tramoEuros = (a: number, b: number) => (numero(a) === numero(b) ? euros(a) : `${numero(a)}–${euros(b)}`);

function veredictoContratos(e: EntradaCostura): Veredicto {
	const m = e.modo;
	if (e.porDebajo) return { clave: 'debajo', palabra: T.palabras.debajo, cifra: '', texto: T.contratos.debajo[m] };
	if (e.nivel.nivel === 'dentro') return { clave: 'dentro', palabra: T.palabras.dentro, cifra: '', texto: T.contratos.dentro(e.nivel.posicion) };
	const clave: ClaveContratos = e.nivel.nivel === 'explicable' ? 'algo' : 'encima';
	const ratio = e.precio / e.parteAlta;
	let cifra: string;
	let veces = ratio >= UMBRAL_VECES;
	if (e.rango) {
		veces = e.rango.min >= UMBRAL_VECES;
		const f = (r: number) => (veces ? numero(r, 1) : porcentaje(r - 1, true));
		cifra = veces ? `${f(e.rango.min)} a ${f(e.rango.max)} veces` : `${f(e.rango.min)} a ${f(e.rango.max)}`;
		if (f(e.rango.min) === f(e.rango.max)) cifra = veces ? `${f(e.rango.min)} veces` : f(e.rango.min);
	} else cifra = veces ? `${numero(ratio, 1)} veces` : porcentaje(ratio - 1, true);
	const base = veces ? T.contratos.vecesLoMasAlto : T.contratos.sobreLoMasAlto;
	return { clave, palabra: clave === 'algo' ? T.palabras.algo : T.palabras.encima, cifra, texto: clave === 'algo' ? `${base}${T.contratos.excelente}` : base };
}

function veredictoOferta(e: EntradaCostura, o: PantallaOferta): Veredicto {
	const cifra = Math.abs(e.precio / o.estimada - 1) < 0.0005 ? '0 %' : porcentaje(e.precio / o.estimada - 1, true);
	// «Mi alquiler» claramente por debajo de la oferta: no es suerte, es que ahora piden más (con el mismo %)
	if (e.modo === 'vivo' && o.contraOferta === 'por_debajo') return { clave: 'pidenmas', palabra: T.palabras.pidenMas, cifra, texto: T.oferta.texto };
	const clave: ClaveOferta = o.contraOferta === 'en_linea' ? 'enlinea' : o.contraOferta === 'por_encima' ? 'encima' : 'debajo';
	return { clave, palabra: T.palabras[clave === 'enlinea' ? 'enLinea' : clave], cifra, texto: T.oferta.texto };
}

export function construirCostura(e: EntradaCostura): Costura {
	const { barra, precio, modo } = e;
	const o = e.oferta;
	const m2 = `${numero(e.superficie)} m²`;
	const nivelO = o?.nivel ?? 'distrito';

	const vC = veredictoContratos(e);
	const vO = o ? veredictoOferta(e, o) : null;

	const mitadC: Mitad = {
		fuente: 'contratos',
		pregunta: T.contratos.pregunta,
		aclaracion: T.contratos.aclaracion(m2, modo),
		nota: modo === 'vivo' && e.firmaReciente ? T.contratos.notaReciente : null,
		veredicto: vC,
		estimacion: null
	};
	const mitadO: Mitad = {
		fuente: 'oferta',
		pregunta: T.oferta.pregunta(m2),
		aclaracion: T.oferta.aclaracion(nivelO),
		nota: null,
		veredicto: vO,
		estimacion: o ? T.oferta.estimacion(numero(o.eurosM2, 2), nivelO, m2, modo) : null
	};
	const conOferta = e.ofertaEnLaWeb;
	const mitades = !conOferta ? [mitadC] : modo === 'mirando' && vO ? [mitadO, mitadC] : [mitadC, mitadO];

	// Titular: una frase por fuente, en el orden del modo; «A su precio.» si la referencia principal del modo lo confirma
	const frC = { texto: T.titular.contratos[modo][vC.clave as ClaveContratos] as string, fuente: 'contratos' as const };
	const frO = vO ? { texto: T.titular.oferta[modo](vO.clave as ClaveOferta, nivelO), fuente: 'oferta' as const } : null;
	const asuPrecio = modo === 'vivo' ? vC.clave === 'dentro' : vO?.clave === 'enlinea';
	let titular: Costura['titular'] = modo === 'mirando' && frO ? [frO, frC] : frO ? [frC, frO] : [frC];
	if (asuPrecio) titular = [{ texto: T.titular.asuPrecio, fuente: titular[0]!.fuente }, ...titular.slice(1)];

	// Escala común, sin rotular
	const lo = barra.inf.max;
	const hi = barra.sup.min;
	const hiMax = barra.sup.max;
	const techo = barra.techo.max;
	const valores = [barra.inf.min, precio, techo, ...(o ? [o.estimada * (1 - o.banda), o.estimada * (1 + o.banda)] : [])];
	const min = Math.max(0, Math.floor((Math.min(...valores) * 0.85) / 100) * 100);
	const max = Math.ceil((Math.max(...valores) * 1.1) / 100) * 100;
	const X = (v: number) => Math.min(1, Math.max(0, (v - min) / (max - min)));

	const contratos: CarrilContratos = {
		banda: { desde: X(lo), hasta: X(Math.max(lo, hi)) },
		incertidumbre: hiMax > hi ? { desde: X(hi), hasta: X(hiMax) } : null,
		excelente: { desde: X(hiMax), hasta: X(techo) },
		etiquetas: { bajo: euros(lo), alto: tramoEuros(hi, hiMax), maximo: tramoEuros(barra.techo.min, techo) }
	};
	const oferta: CarrilOferta | null = o
		? { x: X(o.estimada), margen: { desde: X(o.estimada * (1 - o.banda)), hasta: X(o.estimada * (1 + o.banda)) }, etiqueta: T.oferta.marca(euros(o.estimada)) }
		: null;

	const plegables: Plegable[] = [];
	if (o) plegables.push({ clave: 'porque', titulo: T.porque.titulo, parrafos: [T.porque.distintas, T.porque.margen(numero(o.banda * 100), nivelO)] });
	plegables.push({
		clave: 'datos',
		titulo: T.datos.titulo,
		parrafos: [e.fuenteContratos, ...(o && e.fuenteOferta ? [`${e.fuenteOferta} ${T.datos.calculo(numero(o.eurosM2, 2), m2, nivelO)}`] : [])]
	});

	return {
		modo,
		lugar: e.lugar,
		contexto: [`${T.contexto[modo]} · ${m2} · `, `${euros(precio)}/mes`],
		titular,
		mitades,
		contratos,
		oferta,
		punto: X(precio),
		pastilla: T.pastilla[modo](euros(precio)),
		plegables,
		fuentes: T.fuentesCortas(o ? mesAnio(o.mes) : null)
	};
}

/** La costura del mismo resultado vista desde «Mi alquiler» (orden, titular, textos y nota de la firma) */
export function costuraEnModo(e: EntradaCostura, modo: ModoCostura, firmaReciente = false): Costura {
	return construirCostura({ ...e, modo, firmaReciente });
}

/** Descripción del dibujo para lectores de pantalla: dónde cae el precio en cada carril */
export function descripcionCostura(c: Costura): string {
	const partes = [T.aria.contratos(c.contratos.etiquetas.bajo, c.contratos.etiquetas.alto, c.contratos.etiquetas.maximo)];
	if (c.oferta) partes.push(T.aria.oferta(c.oferta.etiqueta));
	partes.push(c.pastilla);
	return partes.join(' ');
}
