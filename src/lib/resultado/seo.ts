/**
 * Metadatos solo para buscadores (título, descripción, JSON-LD, robots, sitemap). Nada de esto se ve en la página.
 * Los perfiles sociales son constantes: rellenar y desplegar; los vacíos no salen en el JSON-LD.
 */
import { NOMBRE } from './textos';
import { SITE_URL } from './sitio';
import { AUTOR, AUTOR_PUESTO, FECHA_PREGUNTAS, PREGUNTAS, type PaginaPregunta } from './preguntas';
import { FECHA_MAPA, TEXTO_MAPA } from './mapa-texto';
import { PAGINAS_EN, FECHA_EN, AUTOR_EN, type PaginaEn } from './en';
import { FECHA_CORRECCIONES } from './correcciones';
import { BARRIOS_PILOTO, FECHA_BARRIOS, nombreCompleto, barrioPilotoPorSlug, type PaginaBarrio } from './barrios';
import ogPaginas from './og-paginas.json';

export const PERFIL_INSTAGRAM = 'https://www.instagram.com/asuprecio/';
export const PERFIL_FACEBOOK = 'https://www.facebook.com/people/ASuPrecio/61595385748217/';
export const LOGO_ORGANIZACION = `${SITE_URL}/icon-512.png`;

export const SEO_PORTADA = {
	titulo: `Precio de referencia del alquiler en Madrid · ${NOMBRE}`,
	descripcion:
		'Comprueba en un minuto si tu alquiler, o el de un anuncio, está por encima de lo que pagan quienes ya viven de alquiler en tu zona. Datos del Ministerio de Vivienda. Gratis y sin registro.'
} as const;

export const SEO_MAPA = {
	titulo: `Mapa del índice de referencia del alquiler en Madrid · ${NOMBRE}`,
	descripcion: 'Mapa de la referencia de lo que pagan quienes ya viven de alquiler, por zona, con datos del Ministerio de Vivienda. Compara tu alquiler gratis.'
} as const;

export const SEO_COMO_CALCULAMOS = {
	titulo: `Alquiler Madrid: cómo calculamos la referencia · ${NOMBRE}`,
	descripcion:
		'Método de la referencia de alquiler Madrid: contratos vigentes del Ministerio de Vivienda (SERPAVI 2024). Fuentes y límites.'
} as const;

/** Páginas indexables, en el orden del sitemap, con `lastmod` cuando se conoce. Sin /t/*, /r7k/* ni rutas con parámetros */
export const ENTRADAS_SITEMAP: { ruta: string; lastmod?: string }[] = [
	{ ruta: '/' },
	{ ruta: '/como-calculamos' },
	{ ruta: '/mapa', lastmod: FECHA_MAPA },
	{ ruta: '/preguntas', lastmod: FECHA_PREGUNTAS },
	...PREGUNTAS.map((p) => ({ ruta: `/preguntas/${p.slug}`, lastmod: FECHA_PREGUNTAS })),
	...PAGINAS_EN.map((p) => ({ ruta: p.ruta, lastmod: FECHA_EN })),
	{ ruta: '/correcciones', lastmod: FECHA_CORRECCIONES },
	{ ruta: '/alquiler', lastmod: FECHA_BARRIOS },
	...BARRIOS_PILOTO.map((b) => ({ ruta: `/alquiler/${b.slug}`, lastmod: FECHA_BARRIOS }))
];

/**
 * Entradas del sitemap con los datos reales: un barrio sin dato suficiente no se publica (no entra) y el `lastmod` de las
 * páginas de barrio es el de su última revisión (FECHA_BARRIOS)
 */
export function entradasSitemap(opciones?: { barrios?: string[]; lastmodBarrios?: string }): { ruta: string; lastmod?: string }[] {
	if (!opciones) return ENTRADAS_SITEMAP;
	const lastmod = opciones.lastmodBarrios ?? FECHA_BARRIOS;
	const publicados = new Set(opciones.barrios ?? BARRIOS_PILOTO.map((b) => b.slug));
	return ENTRADAS_SITEMAP.flatMap((e) => {
		if (e.ruta === '/alquiler') return publicados.size ? [{ ruta: e.ruta, lastmod }] : [];
		if (e.ruta.startsWith('/alquiler/')) return publicados.has(e.ruta.slice('/alquiler/'.length)) ? [{ ruta: e.ruta, lastmod }] : [];
		return [e];
	});
}
export const RUTAS_INDEXABLES = ENTRADAS_SITEMAP.map((e) => e.ruta);

