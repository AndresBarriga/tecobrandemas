/**
 * Enlaces para compartir la tarjeta. Son enlaces normales: sin scripts, SDK ni píxeles de
 * terceros. Todos llevan la URL /t/ID, y el texto no lleva ningún dato del anuncio.
 */
import { TARJETA } from './textos';

export type Canal = 'whatsapp' | 'x' | 'copiar' | 'descarga';

export interface EnlacesCompartir {
	whatsapp: string;
	x: string;
	/** El enlace en sí, para copiar */
	copiar: string;
}

export function enlacesCompartir(url: string, texto: string = TARJETA.compartirTitulo): EnlacesCompartir {
	return {
		whatsapp: `https://wa.me/?text=${encodeURIComponent(`${texto} ${url}`)}`,
		x: `https://x.com/intent/post?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(url)}`,
		copiar: url
	};
}

/** Id de tarjeta de 10 caracteres en base 36, como el que acepta el servidor */
export function idDeTarjeta(): string {
	return [...crypto.getRandomValues(new Uint8Array(10))].map((b) => (b % 36).toString(36)).join('');
}
