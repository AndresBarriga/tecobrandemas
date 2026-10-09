/**
 * Lista blanca de la analítica (PostHog sin cookies). Es pura, sin el SDK: `before_send` la aplica a cada
 * evento antes de que salga del navegador, y los tests la prueban sola.
 *
 * Reglas:
 *  - solo salen `$pageview`, `$pageleave` y los eventos de EVENTOS (entre ellos `mapa_capa`, con la capa de /mapa);
 *  - de un evento propio solo salen sus propiedades (más las globales), y cada valor tiene que ser de su
 *    enum o tener su formato; lo demás se quita;
 *  - las propiedades `$…` del SDK salen todas (el modo sin cookies las necesita: `$raw_user_agent`, `$host`,
 *    `$device_id`, el tamaño de pantalla…), salvo las de IP, geolocalización y perfil (SDK_PROHIBIDAS);
 *  - toda URL (`$current_url`, `$referrer`, `$initial_current_url`…) sale con la ruta y con una query reducida a
 *    PARAMETROS_URL (utm_source, utm_medium, utm_campaign, utm_content, t e internal), cada uno con su formato cerrado;
 *    un parámetro que no cumple se elimina entero (nunca se recorta); `/t/<id>` pasa a `/t/:id`;
 *  - nunca: dirección, coordenadas, precio, metros, barrio, sección censal ni texto libre.
 */

export const MODOS = ['mirando', 'vivo', 'habitacion'] as const;
export const RESULTADOS = ['dentro', 'nivel2', 'nivel3'] as const;
/** `usar_ubicacion.resultado`: `denegada` es solo el rechazo del permiso; el resto de fallos técnicos, `no_disponible` */
export const RESULTADOS_UBICACION = ['ok', 'denegada', 'imprecisa', 'fuera', 'no_disponible'] as const;
export const POSICIONES = ['baja', 'media', 'alta'] as const;
export const BRECHAS = ['lt0', '0_10', '10_25', '25_50', '50_100', 'gt100'] as const;
/** `completa.resultado_oferta`: el precio frente a la estimación de anuncios recientes (banda en config/oferta.json) */
export const RESULTADOS_OFERTA = ['por_debajo', 'en_linea', 'por_encima'] as const;
/** `completa.nivel_oferta`: de qué nivel era el dato de anuncios (nunca el barrio ni el distrito concretos) */
export const NIVELES_OFERTA = ['barrio', 'distrito'] as const;
export const CANALES = ['whatsapp', 'x', 'copiar', 'descargar', 'nativo'] as const;
/** Capas de /mapa (`mapa_capa.capa`): nunca la zona, el presupuesto ni los metros */
export const CAPAS_MAPA = ['referencia', 'presupuesto', 'evolucion'] as const;
export const APPS = ['instagram', 'facebook', 'whatsapp', 'x', 'tiktok', 'otro', 'ninguno'] as const;
export const MOTIVOS_SIN_DATO = [
	'superficie_menor', 'superficie_mayor', 'obra_nueva', 'unifamiliar', 'temporal', 'testigos', 'sin_dato_seccion', 'fuera_de_madrid', 'habitacion'
] as const;
export const RESPUESTAS_QUE_HARAS = [
	'negociar', 'descartar', 'seguir', 'curiosidad', 'hablar_casero', 'asesoramiento', 'nada'
] as const;

