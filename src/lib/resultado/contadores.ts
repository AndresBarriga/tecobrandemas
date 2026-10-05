/**
 * Contadores de uso: son reales o no se muestran. El de inicio cubre toda la herramienta y
 * tiene tres estados; el del barrio solo aparece desde 10 y, por debajo, el bloque desaparece.
 * Sin dato del servidor (null) no se muestra nada: nunca se inventa una cifra.
 */
import { numero } from './formato';
import {
	CONTADOR_BARRIO, CONTADOR_CERO, CONTADOR_MUCHOS, CONTADOR_POCOS, UMBRAL_CONTADOR_BARRIO, UMBRAL_CONTADOR_GRANDE
} from './textos';

export interface Contador {
	/** Cifra grande; null en el estado «cero» */
	numero: string | null;
	texto: string;
}

const valido = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0;

export function contadorInicio(n: number | null | undefined): Contador | null {
	if (!valido(n)) return null;
	if (n === 0) return { numero: null, texto: CONTADOR_CERO };
	return { numero: numero(n), texto: n < UMBRAL_CONTADOR_GRANDE ? CONTADOR_POCOS : CONTADOR_MUCHOS };
}

export function contadorBarrio(n: number | null | undefined): Contador | null {
	if (!valido(n) || n < UMBRAL_CONTADOR_BARRIO) return null;
	return { numero: numero(n), texto: CONTADOR_BARRIO };
}
