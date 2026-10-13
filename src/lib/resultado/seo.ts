/**
 * Metadatos solo para buscadores (título, descripción, JSON-LD, robots, sitemap). Nada de esto se ve en la página.
 * Los perfiles sociales son constantes: rellenar y desplegar; los vacíos no salen en el JSON-LD.
 */
import { NOMBRE } from './textos';
import { SITE_URL } from './sitio';
import { AUTOR, FECHA_PREGUNTAS, PREGUNTAS, type PaginaPregunta } from './preguntas';

export const PERFIL_INSTAGRAM = 'https://www.instagram.com/asuprecio/';
export const PERFIL_FACEBOOK = 'https://www.facebook.com/people/ASuPrecio/61595385748217/';
export const LOGO_ORGANIZACION = `${SITE_URL}/icon-512.png`;

export const SEO_PORTADA = {
	titulo: `Precio de referencia del alquiler en Madrid · ${NOMBRE}`,
	descripcion:
		'Comprueba en un minuto si tu alquiler, o el de un anuncio, está por encima de lo que pagan quienes ya viven de alquiler en tu zona. Datos del Ministerio de Vivienda. Gratis y sin registro.'
} as const;

export const SEO_MAPA = {
	titulo: `Alquiler Madrid: mapa de referencia por zonas · ${NOMBRE}`,
	descripcion: 'Mapa del alquiler Madrid por zonas: la referencia de lo que pagan quienes ya viven de alquiler, con datos del Ministerio de Vivienda.'
} as const;

export const SEO_COMO_CALCULAMOS = {
	titulo: `Alquiler Madrid: cómo calculamos la referencia · ${NOMBRE}`,
	descripcion:
		'Método de la referencia de alquiler Madrid: contratos vigentes del Ministerio de Vivienda (SERPAVI 2024) ajustados por IPC. Fuentes y límites.'
} as const;

/** Páginas indexables, en el orden del sitemap, con `lastmod` cuando se conoce. Sin /t/*, /r7k/* ni rutas con parámetros */
export const ENTRADAS_SITEMAP: { ruta: string; lastmod?: string }[] = [
	{ ruta: '/' },
	{ ruta: '/como-calculamos' },
	{ ruta: '/mapa' },
	{ ruta: '/preguntas', lastmod: FECHA_PREGUNTAS },
	...PREGUNTAS.map((p) => ({ ruta: `/preguntas/${p.slug}`, lastmod: FECHA_PREGUNTAS }))
];
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

export function contenidoSitemap(): string {
	const urls = ENTRADAS_SITEMAP.map((e) => `\t<url><loc>${SITE_URL}${e.ruta}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`).join('\n');
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
			author: { '@type': 'Organization', name: AUTOR, url: `${SITE_URL}/` },
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
