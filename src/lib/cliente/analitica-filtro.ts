/**
 * Lista blanca de la analítica (PostHog sin cookies). Es pura, sin el SDK: `before_send` la aplica a cada
 * evento antes de que salga del navegador, y los tests la prueban sola.
 *
 * Reglas:
 *  - solo salen `$pageview`, `$pageleave` y los eventos de EVENTOS;
 *  - de un evento propio solo salen sus propiedades (más las globales), y cada valor tiene que ser de su
 *    enum o tener su formato; lo demás se quita;
 *  - de las propiedades `$…` del SDK solo salen las de PROPIEDADES_SDK;
 *  - las URL salen sin query (salvo utm_*) y el referrer, solo el dominio;
 *  - nunca: dirección, coordenadas, precio, metros, barrio, sección censal ni texto libre.
 */

export const MODOS = ['mirando', 'vivo', 'habitacion'] as const;
export const RESULTADOS = ['dentro', 'nivel2', 'nivel3'] as const;
export const POSICIONES = ['baja', 'media', 'alta'] as const;
export const BRECHAS = ['lt0', '0_10', '10_25', '25_50', '50_100', 'gt100'] as const;
export const CANALES = ['whatsapp', 'x', 'copiar', 'descargar', 'nativo'] as const;
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
// Nombre de un distrito: letras (con tildes), espacios y guiones; nunca cifras ni signos de dirección
const NOMBRE_DISTRITO = /^[\p{L} '·-]{2,40}$/u;

type Validador = (v: unknown) => boolean;

/** Cada propiedad propia, con lo que puede valer (null vale siempre: «sin dato») */
const VALIDADORES: Record<string, Validador> = {
	modo: enumerado(MODOS),
	resultado: (v) => enumerado([...RESULTADOS, 'ok', 'denegada', 'imprecisa', 'fuera'])(v),
	posicion: enumerado(POSICIONES),
	brecha_tramo: enumerado(BRECHAS),
	es_horquilla: (v) => typeof v === 'boolean',
	distrito: (v) => typeof v === 'string' && NOMBRE_DISTRITO.test(v),
	segundos_hasta_resultado: entero(0, 86_400),
	indice_analisis: entero(1, 1000),
	tipo: enumerado(['no_encontrada', '429', 'horquilla', 'otro', 'alquiler', 'habitacion']),
	motivo: enumerado(MOTIVOS_SIN_DATO),
	respuesta: enumerado(RESPUESTAS_QUE_HARAS),
	canal: enumerado(CANALES),
	tarjeta_id: (v) => typeof v === 'string' && IDENTIFICADOR_TARJETA.test(v),
	// Globales (se registran al cargar)
	v: (v) => v === 1,
	navegador_app: enumerado(APPS),
	tarjeta_origen: (v) => typeof v === 'string' && IDENTIFICADOR_TARJETA.test(v),
	interno: (v) => typeof v === 'boolean'
};

export const PROPIEDADES_GLOBALES = ['v', 'navegador_app', 'tarjeta_origen', 'interno'] as const;

/** Eventos propios y las propiedades de cada uno */
export const EVENTOS: Record<string, readonly string[]> = {
	empieza: ['modo'],
	usar_ubicacion: ['resultado'],
	error_geocodificador: ['tipo'],
	confirma_precio: ['modo'],
	completa: ['modo', 'resultado', 'posicion', 'brecha_tramo', 'es_horquilla', 'distrito', 'segundos_hasta_resultado', 'indice_analisis'],
	sin_dato: ['modo', 'motivo'],
	que_haras: ['modo', 'respuesta', 'resultado'],
	comparte: ['modo', 'canal', 'tarjeta_id', 'resultado'],
	aporta: ['tipo']
};

export const EVENTOS_SDK = ['$pageview', '$pageleave'] as const;

/**
 * Propiedades que el SDK añade a `$pageview` y `$pageleave` y que se dejan salir; las demás (`$raw_user_agent`,
 * idioma, zona horaria, tamaño de pantalla, título de la página, etc.) se quitan. Lista fijada con la prueba de
 * e2e/analitica.spec.ts (SDK 1.438.1; docs/operacion.md, «Lista blanca de propiedades»).
 * `token`, `distinct_id` (siempre «$posthog_cookieless»), `$cookieless_mode` y `$process_person_profile` son
 * obligatorias: sin ellas PostHog no aplicaría el modo sin cookies ni descartaría el perfil de persona.
 */
export const PROPIEDADES_SDK: readonly string[] = [
	'$current_url', '$pathname', '$host', '$referrer', '$referring_domain',
	'$browser', '$browser_version', '$os', '$os_version', '$device_type',
	'$lib', '$lib_version', '$insert_id', '$time', '$pageview_id',
	'$cookieless_mode', '$process_person_profile', '$is_identified',
	'$prev_pageview_pathname', '$prev_pageview_duration'
];
/** Sin `$` y obligatorias para PostHog */
const PROPIEDADES_OBLIGATORIAS = ['token', 'distinct_id'];

/** Propiedades de campaña que se dejan salir; el resto (gclid, fbclid, etc.) se quita */
const CAMPANA = /^utm_(source|medium|campaign|content|term)$/;

/** Una URL sin query (salvo utm_*) y sin hash; `/t/<id>` pasa a `/t/:id` */
export function limpiarUrl(url: string): string {
	try {
		const u = new URL(url, 'https://x.invalid');
		const utm = [...u.searchParams].filter(([k]) => CAMPANA.test(k));
		const origen = /^https?:\/\//i.test(url) ? u.origin : '';
		const ruta = limpiarRuta(u.pathname);
		return `${origen}${ruta}${utm.length ? `?${utm.map(([k, v]) => `${k}=${encodeURIComponent(v.slice(0, 100))}`).join('&')}` : ''}`;
	} catch {
		return '';
	}
}

export const limpiarRuta = (ruta: string) => ruta.replace(/^\/t\/[^/]+/, '/t/:id');

/** Del referrer solo el dominio («https://www.instagram.com/» → «www.instagram.com») */
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
			if (PROPIEDADES_SDK.includes(clave)) salida[clave] = valor;
			continue;
		}
		if (CAMPANA.test(clave)) {
			if (esDelSdk && typeof valor === 'string') salida[clave] = valor.slice(0, 100);
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

	// URL y referrer
	for (const clave of ['$current_url']) if (typeof salida[clave] === 'string') salida[clave] = limpiarUrl(salida[clave] as string);
	for (const clave of ['$pathname', '$prev_pageview_pathname']) if (typeof salida[clave] === 'string') salida[clave] = limpiarRuta(salida[clave] as string);
	if (typeof salida.$referrer === 'string') salida.$referrer = dominioDelReferrer(salida.$referrer) || '$direct';
	if (typeof salida.$referring_domain === 'string') salida.$referring_domain = salida.$referring_domain.replace(/[/?#].*$/, '');

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
