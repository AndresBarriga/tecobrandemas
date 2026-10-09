import { expect, test } from '@playwright/test';
import { abrir, comprobar, conCompartirNativo, esperarAnimacion, sinCompartirNativo } from './ayudas';

type Peticion = { metodo: string; url: string; cuerpo: string };

test.describe('compartir la tarjeta (escritorio: copiar enlace y descargar imagen)', () => {
	test.beforeEach(async ({ page }) => sinCompartirNativo(page));

	test('no se guarda nada hasta copiar el enlace; el enlace lleva el id y la subida es una sola', async ({ page, context }) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		const peticiones: Peticion[] = [];
		page.on('request', (r) => peticiones.push({ metodo: r.method(), url: r.url(), cuerpo: r.postData() ?? '' }));

		await abrir(page);
		await comprobar(page, { precio: '2500', superficie: '90' });
		await esperarAnimacion(page);
		const grupo = page.getByRole('group', { name: 'Compartir el resultado' });
		await expect(grupo).toBeVisible();
		await grupo.scrollIntoViewIfNeeded();
		await page.screenshot({ path: `e2e/capturas/${test.info().project.name}/37-compartir-canales.png` });
		// En escritorio solo dos: copiar enlace (con vista previa) y descargar la imagen
		await expect(grupo.getByRole('button', { name: 'Copiar enlace' })).toBeVisible();
		await expect(grupo.getByRole('button', { name: 'Descargar imagen' })).toBeVisible();
		await expect(grupo.getByRole('link', { name: 'WhatsApp' })).toHaveCount(0);
		// El aviso: la tarjeta muestra el barrio y deja deducir el precio
		await expect(page.getByText('La tarjeta muestra tu barrio y permite deducir tu precio.').first()).toBeVisible();
		// Sin elegir canal, nada se sube
		expect(peticiones.filter((p) => p.url.endsWith('/api/tarjeta'))).toHaveLength(0);

		await grupo.getByRole('button', { name: 'Copiar enlace' }).click();
		await expect(page.getByText('Enlace copiado.')).toBeVisible();
		const enlace = await page.evaluate(() => navigator.clipboard.readText());
		const id = enlace.match(/\/t\/([0-9a-z]{10})$/)![1]!;
		expect(peticiones.filter((p) => p.url.endsWith('/api/tarjeta'))).toHaveLength(1);
		const subida = peticiones.find((p) => p.url.endsWith('/api/tarjeta'))!;
		expect(subida.cuerpo).toContain(id);
		expect(subida.cuerpo).not.toMatch(/2500|2\.500|Fuente del Berro/);

		// Copiar otra vez: mismo id, sin subir otra vez
		await grupo.getByRole('button', { name: 'Copiar enlace' }).click();
		await page.waitForTimeout(500);
		expect(peticiones.filter((p) => p.url.endsWith('/api/tarjeta'))).toHaveLength(1);

		// La tarjeta existe en /t/<id> (los eventos de compartir se comprueban en e2e/analitica.spec.ts)
		await expect.poll(async () => (await page.request.get(`/t/${id}`)).status()).toBe(200);
		// Nada de terceros durante toda la prueba
		const externas = peticiones.filter((p) => !p.url.startsWith(new URL(page.url()).origin));
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
	});

	test('con un id distinto por resultado', async ({ page }) => {
		const id = async () => {
			const r = page.waitForResponse((x) => x.url().endsWith('/api/tarjeta'));
			await page.getByRole('button', { name: 'Copiar enlace' }).click();
			return ((await (await r).json()) as { id: string }).id;
		};
		await abrir(page);
		await comprobar(page, { precio: '2500', superficie: '90' });
		const primero = await id();
		// En móvil el formulario se esconde tras el resultado: se vuelve con «Otro anuncio»
		if (!(await page.locator('#precio').isVisible())) await page.getByRole('button', { name: 'Otro anuncio' }).first().click();
		await comprobar(page, { precio: '2600', superficie: '90' });
		expect(await id()).not.toBe(primero);
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
	});
});
