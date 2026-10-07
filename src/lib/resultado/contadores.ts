/**
 * Contador del barrio: es real o no se muestra; solo aparece desde 10 y, por debajo, el bloque desaparece.
 * (El contador de toda la herramienta se quitó al pasar los eventos a PostHog.)
 * Sin dato del servidor (null) no se muestra nada: nunca se inventa una cifra.
 */
import { numero } from './formato';
import {
	CONTADOR_BARRIO, UMBRAL_CONTADOR_BARRIO
} from './textos';

export interface Contador {
	/** Cifra grande; null en el estado «cero» */
	numero: string | null;
	texto: string;
}

const valido = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0;

export function contadorBarrio(n: number | null | undefined): Contador | null {
	if (!valido(n) || n < UMBRAL_CONTADOR_BARRIO) return null;
	return { numero: numero(n), texto: CONTADOR_BARRIO };
}