/** Rastreadores de vista previa de enlaces (leen /t/:id y su imagen para mostrar la tarjeta) */
export const AGENTES_VISTA_PREVIA = ['Twitterbot', 'facebookexternalhit', 'WhatsApp', 'LinkedInBot', 'Slackbot', 'TelegramBot', 'Discordbot'] as const;

/** Rastreadores de búsqueda y de IA que deben poder rastrear lo público (grupo propio, mismas reglas que `*`) */
export const AGENTES_BUSQUEDA = ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot'] as const;

const RUTAS_CERRADAS = ['/api/', '/r7k/'] as const;

export function contenidoRobots(): string {
	const cerradas = RUTAS_CERRADAS.map((r) => `Disallow: ${r}`);
	const grupo = (agentes: readonly string[], reglas: string[]) => [...agentes.map((a) => `User-agent: ${a}`), ...reglas, ''];
	return [
		...grupo(['*', ...AGENTES_BUSQUEDA], ['Allow: /', ...cerradas]),
		// Vista previa de enlaces: mismas reglas. /t/ está abierto a todos: la tarjeta se queda fuera del índice por su noindex, que así se puede leer
		...grupo(AGENTES_VISTA_PREVIA, ['Allow: /', ...cerradas]),
		`Sitemap: ${SITE_URL}/sitemap.xml`,
		''
	].join('\n');
}

export function contenidoSitemap(opciones?: { barrios?: string[]; lastmodBarrios?: string }): string {
	const urls = entradasSitemap(opciones).map((e) => `\t<url><loc>${SITE_URL}${e.ruta}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`).join('\n');
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** JSON-LD de la portada: la aplicación y la organización */
export function jsonLdPortada(): object[] {
	const sameAs = [PERFIL_INSTAGRAM, PERFIL_FACEBOOK].filter(Boolean);
	return [
		{
			'@context': 'https://schema.org',
			'@type': 'WebApplication',
			name: NOMBRE,
			url: `${SITE_URL}/`,
			applicationCategory: 'UtilitiesApplication',
			isAccessibleForFree: true,
			inLanguage: 'es',
			areaServed: 'Madrid',
			description: SEO_PORTADA.descripcion
		},
		{
			'@context': 'https://schema.org',
			'@type': 'Organization',
			name: NOMBRE,
			url: `${SITE_URL}/`,
			logo: LOGO_ORGANIZACION,
			...(sameAs.length ? { sameAs } : {})
		}
	];
}

/** Para incrustar en <script type="application/ld+json">: `<` escapado para que nada cierre la etiqueta */
export function jsonLdComoTexto(datos: object): string {
	return JSON.stringify(datos).replace(/</g, '\\u003c');
}

// ——— Centro de preguntas ———

const editor = () => ({ '@type': 'Organization', name: NOMBRE, url: `${SITE_URL}/`, logo: { '@type': 'ImageObject', url: LOGO_ORGANIZACION } });

/** El autor de las páginas de texto: la persona que firma «Quiénes somos», con su puesto */
const autor = (nombre: string) => ({ '@type': 'Person', name: nombre, jobTitle: AUTOR_PUESTO, url: `${SITE_URL}/como-calculamos#qui` });

function migas(...pasos: { nombre: string; ruta: string }[]): object {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [{ nombre: 'Inicio', ruta: '/' }, ...pasos].map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.nombre, item: `${SITE_URL}${p.ruta}` }))
	};
}

/** JSON-LD de una página de preguntas: Article, FAQPage (solo con su bloque de preguntas frecuentes) y BreadcrumbList */
export function jsonLdPregunta(p: PaginaPregunta): object[] {
	const url = `${SITE_URL}/preguntas/${p.slug}`;
	return [
		{
			'@context': 'https://schema.org',
			'@type': 'Article',
			headline: p.h1,
			description: p.descripcion,
			inLanguage: 'es',
			datePublished: FECHA_PREGUNTAS,
			dateModified: FECHA_PREGUNTAS,
			author: autor(AUTOR),
			publisher: editor(),
			mainEntityOfPage: url
		},
		{
			'@context': 'https://schema.org',
			'@type': 'FAQPage',
			mainEntity: p.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
		},
		migas({ nombre: 'Preguntas', ruta: '/preguntas' }, { nombre: p.h1, ruta: `/preguntas/${p.slug}` })
	];
}

