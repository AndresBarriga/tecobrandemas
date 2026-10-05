/**
 * Casos sin dato (R5). El orden fija qué motivo se muestra cuando hay varios:
 * primero lo que depende del anuncio (tipo, duración, obra nueva, superficie) y
 * después lo que depende de la sección.
 * En el fixture, A50 es obra nueva y unifamiliar → «unifamiliar»; A48 tiene 295 m² y
 * 19 testigos → «superficie».
 */
import type { Anuncio, DatosSeccion, MotivoSinDato, SeccionConDato } from './tipos';

export const SUPERFICIE_MIN = 30;
export const SUPERFICIE_MAX = 150;
/** Metodología SERPAVI §5: hacen falta más de 20 testigos */
export const TESTIGOS_MIN = 21;

export function motivoAnuncio(a: Anuncio): MotivoSinDato | null {
	if (a.tipo === 'casa') return 'unifamiliar';
	if (!a.largaDuracion) return 'temporal';
	if (a.obraNueva) return 'obra_nueva';
	if (a.superficie < SUPERFICIE_MIN || a.superficie > SUPERFICIE_MAX) return 'superficie';
	return null;
}

export function tieneDato(s: DatosSeccion): s is SeccionConDato {
	return s.smed !== null && s.p25 !== null && s.p75 !== null && s.n !== null;
}

export function motivoSeccion(s: DatosSeccion): MotivoSinDato | null {
	if (!tieneDato(s)) return 'sin_dato_seccion';
	if (s.n < TESTIGOS_MIN) return 'testigos';
	return null;
}
