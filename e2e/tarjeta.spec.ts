import { readFileSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { abrir, comprobar, esperarAnimacion, sinCompartirNativo } from './ayudas';

const carpeta = () => `e2e/capturas/${test.info().project.name}`;

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
