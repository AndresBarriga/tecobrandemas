import { describe, expect, it } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { campanaValida } from '../src/lib/cliente/analitica-filtro';
import {
	CONSEJO_TRADUCCION_EN, CORRECCIONES, ENLACE_HERRAMIENTA_EN, ENTRADAS_SITEMAP, FECHA_EN, HUB_PREGUNTAS, MAPA_REFERENCIA, OG_PAGINAS, PAGINAS_EN, PARES_IDIOMA, PREGUNTAS, SITE_URL,
	TEXTO_CORRECCIONES, alternativas, contenidoSitemap, jsonLdComoTexto, jsonLdEn, mesAnio, textoDePaginaEn, ogDe
} from '../src/lib/resultado';

const fuente = (ruta: string) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const palabras = (t: string[]) => t.join(' ').split(/\s+/).filter(Boolean).length;
const frases = (t: string) => t.split(/(?<=[.!?])\s+(?=[A-Z“¿])/).filter(Boolean).length;
const [INICIO, INDICE, ALTO] = PAGINAS_EN;

// Equivalentes en inglés de las reglas de vocabulario (docs/brief-cambio-de-encuadre.md): ni veredictos ni «techo»
const PROHIBIDAS_EN = ['illegal', 'abusive', 'ceiling', 'market price', 'fair price', 'real price', 'reasonable', 'normal', 'expensive', 'cheap', 'overpriced', 'rip-off', 'unfair'];

