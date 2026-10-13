import { describe, expect, it } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { analizar } from '../src/lib/motor';
import { campanaValida } from '../src/lib/cliente/analitica-filtro';
import {
	BARRIOS_PILOTO, ENTRADAS_SITEMAP, FECHA_BARRIOS, OG_PAGINAS, SITE_URL, TEXTO_INDICE_BARRIOS, barrioPilotoDeSeccion, barrioPublicable, barriosVecinos,
	construirBarrio, construirIndiceBarrios, contenidoSitemap, enlaceHerramientaBarrio, filasBarrio, h1Barrio, jsonLdBarrio, jsonLdComoTexto, jsonLdIndiceBarrios,
	numero, seccionesConDato, textoDeBarrio, tituloBarrio, type DatosBarrios
} from '../src/lib/resultado';

const J = (r: string) => JSON.parse(readFileSync(new URL(`../${r}`, import.meta.url), 'utf8'));
const datos: DatosBarrios = {
	secciones: J('data/processed/secciones_madrid.json'),
	barrios: J('data/processed/seccion_barrio.json').barrios,
	ipc: J('data/processed/ipc_alquiler.json'),
	vecinas: J('data/processed/vecinas.json')
};
const topo = J('data/processed/secciones_madrid.topo.json');
const fuente = (ruta: string) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const frases = (t: string) => t.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚ¿«])/).filter(Boolean).length;
const mediana = (v: number[]) => { const s = [...v].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; };

/** Tolerancia entre la cifra del barrio y la que da la herramienta para una dirección céntrica: ±15 % en la parte baja y en la alta */
const TOLERANCIA = 0.15;

const SLUGS = [
	'lavapies-embajadores', 'malasana-universidad', 'chueca-justicia', 'barrio-de-las-letras-cortes', 'arguelles', 'trafalgar', 'arapiles', 'goya', 'delicias',
	'cuatro-caminos', 'prosperidad', 'puerta-del-angel', 'vista-alegre', 'pueblo-nuevo', 'palos-de-moguer-palos-de-la-frontera'
];

// Mismas reglas que tests/textos.test.ts y tests/preguntas.test.ts, más las de este piloto
const PROHIBIDAS = [
	'ilegal', 'abusivo', 'actualizado a hoy', 'cuesta entrar', 'techo', 'lo que se paga aqui', 'lo que se paga en tu zona', 'puedes respirar', 'dentro de lo razonable',
	'como mucho', 'como maximo', 'de media', 'precio justo', 'precio correcto', 'precio real', 'lo que vale', 'precio de mercado', 'razonable', 'normal', 'de hoy',
	'mas caro', 'mas barato', 'mas cara', 'mas barata', 'ranking', 'mejores', 'peores', 'evolucion', 'subida', 'bajada', 'usuarios'
];
// La única mención a los anuncios es esta frase, obligada: lo que se muestra no es lo que se pide
const FRASE_ANUNCIOS = 'No es lo que se pide en los anuncios.';

describe('barrios: los 15 slugs y los datos', () => {
	it('slugs pedidos, sin tildes ni eñes', () => {
		expect(BARRIOS_PILOTO.map((b) => b.slug)).toEqual(SLUGS);
		for (const s of SLUGS) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
	});
	it('todos tienen dato suficiente para 50, 70 y 90 m² (si no, no se publican)', () => {
		for (const b of BARRIOS_PILOTO) {
			expect(barrioPublicable(datos, b.codigo), b.oficial).toBe(true);
			expect(datos.barrios[b.codigo]!.nombre, b.slug).toBe(b.oficial);
			const filas = filasBarrio(datos, b.codigo)!;
			expect(filas.map((f) => f.m2)).toEqual([50, 70, 90]);
			for (const f of filas) {
				expect(f.sup).toBeGreaterThan(f.inf);
				expect(f.infM2).toBeGreaterThan(0);
			}
			expect(seccionesConDato(datos, b.codigo).length, b.oficial).toBeGreaterThanOrEqual(5);
		}
		// Un barrio inventado o sin zonas con dato no se publica ni existe
		expect(barrioPublicable(datos, '999')).toBe(false);
		expect(construirBarrio(datos, 'no-existe')).toBeNull();
	});
	it('el rango crece con el tamaño (en €/mes) y baja por m² (los pisos pequeños, más por m²)', () => {
		for (const b of BARRIOS_PILOTO) {
			const [a, c, d] = filasBarrio(datos, b.codigo)!;
			expect(a!.inf).toBeLessThan(c!.inf);
			expect(c!.sup).toBeLessThan(d!.sup);
			expect(a!.infM2).toBeGreaterThan(d!.infM2);
		}
	});
});

