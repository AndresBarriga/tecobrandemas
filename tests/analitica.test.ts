import { describe, expect, it } from 'vitest';
import {
	dominioDelReferrer, distritoDeLugar, filtrarEvento, limpiarUrl, navegadorApp, tramoDeBrecha, EVENTOS, PROPIEDADES_SDK
} from '../src/lib/cliente/analitica-filtro';
import { datosCompleta, modoDe, motivoDeSinDato, resultadoDeClase } from '../src/lib/cliente/analitica-datos';
import { MOTIVOS_SIN_DATO } from '../src/lib/cliente/analitica-filtro';
import { type DatosMadrid, construirPantalla } from '../src/lib/resultado';

const globales = { v: 1, navegador_app: 'ninguno', tarjeta_origen: null, interno: false };
const base = { token: 'phc_x', distinct_id: '$posthog_cookieless', $cookieless_mode: true, $process_person_profile: false };

describe('analítica: lista blanca (before_send)', () => {
	it('descarta los eventos que no son los de la lista', () => {
		for (const e of ['$autocapture', '$exception', '$web_vitals', '$feature_flag_called', 'llegada', 'servido_si', 'vivo_empieza', 'mapa_ampliar', 'esto_no_cuadra', '$identify', '$set']) {
			expect(filtrarEvento({ event: e, properties: { ...base } }), e).toBeNull();
		}
		expect(filtrarEvento(null)).toBeNull();
		expect(filtrarEvento({ event: '$pageview', properties: { ...base } })).not.toBeNull();
		expect(filtrarEvento({ event: '$pageleave', properties: { ...base } })).not.toBeNull();
		for (const e of Object.keys(EVENTOS)) expect(filtrarEvento({ event: e, properties: { ...base, ...globales } }), e).not.toBeNull();
	});

	it('quita las propiedades propias que no son de ese evento, y los valores fuera de su enum o formato', () => {
		const r = filtrarEvento({
			event: 'empieza',
			properties: { ...base, ...globales, modo: 'mirando', precio: 2500, metros: 90, barrio: 'Goya', direccion: 'Calle Mayor 1', lat: 40.4, lng: -3.7, texto: 'hola' }
		})!;
		expect(Object.keys(r.properties!).sort()).toEqual(['$cookieless_mode', '$process_person_profile', 'distinct_id', 'interno', 'modo', 'navegador_app', 'token', 'tarjeta_origen', 'v'].sort());
		// Valores que no son del enum o del formato: la propiedad no sale
		const malo = filtrarEvento({ event: 'completa', properties: { ...base, modo: 'otro', resultado: 'oro', distrito: 'Calle Mayor 12', segundos_hasta_resultado: -3, indice_analisis: 1.5, es_horquilla: 'sí' } })!;
		expect(Object.keys(malo.properties!)).not.toEqual(expect.arrayContaining(['modo', 'resultado', 'distrito', 'segundos_hasta_resultado', 'indice_analisis', 'es_horquilla']));
		const bueno = filtrarEvento({
			event: 'completa',
			properties: { ...base, modo: 'vivo', resultado: 'nivel3', posicion: null, brecha_tramo: '25_50', es_horquilla: false, distrito: 'Salamanca', segundos_hasta_resultado: 41, indice_analisis: 2 }
		})!;
		expect(bueno.properties).toMatchObject({ modo: 'vivo', resultado: 'nivel3', posicion: null, brecha_tramo: '25_50', es_horquilla: false, distrito: 'Salamanca', segundos_hasta_resultado: 41, indice_analisis: 2 });
		// El id de tarjeta tiene formato fijo
		expect(filtrarEvento({ event: 'comparte', properties: { ...base, canal: 'x', tarjeta_id: 'Calle Mayor 1' } })!.properties).not.toHaveProperty('tarjeta_id');
		expect(filtrarEvento({ event: 'comparte', properties: { ...base, canal: 'x', tarjeta_id: 'abcde12345' } })!.properties).toHaveProperty('tarjeta_id', 'abcde12345');
	});

	it('usar_ubicacion: «denegada» solo es el rechazo del permiso; los fallos técnicos son «no_disponible»', () => {
		for (const r of ['ok', 'denegada', 'imprecisa', 'fuera', 'no_disponible']) {
			expect(filtrarEvento({ event: 'usar_ubicacion', properties: { ...base, resultado: r } })!.properties, r).toHaveProperty('resultado', r);
		}
		for (const r of ['tiempo', 'sin_gps', 'denegado', 'error']) {
			expect(filtrarEvento({ event: 'usar_ubicacion', properties: { ...base, resultado: r } })!.properties, r).not.toHaveProperty('resultado');
		}
	});

	it('quita las propiedades $ del SDK que no están en la lista (user agent, idioma, zona horaria…) y $set', () => {
		const r = filtrarEvento({
			event: '$pageview',
			$set: { email: 'a@b.c' },
			$set_once: { x: 1 },
			properties: { ...base, $raw_user_agent: 'Mozilla/5.0', $browser_language: 'es-ES', $timezone: 'Europe/Madrid', $screen_width: 390, title: 'Resultado: Goya', gclid: 'XYZ', fbclid: 'F', $browser: 'Chrome', $device_type: 'Mobile' }
		})!;
		expect(Object.keys(r.properties!).sort()).toEqual(['$browser', '$cookieless_mode', '$device_type', '$process_person_profile', 'distinct_id', 'token']);
		expect(r).not.toHaveProperty('$set');
		expect(r).not.toHaveProperty('$set_once');
		for (const k of Object.keys(r.properties!).filter((k) => k.startsWith('$'))) expect(PROPIEDADES_SDK, k).toContain(k);
	});

	it('la campaña y el dominio del referrer salen en los eventos propios; nada más', () => {
		const e = { event: 'completa', properties: { ...base, ...globales, modo: 'mirando', utm_source: 'instagram', utm_medium: 'story', utm_campaign: 'launch', utm_content: 'check', ref_domain: 'instagram.com', utm_extra: 'x', gclid: 'y' } };
		const r = filtrarEvento<{ event: string; properties: Record<string, unknown> }>(e);
		expect(r!.properties).toMatchObject({ utm_source: 'instagram', utm_medium: 'story', utm_campaign: 'launch', utm_content: 'check', ref_domain: 'instagram.com' });
		expect(r!.properties).not.toHaveProperty('utm_extra');
		expect(r!.properties).not.toHaveProperty('gclid');
		expect(filtrarEvento({ event: 'completa', properties: { ...base, ref_domain: 'https://x.com/ruta?secreto=1' } })!.properties).not.toHaveProperty('ref_domain');
	});

	it('las URL salen sin query (salvo utm_*), sin hash y con /t/:id; el referrer, solo el dominio', () => {
		expect(limpiarUrl('https://a-su-precio.workers.dev/?t=abcde12345&utm_source=ig&utm_medium=story&gclid=XYZ&direccion=Calle%20Mayor#x')).toBe(
			'https://a-su-precio.workers.dev/?utm_source=ig&utm_medium=story'
		);
		expect(limpiarUrl('https://a-su-precio.workers.dev/t/abcde12345?x=1')).toBe('https://a-su-precio.workers.dev/t/:id');
		expect(limpiarUrl('https://a-su-precio.workers.dev/mapa?capa=presupuesto&m2=60&barrio=042')).toBe('https://a-su-precio.workers.dev/mapa');
		expect(dominioDelReferrer('https://l.instagram.com/?u=https%3A%2F%2Fexample.com%2Fsecreto')).toBe('l.instagram.com');
		const r = filtrarEvento({
			event: '$pageview',
			properties: { ...base, $current_url: 'https://x.dev/t/abcde12345?utm_campaign=c&barrio=Goya', $pathname: '/t/abcde12345', $referrer: 'https://l.instagram.com/?u=secreto', $referring_domain: 'l.instagram.com', utm_campaign: 'c', utm_source: 's' }
		})!;
		expect(r.properties).toMatchObject({ $current_url: 'https://x.dev/t/:id?utm_campaign=c', $pathname: '/t/:id', $referrer: 'l.instagram.com', utm_campaign: 'c', utm_source: 's' });
		expect(JSON.stringify(r)).not.toMatch(/secreto|Goya|abcde12345/);
	});

	it('nunca salen dirección, coordenadas, precio, metros, barrio ni texto libre, en ningún evento', () => {
		for (const e of Object.keys(EVENTOS)) {
			const r = filtrarEvento({
				event: e,
				properties: { ...base, ...globales, direccion: 'Calle Mayor 1', lat: 40.41, lng: -3.7, precio: 1234, m2: 70, metros: 70, barrio: 'Goya', cusec: '2807901001', texto: 'libre', mensaje: 'x', email: 'a@b.c' }
			})!;
			expect(Object.keys(r.properties!), e).not.toEqual(expect.arrayContaining(['direccion']));
			for (const k of ['direccion', 'lat', 'lng', 'precio', 'm2', 'metros', 'barrio', 'cusec', 'texto', 'mensaje', 'email']) expect(r.properties, `${e}.${k}`).not.toHaveProperty(k);
		}
	});
});

