/**
 * Pantalla de resultado (R4) y pantallas sin dato (R5), como datos listos para pintar.
 * Los componentes no calculan nada: reciben esto y lo muestran.
 *
 * Decisiones (revisables):
 *  - nivel «por encima»: la cifra principal es el % sobre R_sup y debajo van los € al mes y al año;
 *  - nivel «explicable»: sin porcentaje; se dice hasta dónde llegaría un piso de máxima calidad (R_max);
 *  - nivel «dentro»: sin porcentaje, con la posición (baja, media o alta);
 *  - con horquilla, la cifra es el intervalo entre secciones y el nivel es el más prudente.
 */
import { type Anuncio, type Analisis, type Nivel, type ResultadoSeccion, analizar } from '../motor';
import { type DatosMadrid, barrioDe, datosSeccion } from './datos';
import { type Barra, construirBarra } from './barra';
import { type Evolucion, evolucion } from './evolucion';
import { euros, mesAnio, numero } from './formato';
import {
	type Accion, AVISO_INDEPENDIENTE, ENLACE_OFICIAL, ETIQUETA_BRECHA, type ClaveSinDato, type MotivoPantalla,
	PRECIO_PEDIDO, QUE_PUEDES_HACER, SIN_DATO, TEXTO_OFICIAL_SIN_DATO
} from './textos';
import type { PantallaHabitacion } from './habitacion';
import type { InfoInquilino } from './inquilino';
import type { Punto } from '../ubicacion/geocodificar';
import type { Ubicacion } from './ubicacion';
import { type Vista, construirVista, principalPorEncima } from './vista';

export interface PantallaSinDato {
	tipo: 'sin_dato';
	motivo: MotivoPantalla;
	/** «Lavapiés-Embajadores, Centro»; null si no hay ubicación (habitación, fuera de Madrid) */
	lugar: string | null;
	/** «26 m², 950 €/mes» */
	contexto: string | null;
	/** En mayúsculas condensadas en la pantalla */
	titular: string;
	frase: string;
	extra: string;
	/** Siempre lleva enlace a la app oficial */
	textoOficial: string;
	enlaceOficial: string;
}

export interface PantallaResultado {
	tipo: 'resultado';
	/** Precio / R_sup en el caso más prudente (el menor de las zonas posibles); para avisar de un posible error al teclear */
	ratioMin: number;
	nivel: Nivel;
	/** Frase del nivel: «Dentro de la referencia, en la parte media» … */
	titular: string;
	/** Solo en «por encima»: «Cuánto más te piden» */
	etiquetaBrecha: string | null;
	/** Solo en «por encima»: «+47 %» o «entre +47 % y +55 %» */
	brechaPct: string | null;
	/** Solo en «por encima»: «+689 €/mes · +8.267 €/año» */
	brechaEuros: string | null;
	/** Solo en «explicable»: hasta dónde llegaría un piso de máxima calidad */
	textoMaximo: string | null;
	/** «Referencia: 1.068 – 1.661 €/mes» */
	rango: string;
	/** «Basado en 139 alquileres registrados en la zona · referencia 2024 ajustada por el IPC del alquiler (hasta agosto de 2026)» */
	base: string;
	avisoUbicacion: string | null;
	horquilla: boolean;
	barra: Barra;
	barrio: string | null;
	/** Código del barrio (para el recuento público); nunca la sección */
	barrioCodigo: string | null;
	/** Secciones que entran en el cálculo (la interfaz las usa para «Tu zona» y la evolución) */
	cusecs: string[];
	evolucion: Evolucion | null;
	precioPedido: string;
	quePuedesHacer: readonly Accion[];
	/** Lo que pinta el diseño: lugar, cifra, frase, etiquetas de la barra, meses, fuente */
	vista: Vista;
	avisoIndependiente: string;
	enlaceOficial: string;
	/** Lo que se enviaría al registro anónimo (R7) si la persona marca la casilla; null si no hay barrio */
	registro: RegistroAnalisis | null;
	/** Lo que necesita «Tu zona» para calcularse en el navegador; el punto no sale del dispositivo */
	zona: ParametrosZona | null;
	/** «Ya vivo aquí»: la lectura del inquilino; null en un anuncio */
	inquilino: InfoInquilino | null;
}