describe('barrios: coincide con la herramienta para una dirección céntrica', () => {
	// «Dirección céntrica» = la zona del barrio cuyo centro queda más cerca del centro del barrio (mediana de los centros de sus zonas)
	const centros = new Map<string, [number, number]>();
	const objeto = Object.values(topo.objects)[0] as { geometries: { properties: { cusec: string; cx: number; cy: number } }[] };
	for (const g of objeto.geometries) centros.set(g.properties.cusec, [g.properties.cx, g.properties.cy]);

	it.each(BARRIOS_PILOTO.map((b) => [b.slug, b] as const))(`%s: la parte baja y la parte alta para 70 m² difieren ≤${TOLERANCIA * 100} % de las de la herramienta`, (_s, b) => {
		const cusecs = seccionesConDato(datos, b.codigo);
		const pts = cusecs.map((c) => centros.get(c)!);
		const cx = mediana(pts.map((p) => p[0]));
		const cy = mediana(pts.map((p) => p[1]));
		const central = cusecs.reduce((m, c) => ((centros.get(c)![0] - cx) ** 2 + (centros.get(c)![1] - cy) ** 2 < (centros.get(m)![0] - cx) ** 2 + (centros.get(m)![1] - cy) ** 2 ? c : m));
		const s = datos.secciones[central]!;
		const r = analizar({ precio: 1000, superficie: 70, obraNueva: false, tipo: 'piso', largaDuracion: true }, [{ cusec: central, smed: s.smed, p25: s.p25, p75: s.p75, n: s.n }], datos.ipc.factor);
		expect(r.tipo).toBe('resultado');
		if (r.tipo !== 'resultado') return;
		const f70 = filasBarrio(datos, b.codigo)!.find((f) => f.m2 === 70)!;
		expect(Math.abs(f70.inf / r.prudente.referencia.inf - 1), `parte baja ${f70.inf} frente a ${Math.round(r.prudente.referencia.inf)}`).toBeLessThanOrEqual(TOLERANCIA);
		expect(Math.abs(f70.sup / r.prudente.referencia.sup - 1), `parte alta ${f70.sup} frente a ${Math.round(r.prudente.referencia.sup)}`).toBeLessThanOrEqual(TOLERANCIA);
	});
});

