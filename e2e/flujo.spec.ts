import { expect, test } from '@playwright/test';
import { BERRO, NB, abrir, comprobar, esperarAnimacion } from './ayudas';

test.describe('flujo', () => {
	test('completa el flujo en menos de 30 s y la barra queda en su sitio', async ({ page }) => {
		const t0 = Date.now();
		await abrir(page);
		await comprobar(page, { precio: '2500', superficie: '90' });
		await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
		await expect(page.getByText('Por encima del techo para un piso excelente')).toBeVisible();
		await esperarAnimacion(page);
		expect(Date.now() - t0).toBeLessThan(30_000);
		await expect(page.getByRole('img', { name: /Tu anuncio, 2\.500/ })).toBeVisible();
	});

	test('formatea el precio al salir del campo y valida con mensajes que dicen cómo corregir', async ({ page }) => {
		await abrir(page);
		await page.fill('#precio', '2200€');
		await page.locator('#superficie').focus();
		await expect(page.locator('#precio')).toHaveValue('2.200');
		await page.fill('#superficie', '3');
		await page.locator('#precio').focus();
		await expect(page.getByText(/Escribe los m².*entre 10 y 500/)).toBeVisible();
		await page.getByRole('button', { name: 'Comprobar el precio' }).click();
		await expect(page.getByText(/Escribe la calle y el número/)).toBeVisible();
	});

	test('solo se piden recursos del propio dominio y no sale ningún precio', async ({ page }) => {
		const externas: string[] = [];
		const posts: { url: string; cuerpo: string }[] = [];
		page.on('request', (r) => {
			if (new URL(r.url()).origin !== 'http://localhost:5173') externas.push(r.url());
			if (r.method() === 'POST') posts.push({ url: r.url(), cuerpo: r.postData() ?? '' });
		});
		await abrir(page);
		await comprobar(page, { precio: '2500', superficie: '90' });
		await expect(page.getByText('Por encima del techo')).toBeVisible();
		expect(externas).toEqual([]);
		// Lo único que se envía es la dirección, a nuestro Worker; ni precio ni m²
		expect(posts.map((p) => new URL(p.url).pathname)).toEqual(['/api/geocode']);
		expect(posts[0]!.cuerpo).not.toMatch(/2500|2\.500|90/);
	});

	test('Sofia Sans sale de /fonts', async ({ page }) => {
		const fuentes: string[] = [];
		page.on('response', (r) => {
			if (/\.woff2?$/.test(r.url())) fuentes.push(new URL(r.url()).pathname);
		});
		await abrir(page);
		await page.evaluate(() => document.fonts.ready);
		expect(fuentes.length).toBeGreaterThan(0);
		expect(fuentes.every((f) => f.startsWith('/fonts/'))).toBe(true);
		expect(await page.evaluate(() => document.fonts.check('900 40px "Sofia Sans Extra Condensed"'))).toBe(true);
	});

	test('«Otro piso» vuelve al formulario con lo escrito', async ({ page }) => {
		await abrir(page);
		await comprobar(page, { precio: '2500', superficie: '90' });
		await expect(page.getByText('Por encima del techo')).toBeVisible();
		await page.getByRole('button', { name: /Comparar con otro piso/ }).click();
		await expect(page.locator('#direccion')).toBeVisible();
		await expect(page.locator('#direccion')).toHaveValue(BERRO);
	});

	test('textos con espacio duro: «2.500 €» y «+NN %»', async ({ page }) => {
		await abrir(page);
		await comprobar(page, { precio: '2500', superficie: '90' });
		await expect(page.getByText('Por encima del techo')).toBeVisible();
		const cuerpo = await page.locator('main').innerText();
		expect(cuerpo).toContain(`2.500${NB}€`);
		expect(cuerpo).toMatch(/\+\d+(,\d)? %/);
		expect(cuerpo).not.toMatch(/\d [€%]/);
		expect(cuerpo.toLowerCase()).not.toMatch(/ilegal|abusivo|actualizado a hoy/);
	});
});