/** Entrada de «Tu zona»: el anuncio, la ubicación (el punto, o null si solo hay calle) y las zonas */
export interface ParametrosZona {
	precio: number;
	superficie: number;
	origen: Punto | null;
	cusecs: string[];
	clase: 'a' | 'b' | 'c';
}

/** Cuerpo de POST /api/analisis: barrio, precio y m² exactos y nivel; sin dirección ni sección */
export interface RegistroAnalisis {
	barrio: string;
	precio: number;
	m2: number;
	nivel: 'a' | 'b' | 'c';
}

export type Pantalla = PantallaSinDato | PantallaResultado | PantallaHabitacion;

/** Qué se sabe del anuncio y de dónde está, para el encabezado de la pantalla sin dato */
export interface ContextoSinDato {
	anuncio: Anuncio;
	/** Barrio y distrito de la ubicación, si la hay */
	lugar: string | null;
}

function claveSinDato(motivo: MotivoPantalla, anuncio: Anuncio | null): ClaveSinDato {
	if (motivo !== 'superficie') return motivo;
	return anuncio && anuncio.superficie > 150 ? 'superficie_mayor' : 'superficie_menor';
}

function contextoSinDato(motivo: MotivoPantalla, c: ContextoSinDato | null): string | null {
	if (motivo === 'habitacion') return 'En un piso compartido';
	if (!c) return null;
	const m2 = `${numero(c.anuncio.superficie)}\u00A0m²`;
	if (motivo === 'unifamiliar') return `Casa unifamiliar, ${m2}`;
	const base = `${m2}, ${euros(c.anuncio.precio)}/mes`;
	if (motivo === 'obra_nueva') return `${base}, obra nueva`;
	if (motivo === 'temporal') return `${base}, no es de larga duración`;
	return base;
}

export function pantallaSinDato(motivo: MotivoPantalla, c: ContextoSinDato | null = null): PantallaSinDato {
	return {
		tipo: 'sin_dato',
		motivo,
		lugar: motivo === 'habitacion' ? 'Alquiler de una habitación' : (c?.lugar ?? null),
		contexto: contextoSinDato(motivo, c),
		...SIN_DATO[claveSinDato(motivo, c?.anuncio ?? null)],
		textoOficial: TEXTO_OFICIAL_SIN_DATO,
		enlaceOficial: ENLACE_OFICIAL
	};
}

/** Pantalla «sin dato» a partir de su clave (enlaces de «Cómo calculamos» a /?motivo=…); sin anuncio ni lugar */
export function pantallaSinDatoDeClave(clave: string): PantallaSinDato | null {
	if (!Object.hasOwn(SIN_DATO, clave)) return null;
	const k = clave as ClaveSinDato;
	const motivo: MotivoPantalla = k === 'superficie_menor' || k === 'superficie_mayor' ? 'superficie' : k;
	return { ...pantallaSinDato(motivo), ...SIN_DATO[k] };
}

function titularNivel(n: Nivel): string {
	if (n.nivel === 'dentro') {
		const parte = { baja: 'baja', media: 'media', alta: 'alta' }[n.posicion];
		return `Dentro de la referencia, en la parte ${parte}`;
	}
	if (n.nivel === 'explicable') {
		return 'Por encima de la referencia, aunque podría explicarse si el piso tiene características excelentes';
	}
	return 'Por encima de la parte alta de la referencia, incluso para un piso de máxima calidad';
}

function intervalo(a: number, b: number, formato: (x: number) => string): string {
	return formato(a) === formato(b) ? formato(a) : `entre ${formato(a)} y ${formato(b)}`;
}

