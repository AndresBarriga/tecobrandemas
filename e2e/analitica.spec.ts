/**
 * Analítica (PostHog sin cookies). En `vite dev`, `?ph_prueba=1` la activa con una clave de mentira; el proxy
 * /r7k se intercepta aquí (no se envía nada a PostHog) y se lee lo que de verdad sale del navegador.
 * Los `$pageleave` de cierre de pestaña van por sendBeacon y no se interceptan: se comprueban los de la
 * navegación interna.
 */
import { gunzipSync } from 'node:zlib';
import { expect, test, type BrowserContext } from '@playwright/test';
import { abrir, comprobar, esperarAnimacion, sinCompartirNativo } from './ayudas';

type Evento = { event: string; properties: Record<string, unknown> };

/** Registra los eventos que salen hacia /r7k (el cuerpo va en gzip o en JSON) */
async function escuchar(context: BrowserContext): Promise<Evento[]> {
	const salida: Evento[] = [];
	await context.route('**/r7k/**', async (r) => {
		const buf = r.request().postDataBuffer() ?? Buffer.alloc(0);
		let texto = '';
		try {
			texto = gunzipSync(buf).toString();
		} catch {
			texto = buf.toString();
		}
		try {
			const j = JSON.parse(texto);
			for (const e of Array.isArray(j) ? j : (j.batch ?? [j])) salida.push(e as Evento);
		} catch {
			// no es JSON: se ignora
		}
		await r.fulfill({ status: 200, contentType: 'application/json', body: '{"status":1}' });
	});
	return salida;
}
const tipos = (ev: Evento[]) => ev.map((e) => e.event);
const de = (ev: Evento[], nombre: string) => ev.filter((e) => e.event === nombre);
const esperar = (ev: Evento[], nombre: string) => expect.poll(() => tipos(ev), { timeout: 12_000 }).toContain(nombre);
const URL_PRUEBA = '/?ph_prueba=1&t=abcdefghij&utm_source=ig&utm_medium=story&gclid=XYZ&internal=1';