describe('analítica: categorías', () => {
	it('navegador integrado de la app por el user agent (solo sale la categoría)', () => {
		expect(navegadorApp('Mozilla/5.0 (iPhone) AppleWebKit Mobile/15E148 Instagram 300.0')).toBe('instagram');
		expect(navegadorApp('Mozilla/5.0 (Linux; Android 14) [FBAN/FB4A;FBAV/450.0]')).toBe('facebook');
		expect(navegadorApp('Mozilla/5.0 (iPhone) AppleWebKit Mobile/15E148 WhatsApp/2.24')).toBe('whatsapp');
		expect(navegadorApp('Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile Safari/537.36 TwitterAndroid')).toBe('x');
		expect(navegadorApp('Mozilla/5.0 (Linux; Android 14) musical_ly_300 BytedanceWebview/d8a21c6')).toBe('tiktok');
		expect(navegadorApp('Mozilla/5.0 (Linux; Android 14; Pixel 7; wv) AppleWebKit Chrome/120 Mobile Safari/537.36')).toBe('otro');
		expect(navegadorApp('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Mobile/15E148')).toBe('otro');
		expect(navegadorApp('Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15')).toBe('ninguno');
		expect(navegadorApp('')).toBe('ninguno');
	});

	it('tramos de la brecha sobre la parte alta', () => {
		expect(tramoDeBrecha(0.8)).toBe('lt0');
		expect(tramoDeBrecha(1)).toBe('0_10');
		expect(tramoDeBrecha(1.099)).toBe('0_10');
		expect(tramoDeBrecha(1.1)).toBe('10_25');
		expect(tramoDeBrecha(1.25)).toBe('25_50');
		expect(tramoDeBrecha(1.5)).toBe('50_100');
		expect(tramoDeBrecha(2)).toBe('50_100');
		expect(tramoDeBrecha(2.01)).toBe('gt100');
	});

	it('el distrito sale del lugar «barrio, distrito»; sin coma, nada (nunca el barrio)', () => {
		expect(distritoDeLugar('Fuente del Berro, Salamanca')).toBe('Salamanca');
		expect(distritoDeLugar('Madrid')).toBeNull();
		expect(distritoDeLugar(null)).toBeNull();
	});

	it('el modo y el nivel', () => {
		expect(modoDe({ situacion: 'mirando', tipo: 'piso' })).toBe('mirando');
		expect(modoDe({ situacion: 'vivo', tipo: 'piso' })).toBe('vivo');
		expect(modoDe({ situacion: 'vivo', tipo: 'habitacion' })).toBe('habitacion');
		expect([resultadoDeClase('a'), resultadoDeClase('b'), resultadoDeClase('c')]).toEqual(['dentro', 'nivel2', 'nivel3']);
	});

	it('los motivos de «sin dato» son un enum cerrado; la superficie se reparte según el límite', () => {
		expect(motivoDeSinDato('superficie', 20)).toBe('superficie_menor');
		expect(motivoDeSinDato('superficie', 200)).toBe('superficie_mayor');
		expect(motivoDeSinDato('superficie', null)).toBe('superficie_menor');
		for (const m of MOTIVOS_SIN_DATO.filter((m) => !m.startsWith('superficie'))) expect(motivoDeSinDato(m, null)).toBe(m);
		expect(motivoDeSinDato('inventado', null)).toBeNull();
		expect(filtrarEvento({ event: 'sin_dato', properties: { ...base, modo: 'mirando', motivo: 'inventado' } })!.properties).not.toHaveProperty('motivo');
	});
});