function desdeAnalisis(
	a: Anuncio, u: Ubicacion, an: Extract<Analisis, { tipo: 'resultado' }>, datos: DatosMadrid
): PantallaResultado {
	const { prudente } = an;
	const r: ResultadoSeccion = prudente;
	const nivel = r.nivel;
	const conBrecha = an.secciones.filter((s) => s.brecha !== null);

	let brechaPct: string | null = null;
	let brechaEuros: string | null = null;
	if (nivel.nivel === 'por_encima') {
		const cifra = principalPorEncima(an.horquilla ? an.pctMin + 1 : r.pct + 1, an.horquilla ? an.pctMax + 1 : null, '');
		brechaPct = cifra.tipo === 'cifra' ? cifra.texto : cifra.tipo === 'rango' ? `entre ${cifra.desde} y ${cifra.hasta}` : null;
		const mes = conBrecha.map((s) => s.brecha!.euroMes);
		const año = conBrecha.map((s) => s.brecha!.euroAño);
		brechaEuros = an.horquilla
			? `${intervalo(Math.min(...mes), Math.max(...mes), (x) => `${numero(x)}\u00A0€/mes`)} · ${intervalo(Math.min(...año), Math.max(...año), (x) => `${numero(x)}\u00A0€/año`)}`
			: `+${numero(r.brecha!.euroMes)}\u00A0€/mes · +${numero(r.brecha!.euroAño)}\u00A0€/año`;
	}

	const cusecs = an.secciones.map((s) => s.seccion.cusec);
	const barrio = barrioDe(datos, r.seccion.cusec);
	const barra = construirBarra(a.precio, an.secciones.map((x) => x.referencia));
	const vista = construirVista({ anuncio: a, ubicacion: u, analisis: an, barra, barrio, ipcMes: datos.ipc.ultimo_mes });
	return {
		tipo: 'resultado',
		ratioMin: an.pctMin + 1,
		nivel,
		titular: titularNivel(nivel),
		etiquetaBrecha: nivel.nivel === 'por_encima' ? ETIQUETA_BRECHA : null,
		brechaPct,
		brechaEuros,
		textoMaximo:
			nivel.nivel === 'explicable'
				? `Un piso con las mejores características posibles podría llegar a ${euros(r.referencia.max)} al mes en esta zona.`
				: null,
		rango: `Referencia: ${numero(r.referencia.inf)} – ${euros(r.referencia.sup)} al mes`,
		base: `Basado en ${numero(r.seccion.n)} alquileres registrados en la zona · referencia 2024 ajustada por el IPC del alquiler (hasta ${mesAnio(datos.ipc.ultimo_mes)})`,
		avisoUbicacion: vista.aviso,
		horquilla: an.horquilla,
		barra,
		barrio: barrio?.nombre ?? null,
		barrioCodigo: barrio?.codigo ?? null,
		cusecs,
		evolucion: evolucion(datos, cusecs),
		precioPedido: PRECIO_PEDIDO,
		quePuedesHacer: QUE_PUEDES_HACER,
		vista,
		avisoIndependiente: AVISO_INDEPENDIENTE,
		enlaceOficial: ENLACE_OFICIAL,
		zona: { precio: a.precio, superficie: a.superficie, origen: u.punto, cusecs: u.cusecs, clase: vista.clase },
		registro: barrio ? { barrio: barrio.codigo, precio: Math.round(a.precio), m2: a.superficie, nivel: vista.clase } : null,
		inquilino: null
	};
}

export function construirPantalla(a: Anuncio, u: Ubicacion, datos: DatosMadrid): Pantalla {
	const an = analizar(a, u.cusecs.map((c) => datosSeccion(datos, c)), datos.ipc.factor);
	if (an.tipo === 'resultado') return desdeAnalisis(a, u, an, datos);
	const b = u.cusecs[0] ? barrioDe(datos, u.cusecs[0]) : null;
	return pantallaSinDato(an.motivo, { anuncio: a, lugar: b ? `${b.nombre}, ${b.distrito}` : null });
}