const enumerado = (valores: readonly string[]) => (v: unknown) => typeof v === 'string' && valores.includes(v);
const entero = (min: number, max: number) => (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
const IDENTIFICADOR_TARJETA = /^[0-9a-z]{10}$/;
/**
 * Valor de campaña (`utm_*`, en la URL y como propiedad): hasta 40 caracteres, solo letras minúsculas, cifras, guion y guion
 * bajo, empezando por letra y sin tres cifras seguidas. Así no puede ser un precio («2500»), una sección censal («2807904033»)
 * ni una cifra suelta. Si no encaja se descarta entero; nunca se recorta ni se pasa a minúsculas.
 */
export const campanaValida = (v: unknown): v is string => typeof v === 'string' && /^[a-z][a-z0-9_-]{0,39}$/.test(v) && !/\d{3}/.test(v);
// Nombre de un distrito: letras (con tildes), espacios y guiones; nunca cifras ni signos de dirección
const NOMBRE_DISTRITO = /^[\p{L} '·-]{2,40}$/u;

type Validador = (v: unknown) => boolean;

/** Cada propiedad propia, con lo que puede valer (null vale siempre: «sin dato») */
const VALIDADORES: Record<string, Validador> = {
	modo: enumerado(MODOS),
	resultado: (v) => enumerado([...RESULTADOS, ...RESULTADOS_UBICACION])(v),
	posicion: enumerado(POSICIONES),
	brecha_tramo: enumerado(BRECHAS),
	resultado_oferta: enumerado(RESULTADOS_OFERTA),
	nivel_oferta: enumerado(NIVELES_OFERTA),
	es_horquilla: (v) => typeof v === 'boolean',
	distrito: (v) => typeof v === 'string' && NOMBRE_DISTRITO.test(v),
	segundos_hasta_resultado: entero(0, 86_400),
	indice_analisis: entero(1, 1000),
	tipo: enumerado(['no_encontrada', '429', 'horquilla', 'otro', 'alquiler', 'habitacion']),
	motivo: enumerado(MOTIVOS_SIN_DATO),
	respuesta: enumerado(RESPUESTAS_QUE_HARAS),
	canal: enumerado(CANALES),
	capa: enumerado(CAPAS_MAPA),
	tarjeta_id: (v) => typeof v === 'string' && IDENTIFICADOR_TARJETA.test(v),
	// Globales (se registran al cargar)
	v: (v) => v === 1,
	navegador_app: enumerado(APPS),
	// Campaña con la que llegó la persona (solo en memoria, de la URL de esa visita) o, sin campaña, el dominio del referrer
	utm_source: campanaValida,
	utm_medium: campanaValida,
	utm_campaign: campanaValida,
	utm_content: campanaValida,
	ref_domain: (v) => typeof v === 'string' && /^[a-z0-9.-]{1,100}$/i.test(v),
	tarjeta_origen: (v) => typeof v === 'string' && IDENTIFICADOR_TARJETA.test(v),
	interno: (v) => typeof v === 'boolean'
};

export const PROPIEDADES_GLOBALES = [
	'v', 'navegador_app', 'tarjeta_origen', 'interno', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'ref_domain'
] as const;

/** Eventos propios y las propiedades de cada uno */
export const EVENTOS: Record<string, readonly string[]> = {
	empieza: ['modo'],
	usar_ubicacion: ['resultado'],
	error_geocodificador: ['tipo'],
	confirma_precio: ['modo'],
	completa: ['modo', 'resultado', 'posicion', 'brecha_tramo', 'resultado_oferta', 'nivel_oferta', 'es_horquilla', 'distrito', 'segundos_hasta_resultado', 'indice_analisis'],
	sin_dato: ['modo', 'motivo'],
	que_haras: ['modo', 'respuesta', 'resultado'],
	comparte: ['modo', 'canal', 'tarjeta_id', 'resultado'],
	aporta: ['tipo'],
	mapa_capa: ['capa']
};

export const EVENTOS_SDK = ['$pageview', '$pageleave'] as const;

/**
 * Propiedades `$…` que nunca salen: IP, geolocalización y datos de perfil (no hay perfiles de persona). Todas las
 * demás `$…` del SDK salen: el modo sin cookies de PostHog calcula el identificador diario en el servidor a partir
 * de `$raw_user_agent`, `$host` y la IP de la petición, y sin ellas descarta el evento (`cookieless_missing_user_agent`).
 * `token` y `distinct_id` (siempre «$posthog_cookieless») también son obligatorias.
 */
export const SDK_PROHIBIDAS = /^\$(ip|geoip\w*|geo\w*|country\w*|city\w*|region\w*|subdivision\w*|latitude|longitude|postal\w*|location\w*|set|set_once)$/i;
/** Sin `$` y obligatorias para PostHog */
const PROPIEDADES_OBLIGATORIAS = ['token', 'distinct_id'];

/** Propiedades de campaña que se dejan salir, con su formato (campanaValida); el resto (utm_term, gclid, fbclid, etc.) se quita */
const CAMPANA = /^utm_(source|medium|campaign|content)$/;
/**
 * Lo único que sale de la query de una URL y el formato de cada valor; el resto (m2, precio, barrio, gclid, c…) se quita.
 * `t` es el id de tarjeta (10 caracteres de base 36) y no puede ser solo cifras (parecería una sección censal); `internal`, solo `1`.
 */
const PARAMETROS_URL = new Map<string, (v: string) => boolean>([
	['utm_source', campanaValida],
	['utm_medium', campanaValida],
	['utm_campaign', campanaValida],
	['utm_content', campanaValida],
	['t', (v) => IDENTIFICADOR_TARJETA.test(v) && !/^\d+$/.test(v)],
	['internal', (v) => v === '1']
]);
export const QUERY_PERMITIDA: readonly string[] = [...PARAMETROS_URL.keys()];

/** Una URL con su ruta y la query reducida a QUERY_PERMITIDA, sin hash; `/t/<id>` pasa a `/t/:id`. `$direct` se queda como está */
export function limpiarUrl(url: string): string {
	if (url === '$direct') return url;
	try {
		const u = new URL(url, 'https://x.invalid');
		const query = [...u.searchParams].filter(([k, v]) => PARAMETROS_URL.get(k)?.(v) === true);
		const origen = /^https?:\/\//i.test(url) ? u.origin : '';
		const ruta = limpiarRuta(u.pathname);
		return `${origen}${ruta}${query.length ? `?${query.map(([k, v]) => `${k}=${v}`).join('&')}` : ''}`;
	} catch {
		return '';
	}
}

export const limpiarRuta = (ruta: string) => ruta.replace(/^\/t\/[^/]+/, '/t/:id');

/** Del referrer solo el dominio («https://www.instagram.com/» → «www.instagram.com»); se usa para `ref_domain` */
export function dominioDelReferrer(referrer: string): string {
	try {
		return new URL(referrer).hostname;
	} catch {
		return '';
	}
}

export interface EventoSdk {
	event: string;
	properties?: Record<string, unknown>;
	[otras: string]: unknown;
}

/**
 * Deja salir el evento con solo lo permitido, o devuelve null si no se puede enviar.
 * El resultado no lleva `$set` ni `$set_once` (no hay perfiles de persona).
 */
export function filtrarEvento<T extends EventoSdk>(e: T | null): T | null {
	if (!e || typeof e.event !== 'string') return null;
	const propios = EVENTOS[e.event];
	const esDelSdk = (EVENTOS_SDK as readonly string[]).includes(e.event);
	if (!propios && !esDelSdk) return null;

	const entrada = e.properties ?? {};
	const salida: Record<string, unknown> = {};
	for (const [clave, valor] of Object.entries(entrada)) {
		if (clave.startsWith('$')) {
			if (SDK_PROHIBIDAS.test(clave)) continue;
			// Solo valores sencillos: un objeto o una lista podrían llevar cualquier cosa
			if (valor === null || typeof valor === 'number' || typeof valor === 'boolean') salida[clave] = valor;
			else if (typeof valor === 'string') salida[clave] = valor.slice(0, 600);
			continue;
		}
		if (CAMPANA.test(clave)) {
			if (campanaValida(valor)) salida[clave] = valor;
			continue;
		}
		if (PROPIEDADES_OBLIGATORIAS.includes(clave)) {
			if (typeof valor === 'string' && valor.length <= 80) salida[clave] = valor;
			continue;
		}
		const permitidas = propios ? [...propios, ...PROPIEDADES_GLOBALES] : [...PROPIEDADES_GLOBALES];
		if (!permitidas.includes(clave)) continue;
		if (valor === null) {
			salida[clave] = null;
			continue;
		}
		if (VALIDADORES[clave]?.(valor)) salida[clave] = valor;
	}

	// URL («$current_url», «$referrer», «$initial_current_url»…), rutas y dominios: se limpian por el nombre de la propiedad
	// y, por si el SDK añade otra, por su valor (cualquier texto que empiece por http:// o https://)
	for (const [clave, valor] of Object.entries(salida)) {
		if (typeof valor !== 'string') continue;
		if (/referring_domain$/.test(clave)) salida[clave] = valor.replace(/[/?#].*$/, '');
		else if (/pathname$/.test(clave)) salida[clave] = limpiarRuta(valor);
		else if (/(url|referrer)$/.test(clave) || /^https?:\/\//i.test(valor)) salida[clave] = limpiarUrl(valor);
	}

	const { $set: _s, $set_once: _so, ...resto } = e as Record<string, unknown>;
	return { ...resto, properties: salida } as T;
}

/** Categoría del navegador integrado de una app, a partir del user agent; el user agent no sale del navegador */
export function navegadorApp(userAgent: string): (typeof APPS)[number] {
	const ua = userAgent || '';
	if (/Instagram/i.test(ua)) return 'instagram';
	if (/FBAN|FBAV|FB_IAB|FBIOS|Messenger/i.test(ua)) return 'facebook';
	if (/WhatsApp/i.test(ua)) return 'whatsapp';
	if (/Twitter|TwitterAndroid|\bX\/\d/i.test(ua)) return 'x';
	if (/musical_ly|BytedanceWebview|TikTok|Bytedance/i.test(ua)) return 'tiktok';
	// Otros navegadores integrados: Android WebView («; wv)») o WebKit de iOS sin «Safari/»
	if (/; wv\)|\bLine\/|Snapchat|Pinterest|LinkedInApp|GSA\//i.test(ua)) return 'otro';
	if (/iPhone|iPad|iPod/.test(ua) && /AppleWebKit/.test(ua) && !/Safari\//.test(ua)) return 'otro';
	return 'ninguno';
}

/** «+23 %» sobre la parte alta → tramo; `ratio` es precio / parte alta (R_sup) */
export function tramoDeBrecha(ratio: number): (typeof BRECHAS)[number] {
	const pct = (ratio - 1) * 100;
	if (pct < 0) return 'lt0';
	if (pct < 10) return '0_10';
	if (pct < 25) return '10_25';
	if (pct < 50) return '25_50';
	if (pct <= 100) return '50_100';
	return 'gt100';
}

/** «Fuente del Berro, Salamanca» → «Salamanca»; sin coma, null (nunca el barrio) */
export function distritoDeLugar(lugar: string | null | undefined): string | null {
	if (!lugar || !lugar.includes(', ')) return null;
	const d = lugar.split(', ').pop()!.trim();
	return NOMBRE_DISTRITO.test(d) ? d : null;
}
