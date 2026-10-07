/**
 * URL oficial del sitio: la única que se escribe a mano. Todas las URL absolutas (canónica, Open Graph, sitemap,
 * robots, enlaces para compartir) salen de aquí. En `vite dev` (y en las pruebas e2e) se usa el origen real de la
 * página, para que el enlace de una tarjeta compartida en local abra la tarjeta local.
 */
export const SITE_URL = 'https://asuprecio.com';

/** URL absoluta de una ruta («/mapa» → «https://asuprecio.com/mapa»); en desarrollo, con el origen de la página */
export function urlAbsoluta(ruta: string, origenActual?: string): string {
	const base = import.meta.env.DEV && origenActual ? origenActual : SITE_URL;
	return `${base}${ruta.startsWith('/') ? ruta : `/${ruta}`}`;
}
