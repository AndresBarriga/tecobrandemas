/**
 * Reglas de CLAUDE.md sobre textos y estructura (Hito 4):
 *  - ningún texto dice «ilegal», «abusivo», «actualizado a hoy» ni «cuesta entrar»;
 *  - atribuciones y enlace al valor oficial siempre presentes;
 *  - los componentes no calculan: no importan motor/ ni ubicacion/.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Anuncio } from '../src/lib/motor';
import * as textos from '../src/lib/resultado/textos';
import {
	type DatosMadrid, construirPantalla, construirTarjeta, validarAportacion, validarFormulario, zona
} from '../src/lib/resultado';

const PROHIBIDAS = ['ilegal', 'abusivo', 'actualizado a hoy', 'cuesta entrar'];
const sinTildes = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

function cadenas(v: unknown): string[] {
	if (typeof v === 'string') return [v];
	if (typeof v === 'function') return [];
	if (v && typeof v === 'object') return Object.values(v).flatMap(cadenas);
	return [];
}

const DATOS: DatosMadrid = {
	secciones: { A: { cdis: '07', barrio: '071', smed: 70, p25: 12, p75: 20, n: 100, n_vu: 0, med2015: 10, med2024: 15 } },
	barrios: { '071': { nombre: 'Almagro', cod_distrito: '07', distrito: 'Chamberí' } },
	ipc: { factor: 1.05, ultimo_mes: '2026-08' }
};
const base: Anuncio = { precio: 1000, superficie: 70, obraNueva: false, tipo: 'piso', largaDuracion: true };
const ubic = { cusecs: ['A'], aproximada: true, motivo: 'calle' as const, numerosUsados: [4], punto: null, via: 'Calle de Alcalá' };

describe('textos', () => {
	// Todo lo que el producto puede decir: constantes, avisos con valores de ejemplo,
	// y las pantallas generadas para cada nivel y cada motivo sin dato
	const funciones = Object.values(textos.AVISO_UBICACION).flatMap((f) => [true, false].map((horquilla) => f({ n: 2, calle: 'Calle de Alcalá', usados: '4 y 6', horquilla })));
	const pantallas = [200, 1300, 1700, 3000].map((precio) => construirPantalla({ ...base, precio }, ubic, DATOS));
	const sinDato = Object.values(textos.SIN_DATO);
	const dinamicos = [
		textos.PAGINA_TARJETA.intro('Almagro'),
		textos.PAGINA_TARJETA.intro(null),
		textos.ERRORES.pedirNumero('Calle de Alcalá', 7).titulo,
		textos.ERRORES.pedirNumero('Calle de Alcalá', 7).texto,
		textos.OG.titular('Almagro'),
		textos.OG.titular(null),
		textos.NOTA_TARJETA.a('Almagro'),
		textos.NOTA_TARJETA.b('Almagro'),
		textos.NOTA_TARJETA.c('Almagro', true),
		textos.NOTA_TARJETA.c('Almagro', false)
	];
	const todos = [
		...cadenas({ ...textos, AVISO_UBICACION: undefined }),
		...dinamicos,
		...funciones,
		...cadenas(pantallas),
		...pantallas.flatMap((p) => (p.tipo === 'resultado' ? cadenas(construirTarjeta(p)) : [])),
		...cadenas(sinDato),
		...cadenas(validarFormulario({ precio: '', superficie: '', obraNueva: false, largaDuracion: true, tipo: 'piso' })),
		...cadenas(validarAportacion({ precio: '', superficie: '', anioContrato: '', barrio: '', consentimiento: false }, [], 2026)),
		...cadenas(zona(70, { lon: 0, lat: 0 }, [], DATOS, new Map()))
	];

	it('hay textos que revisar', () => {
		expect(todos.length).toBeGreaterThan(60);
	});

	it.each(PROHIBIDAS)('ningún texto dice «%s»', (palabra) => {
		const infractores = todos.filter((t) => sinTildes(t).includes(sinTildes(palabra)));
		expect(infractores).toEqual([]);
	});

	it('formato español: espacio duro entre la cifra y «€», «%» o «m²»', () => {
		const sueltos = todos.filter((t) => /\d [€%]|\d m²/.test(t));
		expect(sueltos).toEqual([]);
	});

	it('atribuciones obligatorias', () => {
		expect(textos.ATRIBUCIONES).toContain('Origen de los datos: Ministerio de Vivienda y Agenda Urbana');
		expect(textos.ATRIBUCIONES).toContain('Elaboración propia con datos extraídos del sitio web del INE: www.ine.es');
		expect(textos.ATRIBUCIONES).toContain('CartoCiudad CC-BY 4.0 scne.es');
		expect(textos.ATRIBUCIONES.some((a) => a.includes('Ayuntamiento de Madrid'))).toBe(true);
		expect(textos.ATRIBUCIONES.some((a) => a.includes('OpenStreetMap contributors'))).toBe(true);
	});

	it('nunca sugiere respaldo oficial', () => {
		expect(textos.AVISO_INDEPENDIENTE).toMatch(/independiente/i);
		expect(sinTildes(todos.join(' '))).not.toMatch(/respaldad[oa] por|avalad[oa] por|herramienta oficial/);
	});

	it('enlace al valor oficial en el resultado y en cada pantalla sin dato', () => {
		expect(textos.ENLACE_OFICIAL).toBe('https://serpavi.mivau.gob.es');
		for (const p of pantallas) {
			if (p.tipo === 'resultado') {
				expect(p.enlaceOficial).toBe(textos.ENLACE_OFICIAL);
				expect(p.avisoIndependiente).toContain('serpavi.mivau.gob.es');
			}
		}
		for (const motivo of Object.keys(textos.SIN_DATO) as (keyof typeof textos.SIN_DATO)[]) {
			const p = construirPantalla({ ...base }, ubic, DATOS);
			expect(p.tipo).toBe('resultado'); // el anuncio base es válido; las de abajo se piden directamente
			const s = JSON.stringify({ ...textos.SIN_DATO[motivo], oficial: textos.TEXTO_OFICIAL_SIN_DATO });
			expect(s).toContain('serpavi.mivau.gob.es');
			expect(s).not.toContain('%');
		}
	});

	it('el resultado dice «cuánto más te piden» y trae «qué puedes hacer»', () => {
		const p = construirPantalla({ ...base, precio: 3000 }, ubic, DATOS);
		if (p.tipo !== 'resultado') throw new Error('esperaba resultado');
		expect(p.etiquetaBrecha).toBe('Cuánto más te piden');
		expect(p.quePuedesHacer.length).toBe(3);
		expect(p.precioPedido).toMatch(/no el que se firma/);
	});
});

// ——— Estructura: los componentes no calculan ———

function ficheros(dir: string, ext: string[]): string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir).flatMap((f) => {
		const ruta = join(dir, f);
		if (statSync(ruta).isDirectory()) return ficheros(ruta, ext);
		return ext.some((e) => ruta.endsWith(e)) ? [ruta] : [];
	});
}

const raiz = fileURLToPath(new URL('..', import.meta.url));

describe('estructura', () => {
	const componentes = [...ficheros(join(raiz, 'src/routes'), ['.svelte']), ...ficheros(join(raiz, 'src/lib/componentes'), ['.svelte'])];

	it.each(componentes.length ? componentes : ['(todavía no hay componentes)'])('%s no importa motor/ ni ubicacion/', (ruta) => {
		if (!componentes.length) return;
		const codigo = readFileSync(ruta, 'utf-8');
		expect(codigo).not.toMatch(/from\s+['"][^'"]*\/(motor|ubicacion)(\/|['"])/);
	});

	it('el texto escrito en los componentes cumple las mismas reglas', () => {
		for (const ruta of componentes) {
			const texto = readFileSync(ruta, 'utf-8')
				.replace(/<script[\s\S]*?<\/script>/g, '')
				.replace(/<style[\s\S]*?<\/style>/g, '');
			for (const palabra of PROHIBIDAS) expect(sinTildes(texto), `${ruta}: «${palabra}»`).not.toContain(sinTildes(palabra));
			expect(texto, ruta).not.toMatch(/\d [€%]|\d m²/);
		}
	});

	it('los view-models no dependen de Svelte ni del navegador', () => {
		for (const ruta of ficheros(join(raiz, 'src/lib/resultado'), ['.ts'])) {
			const codigo = readFileSync(ruta, 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
			expect(codigo, ruta).not.toMatch(/from\s+['"](svelte|\$app|\$env)/);
			expect(codigo, ruta).not.toMatch(/\b(window|document|localStorage|fetch)\b/);
		}
	});
});