export const jsonLdHubPreguntas = (): object[] => [migas({ nombre: 'Preguntas', ruta: '/preguntas' })];

/** JSON-LD de /mapa: WebPage, FAQPage (con sus tres preguntas) y BreadcrumbList (Inicio › Mapa) */
export function jsonLdMapa(h1: string): object[] {
	return [
		{
			'@context': 'https://schema.org',
			'@type': 'WebPage',
			name: h1,
			description: SEO_MAPA.descripcion,
			url: `${SITE_URL}/mapa`,
			inLanguage: 'es',
			dateModified: FECHA_MAPA,
			isPartOf: { '@type': 'WebSite', name: NOMBRE, url: `${SITE_URL}/` }
		},
		{
			'@context': 'https://schema.org',
			'@type': 'FAQPage',
			mainEntity: TEXTO_MAPA.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
		},
		migas({ nombre: 'Mapa', ruta: '/mapa' })
	];
}

// ——— Páginas en inglés ———

/** JSON-LD de una página en inglés: WebPage, FAQPage (solo con su bloque de preguntas) y BreadcrumbList */
export function jsonLdEn(p: PaginaEn): object[] {
	const url = `${SITE_URL}${p.ruta}`;
	const pasos = p.ruta === '/en' ? [] : [{ nombre: p.h1, ruta: p.ruta }];
	return [
		{
			'@context': 'https://schema.org',
			'@type': 'WebPage',
			name: p.h1,
			description: p.descripcion,
			url,
			inLanguage: 'en',
			dateModified: FECHA_EN,
			author: autor(AUTOR_EN),
			publisher: editor(),
			isPartOf: { '@type': 'WebSite', name: NOMBRE, url: `${SITE_URL}/` }
		},
		{
			'@context': 'https://schema.org',
			'@type': 'FAQPage',
			inLanguage: 'en',
			mainEntity: p.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
		},
		{
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [{ nombre: 'Home', ruta: '/en' }, ...pasos].map((s, i) => ({ '@type': 'ListItem', position: i + 1, name: s.nombre, item: `${SITE_URL}${s.ruta}` }))
		}
	];
}

// ——— Vista previa (og:image) ———

export interface OgPagina {
	ruta: string;
	imagen: string;
	titulo: string;
}

/** Las páginas con imagen de vista previa propia (scripts/og_paginas.mjs las genera con una sola plantilla) */
export const OG_PAGINAS: OgPagina[] = ogPaginas;

export const ogDe = (ruta: string): OgPagina | undefined => OG_PAGINAS.find((o) => o.ruta === ruta);

// ——— Alquiler por barrios ———

/** JSON-LD de la página de un barrio: WebPage, FAQPage y BreadcrumbList (Inicio › Alquiler por barrios › Barrio) */
export function jsonLdBarrio(p: PaginaBarrio): object[] {
	const b = barrioPilotoPorSlug(p.slug)!;
	const url = `${SITE_URL}/alquiler/${p.slug}`;
	return [
		{
			'@context': 'https://schema.org',
			'@type': 'WebPage',
			name: p.h1,
			description: p.descripcion,
			url,
			inLanguage: 'es',
			dateModified: p.modificado,
			isPartOf: { '@type': 'WebSite', name: NOMBRE, url: `${SITE_URL}/` },
			about: { '@type': 'Place', name: `${b.oficial}, Madrid`, address: { '@type': 'PostalAddress', addressLocality: 'Madrid', addressCountry: 'ES' } }
		},
		{
			'@context': 'https://schema.org',
			'@type': 'FAQPage',
			mainEntity: p.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
		},
		migas({ nombre: 'Alquiler por barrios', ruta: '/alquiler' }, { nombre: nombreCompleto(b), ruta: `/alquiler/${p.slug}` })
	];
}

export const jsonLdIndiceBarrios = (): object[] => [migas({ nombre: 'Alquiler por barrios', ruta: '/alquiler' })];

