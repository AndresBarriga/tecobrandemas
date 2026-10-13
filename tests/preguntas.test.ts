import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { campanaValida } from '../src/lib/cliente/analitica-filtro';
import {
	AUTOR, ENTRADAS_SITEMAP, FECHA_PREGUNTAS, HUB_PREGUNTAS, PREGUNTAS, SITE_URL, contenidoSitemap, enlaceHerramienta, jsonLdComoTexto, jsonLdHubPreguntas,
	jsonLdPregunta, preguntaPorSlug, textoDePagina
} from '../src/lib/resultado';

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const palabras = (t: string[]) => t.join(' ').split(/\s+/).filter(Boolean).length;
const frases = (t: string) => t.split(/(?<=[.!?»])\s+(?=[A-ZÁÉÍÓÚ¿«])/).filter(Boolean).length;

// Mismas reglas que tests/textos.test.ts (CLAUDE.md y docs/brief-cambio-de-encuadre.md), más las de lenguaje del brief
const PROHIBIDAS = [
	'ilegal', 'abusivo', 'actualizado a hoy', 'cuesta entrar', 'techo', 'lo que se paga aqui', 'lo que se paga en tu zona', 'puedes respirar',
	'dentro de lo razonable', 'como mucho', 'como maximo', 'de media', 'precio justo', 'precio correcto', 'precio real', 'lo que vale', 'precio de mercado',
	'razonable', 'normal', 'de hoy', 'abuso', 'robo', 'especulacion', 'te toman el pelo'
];

