/** El % de la oferta se pinta sin signo y con su dirección, en pantalla y en la tarjeta; el valor no cambia */
import { describe, expect, it } from 'vitest';
import type { Anuncio } from '../src/lib/motor';
import { type DatosMadrid, aInquilino, construirPantalla, construirTarjeta, ofertaConDireccion, ofertaTarjetaPintada, textoCompartir, textosEnlace } from '../src/lib/resultado';

const NB = ' ';
const datos = (v: number): DatosMadrid => ({
	secciones: { A: { cdis: '07', barrio: '071', smed: 70, p25: 12, p75: 20, n: 100, n_vu: 0, med2015: 10, med2024: 15 } },
	barrios: { '071': { nombre: 'Almagro', cod_distrito: '07', distrito: 'Chamberí' } },
	ipc: { factor: 1.05, ultimo_mes: '2026-08' },
	oferta: { serie: '4.3.21.D', fuente: 'Ayuntamiento de Madrid', mes: '2026-06', barrios: {}, distritos: { '07': { v, mes: '2026-06' } } }
});
const base: Anuncio = { precio: 1000, superficie: 70, obraNueva: false, tipo: 'piso', largaDuracion: true };
const ubic = { cusecs: ['A'], aproximada: false, motivo: null, numerosUsados: [], punto: null, via: null };
const extra = { firma: { reciente: true, mes: null, ano: 2026 }, rentaFirma: null, somos: null };

function pantalla(precio: number, vivo: boolean) {
	const p = construirPantalla({ ...base, precio }, ubic, datos(24));
	if (p.tipo !== 'resultado') throw new Error('esperaba resultado');
	const q = vivo ? aInquilino(p, { ...base, precio }, extra) : p;
	if (q.tipo !== 'resultado') throw new Error('esperaba resultado');
	return q;
}

describe('la tarjeta lleva solo el distrito', () => {
	it('imagen (lugar), vista previa y texto de WhatsApp: «Chamberí», nunca el barrio; las ya guardadas no se migran', () => {
		for (const vivo of [false, true]) {
			const t = construirTarjeta(pantalla(2600, vivo));
			expect(t.lugar).toBe('Chamberí');
			expect(t.barrio).toBeNull();
			expect(textoCompartir(t)).toMatch(/^Chamberí\. /);
			expect(textosEnlace(t).titulo).toBe(`A su precio · ${vivo ? 'Un alquiler' : 'Un anuncio'} en Chamberí`);
			expect(JSON.stringify([t, textoCompartir(t), textosEnlace(t)])).not.toContain('Almagro');
		}
		// Una tarjeta v3 ya guardada con barrio se lee tal cual (no hay migración): el texto sigue su `barrio`
		const antigua = { ...construirTarjeta(pantalla(2600, false)), lugar: 'Almagro, Chamberí', barrio: 'Almagro' };
		expect(textosEnlace(antigua).titulo).toContain('Almagro, Chamberí');
	});
});

describe('ofertaConDireccion', () => {
	it('positivo: por encima; negativo: por debajo; sin signo, igual; el número va sin signo', () => {
		expect(ofertaConDireccion(`+76${NB}%`, 'lo que se pide en anuncios')).toEqual({ cifra: `76${NB}%`, direccion: 'por encima', texto: 'por encima de lo que se pide en anuncios' });
		expect(ofertaConDireccion(`−0,8${NB}%`, 'lo que se pide en el distrito')).toEqual({ cifra: `0,8${NB}%`, direccion: 'por debajo', texto: 'por debajo de lo que se pide en el distrito' });
		expect(ofertaConDireccion(`0${NB}%`, 'lo que se pide en anuncios').texto).toBe('igual que lo que se pide en anuncios');
	});
});

describe.each([['Un anuncio', false], ['Mi alquiler', true]])('%s', (_n, vivo) => {
	it('pantalla: el % de la oferta sin signo y con dirección; el valor (con signo) no cambia', () => {
		for (const [precio, dir, signo] of [[2600, 'por encima', '+'], [1000, 'por debajo', '−'], [1700, null, null]] as const) {
			const v = pantalla(precio, vivo).costura.mitades.find((m) => m.fuente === 'oferta')!.veredicto!;
			expect(v.pintado!.cifra, `${precio}`).not.toMatch(/^[+−]/);
			if (dir) expect(v.pintado!.texto).toBe(`${dir} de lo que se pide en anuncios`);
			else expect(v.pintado!.texto).toMatch(/^(por encima|por debajo|igual) (de|que) lo que se pide en anuncios$/);
			// El valor, el de siempre
			if (signo) expect(v.cifra.charAt(0)).toBe(signo);
			expect(v.texto).toBe('frente a lo que se pide en anuncios');
		}
	});

	it('tarjeta, vista previa y texto que se comparte: sin % con signo para la oferta, con su dirección y con el distrito', () => {
		for (const precio of [2600, 1000, 1700]) {
			const t = construirTarjeta(pantalla(precio, vivo));
			const p = ofertaTarjetaPintada(t.oferta!);
			expect(p.cifra).not.toMatch(/^[+−]/);
			expect(p.texto).toMatch(/^(por encima|por debajo|igual) (de|que) lo que se pide en el distrito$/);
			// Los datos guardados son los de siempre (con signo)
			expect(t.oferta!.cifra).toMatch(/^[+−]?\d/);
			const compartido = textoCompartir(t);
			const enlace = textosEnlace(t);
			if (t.oferta!.clave !== 'pidenmas') {
				expect(compartido).toContain(`${p.cifra} ${p.texto}`);
				expect(enlace.descripcion).toContain(`${p.cifra} ${p.texto}`);
				expect(enlace.og.titular).toContain(`${p.cifra} ${p.texto}`);
			}
			// Ningún % de la oferta con signo en esos textos
			expect(`${compartido} ${enlace.descripcion} ${enlace.og.titular}`).not.toContain(t.oferta!.cifra.charAt(0) === '+' || t.oferta!.cifra.charAt(0) === '−' ? t.oferta!.cifra : '@@');
		}
	});
});
