/**
 * Analítica de uso con PostHog (UE), sin cookies ni almacenamiento: el SDK habla con un proxy del propio
 * dominio (/r7k), no carga scripts remotos, no crea perfiles de persona y pasa cada evento por la lista
 * blanca de analitica-filtro.ts antes de enviarlo (deja pasar `$raw_user_agent` y el resto de propiedades `$` del SDK, que el modo sin
 * cookies necesita; quita IP, geolocalización y toda la query de las URL salvo utm_*, c, t e internal). Solo se inicia si PUBLIC_POSTHOG_ENABLED=true (el job de
 * despliegue); en desarrollo, en las pruebas y en local no hace nada.
 *
 * Nunca se llama a identify() ni a $set. Los eventos y sus propiedades están en EVENTOS (analitica-filtro.ts).
 */
import { PUBLIC_POSTHOG_ENABLED, PUBLIC_POSTHOG_KEY } from '$app/env/public';
import {
	type BRECHAS, type CANALES, type CAPAS_MAPA, type MODOS, type MOTIVOS_SIN_DATO, type NIVELES_OFERTA, type RESPUESTAS_QUE_HARAS, type RESULTADOS, type RESULTADOS_OFERTA,
	campanaValida, dominioDelReferrer, filtrarEvento, navegadorApp
} from './analitica-filtro';
import { leerOrigenDeLaUrl, tarjetaOrigen } from './origen';

type Modo = (typeof MODOS)[number];
type Resultado = (typeof RESULTADOS)[number];

// Solo en `vite dev`, `?ph_prueba=1` la activa con una clave de mentira (para e2e/analitica.spec.ts); en producción no existe
// Se recuerda una vez vista: páginas como /mapa reescriben la URL y quitarían el parámetro
let pruebaVista = false;
const deLaPrueba = () => import.meta.env.DEV && (pruebaVista ||= new URLSearchParams(location.search).has('ph_prueba'));
export const analiticaActiva = () => (PUBLIC_POSTHOG_ENABLED && PUBLIC_POSTHOG_KEY !== '') || deLaPrueba();

/** Ruta del proxy en el propio dominio (src/routes/r7k) */
export const RUTA_PROXY = '/r7k';

type Captura = (nombre: string, propiedades?: Record<string, unknown>) => void;
let capturar: Captura | null = null;
const cola: [string, Record<string, unknown> | undefined][] = [];
let iniciada = false;

// Estado en memoria (se pierde al recargar: no se guarda nada en el navegador)
let indiceAnalisis = 0;
let inicioMs: number | null = null;

/** Campaña de la visita: los utm_* (source, medium, campaign y content) de la URL de entrada o, sin ninguno, solo el dominio del referrer. Se lee una vez y vive en memoria */
const CLAVES_UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const;
export function campanaDeLaVisita(url: string, referrer: string, propioHost: string): Record<string, string> {
	const q = new URL(url).searchParams;
	const salida: Record<string, string> = {};
	for (const k of CLAVES_UTM) {
		// Un valor que no encaja (mayúsculas, cifras sueltas, más de 40 caracteres…) se descarta entero
		const v = q.get(k);
		if (campanaValida(v)) salida[k] = v;
	}
	if (Object.keys(salida).length) return salida;
	const dominio = dominioDelReferrer(referrer);
	return dominio && dominio !== propioHost ? { ref_domain: dominio } : {};
}

/** Propiedades que acompañan a todos los eventos */
function propiedadesGlobales() {
	leerOrigenDeLaUrl();
	return {
		v: 1 as const,
		navegador_app: navegadorApp(navigator.userAgent),
		tarjeta_origen: tarjetaOrigen(),
		interno: new URLSearchParams(location.search).get('internal') === '1',
		...campanaDeLaVisita(location.href, document.referrer, location.hostname)
	};
}