describe('analítica: «completa» a partir de una pantalla real', () => {
	const sec = (p25: number, p75: number, n: number, barrio = '071') => ({ cdis: '07', barrio, smed: 70, p25, p75, n, n_vu: 0, med2015: 10, med2024: 15 });
	const DATOS: DatosMadrid = {
		secciones: { A: sec(12, 20, 100) },
		barrios: { '071': { nombre: 'Almagro', cod_distrito: '07', distrito: 'Chamberí' } },
		ipc: { factor: 1.05, ultimo_mes: '2026-08' }
	};
	const ubic = { cusecs: ['A'], aproximada: false, motivo: null, numerosUsados: [] as number[], punto: null, via: null };
	const pantalla = (precio: number) => {
		const p = construirPantalla({ precio, superficie: 70, obraNueva: false, tipo: 'piso', largaDuracion: true }, ubic, DATOS);
		if (p.tipo !== 'resultado') throw new Error('esperaba resultado');
		return p;
	};

	it('por encima: nivel, tramo de brecha y distrito; nada del precio, los metros, el barrio ni la dirección', () => {
		const d = datosCompleta(pantalla(2500), 'mirando');
		expect(d).toMatchObject({ modo: 'mirando', resultado: 'nivel3', posicion: null, es_horquilla: false, distrito: 'Chamberí' });
		expect(['25_50', '50_100', 'gt100']).toContain(d.brecha_tramo);
		expect(JSON.stringify(d)).not.toMatch(/2500|2\.500|Almagro|\b70\b/);
	});

	it('dentro: la posición en la referencia (baja, media o alta)', () => {
		const d = datosCompleta(pantalla(1100), 'vivo');
		expect(d.resultado).toBe('dentro');
		expect(['baja', 'media', 'alta']).toContain(d.posicion);
		expect(d.modo).toBe('vivo');
	});
});
