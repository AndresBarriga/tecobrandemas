import { describe, expect, it } from 'vitest';
import { COMPARTIR_WHATSAPP, enlacesCompartir, idDeTarjeta, mensajeWhatsapp, urlParaWhatsapp } from '#lib/resultado';
import { ID_VALIDO } from '../src/lib/server/tarjetas';

describe('enlaces para compartir', () => {
	const url = 'https://a-su-precio.example/t/abcde12345';

	it('WhatsApp y X llevan el enlace de la tarjeta y nada más', () => {
		const e = enlacesCompartir(url);
		expect(e.whatsapp).toBe(`https://wa.me/?text=${encodeURIComponent(mensajeWhatsapp(url, 'mirando'))}`);
		expect(e.x).toBe(`https://x.com/intent/post?text=${encodeURIComponent('Mira mi resultado')}&url=${encodeURIComponent(url)}`);
		expect(e.copiar).toBe(url);
		for (const l of [e.whatsapp, e.x]) expect(decodeURIComponent(l)).toContain('/t/abcde12345');
	});

	it('WhatsApp: el mensaje de cada modalidad lleva la campaña y ningún dato del anuncio', () => {
		const vivo = enlacesCompartir(url, undefined, 'vivo').whatsapp;
		expect(vivo.startsWith('https://wa.me/?text=')).toBe(true);
		expect(decodeURIComponent(vivo.slice('https://wa.me/?text='.length))).toBe(
			`Acabo de comparar mi alquiler con lo que pagan quienes ya viven de alquiler en mi zona. ¿Y tú? Se mira en un minuto → ${url}?utm_source=whatsapp&utm_medium=share&utm_campaign=tarjeta&utm_content=vivo`
		);
		expect(mensajeWhatsapp(url, 'mirando')).toBe(
			`Antes de ir a verlo: mira cómo queda este piso frente a lo que pagan quienes ya viven de alquiler en la zona → ${url}?utm_source=whatsapp&utm_medium=share&utm_campaign=tarjeta&utm_content=mirando`
		);
		expect(urlParaWhatsapp(url, 'vivo')).toContain('/t/abcde12345?utm_source=whatsapp&utm_medium=share&utm_campaign=tarjeta&utm_content=vivo');
		for (const m of ['mirando', 'vivo'] as const) expect(COMPARTIR_WHATSAPP[m].mensaje).not.toMatch(/\d|€|%|calle/i);
	});

	it('el id del navegador cumple el formato del servidor y no se repite', () => {
		const ids = new Set(Array.from({ length: 300 }, idDeTarjeta));
		expect(ids.size).toBe(300);
		for (const id of ids) expect(id).toMatch(ID_VALIDO);
	});
});