describe('preguntas: las cuatro páginas', () => {
	it('son las cuatro, con los slugs pedidos', () => {
		expect(PREGUNTAS.map((p) => p.slug)).toEqual([
			'como-saber-si-un-alquiler-es-caro-en-madrid',
			'que-es-el-indice-de-referencia-del-alquiler',
			'por-que-los-anuncios-son-mas-caros-que-los-contratos',
			'supera-mi-alquiler-el-indice-de-referencia'
		]);
	});

	it.each(PREGUNTAS.map((p) => [p.slug, p] as const))('%s: título, descripción y H1', (_s, p) => {
		const titulo = `${p.titulo} · A su precio`;
		expect(titulo.length).toBeLessThanOrEqual(60);
		expect(titulo.endsWith(' · A su precio')).toBe(true);
		expect(titulo).not.toBe(p.h1);
		expect(p.titulo.startsWith('A su precio')).toBe(false);
		expect(p.descripcion.length).toBeLessThanOrEqual(155);
		expect(p.descripcion).toMatch(/compru[eé]b|comprobar/i);
		expect(p.h1.endsWith('?') || p.h1.includes('?')).toBe(true);
	});

	it('H1: exactamente el pedido', () => {
		expect(PREGUNTAS.map((p) => p.h1)).toEqual([
			'¿Cómo saber si un alquiler está caro en Madrid?',
			'¿Qué es el índice de referencia del alquiler (SERPAVI)?',
			'¿Por qué los anuncios piden más de lo que pagan los inquilinos actuales?',
			'¿Supera mi alquiler el índice de referencia? Cómo comprobarlo'
		]);
	});

	it.each(PREGUNTAS.map((p) => [p.slug, p] as const))('%s: estructura y longitud', (_s, p) => {
		// La respuesta son las dos primeras frases y se entiende sola
		expect(p.respuesta).toHaveLength(2);
		for (const r of p.respuesta) expect(frases(r)).toBe(1);
		expect(p.secciones.length).toBeGreaterThanOrEqual(3);
		expect(p.secciones.length).toBeLessThanOrEqual(5);
		for (const s of p.secciones) {
			expect(s.h2.startsWith('¿') && s.h2.endsWith('?'), s.h2).toBe(true);
			for (const par of [...s.parrafos, ...(s.despues ?? [])]) expect(frases(par), par).toBeLessThanOrEqual(3);
			if (s.tabla) expect(s.tabla.titulo.startsWith('Ejemplo')).toBe(true);
		}
		expect(p.faq.length).toBeGreaterThanOrEqual(3);
		expect(p.faq.length).toBeLessThanOrEqual(4);
		for (const f of p.faq) {
			expect(f.q.endsWith('?')).toBe(true);
			expect(frases(f.a), f.a).toBeLessThanOrEqual(2);
		}
		// 600–900 palabras, con y sin la lista de fuentes
		expect(palabras(textoDePagina(p))).toBeGreaterThanOrEqual(600);
		expect(palabras(textoDePagina(p, true))).toBeLessThanOrEqual(900);
	});

	it.each(PREGUNTAS.map((p) => [p.slug, p] as const))('%s: enlaces, herramienta y fuentes', (_s, p) => {
		expect(p.utm.length).toBeLessThanOrEqual(40);
		expect(campanaValida(p.utm), `utm_content ${p.utm} no pasa el filtro de la analítica`).toBe(true);
		expect(enlaceHerramienta(p.modo, p.utm)).toBe(`/?modo=${p.modo}&utm_source=preguntas&utm_content=${p.utm}`);
		// Dos preguntas relacionadas, distintas y que existen
		expect(new Set(p.relacionadas).size).toBe(2);
		for (const r of p.relacionadas) {
			expect(r).not.toBe(p.slug);
			expect(preguntaPorSlug(r)).toBeDefined();
		}
		expect(p.fuentes.length).toBeGreaterThanOrEqual(2);
		for (const f of p.fuentes) expect(f.url).toMatch(/^https:\/\//);
		expect(p.fuentes.some((f) => /serpavi\.mivau\.gob\.es/.test(f.url))).toBe(true);
	});

	it.each(PREGUNTAS.map((p) => [p.slug, p] as const))('%s: vocabulario', (_s, p) => {
		const todo = [p.titulo, p.descripcion, ...textoDePagina(p, true)];
		for (const t of todo) for (const palabra of PROHIBIDAS) expect(sinTildes(t), `«${palabra}» en «${t.slice(0, 60)}»`).not.toContain(palabra);
		// «Caro» solo en preguntas y títulos, nunca como veredicto
		const preguntas = new Set([p.h1, p.titulo, ...p.secciones.map((s) => s.h2), ...p.faq.map((f) => f.q)]);
		for (const t of textoDePagina(p, true).filter((x) => !preguntas.has(x))) expect(t, t.slice(0, 60)).not.toMatch(/\bcar[oa]s?\b/i);
		// Sin cifras agregadas de usuarios ni pisos reales
		expect(todo.join(' ')).not.toMatch(/\b(análisis|usuarios) (hechos|realizados)|hemos analizado|se han comprobado/i);
	});
});

describe('preguntas: la del decreto (supera-mi-alquiler-el-indice-de-referencia)', () => {
	const p = preguntaPorSlug('supera-mi-alquiler-el-indice-de-referencia')!;
	const texto = textoDePagina(p, true).join(' ');
	it('cita el BOE literalmente y avisa de que es provisional', () => {
		const cita = p.secciones.flatMap((s) => s.cita?.texto ?? []).join(' ');
		expect(cita).toContain('no procederá la aplicación de incremento alguno de la renta');
		expect(cita).toContain('no podrá ser superior al dos por ciento');
		expect(p.secciones.some((s) => s.cita?.fuente.url === 'https://www.boe.es/buscar/act.php?id=BOE-A-2026-20823')).toBe(true);
		expect(p.aviso).toMatch(/pendiente de convalidación/);
		expect(p.aviso).toMatch(/no es asesoramiento legal/i);
		expect(texto).toContain('31/12/2027');
		expect(texto).toContain('07/10/2026');
	});
	it('dice el valor oficial y que la estimación es independiente', () => {
		expect(texto).toContain('serpavi.mivau.gob.es');
		expect(texto).toMatch(/independiente/);
	});
});

describe('preguntas: JSON-LD', () => {
	it.each(PREGUNTAS.map((p) => [p.slug, p] as const))('%s: Article, FAQPage y BreadcrumbList válidos', (_s, p) => {
		const bloques = jsonLdPregunta(p) as Record<string, any>[];
		for (const b of bloques) {
			const t = jsonLdComoTexto(b);
			expect(JSON.parse(t)).toEqual(JSON.parse(JSON.stringify(b)));
			expect(t).not.toContain('<');
		}
		const [art, faq, migas] = bloques;
		expect(art).toMatchObject({ '@type': 'Article', headline: p.h1, dateModified: FECHA_PREGUNTAS, author: { name: AUTOR }, publisher: { '@type': 'Organization', name: 'A su precio' } });
		expect(faq!['@type']).toBe('FAQPage');
		expect(faq!.mainEntity.map((q: any) => q.name)).toEqual(p.faq.map((f) => f.q));
		expect(migas!.itemListElement.map((i: any) => i.name)).toEqual(['Inicio', 'Preguntas', p.h1]);
		expect(migas!.itemListElement.map((i: any) => i.item)).toEqual([`${SITE_URL}/`, `${SITE_URL}/preguntas`, `${SITE_URL}/preguntas/${p.slug}`]);
	});
	it('el hub: BreadcrumbList', () => {
		const [migas] = jsonLdHubPreguntas() as Record<string, any>[];
		expect(migas!['@type']).toBe('BreadcrumbList');
		expect(migas!.itemListElement.map((i: any) => i.name)).toEqual(['Inicio', 'Preguntas']);
	});
});

describe('preguntas: el hub', () => {
	it('H1, grupos por situación y todos los enlaces existen', () => {
		expect(HUB_PREGUNTAS.h1).toBe('Preguntas sobre el precio del alquiler en Madrid');
		expect(`${HUB_PREGUNTAS.titulo} · A su precio`.length).toBeLessThanOrEqual(60);
		expect(HUB_PREGUNTAS.descripcion.length).toBeLessThanOrEqual(155);
		expect(HUB_PREGUNTAS.grupos.map((g) => g.titulo)).toEqual(['Si estás buscando piso', 'Si ya vives de alquiler', 'Sobre los datos']);
		const [a, b, c] = HUB_PREGUNTAS.grupos;
		expect(a!.paginas).toEqual([PREGUNTAS[0]!.slug, PREGUNTAS[2]!.slug]);
		expect(b!.paginas).toEqual([PREGUNTAS[3]!.slug, PREGUNTAS[0]!.slug]);
		expect(c!.paginas).toEqual([PREGUNTAS[1]!.slug]);
		expect(c!.extra).toMatchObject({ href: '/como-calculamos' });
		expect(campanaValida(HUB_PREGUNTAS.utm)).toBe(true);
	});
});

describe('preguntas: sitemap, pie y canonical', () => {
	it('las 5 URLs, con lastmod', () => {
		const xml = contenidoSitemap();
		const nuevas = ['/preguntas', ...PREGUNTAS.map((p) => `/preguntas/${p.slug}`)];
		expect(nuevas).toHaveLength(5);
		for (const r of nuevas) expect(xml).toContain(`<loc>${SITE_URL}${r}</loc><lastmod>${FECHA_PREGUNTAS}</lastmod>`);
		expect(ENTRADAS_SITEMAP.filter((e) => e.ruta.startsWith('/preguntas'))).toHaveLength(5);
	});
	it('el pie enlaza a /preguntas y «Cómo calculamos» enlaza al hub', () => {
		expect(readFileSync(new URL('../src/lib/componentes/Pie.svelte', import.meta.url), 'utf8')).toContain('href="/preguntas"');
		expect(readFileSync(new URL('../src/routes/como-calculamos/+page.svelte', import.meta.url), 'utf8')).toContain('href="/preguntas"');
	});
	it('las páginas no llevan noindex ni un segundo H1', () => {
		for (const f of ['src/routes/preguntas/+page.svelte', 'src/routes/preguntas/[slug]/+page.svelte']) {
			const s = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
			expect(s).not.toMatch(/noindex|name="robots"/);
			expect(s.match(/<h1[\s>]/g)).toHaveLength(1);
		}
	});
});