test.describe('analítica sin cookies', () => {
	test('tras un análisis completo: sin cookies ni localStorage, sin claves nuevas en sessionStorage y solo peticiones al propio dominio', async ({ page, context, baseURL }) => {
		const ev = await escuchar(context);
		const ajenas: string[] = [];
		page.on('request', (r) => {
			const u = new URL(r.url());
			if (!['data:', 'blob:'].includes(u.protocol) && u.origin !== new URL(baseURL!).origin) ajenas.push(r.url());
			expect(u.pathname, 'el endpoint de eventos antiguo ya no existe').not.toBe('/api/evento');
		});
		await abrir(page, URL_PRUEBA);
		await comprobar(page, { precio: '2500', superficie: '90' });
		await expect(page.getByText('Por encima del techo')).toBeVisible();
		await page.getByRole('button', { name: 'Intentar negociar el precio' }).click();
		await esperar(ev, 'que_haras');
		await esperar(ev, '$pageview');

		expect(await context.cookies()).toEqual([]);
		const almacen = await page.evaluate(() => ({ local: Object.keys(localStorage), sesion: Object.keys(sessionStorage) }));
		expect(almacen.local).toEqual([]);
		// En sessionStorage solo lo propio del navegador de SvelteKit y el historial de la sesión (historial.ts)
		const permitidas = almacen.sesion.filter((k) => k.startsWith('sveltekit:') || k === 'asp:historial');
		expect(almacen.sesion.filter((k) => !permitidas.includes(k))).toEqual([]);
		expect(ajenas).toEqual([]);
	});

	test('lo que sale: eventos y propiedades de la lista, y nada del anuncio', async ({ page, context }) => {
		const ev = await escuchar(context);
		await abrir(page, URL_PRUEBA);
		await comprobar(page, { precio: '2500', superficie: '90' });
		await expect(page.getByText('Por encima del techo')).toBeVisible();
		await page.getByRole('button', { name: 'Intentar negociar el precio' }).click();
		await esperar(ev, 'que_haras');

		expect(tipos(ev)).toEqual(expect.arrayContaining(['$pageview', 'empieza', 'completa', 'que_haras']));
		// No hay nada de lo antiguo
		expect(tipos(ev).filter((t) => /^(llegada|segundo|desde_tarjeta|servido_|vivo_|comparte_)/.test(t))).toEqual([]);

		const pv = de(ev, '$pageview')[0]!.properties;
		expect(pv.$current_url).toMatch(/\/\?utm_source=ig&utm_medium=story$/); // sin t=, gclid ni internal
		expect(pv).toMatchObject({ utm_source: 'ig', utm_medium: 'story', tarjeta_origen: 'abcdefghij', interno: true, v: 1 });
		expect(pv).not.toHaveProperty('gclid');
		expect(pv).not.toHaveProperty('$raw_user_agent');
		expect(pv).toMatchObject({ distinct_id: '$posthog_cookieless', $cookieless_mode: true, $process_person_profile: false });

		expect(de(ev, 'empieza')[0]!.properties).toMatchObject({ modo: 'mirando' });
		const c = de(ev, 'completa')[0]!.properties;
		expect(c).toMatchObject({ modo: 'mirando', resultado: 'nivel3', es_horquilla: false, distrito: 'Salamanca', indice_analisis: 1 });
		expect(c.brecha_tramo).toMatch(/^(0_10|10_25|25_50|50_100|gt100)$/);
		expect(Number.isInteger(c.segundos_hasta_resultado)).toBe(true);
		expect(de(ev, 'que_haras')[0]!.properties).toMatchObject({ modo: 'mirando', respuesta: 'negociar', resultado: 'nivel3' });

		// Segundo análisis dentro de la misma carga: el índice sube (antes era el evento «segundo»)
		await page.getByRole('button', { name: /Comparar con otro piso/ }).click();
		await comprobar(page, { precio: '2600', superficie: '90' });
		await expect.poll(() => de(ev, 'completa').map((e) => e.properties.indice_analisis)).toEqual([1, 2]);

		// Ninguna propiedad fuera de la lista, y nada del anuncio en ningún sitio
		for (const e of ev) {
			const permitidas = e.event.startsWith('$') ? null : new Set(['token', 'distinct_id', 'v', 'navegador_app', 'tarjeta_origen', 'interno', '$cookieless_mode', '$process_person_profile', ...(await import('../src/lib/cliente/analitica-filtro')).EVENTOS[e.event]!]);
			for (const k of Object.keys(e.properties)) {
				if (k.startsWith('$')) expect((await import('../src/lib/cliente/analitica-filtro')).PROPIEDADES_SDK, `${e.event}.${k}`).toContain(k);
				else if (permitidas) expect(permitidas.has(k), `${e.event}.${k}`).toBe(true);
			}
		}
		expect(JSON.stringify(ev)).not.toMatch(/2500|2\.500|Berro|Goya|Calle|"direccion"|"precio"|"m2"|"lat"/);
	});

	test('«sin dato», error del geocodificador y «confirma_precio»', async ({ page, context }) => {
		const ev = await escuchar(context);
		await abrir(page, '/?ph_prueba=1');
		await comprobar(page, { precio: '1500', superficie: '70', obraNueva: true });
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		await esperar(ev, 'sin_dato');
		expect(de(ev, 'sin_dato')[0]!.properties).toMatchObject({ modo: 'mirando', motivo: 'obra_nueva' });
		expect(tipos(ev)).not.toContain('completa');

		await abrir(page, '/?ph_prueba=1');
		await page.fill('#direccion', 'Calle Que No Existe Ninguna 99999');
		await page.fill('#precio', '1500');
		await page.fill('#superficie', '70');
		await page.locator('form').getByRole('button', { name: /^Comprobar/ }).click();
		await esperar(ev, 'error_geocodificador');
		expect(de(ev, 'error_geocodificador')[0]!.properties).toMatchObject({ tipo: 'no_encontrada' });
	});

	test('confirma_precio solo al confirmar un precio que parece un error', async ({ page, context }) => {
		const ev = await escuchar(context);
		await abrir(page, '/?ph_prueba=1');
		await comprobar(page, { precio: '9000', superficie: '90' });
		await expect(page.getByRole('button', { name: 'Sí, es correcto' })).toBeVisible();
		await page.waitForTimeout(500);
		expect(tipos(ev)).not.toContain('confirma_precio');
		expect(tipos(ev)).not.toContain('completa');
		await page.getByRole('button', { name: 'Sí, es correcto' }).click();
		await esperar(ev, 'confirma_precio');
		await esperar(ev, 'completa');
		expect(de(ev, 'confirma_precio')[0]!.properties).toMatchObject({ modo: 'mirando' });
		expect(JSON.stringify(ev)).not.toMatch(/9000|9\.000/);
	});

	test('usar_ubicacion: «denegada» si se rechaza el permiso y «no_disponible» si no hay GPS', async ({ page, context }) => {
		const ev = await escuchar(context);
		// Sin conceder el permiso de ubicación: el navegador lo rechaza
		await abrir(page, '/?ph_prueba=1');
		await page.getByRole('radio', { name: 'Ya vivo aquí' }).check();
		await page.getByRole('button', { name: 'Estoy en casa: usar mi ubicación' }).click();
		await esperar(ev, 'usar_ubicacion');
		expect(de(ev, 'usar_ubicacion').map((e) => e.properties.resultado)).toEqual(['denegada']);

		// Sin API de geolocalización (fallo técnico, no una decisión de la persona)
		await page.addInitScript(() => Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true }));
		await abrir(page, '/?ph_prueba=1');
		await page.getByRole('radio', { name: 'Ya vivo aquí' }).check();
		await page.getByRole('button', { name: 'Estoy en casa: usar mi ubicación' }).click();
		await expect.poll(() => de(ev, 'usar_ubicacion').map((e) => e.properties.resultado), { timeout: 12_000 }).toEqual(['denegada', 'no_disponible']);
	});

	test('empieza se dispara con la primera acción: escribir o «Usar mi ubicación», una sola vez por análisis y con el modo correcto', async ({ page, context }) => {
		await context.grantPermissions(['geolocation']);
		await context.setGeolocation({ latitude: 48.8566, longitude: 2.3522, accuracy: 20 }); // fuera de Madrid: el análisis sigue abierto
		const ev = await escuchar(context);
		await abrir(page, '/?ph_prueba=1');
		await page.getByRole('radio', { name: 'Ya vivo aquí' }).check();
		await page.waitForTimeout(800);
		expect(tipos(ev)).not.toContain('empieza'); // elegir el modo no es empezar
		await page.getByRole('button', { name: 'Estoy en casa: usar mi ubicación' }).click();
		await esperar(ev, 'usar_ubicacion');
		expect(de(ev, 'empieza')).toHaveLength(1);
		expect(de(ev, 'empieza')[0]!.properties).toMatchObject({ modo: 'vivo' });
		// Escribir después no vuelve a empezar el mismo análisis
		await page.fill('#direccion', 'Calle de Fuente del Berro 14');
		await page.fill('#precio', '1620');
		await page.waitForTimeout(3500);
		expect(de(ev, 'empieza')).toHaveLength(1);
		// El orden: empieza antes que usar_ubicacion
		expect(tipos(ev).indexOf('empieza')).toBeLessThan(tipos(ev).indexOf('usar_ubicacion'));
	});

	test('usar_ubicacion lleva solo el resultado, nunca el sitio', async ({ page, context }) => {
		await context.grantPermissions(['geolocation']);
		await context.setGeolocation({ latitude: 48.8566, longitude: 2.3522, accuracy: 20 }); // París: fuera de Madrid
		const ev = await escuchar(context);
		await abrir(page, '/?ph_prueba=1');
		await page.getByRole('radio', { name: 'Ya vivo aquí' }).check();
		await page.getByRole('button', { name: 'Estoy en casa: usar mi ubicación' }).click();
		await esperar(ev, 'usar_ubicacion');
		expect(de(ev, 'usar_ubicacion')[0]!.properties).toMatchObject({ resultado: 'fuera' });
		expect(JSON.stringify(ev)).not.toMatch(/48\.8|2\.35|latitude|longitude/);
	});

	test('compartir, aportar y «Ya vivo aquí» con su pregunta', async ({ page, context }) => {
		await sinCompartirNativo(page);
		const ev = await escuchar(context);
		await abrir(page, '/?ph_prueba=1');
		await comprobar(page, { precio: '1620', superficie: '90', vivo: { mes: 3, ano: 2023, rentaFirma: '1500' } });
		await esperarAnimacion(page);
		await expect(page.getByRole('button', { name: 'Aportar mi alquiler' })).toBeVisible();
		await page.getByRole('button', { name: 'Aportar mi alquiler' }).click();
		await page.getByRole('button', { name: 'Hablar con mi casero' }).click();
		const descarga = page.waitForEvent('download');
		await page.getByRole('button', { name: 'Descargar imagen' }).click();
		await descarga;
		await esperar(ev, 'que_haras');
		await esperar(ev, 'comparte');
		await esperar(ev, 'aporta');
		expect(de(ev, 'empieza')[0]!.properties).toMatchObject({ modo: 'vivo' });
		expect(de(ev, 'completa')[0]!.properties).toMatchObject({ modo: 'vivo' });
		expect(de(ev, 'aporta')[0]!.properties).toMatchObject({ tipo: 'alquiler' });
		expect(de(ev, 'que_haras')[0]!.properties).toMatchObject({ modo: 'vivo', respuesta: 'hablar_casero' });
		expect(de(ev, 'comparte')[0]!.properties).toMatchObject({ modo: 'vivo', canal: 'descargar' });
		expect(JSON.stringify(ev)).not.toMatch(/1620|1\.620|1500|Berro|Calle/);
	});

	test('una pantalla de «Cómo calculamos» → «sin dato» no cuenta como análisis; /mapa no emite eventos propios', async ({ page, context }) => {
		const ev = await escuchar(context);
		await abrir(page, '/?ph_prueba=1&motivo=obra_nueva');
		await esperar(ev, '$pageview');
		expect(tipos(ev)).not.toContain('completa');
	});

	test('las navegaciones internas dan $pageleave y $pageview con la ruta; cambiar parámetros de /mapa no', async ({ page, context }) => {
		const ev = await escuchar(context);
		await abrir(page, '/?ph_prueba=1');
		await page.getByRole('link', { name: 'Mapa' }).first().click();
		await page.waitForURL(/\/mapa/);
		await esperar(ev, '$pageleave');
		await expect.poll(() => de(ev, '$pageview').map((e) => new URL(String(e.properties.$current_url)).pathname)).toContain('/mapa');
		const antes = de(ev, '$pageview').length;
		await page.locator('.seg label', { hasText: 'Mi presupuesto' }).click();
		await page.waitForTimeout(3500);
		expect(de(ev, '$pageview').length).toBe(antes); // ?capa= se actualiza en la URL, pero es la misma página
	});

	test('el proxy atiende /r7k/e/ y /r7k/e directamente, sin redirigir (en desarrollo no reenvía nada)', async ({ request }) => {
		for (const ruta of ['/r7k/e/', '/r7k/e']) {
			const r = await request.post(ruta, { data: 'x', headers: { 'content-type': 'text/plain' }, maxRedirects: 0 });
			expect(r.status(), ruta).toBe(204);
		}
		expect((await request.post('/r7k/otra/', { data: 'x', headers: { 'content-type': 'text/plain' }, maxRedirects: 0 })).status()).toBe(404);
	});

	test('sin ?ph_prueba (como en producción sin PUBLIC_POSTHOG_ENABLED) no sale nada', async ({ page, context }) => {
		const ev = await escuchar(context);
		await abrir(page, '/');
		await comprobar(page, { precio: '2500', superficie: '90' });
		await expect(page.getByText('Por encima del techo')).toBeVisible();
		await page.waitForTimeout(3500);
		expect(ev).toEqual([]);
	});
});