describe('barrios: cada página', () => {
	const paginas = BARRIOS_PILOTO.map((b) => [b.slug, construirBarrio(datos, b.slug)!] as const);

	it.each(paginas)('%s: H1, título ≤60, descripción, respuesta y botón', (slug, p) => {
		const b = BARRIOS_PILOTO.find((x) => x.slug === slug)!;
		expect(p.h1).toBe(h1Barrio(b));
		expect(p.h1).toMatch(/^Precio de referencia del alquiler en .+, Madrid$/);
		expect(`${p.titulo} · A su precio`.length).toBeLessThanOrEqual(60);
		expect(tituloBarrio(b)).toBe(`${p.titulo} · A su precio`);
		expect(p.titulo).toMatch(/^Alquiler en .+: (precio de )?referencia$/);
		expect(p.descripcion.length).toBeLessThanOrEqual(155);
		const f70 = filasBarrio(datos, b.codigo)!.find((f) => f.m2 === 70)!;
		expect(p.descripcion).toContain(`de ${numero(f70.inf)} a ${numero(f70.sup)}\u00A0€ al mes`);
		expect(p.descripcion).toContain('70 m²');
		expect(p.descripcion).toContain('Compruébalo con tu dirección');
		// 2 frases con cifras: el rango para 70 m² y la fuente con el mes de los datos
		expect(p.respuesta).toHaveLength(2);
		for (const r of p.respuesta) expect(frases(r), r).toBe(1);
		expect(p.respuesta[0]).toMatch(/70 m².*[\d.]+ € \(parte baja\).*[\d.]+ € \(parte alta\) al mes/);
		expect(p.respuesta[1]).toMatch(/SERPAVI.*IPC del alquiler.*datos actualizados a [a-z]+ de 20\d\d\.$/);
		expect(p.actualizado).toMatch(/^[a-z]+ de 20\d\d$/);
		expect(p.boton).toMatch(/^Comprobar mi alquiler en /);
		expect(enlaceHerramientaBarrio(slug)).toBe(`/?utm_source=barrio&utm_content=${slug}`);
	});

	it('los slugs caben en utm_content (40 caracteres) y pasan el filtro de la analítica', () => {
		for (const s of SLUGS) expect(campanaValida(s), s).toBe(true);
	});

	it.each(paginas)('%s: tabla de 50, 70 y 90 m² con €/mes y €/m²', (_s, p) => {
		expect(p.tabla.filas).toHaveLength(3);
		expect(p.tabla.filas.map((f) => f[0])).toEqual(['50 m²', '70 m²', '90 m²']);
		for (const f of p.tabla.filas) {
			expect(f[1]).toMatch(/^[\d.]+ a [\d.]+ €$/);
			expect(f[2]).toMatch(/^\d{1,2},\d a \d{1,2},\d €\/m²$/);
		}
	});

	it.each(paginas)('%s: «Cómo leer estos datos», «Dónde está», 3 preguntas, fuentes y enlaces', (slug, p) => {
		expect(p.comoLeer.h2).toBe('Cómo leer estos datos');
		expect(p.comoLeer.parrafos.join(' ')).toContain(FRASE_ANUNCIOS);
		expect(p.comoLeer.parrafos.join(' ')).toMatch(/estimación independiente/);
		expect(p.comoLeer.parrafos.join(' ')).toMatch(/varía según la calle/);
		expect(p.comoLeer.enlaces.map((e) => e.url)).toContain('https://www.mivau.gob.es/vivienda/calculadora-precio-alquiler');
		expect(p.comoLeer.enlaces.map((e) => e.url)).toContain('https://serpavi.mivau.gob.es');
		expect(p.donde.h2).toBe('Dónde está');
		expect(p.donde.parrafos[0]).toMatch(/es un barrio del distrito de .+, en Madrid\./);
		// Vecinos del piloto: hasta 3, del piloto y distintos de sí mismo
		expect(p.donde.vecinos.length).toBeLessThanOrEqual(3);
		for (const v of p.donde.vecinos) expect(v.slug).not.toBe(slug);
		expect(p.faq).toHaveLength(3);
		for (const f of p.faq) {
			expect(f.q.endsWith('?')).toBe(true);
			expect(frases(f.a), f.a).toBeLessThanOrEqual(2);
		}
		expect(p.faq[0]!.q).toMatch(/^¿Cuánto se paga por un piso de 50 m² en /);
		expect(p.fuentes.map((f) => f.url)).toEqual([
			'https://serpavi.mivau.gob.es',
			'https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/IPC291807?date=20240101:20991231',
			'https://www.mivau.gob.es/vivienda/calculadora-precio-alquiler'
		]);
	});

	it.each(paginas)('%s: vocabulario y nada de evolución, anuncios, medias ni comparaciones', (_s, p) => {
		const todo = [p.titulo, p.descripcion, ...textoDeBarrio(p)];
		for (const t of todo) for (const palabra of PROHIBIDAS) expect(sinTildes(t), `«${palabra}» en «${t.slice(0, 60)}»`).not.toContain(palabra);
		const sinFrase = todo.join(' ').replace(FRASE_ANUNCIOS, '');
		expect(sinFrase).not.toMatch(/anuncio|oferta|% |\d ?%|media de Madrid|\bMadrid entero\b|\bcar[oa]s?\b|\bbarat[oa]s?\b/i);
		expect(sinFrase).not.toMatch(/respecto a|frente a otros|que en otros|comparad|comparar con/i);
	});

	it('las páginas se distinguen por sus datos: todas las cifras de 70 m² son distintas', () => {
		const respuestas = new Set(paginas.map(([, p]) => p.respuesta[0]));
		expect(respuestas.size).toBe(15);
		const rangos = new Set(paginas.map(([, p]) => p.tabla.filas[1]![1]));
		expect(rangos.size).toBe(15);
	});

	it.each(paginas)('%s: JSON-LD WebPage, FAQPage y BreadcrumbList válidos', (slug, p) => {
		const bloques = jsonLdBarrio(p) as Record<string, any>[];
		for (const b of bloques) {
			const t = jsonLdComoTexto(b);
			expect(JSON.parse(t)).toEqual(JSON.parse(JSON.stringify(b)));
			expect(t).not.toContain('<');
		}
		const [web, faq, migas] = bloques;
		expect(web).toMatchObject({ '@type': 'WebPage', name: p.h1, url: `${SITE_URL}/alquiler/${slug}`, dateModified: p.modificado });
		expect(p.modificado).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(faq!.mainEntity.map((q: any) => q.name)).toEqual(p.faq.map((f) => f.q));
		expect(migas!.itemListElement.map((i: any) => i.name)).toEqual(['Inicio', 'Alquiler por barrios', expect.any(String)]);
		expect(migas!.itemListElement.map((i: any) => i.item)).toEqual([`${SITE_URL}/`, `${SITE_URL}/alquiler`, `${SITE_URL}/alquiler/${slug}`]);
	});

	it('un solo H1 en las dos plantillas, sin noindex, con la plantilla de vista previa', () => {
		for (const f of ['src/routes/alquiler/+page.svelte', 'src/routes/alquiler/[slug]/+page.svelte']) {
			const s = fuente(f);
			expect(s.match(/<h1[\s>]/g), f).toHaveLength(1);
			expect(s).not.toMatch(/noindex|name="robots"/);
			expect(s).toContain('<MetaSocial');
		}
	});
});

