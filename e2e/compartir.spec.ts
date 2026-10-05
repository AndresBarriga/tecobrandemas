import { expect, test } from '@playwright/test';
import { abrir, comprobar, conCompartirNativo, esperarAnimacion, sinCompartirNativo } from './ayudas';

type Peticion = { metodo: string; url: string; cuerpo: string };

test.describe('compartir la tarjeta (escritorio: cuatro canales)', () => {
	test.beforeEach(async ({ page }) => sinCompartirNativo(page));

	test('no se guarda nada hasta elegir un canal; WhatsApp y X llevan el id y la subida es una sola', async ({ page, context }) => {
		const peticiones: Peticion[] = [];
		page.on('request', (r) => peticiones.push({ metodo: r.method(), url: r.url(), cuerpo: r.postData() ?? '' }));
		// WhatsApp y X se abren en otra pestaña: no salimos a internet en las pruebas
		await context.route(/https:\/\/(wa\.me|x\.com)\//, (r) => r.fulfill({ status: 200, body: 'ok', contentType: 'text/html' }));

		await abrir(page);
		await comprobar(page, { precio: '2500', superficie: '90' });
		await esperarAnimacion(page);
		const grupo = page.getByRole('group', { name: 'Compartir el resultado' });
		await expect(grupo).toBeVisible();
		await grupo.scrollIntoViewIfNeeded();
		await page.screenshot({ path: `e2e/capturas/${test.info().project.name}/37-compartir-canales.png` });
		await expect(grupo.getByRole('link', { name: 'WhatsApp' })).toBeVisible();
		await expect(grupo.getByRole('link', { name: 'X', exact: true })).toBeVisible();
		await expect(grupo.getByRole('button', { name: 'Copiar enlace' })).toBeVisible();
		await expect(grupo.getByRole('button', { name: 'Descargar imagen' })).toBeVisible();
		// Instagram: sin botón propio
		await expect(page.getByText('Instagram')).toHaveCount(0);
		// Sin elegir canal, nada se sube
		expect(peticiones.filter((p) => p.url.endsWith('/api/tarjeta'))).toHaveLength(0);

		const hrefWa = (await grupo.getByRole('link', { name: 'WhatsApp' }).getAttribute('href'))!;
		const hrefX = (await grupo.getByRole('link', { name: 'X', exact: true }).getAttribute('href'))!;
		const id = decodeURIComponent(hrefWa).match(/\/t\/([0-9a-z]{10})/)![1]!;
		expect(hrefWa).toMatch(/^https:\/\/wa\.me\/\?text=/);
		expect(hrefX).toMatch(/^https:\/\/x\.com\/intent\/post\?/);
		expect(decodeURIComponent(hrefX)).toContain(`/t/${id}`);
		// El texto compartido no lleva datos del anuncio
		expect(decodeURIComponent(hrefWa + hrefX)).not.toMatch(/2\.?500|90\s?m|Fuente del Berro|€/);

		// WhatsApp: se abre en otra pestaña y se sube la tarjeta con ese id
		const [popup] = await Promise.all([context.waitForEvent('page'), grupo.getByRole('link', { name: 'WhatsApp' }).click()]);
		await popup.close();
		await expect.poll(() => peticiones.filter((p) => p.url.endsWith('/api/tarjeta')).length).toBe(1);
		const subida = peticiones.find((p) => p.url.endsWith('/api/tarjeta'))!;
		expect(subida.cuerpo).toContain(id);
		expect(subida.cuerpo).not.toMatch(/2500|2\.500|Fuente del Berro/);

		// X: mismo id, sin subir otra vez
		const [popup2] = await Promise.all([context.waitForEvent('page'), grupo.getByRole('link', { name: 'X', exact: true }).click()]);
		await popup2.close();
		await page.waitForTimeout(500);
		expect(peticiones.filter((p) => p.url.endsWith('/api/tarjeta'))).toHaveLength(1);

		// La tarjeta existe en /t/<id>, y los eventos llevan el canal y el id, sin datos del anuncio
		await expect.poll(async () => (await page.request.get(`/t/${id}`)).status()).toBe(200);
		const eventos = peticiones.filter((p) => p.url.endsWith('/api/evento')).map((p) => JSON.parse(p.cuerpo));
		expect(eventos).toContainEqual({ tipo: 'comparte_whatsapp', visita: expect.any(String), tarjeta: id });
		expect(eventos).toContainEqual({ tipo: 'comparte_x', visita: expect.any(String), tarjeta: id });
		// Nada de terceros durante toda la prueba
		const externas = peticiones.filter((p) => !p.url.startsWith(new URL(page.url()).origin) && !/wa\.me|x\.com/.test(p.url));
		expect(externas).toEqual([]);
	});

	test('descargar la imagen no guarda nada en el servidor', async ({ page }) => {
		const posts: string[] = [];
		page.on('request', (r) => r.method() === 'POST' && posts.push(new URL(r.url()).pathname));
		await abrir(page);
		await comprobar(page, { precio: '2500', superficie: '90' });
		await esperarAnimacion(page);
		const descarga = page.waitForEvent('download');
		await page.getByRole('button', { name: 'Descargar imagen' }).click();
		expect((await descarga).suggestedFilename()).toBe('a-su-precio.jpg');
		await expect(page.getByText('Imagen descargada. No se ha guardado nada.')).toBeVisible();
		expect(posts).not.toContain('/api/tarjeta');
		expect(posts).toContain('/api/evento'); // el evento de descarga, sin datos del anuncio
	});

	test('con un id distinto por resultado', async ({ page }) => {
		await abrir(page);
		await comprobar(page, { precio: '2500', superficie: '90' });
		const id = async () =>
			decodeURIComponent((await page.getByRole('link', { name: 'WhatsApp' }).getAttribute('href'))!).match(/\/t\/([0-9a-z]{10})/)![1];
		const primero = await id();
		// En móvil el formulario se esconde tras el resultado: se vuelve con «Otro piso»
		if (!(await page.locator('#precio').isVisible())) await page.getByRole('button', { name: 'Otro piso' }).first().click();
		await comprobar(page, { precio: '2600', superficie: '90' });
		await expect.poll(id).not.toBe(primero);
	});
});

test.describe('compartir la tarjeta (móvil con hoja nativa)', () => {
	test('un solo botón: hoja nativa con la imagen y el enlace, y se guarda la tarjeta', async ({ page }, info) => {
		test.skip(info.project.name.startsWith('escritorio'), 'La hoja nativa solo se usa en dispositivos táctiles');
		await conCompartirNativo(page);
		const posts: Peticion[] = [];
		page.on('request', (r) => r.method() === 'POST' && posts.push({ metodo: 'POST', url: r.url(), cuerpo: r.postData() ?? '' }));
		await abrir(page);
		await comprobar(page, { precio: '2500', superficie: '90' });
		await esperarAnimacion(page);
		await expect(page.getByRole('group', { name: 'Compartir el resultado' })).toHaveCount(0);
		await page.getByRole('button', { name: 'Compartir el resultado' }).click();
		await expect.poll(() => page.evaluate(() => (window as unknown as { __compartido?: unknown }).__compartido)).toMatchObject({
			ficheros: [{ nombre: 'a-su-precio.jpg', tipo: 'image/jpeg' }],
			url: expect.stringMatching(/\/t\/[0-9a-z]{10}$/)
		});
		expect(posts.filter((p) => p.url.endsWith('/api/tarjeta'))).toHaveLength(1);
		const ev = posts.filter((p) => p.url.endsWith('/api/evento')).map((p) => JSON.parse(p.cuerpo));
		expect(ev).toContainEqual({ tipo: 'comparte', visita: expect.any(String), tarjeta: expect.stringMatching(/^[0-9a-z]{10}$/) });
	});
});
