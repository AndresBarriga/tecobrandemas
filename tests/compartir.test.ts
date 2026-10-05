import { describe, expect, it } from 'vitest';
import { enlacesCompartir, idDeTarjeta } from '#lib/resultado';
import { ID_VALIDO } from '../src/lib/server/tarjetas';

describe('enlaces para compartir', () => {
	const url = 'https://a-su-precio.example/t/abcde12345';

	it('WhatsApp y X llevan el enlace de la tarjeta y nada más', () => {
		const e = enlacesCompartir(url);
		expect(e.whatsapp).toBe(`https://wa.me/?text=${encodeURIComponent(`Mira mi resultado ${url}`)}`);
		expect(e.x).toBe(`https://x.com/intent/post?text=${encodeURIComponent('Mira mi resultado')}&url=${encodeURIComponent(url)}`);
		expect(e.copiar).toBe(url);
		for (const l of [e.whatsapp, e.x]) expect(decodeURIComponent(l)).toContain('/t/abcde12345');
	});

	it('el id del navegador cumple el formato del servidor y no se repite', () => {
		const ids = new Set(Array.from({ length: 300 }, idDeTarjeta));
		expect(ids.size).toBe(300);
		for (const id of ids) expect(id).toMatch(ID_VALIDO);
	});
});
