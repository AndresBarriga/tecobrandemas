/**
 * Enlaces para compartir la tarjeta. Son enlaces normales: sin scripts, SDK ni píxeles de
 * terceros. Todos llevan la URL /t/ID, y el texto no lleva ningún dato del anuncio.
 */
import { COMPARTIR_WHATSAPP, TARJETA } from './textos';

export type Canal = 'whatsapp' | 'x' | 'copiar' | 'descarga';

export interface EnlacesCompartir {
	whatsapp: string;
	x: string;
	/** El enlace en sí, para copiar */
	copiar: string;
}

export type ModoCompartir = 'mirando' | 'vivo';

/** Enlace de la tarjeta para WhatsApp: con la campaña, y la modalidad en `utm_content` */
export function urlParaWhatsapp(url: string, modo: ModoCompartir): string {
	return `${url}?utm_source=whatsapp&utm_medium=share&utm_campaign=tarjeta&utm_content=${modo}`;
}

/** Mensaje de WhatsApp de cada modalidad, con el enlace de la tarjeta al final */
export function mensajeWhatsapp(url: string, modo: ModoCompartir): string {
	return `${COMPARTIR_WHATSAPP[modo].mensaje} ${urlParaWhatsapp(url, modo)}`;
}

/** `whatsapp` es el del botón principal (mensaje de la modalidad); `x` usa `texto` */
export function enlacesCompartir(url: string, texto: string = TARJETA.compartirTitulo, modo: ModoCompartir = 'mirando'): EnlacesCompartir {
	return {
		whatsapp: `https://wa.me/?text=${encodeURIComponent(mensajeWhatsapp(url, modo))}`,
		x: `https://x.com/intent/post?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(url)}`,
		copiar: url
	};
}

/** Id de tarjeta de 10 caracteres en base 36, como el que acepta el servidor */
export function idDeTarjeta(): string {
	return [...crypto.getRandomValues(new Uint8Array(10))].map((b) => (b % 36).toString(36)).join('');
}
