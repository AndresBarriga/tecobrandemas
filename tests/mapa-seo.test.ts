import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
	ENTRADAS_SITEMAP, FECHA_MAPA, MAPA_REFERENCIA, SEO_MAPA, SITE_URL, TEXTO_MAPA, contenidoSitemap, jsonLdComoTexto, jsonLdMapa, textoMapaVisible
} from '../src/lib/resultado';

const fuente = (ruta: string) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const H1 = MAPA_REFERENCIA.titulo;
const TEXTO = textoMapaVisible(H1);

// Mismas reglas que tests/textos.test.ts y tests/preguntas.test.ts, más las de este bloque (sin «más caro» ni «más barato»)
const PROHIBIDAS = [
	'ilegal', 'abusivo', 'actualizado a hoy', 'cuesta entrar', 'techo', 'lo que se paga aqui', 'lo que se paga en tu zona', 'puedes respirar',
	'dentro de lo razonable', 'como mucho', 'como maximo', 'de media', 'precio justo', 'precio correcto', 'precio real', 'lo que vale', 'precio de mercado',
	'razonable', 'normal', 'de hoy', 'mas caro', 'mas barato', 'mas caras', 'mas baratas', 'ranking', 'mejores', 'peores'
];

describe('mapa: título, descripción y H1', () => {
	it('el título y la descripción pedidos', () => {
		expect(SEO_MAPA.titulo).toBe('Mapa del índice de referencia del alquiler en Madrid · A su precio');
		expect(SEO_MAPA.descripcion.length).toBeLessThanOrEqual(155);
		expect(SEO_MAPA.descripcion).toMatch(/referencia de lo que pagan quienes ya viven de alquiler/);
		expect(SEO_MAPA.descripcion).toMatch(/por zona/);
		expect(SEO_MAPA.descripcion).toMatch(/Ministerio de Vivienda/);
		expect(SEO_MAPA.descripcion).toMatch(/Compara tu alquiler gratis/);
	});
	it('un solo H1, el de la cabecera, con el texto pedido', () => {
		expect(H1).toBe('Mapa del índice de referencia del alquiler en Madrid');
		const pagina = fuente('src/routes/mapa/+page.svelte');
		expect(pagina.match(/<h1[\s>]/g)).toHaveLength(1);
		expect(pagina).toContain('T.titulo');
	});
});

describe('mapa: texto debajo del mapa', () => {
	it('300–500 palabras', () => {
		const n = TEXTO.join(' ').split(/\s+/).filter(Boolean).length;
		expect(n).toBeGreaterThanOrEqual(300);
		expect(n).toBeLessThanOrEqual(500);
	});
	it('respuesta en 2 frases, tres secciones H2 y tres preguntas', () => {
		expect(TEXTO_MAPA.respuesta).toHaveLength(2);
		expect(TEXTO_MAPA.secciones.map((s) => s.h2)).toEqual(['Cómo leer el mapa', 'De dónde salen los datos', 'Qué no muestra']);
		expect(TEXTO_MAPA.faq).toHaveLength(3);
		expect(TEXTO_MAPA.boton).toBe('Comparar mi alquiler');
		expect(TEXTO_MAPA.enlaceHerramienta).toBe('/?utm_source=mapa');
		expect(TEXTO_MAPA.enlaces.map((e) => e.href)).toEqual(['/preguntas/que-es-el-indice-de-referencia-del-alquiler', '/como-calculamos']);
	});
	it('cubre lo pedido: colores, tamaño, parte alta, SERPAVI, datos de 2024, estimación independiente y qué no muestra', () => {
		const t = TEXTO.join(' ');
		for (const x of [/colores/, /tamaño/, /parte alta/, /SERPAVI/, /los alquileres han subido desde entonces/, /estimación independiente/, /serpavi\.mivau\.gob\.es/, /Los contratos no son precios de anuncios/, /cumple la ley/, /sin dato/]) expect(t).toMatch(x);
	});
	it('vocabulario prohibido, sin cifras de zonas, sin listas de barrios ni datos de usuarios', () => {
		for (const t of TEXTO) for (const palabra of PROHIBIDAS) expect(sinTildes(t), `«${palabra}» en «${t.slice(0, 50)}»`).not.toContain(palabra);
		// Solo las cifras de las reglas del mapa: tamaños, mínimos de contratos y año de los datos
		const cifras = TEXTO.join(' ').match(/\d+/g) ?? [];
		for (const c of cifras) expect(['20', '30', '40', '55', '70', '90', '110', '150', '2015', '2024']).toContain(c);
		expect(TEXTO.join(' ')).not.toMatch(/€\/m²[^.]*\d|\b\d+[,.]\d+\b/);
		expect(TEXTO.join(' ')).not.toMatch(/usuarios|análisis (hechos|realizados)|hemos analizado/i);
		// «caro» solo en preguntas: aquí, en ninguna parte
		expect(TEXTO.join(' ')).not.toMatch(/\bcar[oa]s?\b/i);
	});
});

describe('mapa: JSON-LD, sitemap y canonical', () => {
	it('WebPage, FAQPage y BreadcrumbList válidos', () => {
		const bloques = jsonLdMapa(H1) as Record<string, any>[];
		for (const b of bloques) {
			const t = jsonLdComoTexto(b);
			expect(JSON.parse(t)).toEqual(JSON.parse(JSON.stringify(b)));
			expect(t).not.toContain('<');
		}
		const [web, faq, migas] = bloques;
		expect(web).toMatchObject({ '@type': 'WebPage', name: H1, url: `${SITE_URL}/mapa`, dateModified: FECHA_MAPA });
		expect(faq!.mainEntity.map((q: any) => q.name)).toEqual(TEXTO_MAPA.faq.map((f) => f.q));
		expect(migas!.itemListElement.map((i: any) => [i.name, i.item])).toEqual([['Inicio', `${SITE_URL}/`], ['Mapa', `${SITE_URL}/mapa`]]);
	});
	it('el sitemap lleva /mapa con lastmod', () => {
		expect(contenidoSitemap()).toContain(`<loc>${SITE_URL}/mapa</loc><lastmod>${FECHA_MAPA}</lastmod>`);
		expect(ENTRADAS_SITEMAP.find((e) => e.ruta === '/mapa')!.lastmod).toBe(FECHA_MAPA);
	});
	it('el canonical sale solo de la ruta, nunca de los parámetros', () => {
		const layout = fuente('src/routes/+layout.svelte');
		expect(layout).toContain('urlAbsoluta(page.url.pathname');
		expect(layout).not.toMatch(/page\.url\.(search|href)/);
		expect(fuente('src/routes/mapa/+page.svelte')).not.toMatch(/rel="canonical"/);
	});
});
