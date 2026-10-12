/**
 * Metadatos solo para buscadores (título, descripción, JSON-LD, robots, sitemap). Nada de esto se ve en la página.
 * Los perfiles sociales son constantes: rellenar y desplegar; los vacíos no salen en el JSON-LD.
 */
import { NOMBRE } from './textos';
import { SITE_URL } from './sitio';

export const PERFIL_INSTAGRAM = '';
export const PERFIL_FACEBOOK = '';
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

/** Páginas indexables, en el orden del sitemap. Sin /t/*, /r7k/* ni rutas con parámetros */
export const RUTAS_INDEXABLES = ['/', '/como-calculamos', '/mapa'] as const;

/** Rastreadores de vista previa de enlaces: no indexan, pero necesitan leer /t/:id y su imagen para mostrar la tarjeta */
export const AGENTES_VISTA_PREVIA = ['Twitterbot', 'facebookexternalhit', 'WhatsApp', 'LinkedInBot', 'Slackbot', 'TelegramBot', 'Discordbot'] as const;

/** Rastreadores de búsqueda y de IA que deben poder rastrear lo público (grupo propio, mismas reglas que `*`) */
export const AGENTES_BUSQUEDA = ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot'] as const;

const RUTAS_CERRADAS = ['/r7k/', '/t/'] as const;

export function contenidoRobots(): string {
	const cerradas = RUTAS_CERRADAS.map((r) => `Disallow: ${r}`);
	const grupo = (agentes: readonly string[], reglas: string[]) => [...agentes.map((a) => `User-agent: ${a}`), ...reglas, ''];
	return [
		...grupo(['*', ...AGENTES_BUSQUEDA], ['Allow: /', ...cerradas]),
		// Solo leen la tarjeta para la vista previa; la tarjeta lleva noindex
		...grupo(AGENTES_VISTA_PREVIA, ['Allow: /', 'Disallow: /r7k/']),
		`Sitemap: ${SITE_URL}/sitemap.xml`,
		''
	].join('\n');
}

export function contenidoSitemap(): string {
	const urls = RUTAS_INDEXABLES.map((r) => `\t<url><loc>${SITE_URL}${r}</loc></url>`).join('\n');
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