describe('inglés: las tres páginas', () => {
	it('rutas pedidas', () => {
		expect(PAGINAS_EN.map((p) => p.ruta)).toEqual(['/en', '/en/what-is-the-rent-reference-index-in-spain', '/en/how-to-check-if-a-rent-is-too-high-in-madrid']);
		expect(INICIO!.h1).toBe('Is your rent in Madrid in line with what tenants already pay?');
		expect(INICIO!.boton).toBe('Check a rent (in Spanish, 1 minute)');
		expect(ENLACE_HERRAMIENTA_EN).toBe('/?utm_source=en');
		expect(campanaValida('en')).toBe(true);
	});

	it.each(PAGINAS_EN.map((p) => [p.ruta, p] as const))('%s: título, descripción, respuesta y botón', (_r, p) => {
		const titulo = `${p.titulo} · A su precio`;
		expect(titulo.length).toBeLessThanOrEqual(60);
		expect(titulo).not.toBe(p.h1);
		expect(p.descripcion.length).toBeLessThanOrEqual(155);
		expect(p.respuesta).toHaveLength(2);
		for (const r of p.respuesta) expect(frases(r), r).toBe(1);
		expect(p.boton).toBe('Check a rent (in Spanish, 1 minute)');
		expect(p.faq.length).toBeGreaterThanOrEqual(3);
		for (const f of p.faq) expect(f.q.endsWith('?')).toBe(true);
	});

	it('/en: título pedido; el consejo de traducción, bajo el botón de las tres páginas', () => {
		expect(`${INICIO!.titulo} · A su precio`).toBe('Is my Madrid rent too high? Free check · A su precio');
		expect(CONSEJO_TRADUCCION_EN).toBe('Tip: Chrome, Safari and Edge can translate the tool into English automatically.');
		const comp = fuente('src/lib/componentes/ArticuloEn.svelte');
		expect(comp.indexOf('{CONSEJO_TRADUCCION_EN}')).toBeGreaterThan(comp.indexOf('{p.boton}'));
		expect(comp.indexOf('{CONSEJO_TRADUCCION_EN}')).toBeLessThan(comp.indexOf('{#each p.secciones'));
		expect(textoDePaginaEn(INDICE!).join(' ')).toContain('On A su precio, an area with too few contracts');
	});

	it('/en: «How to use it» con los campos y los 4 resultados', () => {
		const uso = INICIO!.secciones[0]!;
		expect(uso.h2).toBe('How to use it');
		const t = JSON.stringify(uso.definiciones);
		for (const x of ['Address', 'Un anuncio', 'a listing', 'Mi alquiler', 'Precio al mes', 'Metros construidos']) expect(t).toContain(x);
		const filas = INICIO!.secciones.find((s) => s.tabla)!.tabla!.filas.map((f) => f[0]);
		expect(filas).toEqual(['POR DEBAJO', 'DENTRO', 'ALGO POR ENCIMA', 'POR ENCIMA']);
	});

	it.each([INDICE!, ALTO!].map((p) => [p.ruta, p] as const))('%s: 500–700 palabras, 3–4 H2, ejemplo marcado y fuentes', (_r, p) => {
		const n = palabras(textoDePaginaEn(p));
		expect(n).toBeGreaterThanOrEqual(500);
		expect(palabras(textoDePaginaEn(p, true))).toBeLessThanOrEqual(700);
		expect(p.secciones.length).toBeGreaterThanOrEqual(3);
		expect(p.secciones.length).toBeLessThanOrEqual(4);
		for (const s of p.secciones) if (s.tabla) expect(s.tabla.titulo.startsWith('Example (hypothetical)')).toBe(true);
		expect(p.fuentes.some((f) => /serpavi\.mivau\.gob\.es/.test(f.url))).toBe(true);
		for (const s of p.secciones) for (const par of s.parrafos) expect(frases(par), par).toBeLessThanOrEqual(3);
	});

	it('sin hablar del decreto en detalle: enlaza a la página en español y a la calculadora', () => {
		const t = textoDePaginaEn(INDICE!, true).join(' ');
		expect(INDICE!.enlacesEs!.map((e) => e.href)).toEqual(['/preguntas/supera-mi-alquiler-el-indice-de-referencia', 'https://www.mivau.gob.es/vivienda/calculadora-precio-alquiler']);
		expect(t).not.toMatch(/2 ?%|two per cent|dos por ciento|31 December 2027|disposición final/i);
		expect(textoDePaginaEn(ALTO!).join(' ')).not.toMatch(/decree/i);
	});

	it.each(PAGINAS_EN.map((p) => [p.ruta, p] as const))('%s: vocabulario; «too high» solo en título, H1 y preguntas', (_r, p) => {
		const todo = [p.titulo, p.descripcion, ...textoDePaginaEn(p, true)];
		for (const t of todo) for (const w of PROHIBIDAS_EN) expect(t.toLowerCase(), `«${w}» en «${t.slice(0, 50)}»`).not.toContain(w);
		const preguntas = new Set([p.h1, p.titulo, ...p.secciones.map((s) => s.h2), ...p.faq.map((f) => f.q)]);
		for (const t of textoDePaginaEn(p, true).filter((x) => !preguntas.has(x))) expect(t.toLowerCase(), t.slice(0, 50)).not.toContain('too high');
		expect(todo.join(' ')).not.toMatch(/users|analyses (done|made)|we have analy[sz]ed/i);
	});

	it('todos los botones llevan utm_source=en y la página dice el idioma de la herramienta', () => {
		const comp = fuente('src/lib/componentes/ArticuloEn.svelte');
		expect(comp).toContain('ENLACE_HERRAMIENTA_EN');
		expect(comp.match(/class="boton"/g)).toHaveLength(1);
		expect(comp).not.toMatch(/href="\/\?(?!utm_source=en)/);
	});
});

describe('inglés: hreflang, lang, sitemap, JSON-LD y pie', () => {
	it('pares es/en simétricos', () => {
		expect(PARES_IDIOMA).toEqual([
			{ es: '/', en: '/en' },
			{ es: '/preguntas/que-es-el-indice-de-referencia-del-alquiler', en: '/en/what-is-the-rent-reference-index-in-spain' },
			{ es: '/preguntas/como-saber-si-un-alquiler-es-caro-en-madrid', en: '/en/how-to-check-if-a-rent-is-too-high-in-madrid' }
		]);
		for (const par of PARES_IDIOMA) {
			expect(alternativas(par.es)).toEqual(par);
			expect(alternativas(par.en)).toEqual(par);
			if (par.es !== '/') expect(PREGUNTAS.some((p) => `/preguntas/${p.slug}` === par.es)).toBe(true);
		}
		expect(alternativas('/mapa')).toBeNull();
		const layout = fuente('src/routes/+layout.svelte');
		expect(layout).toContain('hreflang="es"');
		expect(layout).toContain('hreflang="en"');
		expect(layout).toContain('hreflang="x-default"');
	});
	it('<html lang="en"> en el servidor y el idioma se restablece al salir', () => {
		expect(fuente('src/hooks.server.ts')).toMatch(/startsWith\('\/en\/'\)[\s\S]*lang="en"/);
		expect(fuente('src/lib/componentes/ArticuloEn.svelte')).toContain("document.documentElement.lang = 'en'");
	});
	it('sitemap: /en, las dos páginas y /correcciones, con lastmod', () => {
		const xml = contenidoSitemap();
		for (const r of PAGINAS_EN.map((p) => p.ruta)) expect(xml).toContain(`<loc>${SITE_URL}${r}</loc><lastmod>${FECHA_EN}</lastmod>`);
		expect(xml).toContain(`<loc>${SITE_URL}/correcciones</loc><lastmod>`);
		for (const e of ENTRADAS_SITEMAP) expect(e.ruta).not.toMatch(/\/t\/|\/r7k\/|[?#]/);
	});
	it.each(PAGINAS_EN.map((p) => [p.ruta, p] as const))('%s: JSON-LD WebPage, FAQPage y BreadcrumbList válidos', (_r, p) => {
		const bloques = jsonLdEn(p) as Record<string, any>[];
		for (const b of bloques) {
			const t = jsonLdComoTexto(b);
			expect(JSON.parse(t)).toEqual(JSON.parse(JSON.stringify(b)));
			expect(t).not.toContain('<');
		}
		const [web, faq, migas] = bloques;
		expect(web).toMatchObject({ '@type': 'WebPage', inLanguage: 'en', url: `${SITE_URL}${p.ruta}`, dateModified: FECHA_EN });
		expect(faq!.mainEntity.map((q: any) => q.name)).toEqual(p.faq.map((f) => f.q));
		expect(migas!.itemListElement[0].name).toBe('Home');
		expect(migas!.itemListElement.at(-1).item).toBe(`${SITE_URL}${p.ruta}`);
	});
	it('el pie enlaza a «English» (discreto), a «Correcciones» y desde el inglés a «Español»', () => {
		const pie = fuente('src/lib/componentes/Pie.svelte');
		expect(pie).toContain('hreflang="en"');
		expect(pie).toContain('>English<');
		expect(pie).toContain('href="/correcciones"');
		expect(pie).toContain('>Español<');
	});
});

describe('vista previa (og:image)', () => {
	const paginasConOg = ['/preguntas', ...PREGUNTAS.map((p) => `/preguntas/${p.slug}`), '/mapa', ...PAGINAS_EN.map((p) => p.ruta)];
	it('una imagen por página, y cada título es el H1 de su página', () => {
		expect(OG_PAGINAS.map((o) => o.ruta).filter((r) => !r.startsWith('/alquiler'))).toEqual(paginasConOg);
		const h1 = new Map<string, string>([['/preguntas', HUB_PREGUNTAS.h1], ['/mapa', MAPA_REFERENCIA.titulo], ...PREGUNTAS.map((p) => [`/preguntas/${p.slug}`, p.h1] as [string, string]), ...PAGINAS_EN.map((p) => [p.ruta, p.h1] as [string, string])]);
		for (const o of OG_PAGINAS.filter((x) => !x.ruta.startsWith('/alquiler'))) expect(o.titulo, o.ruta).toBe(h1.get(o.ruta));
		expect(ogDe('/mapa')!.imagen).toBe('mapa.png');
	});
	it.each(OG_PAGINAS.map((o) => [o.imagen] as const))('%s: PNG de 1200×630 y menos de 300 KB', (imagen) => {
		const ruta = new URL(`../static/og/${imagen}`, import.meta.url);
		const b = readFileSync(ruta);
		expect(b.subarray(1, 4).toString()).toBe('PNG');
		expect(b.readUInt32BE(16)).toBe(1200);
		expect(b.readUInt32BE(20)).toBe(630);
		expect(statSync(ruta).size).toBeLessThan(300 * 1024);
	});
	it('las páginas usan la plantilla de etiquetas', () => {
		for (const f of ['src/routes/preguntas/+page.svelte', 'src/routes/preguntas/[slug]/+page.svelte', 'src/routes/mapa/+page.svelte', 'src/lib/componentes/ArticuloEn.svelte']) expect(fuente(f), f).toContain('<MetaSocial');
		const meta = fuente('src/lib/componentes/MetaSocial.svelte');
		for (const x of ['og:image', 'og:title', 'og:description', 'twitter:card', 'summary_large_image', 'content="1200"', 'content="630"']) expect(meta).toContain(x);
	});
});

describe('confianza', () => {
	it('/correcciones: texto pedido, lista vacía con su formato, mismo correo que «Quiénes somos»', () => {
		expect(TEXTO_CORRECCIONES.intro).toBe('Si encuentras un error en un dato o un texto, escríbenos a hola@asuprecio.com. Aquí registramos lo que corregimos.');
		expect(TEXTO_CORRECCIONES.formato).toBe('fecha · página · qué cambió');
		expect(CORRECCIONES).toEqual([]);
		expect(fuente('src/routes/correcciones/+page.svelte')).not.toMatch(/noindex|name="robots"/);
	});
	it('«Cómo calculamos»: aviso de IA al final y la nota de los datos de 2024', () => {
		const c = fuente('src/routes/como-calculamos/+page.svelte');
		expect(c).toContain('Los textos de esta web se redactan con ayuda de herramientas de IA y se revisan a mano. Los datos salen de fuentes oficiales, enlazadas en cada página.');
		expect(c).toContain('{p.notaDatos}');
		expect(c.indexOf('nota-ia">')).toBeGreaterThan(c.indexOf('class="cta"'));
	});
	it('la portada dice de qué año son los datos, sin un mes de actualización escrito a mano', () => {
		expect(fuente('src/routes/+page.svelte')).toContain('{NOTA_DATOS}');
	});
});
