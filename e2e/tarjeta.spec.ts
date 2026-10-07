import { readFileSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { SITE_URL } from '../src/lib/resultado/sitio';
import { abrir, comprobar, esperarAnimacion, sinCompartirNativo } from './ayudas';

const carpeta = () => `e2e/capturas/${test.info().project.name}`;

test('la portada tiene imagen de vista previa (og:image 1200×630) y tarjeta grande', async ({ page, request }) => {
	await abrir(page);
	const meta = (n: string) => page.locator(`meta[${n}]`).getAttribute('content');
	expect(await meta('property="og:image"')).toBe(`${SITE_URL}/og-portada.png`);
	expect(await meta('property="og:image:width"')).toBe('1200');
	expect(await meta('property="og:image:height"')).toBe('630');
	expect(await meta('name="twitter:card"')).toBe('summary_large_image');
	expect(await meta('name="twitter:image"')).toBe(`${SITE_URL}/og-portada.png`);
	const img = await request.get('/og-portada.png');
	expect(img.status()).toBe(200);
	expect(img.headers()['content-type']).toBe('image/png');
});

test.describe('tarjeta y /t/:id', () => {
	test('22-tarjeta: se genera en menos de 3 s, sin precio, y el enlace /t/:id la muestra', async ({ page, request, baseURL }) => {
		await sinCompartirNativo(page);
		await abrir(page);
		await comprobar(page, { precio: '2500', superficie: '90' });
		await expect(page.getByRole('group', { name: 'Compartir el resultado' })).toBeVisible();
		await esperarAnimacion(page);

		// El canvas es de 1080×1350
		const canvas = page.getByLabel('Vista previa de la tarjeta para compartir');
		expect(await canvas.evaluate((c: HTMLCanvasElement) => [c.width, c.height])).toEqual([1080, 1350]);

		const posts: { ruta: string; cuerpo: string }[] = [];
		page.on('request', (r) => r.method() === 'POST' && posts.push({ ruta: new URL(r.url()).pathname, cuerpo: r.postData() ?? '' }));
		const respuesta = page.waitForResponse((r) => r.url().endsWith('/api/tarjeta'));

		// Descargar la imagen no sube nada
		const descarga = page.waitForEvent('download');
		await page.getByRole('button', { name: 'Descargar imagen' }).click();
		const d = await descarga;
		const ruta = `${carpeta()}/22-tarjeta.jpg`;
		await d.saveAs(ruta);
		const jpg = readFileSync(ruta);
		expect([jpg[0], jpg[1]]).toEqual([0xff, 0xd8]);
		expect(posts.filter((p) => p.ruta === '/api/tarjeta')).toHaveLength(0);

		// Copiar el enlace sí la sube, en menos de 3 s
		const t0 = Date.now();
		await page.getByRole('button', { name: 'Copiar enlace' }).click();

		// Lo que sube la tarjeta no lleva precio, m² ni dirección
		const subida = await respuesta;
		expect(Date.now() - t0).toBeLessThan(3000);
		expect(subida.status()).toBe(201);
		const { id } = await subida.json();
		const envio = posts.find((p) => p.ruta === '/api/tarjeta')!;
		expect(envio.cuerpo).not.toMatch(/2500|2\.500|Fuente del Berro|\b90\b/);

		// Página compartida
		await page.goto(`/t/${id}`);
		await expect(page.getByRole('link', { name: 'Comprueba tu piso' })).toBeVisible();
		await expect(page.getByText(/Alguien ha comprobado un piso en/)).toBeVisible();
		const og = await page.locator('meta[property="og:image"]').getAttribute('content');
		expect(og).toBe(`${baseURL}/t/${id}/og.jpg`);
		const meta = await page.locator('head').innerHTML();
		expect(meta).not.toMatch(/2\.?500|€\/mes|Fuente del Berro 14/);
		expect(await page.locator('meta[name="robots"]').getAttribute('content')).toContain('noindex');
		await page.waitForTimeout(1200);
		await page.screenshot({ path: `${carpeta()}/23-pagina-t.png`, fullPage: true });

		const ogImg = await request.get(`/t/${id}/og.jpg`);
		expect(ogImg.status()).toBe(200);
		expect(ogImg.headers()['content-type']).toBe('image/jpeg');
		writeFileSync(`${carpeta()}/24-og.jpg`, await ogImg.body());
	});

	test('el servidor descarta lo que no es de la tarjeta y rechaza lo mal formado', async ({ request }) => {
		const mala = await request.post('/api/tarjeta', { multipart: { tarjeta: '{"precio":2500}' } });
		expect(mala.status()).toBe(400);
		const sinJpeg = await request.post('/api/tarjeta', {
			multipart: {
				tarjeta: JSON.stringify({
					clase: 'c', etiqueta: 'Por encima del techo para un piso excelente', hero: { tipo: 'cifra', texto: '+30 %' },
					nota: 'x', frase: 'y', barrio: 'Goya', aproximada: false,
					barra: { banda: { desde: 0.4, hasta: 0.6 }, incertidumbre: null, techo: { desde: 0.6, hasta: 0.7 }, punto: 0.8, tercio: null },
					precio: 2500, direccion: 'Calle X 3'
				}),
				og: { name: 'og.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('no soy un jpeg') }
			}
		});
		expect(sinJpeg.status()).toBe(400);
	});

	test('una tarjeta que no existe da una página con salida', async ({ page }) => {
		const r = await page.goto('/t/abcdefghij');
		expect(r?.status()).toBe(404);
		await expect(page.getByRole('heading', { name: 'Esta tarjeta no existe' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Comprueba tu piso' })).toBeVisible();
		expect((await page.goto('/t/no-valido'))?.status()).toBe(404);
	});
});

/** Peso y tamaño de un JPEG (lee el marcador SOF) */
function infoJpeg(b: Buffer) {
	let i = 2;
	while (i < b.length) {
		if (b[i] !== 0xff) return null;
		const m = b[i + 1]!;
		if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { alto: b.readUInt16BE(i + 5), ancho: b.readUInt16BE(i + 7) };
		i += 2 + b.readUInt16BE(i + 2);
	}
	return null;
}

test.describe('vista previa para rastreadores (WhatsApp, Facebook, X)', () => {
	test('/t/:id y og.jpg responden bien a facebookexternalhit, WhatsApp y Twitterbot, también en HEAD', async ({ page, request }) => {
		await sinCompartirNativo(page);
		await abrir(page);
		await comprobar(page, { precio: '2500', superficie: '90' });
		await expect(page.getByRole('group', { name: 'Compartir el resultado' })).toBeVisible();
		await esperarAnimacion(page);
		const subida = page.waitForResponse((r) => r.url().endsWith('/api/tarjeta'));
		await page.getByRole('button', { name: 'Copiar enlace' }).click();
		const { id } = await (await subida).json();

		for (const ua of ['facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', 'WhatsApp/2.23.20.0 A', 'Twitterbot/1.0']) {
			const headers = { 'user-agent': ua };
			const pagina = await request.get(`/t/${id}`, { headers, maxRedirects: 0 });
			expect(pagina.status(), ua).toBe(200);
			expect(pagina.headers()['content-type']).toContain('text/html');
			// Las etiquetas están en el HTML del servidor (esta petición no ejecuta JS)
			const head = (await pagina.text()).split('</head>')[0]!;
			const og = (n: string) => new RegExp(`<meta (?:property|name)="${n}" content="([^"]*)"`).exec(head)?.[1];
			const imagen = `${SITE_URL}/t/${id}/og.jpg`.replace(SITE_URL, new URL(pagina.url()).origin);
			expect(og('og:title')).toBeTruthy();
			expect(og('og:description')).toBeTruthy();
			expect(og('og:type')).toBe('website');
			expect(og('og:image:type')).toBe('image/jpeg');
			expect(og('og:image:width')).toBe('1200');
			expect(og('og:image:height')).toBe('630');
			expect(og('twitter:card')).toBe('summary_large_image');
			for (const n of ['og:url', 'og:image', 'og:image:secure_url', 'twitter:image']) expect(og(n), n).toMatch(/^https?:\/\//);
			expect(og('og:image')).toBe(imagen);
			expect(og('og:image:secure_url')).toBe(imagen);

			const cabeza = await request.head(`/t/${id}`, { headers, maxRedirects: 0 });
			expect(cabeza.status(), `HEAD ${ua}`).toBe(200);
			expect(cabeza.headers()['content-type']).toContain('text/html');

			const t0 = Date.now();
			const jpg = await request.get(`/t/${id}/og.jpg`, { headers, maxRedirects: 0 });
			expect(Date.now() - t0).toBeLessThan(1000);
			expect(jpg.status()).toBe(200);
			expect(jpg.headers()['content-type']).toBe('image/jpeg');
			expect(jpg.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
			const cuerpo = await jpg.body();
			expect(cuerpo.length).toBeLessThan(300_000);
			expect(infoJpeg(cuerpo)).toEqual({ ancho: 1200, alto: 630 });
			expect((await request.head(`/t/${id}/og.jpg`, { headers, maxRedirects: 0 })).status()).toBe(200);
		}
	});

	test('la página compartida lleva la cabecera con el logo', async ({ page }) => {
		await sinCompartirNativo(page);
		await abrir(page);
		await comprobar(page, { precio: '2500', superficie: '90' });
		await expect(page.getByRole('group', { name: 'Compartir el resultado' })).toBeVisible();
		await esperarAnimacion(page);
		const subida = page.waitForResponse((r) => r.url().endsWith('/api/tarjeta'));
		await page.getByRole('button', { name: 'Copiar enlace' }).click();
		const { id } = await (await subida).json();
		await page.goto(`/t/${id}`);
		await expect(page.locator('header [data-logo]')).toBeVisible();
		await expect(page.locator('header [data-logo] img')).toBeVisible();
		await expect(page.getByRole('link', { name: 'A su precio, inicio' })).toBeVisible();
	});

	test('WhatsApp y X se abren cuando la tarjeta ya está subida (si no, la vista previa sale vacía)', async ({ page, context }) => {
		await sinCompartirNativo(page);
		await abrir(page);
		await comprobar(page, { precio: '2500', superficie: '90' });
		await expect(page.getByRole('group', { name: 'Compartir el resultado' })).toBeVisible();
		await esperarAnimacion(page);
		// La subida tarda: el canal no puede abrirse antes de que termine
		let subidaTerminada = 0;
		await page.route('**/api/tarjeta', async (ruta) => {
			await new Promise((r) => setTimeout(r, 1200));
			await ruta.continue();
			subidaTerminada = Date.now();
		});
		await context.route(/wa\.me|x\.com/, (r) => r.fulfill({ status: 200, body: 'ok' }));
		const popup = context.waitForEvent('page');
		await page.getByRole('link', { name: 'WhatsApp' }).click();
		const nueva = await popup;
		const abierta = Date.now();
		expect(nueva.url()).toMatch(/wa\.me|about:blank/);
		expect(subidaTerminada).toBeGreaterThan(0);
		expect(abierta).toBeGreaterThanOrEqual(subidaTerminada - 50);
	});
});
