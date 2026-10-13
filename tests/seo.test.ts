import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
	AGENTES_BUSQUEDA, AGENTES_VISTA_PREVIA, RUTAS_INDEXABLES, SEO_COMO_CALCULAMOS, SEO_MAPA, SEO_PORTADA, SITE_URL, contenidoRobots, contenidoSitemap, jsonLdComoTexto, jsonLdPortada
} from '../src/lib/resultado';

const fuente = (ruta: string) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');

describe('SEO: título y descripción', () => {
	it('portada', () => {
		expect(SEO_PORTADA.titulo).toBe('Precio de referencia del alquiler en Madrid · A su precio');
		expect(SEO_PORTADA.descripcion).toBe(
			'Comprueba en un minuto si tu alquiler, o el de un anuncio, está por encima de lo que pagan quienes ya viven de alquiler en tu zona. Datos del Ministerio de Vivienda. Gratis y sin registro.'
		);
	});
	it('«Cómo calculamos» lleva «alquiler Madrid» y «referencia», y cabe en una búsqueda; el mapa tiene su propio test (tests/mapa-seo.test.ts)', () => {
		const s = SEO_COMO_CALCULAMOS;
		for (const t of [s.titulo, s.descripcion]) {
			expect(t.toLowerCase()).toContain('alquiler madrid');
			expect(t.toLowerCase()).toContain('referencia');
		}
		expect(s.titulo.length).toBeLessThanOrEqual(70);
		expect(s.descripcion.length).toBeLessThanOrEqual(160);
		expect(SEO_MAPA.titulo.length).toBeLessThanOrEqual(70);
		expect(SEO_MAPA.descripcion.length).toBeLessThanOrEqual(155);
	});
	it('las páginas usan esos textos', () => {
		expect(fuente('src/routes/+page.svelte')).toContain('{SEO_PORTADA.titulo}');
		expect(fuente('src/routes/mapa/+page.svelte')).toContain('{SEO_MAPA.titulo}');
		expect(fuente('src/routes/como-calculamos/+page.svelte')).toContain('{SEO_COMO_CALCULAMOS.titulo}');
	});
});

describe('SEO: JSON-LD de la portada', () => {
	const [app, org] = jsonLdPortada() as [Record<string, unknown>, Record<string, unknown>];
	it('es JSON válido y no puede cerrar la etiqueta', () => {
		for (const d of jsonLdPortada()) {
			const texto = jsonLdComoTexto(d);
			expect(JSON.parse(texto)).toEqual(JSON.parse(JSON.stringify(d)));
			expect(texto).not.toContain('<');
		}
		expect(jsonLdComoTexto({ a: '</script>' })).not.toContain('</script>');
	});
	it('WebApplication', () => {
		expect(app).toMatchObject({
			'@context': 'https://schema.org', '@type': 'WebApplication', name: 'A su precio', url: `${SITE_URL}/`,
			applicationCategory: 'UtilitiesApplication', isAccessibleForFree: true, inLanguage: 'es', areaServed: 'Madrid',
			description: SEO_PORTADA.descripcion
		});
	});
	it('Organization', () => {
		expect(org).toMatchObject({ '@type': 'Organization', name: 'A su precio', url: `${SITE_URL}/` });
		expect(String(org.logo)).toMatch(/^https:\/\/asuprecio\.com\/.+\.png$/);
		if ('sameAs' in org) for (const u of org.sameAs as string[]) expect(u).toMatch(/^https:\/\/(www\.)?(instagram|facebook)\.com\//);
	});
});

describe('SEO: sitemap y robots', () => {
	it('sitemap: las páginas indexables; sin /t/, /r7k/ ni parámetros', () => {
		const xml = contenidoSitemap();
		const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
		expect(urls.slice(0, 3)).toEqual([`${SITE_URL}/`, `${SITE_URL}/como-calculamos`, `${SITE_URL}/mapa`]);
		expect(urls).toHaveLength(RUTAS_INDEXABLES.length);
		for (const u of urls) expect(u).not.toMatch(/\/t\/|\/r7k\/|[?#]/);
		expect(xml.startsWith('<?xml')).toBe(true);
	});
	it('robots: cierra /api/ y /r7k/, deja abierto /t/ (lo protege el noindex), enlaza el sitemap y deja entrar a buscadores y vistas previas', () => {
		const txt = contenidoRobots();
		const grupos = txt.trim().split(/\n\n+/).filter((g) => g.includes('User-agent'));
		const reglasDe = (agente: string) => grupos.find((g) => g.split('\n').includes(`User-agent: ${agente}`))!.split('\n').filter((l) => /^(Allow|Disallow)/.test(l));
		expect(txt).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
		for (const a of ['*', ...AGENTES_BUSQUEDA, ...AGENTES_VISTA_PREVIA]) {
			expect(reglasDe(a), a).toEqual(['Allow: /', 'Disallow: /api/', 'Disallow: /r7k/']);
		}
		expect(txt).not.toContain('/t/');
		// Ninguna regla cierra todo el sitio
		expect(txt).not.toMatch(/^Disallow:\s*\/?\s*$/m);
	});
});

describe('SEO: noindex', () => {
	it('config/indexacion.json permite indexar', () => {
		expect(JSON.parse(fuente('config/indexacion.json')).noindex).toBe(false);
	});
	it('las tarjetas /t/ llevan noindex (etiqueta y cabecera) y ninguna página indexable lo fuerza', () => {
		expect(fuente('src/routes/+layout.svelte')).toContain("page.route.id?.startsWith('/t/')");
		expect(fuente('src/hooks.server.ts')).toContain("event.url.pathname.startsWith('/t/')");
		for (const p of ['src/routes/+page.svelte', 'src/routes/mapa/+page.svelte', 'src/routes/como-calculamos/+page.svelte']) {
			expect(fuente(p), p).not.toMatch(/noindex|name="robots"/);
		}
	});
});