export async function iniciarAnalitica(): Promise<void> {
	if (iniciada || !analiticaActiva()) return;
	iniciada = true;
	try {
		// La variante sin dependencias externas y sin extensiones: no carga ningún script remoto
		const { default: posthog } = await import('posthog-js/dist/module.slim.no-external');
		posthog.init(PUBLIC_POSTHOG_KEY || 'phc_prueba_local', {
			api_host: RUTA_PROXY,
			ui_host: 'https://eu.posthog.com',
			cookieless_mode: 'always',
			person_profiles: 'never',
			autocapture: false,
			// La variante slim no trae la extensión de cambios de ruta: el $pageview inicial y los de las navegaciones internas los lanza paginaVista()
			capture_pageview: false,
			capture_pageleave: true,
			disable_session_recording: true,
			disable_surveys: true,
			capture_heatmaps: false,
			capture_dead_clicks: false,
			capture_exceptions: false,
			rageclick: false,
			advanced_disable_flags: true,
			disable_external_dependency_loading: true,
			// En producción el SDK descarta el tráfico de robots; solo en `vite dev` (pruebas e2e, navegador automatizado) se desactiva
			opt_out_useragent_filter: import.meta.env.DEV,
			before_send: (e) => {
				// Solo en `vite dev`: guarda el evento tal como lo manda el SDK, para fijar la lista blanca (e2e/analitica.spec.ts)
				if (import.meta.env.DEV) (globalThis as { __phCrudo?: unknown[] }).__phCrudo?.push(structuredClone(e));
				return filtrarEvento(e as never) as never;
			},
			loaded: (ph) => {
				ph.register(propiedadesGlobales());
			}
		});
		capturar = (nombre, propiedades) => posthog.capture(nombre, propiedades);
		capturar('$pageview');
		for (const [n, p] of cola.splice(0)) capturar(n, p);
	} catch (e) {
		// Sin analítica no pasa nada: la herramienta funciona igual (solo en desarrollo se avisa del motivo)
		if (import.meta.env.DEV) console.warn('analítica no iniciada:', (e as Error).message);
	}
}

function enviar(nombre: string, propiedades?: Record<string, unknown>) {
	if (!analiticaActiva()) return;
	if (capturar) capturar(nombre, propiedades);
	else cola.push([nombre, propiedades]);
}

// ——— Páginas ———

/** Navegación interna a otra ruta (la primera página la lanza iniciarAnalitica) */
export function paginaVista(): void {
	if (capturar) capturar('$pageview');
}

/** Se sale de una ruta sin recargar la página; al cerrar o recargar, el SDK manda su propio $pageleave */
export function paginaSalida(): void {
	if (capturar) capturar('$pageleave');
}

// ——— Eventos ———

/** Primera vez que se escribe en el formulario (una vez por carga de la página) */
let empezado = false;
export function empieza(modo: Modo): void {
	if (empezado) return;
	empezado = true;
	inicioMs = Date.now();
	enviar('empieza', { modo });
}

/** `denegada` solo si la persona rechaza el permiso; `no_disponible`, los fallos técnicos (sin GPS, tiempo agotado, posición no disponible) */
export function usarUbicacion(resultado: 'ok' | 'denegada' | 'imprecisa' | 'fuera' | 'no_disponible'): void {
	enviar('usar_ubicacion', { resultado });
}

export function errorGeocodificador(tipo: 'no_encontrada' | '429' | 'horquilla' | 'otro'): void {
	enviar('error_geocodificador', { tipo });
}

export function confirmaPrecio(modo: Modo): void {
	enviar('confirma_precio', { modo });
}

export interface DatosCompleta {
	modo: Modo;
	resultado: Resultado | null;
	posicion: 'baja' | 'media' | 'alta' | null;
	brecha_tramo: (typeof BRECHAS)[number] | null;
	/** Solo con la oferta encendida y con dato de la zona; si no, la propiedad no sale */
	resultado_oferta?: (typeof RESULTADOS_OFERTA)[number];
	nivel_oferta?: (typeof NIVELES_OFERTA)[number];
	es_horquilla: boolean;
	distrito: string | null;
}

/** Un resultado completo (anuncio, piso en el que se vive o habitación). El índice cuenta los de esta carga */
export function completa(d: DatosCompleta): void {
	indiceAnalisis++;
	const segundos = inicioMs === null ? null : Math.max(0, Math.round((Date.now() - inicioMs) / 1000));
	inicioMs = null;
	empezado = false; // el siguiente análisis vuelve a empezar
	enviar('completa', { ...d, segundos_hasta_resultado: segundos, indice_analisis: indiceAnalisis });
}

export type MotivoSinDato = (typeof MOTIVOS_SIN_DATO)[number];

export function sinDato(modo: Modo, motivo: MotivoSinDato): void {
	// Un «sin dato» cierra ese intento: el siguiente análisis vuelve a empezar
	empezado = false;
	inicioMs = null;
	enviar('sin_dato', { modo, motivo });
}

export function queHaras(modo: Modo, respuesta: (typeof RESPUESTAS_QUE_HARAS)[number], resultado: Resultado | null): void {
	enviar('que_haras', { modo, respuesta, resultado });
}

export function comparte(d: { modo: Modo; canal: (typeof CANALES)[number]; tarjeta_id: string | null; resultado: Resultado | null }): void {
	enviar('comparte', d);
}

export function aporta(tipo: 'alquiler' | 'habitacion'): void {
	enviar('aporta', { tipo });
}

/** /mapa: la capa que se ve al cargar y cada vez que se cambia. Solo el nombre de la capa: nada de la zona, el presupuesto ni los metros */
export function mapaCapa(capa: (typeof CAPAS_MAPA)[number]): void {
	enviar('mapa_capa', { capa });
}