describe('barrios: vecinos, índice, sitemap, mapa y pie', () => {
	it('los vecinos salen de los límites reales y los enlaces son solo a barrios del piloto', () => {
		const emb = barriosVecinos(datos, '012').map((v) => v.nombre);
		expect(emb).toContain('Cortes');
		const p = construirBarrio(datos, 'lavapies-embajadores')!;
		expect(p.donde.vecinos.map((v) => v.slug).every((s) => SLUGS.includes(s))).toBe(true);
		expect(p.donde.vecinos.length).toBeGreaterThanOrEqual(1);
		expect(p.donde.vecinos.length).toBeLessThanOrEqual(3);
		// Orden alfabético, no por precio
		const nombres = p.donde.vecinos.map((v) => v.nombre);
		expect(nombres).toEqual([...nombres].sort((a, b) => a.localeCompare(b, 'es')));
	});
	it('índice: por distrito en orden alfabético y los barrios en orden alfabético, con su rango para 70 m²', () => {
		const i = construirIndiceBarrios(datos);
		expect(TEXTO_INDICE_BARRIOS.h1).toBe('Precio de referencia del alquiler por barrios de Madrid');
		expect(`${TEXTO_INDICE_BARRIOS.titulo} · A su precio`.length).toBeLessThanOrEqual(60);
		expect(TEXTO_INDICE_BARRIOS.descripcion.length).toBeLessThanOrEqual(155);
		const distritos = i.distritos.map((d) => d.distrito);
		expect(distritos).toEqual([...distritos].sort((a, b) => a.localeCompare(b, 'es')));
		expect(i.distritos.flatMap((d) => d.barrios)).toHaveLength(15);
		for (const d of i.distritos) {
			const n = d.barrios.map((b) => b.nombre);
			expect(d.barrios.map((b) => b.slug).every((s) => SLUGS.includes(s))).toBe(true);
			for (const b of d.barrios) expect(b.rango70).toMatch(/^de .+ a .+ € al mes$/);
			expect(n.length).toBeGreaterThan(0);
		}
		expect(i.distritos.find((d) => d.distrito === 'Centro')!.barrios.map((b) => b.nombre)).toEqual(['Barrio de las Letras (Cortes)', 'Lavapiés (Embajadores)', 'Chueca (Justicia)', 'Malasaña (Universidad)']);
		expect(jsonLdIndiceBarrios()).toHaveLength(1);
		expect(fuente('src/lib/componentes/Pie.svelte')).toContain('href="/alquiler"');
	});
	it('sitemap: las 16 URLs con lastmod; un barrio sin dato no entra', () => {
		const xml = contenidoSitemap({ barrios: SLUGS, lastmodBarrios: '2026-10-05' });
		for (const r of ['/alquiler', ...SLUGS.map((s) => `/alquiler/${s}`)]) expect(xml).toContain(`<loc>${SITE_URL}${r}</loc><lastmod>2026-10-05</lastmod>`);
		expect(ENTRADAS_SITEMAP.filter((e) => e.ruta.startsWith('/alquiler'))).toHaveLength(16);
		const sin = contenidoSitemap({ barrios: SLUGS.filter((s) => s !== 'goya'), lastmodBarrios: '2026-10-05' });
		expect(sin).not.toContain('/alquiler/goya<');
		expect(sin).toContain('/alquiler/arguelles<');
		expect(contenidoSitemap()).toContain(`<loc>${SITE_URL}/alquiler/goya</loc><lastmod>${FECHA_BARRIOS}</lastmod>`);
		expect(fuente('src/routes/sitemap.xml/+server.ts')).toContain('barriosPublicados');
		expect(fuente('src/routes/alquiler/[slug]/+page.server.ts')).toContain('entries');
	});
	it('mapa: «Ver la referencia de…» solo para zonas de barrios del piloto', () => {
		const emb = Object.keys(datos.secciones).find((c) => datos.secciones[c]!.barrio === '012')!;
		const otro = Object.keys(datos.secciones).find((c) => datos.secciones[c]!.barrio === '011')!;
		expect(barrioPilotoDeSeccion(datos, emb)).toEqual({ slug: 'lavapies-embajadores', nombre: 'Embajadores' });
		expect(barrioPilotoDeSeccion(datos, otro)).toBeNull();
		expect(fuente('src/routes/mapa/+page.svelte')).toContain('Ver la referencia de {barrioPiloto.nombre}');
	});
	it('«Cómo calculamos» explica la cifra de barrio', () => {
		const m = fuente('src/lib/resultado/metodologia.ts');
		expect(m).toContain('la cifra de cada barrio es la mediana de la referencia de sus zonas');
		expect(m).toContain('Dentro del barrio, la cifra varía según la calle');
	});
	it('vista previa: una imagen por página, con el H1 como título', () => {
		const imagenes = OG_PAGINAS.filter((o) => o.ruta.startsWith('/alquiler'));
		expect(imagenes).toHaveLength(16);
		expect(imagenes[0]!.titulo).toBe(TEXTO_INDICE_BARRIOS.h1);
		for (const b of BARRIOS_PILOTO) {
			const o = imagenes.find((x) => x.ruta === `/alquiler/${b.slug}`)!;
			expect(o.titulo).toBe(h1Barrio(b));
			expect(statSync(new URL(`../static/og/${o.imagen}`, import.meta.url)).size).toBeLessThan(300 * 1024);
		}
	});
});
