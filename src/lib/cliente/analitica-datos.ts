/**
 * De una pantalla de resultado a las propiedades de los eventos de analítica. Puro y sin SDK: solo categorías
 * (nivel, posición, tramo de la brecha, distrito); nunca el precio, los metros, el barrio ni la dirección.
 */
import type { Pantalla, PantallaResultado } from '#lib/resultado';
import type { DatosCompleta, MotivoSinDato } from './analitica';
import { distritoDeLugar, tramoDeBrecha } from './analitica-filtro';

export type ModoAnalitica = DatosCompleta['modo'];
type ResultadoAnalitica = NonNullable<DatosCompleta['resultado']>;

/** El modo de uso a partir del formulario: la habitación manda sobre la situación */
export const modoDe = (f: { situacion: string; tipo: string }): ModoAnalitica =>
	f.tipo === 'habitacion' ? 'habitacion' : f.situacion === 'vivo' ? 'vivo' : 'mirando';

/** a → dentro, b → nivel2 (explicable), c → nivel3 (por encima) */
export const resultadoDeClase = (clase: 'a' | 'b' | 'c'): ResultadoAnalitica => (clase === 'a' ? 'dentro' : clase === 'b' ? 'nivel2' : 'nivel3');

const POSICIONES = ['baja', 'media', 'alta'] as const;

/** Lo que sale de «completa» para un resultado de anuncio o de «Mi alquiler», o para una habitación */
export function datosCompleta(p: Extract<Pantalla, { tipo: 'resultado' | 'habitacion' }>, modo: ModoAnalitica): DatosCompleta {
	if (p.tipo === 'habitacion') {
		return { modo, resultado: null, posicion: null, brecha_tramo: null, es_horquilla: false, distrito: distritoDeLugar(p.lugar) };
	}
	const r: PantallaResultado = p;
	const tercio = r.vista.barra.tercio;
	return {
		modo,
		resultado: resultadoDeClase(r.vista.clase),
		posicion: tercio === null ? null : POSICIONES[tercio],
		brecha_tramo: tramoDeBrecha(r.ratioMin),
		// Solo la categoría y el nivel del dato: nunca importes, €/m², m² ni la zona
		...(r.oferta ? { resultado_oferta: r.oferta.contraOferta, nivel_oferta: r.oferta.nivel } : {}),
		es_horquilla: r.horquilla,
		distrito: distritoDeLugar(r.vista.lugar)
	};
}

export type { MotivoSinDato };

/** Clave del motivo de una pantalla «sin dato»; la superficie se reparte según el lado del límite */
export function motivoDeSinDato(motivo: string, superficie: number | null): MotivoSinDato | null {
	if (motivo === 'superficie') return superficie !== null && superficie > 150 ? 'superficie_mayor' : 'superficie_menor';
	return (['obra_nueva', 'unifamiliar', 'temporal', 'testigos', 'sin_dato_seccion', 'fuera_de_madrid', 'habitacion'] as const).find((m) => m === motivo) ?? null;
}
