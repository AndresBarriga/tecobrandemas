import { expect, test } from '@playwright/test';

test.describe('/mapa indexable', () => {
	test('sin JavaScript el HTML ya lleva el H1 y el texto; canonical sin parámetros', async ({ browser }) => {
		const ctx = await browser.newContext({ javaScriptEnabled: false });
		const page = await ctx.newPage();
		await page.goto('/mapa?capa=referencia&m2=70&barrio=079');
		await expect(page.locator('h1')).toHaveCount(1);
		await expect(page.locator('h1')).toHaveText(/Mapa del índice de referencia del alquiler en Madrid/i);
		for (const h2 of ['Cómo leer el mapa', 'De dónde salen los datos', 'Qué no muestra', 'Preguntas frecuentes']) await expect(page.getByRole('heading', { level: 2, name: h2 })).toHaveCount(1);
		await expect(page.getByRole('link', { name: 'Comparar mi alquiler' })).toHaveAttribute('href', '/?utm_source=mapa');
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https?:\/\/[^?#]+\/mapa$/);
		await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
		expect(await page.title()).toBe('Mapa del índice de referencia del alquiler en Madrid · A su precio');
		const tipos = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t)['@type']);
		expect(tipos).toEqual(['WebPage', 'FAQPage', 'BreadcrumbList']);
		await ctx.close();
	});

	test('con JavaScript el texto sigue siendo uno solo, en escritorio y en móvil, y el canonical no cambia', async ({ page }) => {
		await page.goto('/mapa?capa=evolucion&m2=70');
		await page.locator('[data-listo=true]').waitFor();
		await expect(page.locator('article.seo')).toHaveCount(1);
		await expect(page.getByRole('heading', { level: 2, name: 'Qué no muestra' })).toHaveCount(1);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https?:\/\/[^?#]+\/mapa$/);
	});
});
