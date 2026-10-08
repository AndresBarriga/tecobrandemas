import { describe, expect, it } from 'vitest';
import {
	dominioDelReferrer, distritoDeLugar, filtrarEvento, limpiarUrl, navegadorApp, tramoDeBrecha, EVENTOS, SDK_PROHIBIDAS
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

	it('deja pasar las propiedades $ del SDK que el modo sin cookies necesita; quita IP, geolocalización, perfil, título y los identificadores de clic', () => {
		const r = filtrarEvento({
			event: '$pageview',
			$set: { email: 'a@b.c' },
			$set_once: { x: 1 },
			properties: {
				...base, $raw_user_agent: 'Mozilla/5.0 (Macintosh)', $host: 'asuprecio.com', $device_id: null, $session_id: 's1', $window_id: 'w1',
				$browser_language: 'es-ES', $timezone: 'Europe/Madrid', $screen_width: 390, $viewport_height: 800, $lib: 'web', $lib_version: '1.438.1',
				$time: 1791446609.4, $browser: 'Chrome', $os: 'Mac OS X', $device_type: 'Desktop',
				$ip: '203.0.113.7', $geoip_city_name: 'Madrid', $geoip_latitude: 40.4, $geoip_disable: true, $set: { email: 'a@b.c' }, $groups: { a: 1 },
				title: 'Resultado: Goya', gclid: 'XYZ', fbclid: 'F'
			}
		})!;
		for (const k of ['$raw_user_agent', '$host', '$device_id', '$session_id', '$window_id', '$browser_language', '$timezone', '$screen_width', '$viewport_height', '$lib', '$lib_version', '$time', '$browser', '$os', '$device_type']) {
			expect(r.properties, k).toHaveProperty(k);
		}
		expect(r.properties).toMatchObject({ $raw_user_agent: 'Mozilla/5.0 (Macintosh)', $cookieless_mode: true, distinct_id: '$posthog_cookieless' });
		for (const k of ['$ip', '$geoip_city_name', '$geoip_latitude', '$geoip_disable', '$set', '$groups', 'title', 'gclid', 'fbclid']) expect(r.properties, k).not.toHaveProperty(k);
		expect(r).not.toHaveProperty('$set');
		expect(r).not.toHaveProperty('$set_once');
		for (const k of Object.keys(r.properties!).filter((k) => k.startsWith('$'))) expect(SDK_PROHIBIDAS.test(k), k).toBe(false);
	});

	it('la campaña y el dominio del referrer salen en los eventos propios; nada más', () => {
		const e = { event: 'completa', properties: { ...base, ...globales, modo: 'mirando', utm_source: 'instagram', utm_medium: 'story', utm_campaign: 'launch', utm_content: 'check', ref_domain: 'instagram.com', utm_extra: 'x', gclid: 'y' } };
		const r = filtrarEvento<{ event: string; properties: Record<string, unknown> }>(e);
		expect(r!.properties).toMatchObject({ utm_source: 'instagram', utm_medium: 'story', utm_campaign: 'launch', utm_content: 'check', ref_domain: 'instagram.com' });
		expect(r!.properties).not.toHaveProperty('utm_extra');
		// Como propiedad, el mismo formato: lo que no encaja no sale (ni recortado)
		const mal = filtrarEvento({ event: 'completa', properties: { ...base, utm_source: 'Instagram', utm_medium: '2500', utm_campaign: 'a'.repeat(41), utm_content: 'oct-2026' } })!;
		for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) expect(mal.properties, k).not.toHaveProperty(k);
		expect(r!.properties).not.toHaveProperty('gclid');
		expect(filtrarEvento({ event: 'completa', properties: { ...base, ref_domain: 'https://x.com/ruta?secreto=1' } })!.properties).not.toHaveProperty('ref_domain');
	});

	it('las URL salen con la ruta y la query reducida a utm_source, utm_medium, utm_campaign, utm_content, t e internal, cada uno con su formato; sin hash y con /t/:id', () => {
		expect(limpiarUrl('https://asuprecio.com/?t=abcde12345&utm_source=ig&utm_medium=story&gclid=XYZ&direccion=Calle%20Mayor&utm_term=kw&c=ig1&internal=1#x')).toBe(
			'https://asuprecio.com/?t=abcde12345&utm_source=ig&utm_medium=story&internal=1'
		);
		// `c` ya no sale (nada lo usa); lo que no cumple el formato se elimina entero, nunca se recorta
		expect(limpiarUrl('https://asuprecio.com/?c=ig1&utm_source=ig')).toBe('https://asuprecio.com/?utm_source=ig');
		expect(limpiarUrl('https://asuprecio.com/?t=abc&internal=2')).toBe('https://asuprecio.com/');
		expect(limpiarUrl('https://asuprecio.com/?t=abcde123456&internal=true')).toBe('https://asuprecio.com/'); // 11 caracteres
		expect(limpiarUrl('https://asuprecio.com/?t=2807904033')).toBe('https://asuprecio.com/'); // solo cifras: parecería una sección censal
		for (const malo of ['Instagram', '2500', '2807904033', 'oct-2026', 'a'.repeat(41), 'ig story', '-ig', 'ig.1', 'ig%2C1', 'story€']) {
			expect(limpiarUrl(`https://asuprecio.com/?utm_source=${encodeURIComponent(malo)}`), malo).toBe('https://asuprecio.com/');
		}
		expect(limpiarUrl(`https://asuprecio.com/?utm_campaign=${'a'.repeat(40)}`)).toBe(`https://asuprecio.com/?utm_campaign=${'a'.repeat(40)}`);
		expect(limpiarUrl('https://asuprecio.com/?utm_content=v2&utm_medium=story_ig-1')).toBe('https://asuprecio.com/?utm_content=v2&utm_medium=story_ig-1');
		expect(limpiarUrl('https://asuprecio.com/mapa?m2=70&utm_campaign=lanzamiento')).toBe('https://asuprecio.com/mapa?utm_campaign=lanzamiento');
		expect(limpiarUrl('$direct')).toBe('$direct');
		expect(limpiarUrl('https://asuprecio.com/t/abcde12345?x=1')).toBe('https://asuprecio.com/t/:id');
		expect(limpiarUrl('https://asuprecio.com/mapa?capa=presupuesto&m2=60&barrio=042')).toBe('https://asuprecio.com/mapa');
		expect(dominioDelReferrer('https://l.instagram.com/?u=https%3A%2F%2Fexample.com%2Fsecreto')).toBe('l.instagram.com');
		const r = filtrarEvento({
			event: '$pageview',
			properties: { ...base, $current_url: 'https://x.dev/t/abcde12345?utm_campaign=c&barrio=Goya', $pathname: '/t/abcde12345', $referrer: 'https://l.instagram.com/?u=secreto', $referring_domain: 'l.instagram.com', utm_campaign: 'c', utm_source: 's' }
		})!;
		// La ruta se mantiene en las URL, también en el referrer; la query se queda en lo permitido
		expect(r.properties).toMatchObject({ $current_url: 'https://x.dev/t/:id?utm_campaign=c', $pathname: '/t/:id', $referrer: 'https://l.instagram.com/', $referring_domain: 'l.instagram.com', utm_campaign: 'c', utm_source: 's' });
		expect(JSON.stringify(r)).not.toMatch(/secreto|Goya|abcde12345/);
	});

	it('un evento de ejemplo conserva $raw_user_agent y los UTM; y no lleva m², precio, dirección ni coordenadas en ninguna propiedad ni URL', () => {
		const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
		const enlace = 'https://asuprecio.com/?utm_source=ig&utm_medium=story&utm_campaign=lanzamiento&utm_content=check&c=a1&t=abcde12345&internal=1&m2=70&metros=70&precio=2500&direccion=Calle%20de%20Alcal%C3%A1%2012&lat=40.42&lng=-3.68&gclid=XYZ';
		const sucio = filtrarEvento({
			event: '$pageview',
			uuid: '01a11a89-ee18-7f29-b79b-fa365bc0a859',
			timestamp: '2026-10-08T08:03:29.432Z',
			$set: { direccion: 'Calle de Alcalá 12' },
			properties: {
				...base, ...globales, utm_source: 'ig', utm_medium: 'story', utm_campaign: 'lanzamiento', utm_content: 'check', utm_term: 'kw', gclid: 'XYZ',
				$raw_user_agent: ua, $host: 'asuprecio.com', $device_id: null, $lib: 'web', $lib_version: '1.438.1', $time: 1791446609.4,
				$pathname: '/mapa', $browser: 'Safari', $os: 'iOS', $device_type: 'Mobile', $screen_width: 390, $screen_height: 844, $viewport_width: 390, $viewport_height: 664,
				$current_url: enlace, $initial_current_url: enlace, $session_entry_url: enlace,
				$referrer: 'https://asuprecio.com/mapa?m2=70&precio=2500&direccion=Calle%20Mayor', $initial_referrer: '$direct', $referring_domain: 'asuprecio.com',
				$ip: '203.0.113.7', $geoip_city_name: 'Madrid', $geoip_latitude: 40.4168, $geoip_longitude: -3.7038,
				precio: 2500, m2: 70, direccion: 'Calle de Alcalá 12', lat: 40.4168, lng: -3.7038
			}
		})!;
		const p = sucio.properties!;
		// Lo que el modo sin cookies necesita
		expect(p).toMatchObject({ $raw_user_agent: ua, $host: 'asuprecio.com', $lib: 'web', $browser: 'Safari', $screen_width: 390, $viewport_height: 664, $cookieless_mode: true, distinct_id: '$posthog_cookieless' });
		// La campaña viaja como propiedades (utm_term ya no)
		expect(p).toMatchObject({ utm_source: 'ig', utm_medium: 'story', utm_campaign: 'lanzamiento', utm_content: 'check' });
		expect(p).not.toHaveProperty('utm_term');
		// Las URL conservan ruta y solo la query permitida
		expect(p.$current_url).toBe('https://asuprecio.com/?utm_source=ig&utm_medium=story&utm_campaign=lanzamiento&utm_content=check&t=abcde12345&internal=1');
		expect(p.$initial_current_url).toBe(p.$current_url);
		expect(p.$session_entry_url).toBe(p.$current_url);
		expect(p.$referrer).toBe('https://asuprecio.com/mapa');
		expect(p.$initial_referrer).toBe('$direct');
		// Nada de IP ni geolocalización
		expect(Object.keys(p).filter((k) => /^\$(ip|geo)/i.test(k))).toEqual([]);
		// Ni m², precio, dirección ni coordenadas, en ninguna propiedad ni URL
		for (const k of ['precio', 'm2', 'metros', 'direccion', 'lat', 'lng', 'gclid']) expect(p, k).not.toHaveProperty(k);
		const texto = JSON.stringify(sucio);
		expect(texto).not.toMatch(/m2=|metros=|precio=|direccion=|lat=|lng=|gclid|Alcal|Calle|2500|40\.41|3\.70|203\.0\.113/i);
		expect(sucio).not.toHaveProperty('$set');
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
