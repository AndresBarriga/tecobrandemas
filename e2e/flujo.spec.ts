import { expect, test } from '@playwright/test';
import { BERRO, NB, abrir, comprobar, esperarAnimacion } from './ayudas';

test.describe('flujo', () => {
	test('completa el flujo en menos de 30 s y la barra queda en su sitio', async ({ page }) => {
		const t0 = Date.now();
		await abrir(page);
		await comprobar(page, { precio: '2500', superficie: '90' });
		await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
		await expect(page.getByText('POR ENCIMA', { exact: true }).first()).toBeVisible();
		await esperarAnimacion(page);
		expect(Date.now() - t0).toBeLessThan(30_000);
		await expect(page.getByText(/2\.500 €\/mes · precio del anuncio/)).toBeVisible();
		await expect(page.getByRole('img', { name: /Contratos vigentes de la zona: lo habitual de/ })).toBeVisible();
	});

	test('formatea el precio al salir del campo y valida con mensajes que dicen cómo corregir', async ({ page }) => {
		await abrir(page, '/?modo=mirando');
		await page.fill('#precio', '2200€');
		await page.locator('#superficie').focus();
		await expect(page.locator('#precio')).toHaveValue('2.200');
		await page.fill('#superficie', '3');
		await page.locator('#precio').focus();
		await expect(page.getByText(/Escribe los m².*entre 10 y 500/)).toBeVisible();
		await page.getByRole('button', { name: 'Comprobar el precio' }).click();
		// «Un anuncio» empieza por «Calle»
		await expect(page.getByText(/Escribe el nombre de la calle/)).toBeVisible();
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
		// En escritorio la portada ya enseña un resultado de muestra: se espera al de verdad
		await expect(page.getByRole('group', { name: 'Compartir el resultado' })).toBeVisible();
		await expect(page.getByText('POR ENCIMA', { exact: true }).first()).toBeVisible();
		expect(externas).toEqual([]);
		// Solo se envía la dirección a nuestro Worker (para situar el piso); ni precio ni m² en ningún cuerpo
		const rutas = posts.map((p) => new URL(p.url).pathname);
		expect(rutas).toContain('/api/geocode');
		expect(rutas.filter((r) => r !== '/api/geocode')).toEqual([]);
		for (const p of posts) expect(p.cuerpo, p.url).not.toMatch(/2500|2\.500|"90"|\b90\b/);
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

	test('«Otro anuncio» vuelve al formulario con lo escrito', async ({ page }) => {
		await abrir(page);
		await comprobar(page, { precio: '2500', superficie: '90' });
		await expect(page.getByText('POR ENCIMA', { exact: true }).first()).toBeVisible();
		await page.getByRole('button', { name: /Comparar con otro anuncio/ }).click();
		await expect(page.locator('#direccion')).toBeVisible();
		// El número escrito al final de la calle pasa al campo «Nº»
		await expect(page.locator('#direccion')).toHaveValue('Calle de Fuente del Berro');
		await expect(page.locator('#numero')).toHaveValue('14');
	});

	test('textos con espacio duro: «2.500 €» y «+NN %»', async ({ page }) => {
		await abrir(page);
		await comprobar(page, { precio: '2500', superficie: '90' });
		await expect(page.getByRole('group', { name: 'Compartir el resultado' })).toBeVisible();
		const cuerpo = await page.locator('main').innerText();
		expect(cuerpo).toContain(`2.500${NB}€`);
		expect(cuerpo).toMatch(/\+\d+(,\d)? %/);
		expect(cuerpo).not.toMatch(/\d [€%]/);
		expect(cuerpo.toLowerCase()).not.toMatch(/ilegal|abusivo|actualizado a hoy/);
	});
});
