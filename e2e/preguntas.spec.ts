import { expect, test } from '@playwright/test';

const RUTAS = [
	'/preguntas',
	'/preguntas/como-saber-si-un-alquiler-es-caro-en-madrid',
	'/preguntas/que-es-el-indice-de-referencia-del-alquiler',
	'/preguntas/por-que-los-anuncios-son-mas-caros-que-los-contratos',
	'/preguntas/supera-mi-alquiler-el-indice-de-referencia'
];

test.describe('centro de preguntas', () => {
	for (const ruta of RUTAS) {
		test(`${ruta}: un H1, canonical propio, sin noindex y JSON-LD válido`, async ({ page, request }) => {
			const r = await page.goto(ruta);
			expect(r!.status()).toBe(200);
			expect((r!.headers()['x-robots-tag'] ?? '')).not.toContain('noindex');
			await expect(page.locator('h1')).toHaveCount(1);
			await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
			expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toMatch(new RegExp(`${ruta}$`));
			const titulo = await page.title();
			expect(titulo.length).toBeLessThanOrEqual(60);
			expect(titulo.endsWith(' · A su precio')).toBe(true);
			expect((await page.locator('meta[name="description"]').getAttribute('content'))!.length).toBeLessThanOrEqual(155);
			const bloques = await page.locator('script[type="application/ld+json"]').allTextContents();
			const tipos = bloques.map((b) => JSON.parse(b)['@type']);
			expect(tipos).toEqual(ruta === '/preguntas' ? ['BreadcrumbList'] : ['Article', 'FAQPage', 'BreadcrumbList']);
			// El pie enlaza al hub
			await expect(page.locator('footer a[href="/preguntas"]')).toBeVisible();
			if (ruta !== '/preguntas') await expect(page.getByText(/Última actualización: 13\/10\/2026/).first()).toBeVisible();
			expect((await request.get('/sitemap.xml')).ok()).toBe(true);
		});
	}

	test('el botón lleva a la herramienta con la campaña', async ({ page }) => {
		await page.goto('/preguntas/supera-mi-alquiler-el-indice-de-referencia');
		await page.getByRole('link', { name: 'Comprobar mi alquiler' }).click();
		await expect(page).toHaveURL(/\/\?modo=vivo&utm_source=preguntas&utm_content=subida-alquiler$/);
	});

	test('«Cómo calculamos» enlaza al hub', async ({ page }) => {
		await page.goto('/como-calculamos');
		await expect(page.getByRole('link', { name: /preguntas sobre el precio del alquiler/ })).toHaveAttribute('href', '/preguntas');
	});
});
