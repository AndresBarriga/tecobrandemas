import { expect, test } from '@playwright/test';

test.describe('alquiler por barrios (piloto)', () => {
	test('/alquiler: un H1, 15 barrios por distrito, canonical y JSON-LD', async ({ page }) => {
		const r = await page.goto('/alquiler');
		expect(r!.status()).toBe(200);
		await expect(page.locator('h1')).toHaveText('Precio de referencia del alquiler por barrios de Madrid');
		await expect(page.locator('main ul li a')).toHaveCount(15);
		const distritos = await page.locator('main h2').allTextContents();
		expect(distritos).toEqual([...distritos].sort((a, b) => a.localeCompare(b, 'es')));
		expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toMatch(/\/alquiler$/);
		const tipos = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t)['@type']);
		expect(tipos).toEqual(['BreadcrumbList']);
		await expect(page.locator('footer a[href="/alquiler"]')).toBeVisible();
	});

	test('una página de barrio: H1, título, tabla, enlaces y botón con utm', async ({ page }) => {
		const r = await page.goto('/alquiler/lavapies-embajadores');
		expect(r!.status()).toBe(200);
		await expect(page.locator('h1')).toHaveText('Precio de referencia del alquiler en Lavapiés (Embajadores), Madrid');
		expect(await page.title()).toBe('Alquiler en Lavapiés: precio de referencia · A su precio');
		await expect(page.locator('table tbody tr')).toHaveCount(3);
		await expect(page.getByText(/^Datos actualizados a [a-zé]+ de 20\d\d\.$/).first()).toBeVisible();
		await expect(page.getByRole('link', { name: 'Comprobar mi alquiler en Lavapiés' })).toHaveAttribute('href', '/?utm_source=barrio&utm_content=lavapies-embajadores');
		await expect(page.getByRole('link', { name: 'Mapa del índice de referencia del alquiler en Madrid' })).toHaveAttribute('href', '/mapa');
		const tipos = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t)['@type']);
		expect(tipos).toEqual(['WebPage', 'FAQPage', 'BreadcrumbList']);
		expect(await page.locator('meta[property="og:image"]').getAttribute('content')).toMatch(/\/og\/alquiler-lavapies-embajadores\.png$/);
		await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
	});

	test('un barrio que no es del piloto da 404', async ({ page }) => {
		const r = await page.goto('/alquiler/palacio');
		expect(r!.status()).toBe(404);
	});
});
