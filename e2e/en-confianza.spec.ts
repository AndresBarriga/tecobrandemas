import { expect, test } from '@playwright/test';

const EN = ['/en', '/en/what-is-the-rent-reference-index-in-spain', '/en/how-to-check-if-a-rent-is-too-high-in-madrid'];

test.describe('inglés', () => {
	for (const ruta of EN) {
		test(`${ruta}: lang="en", un H1, canonical, hreflang, JSON-LD y og:image`, async ({ page }) => {
			const r = await page.goto(ruta);
			expect(r!.status()).toBe(200);
			await expect(page.locator('html')).toHaveAttribute('lang', 'en');
			await expect(page.locator('h1')).toHaveCount(1);
			expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toMatch(new RegExp(`${ruta}$`));
			const alt = await page.locator('link[rel="alternate"]').evaluateAll((l) => l.map((x) => [x.getAttribute('hreflang'), x.getAttribute('href')]));
			expect(alt.map((a) => a[0])).toEqual(['es', 'en', 'x-default']);
			expect(alt[1]![1]).toBe(`https://asuprecio.com${ruta}`);
			const tipos = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t)['@type']);
			expect(tipos).toEqual(['WebPage', 'FAQPage', 'BreadcrumbList']);
			expect(await page.locator('meta[property="og:image"]').getAttribute('content')).toMatch(/^https:\/\/asuprecio\.com\/og\/.+\.png$/);
			await expect(page.getByRole('link', { name: 'Check a rent (in Spanish, 1 minute)' })).toHaveAttribute('href', '/?utm_source=en');
			await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
		});
	}

	test('la imagen de vista previa existe y el enlace «Español» lleva a la página equivalente', async ({ page, request }) => {
		await page.goto('/en/what-is-the-rent-reference-index-in-spain');
		const og = new URL(await page.locator('meta[property="og:image"]').getAttribute('content') as string).pathname;
		expect((await request.get(og)).status()).toBe(200);
		await expect(page.locator('header .idioma')).toHaveAttribute('href', '/preguntas/que-es-el-indice-de-referencia-del-alquiler');
	});

	test('en español: hreflang hacia /en, enlace «English» en el pie, lang="es"', async ({ page }) => {
		await page.goto('/preguntas/como-saber-si-un-alquiler-es-caro-en-madrid');
		await expect(page.locator('html')).toHaveAttribute('lang', 'es');
		await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute('href', 'https://asuprecio.com/en/how-to-check-if-a-rent-is-too-high-in-madrid');
		await expect(page.locator('footer a[hreflang="en"]')).toHaveAttribute('href', '/en/how-to-check-if-a-rent-is-too-high-in-madrid');
		await page.goto('/mapa');
		await expect(page.locator('link[rel="alternate"]')).toHaveCount(0);
		await expect(page.locator('footer a[hreflang="en"]').first()).toHaveAttribute('href', '/en');
	});
});

test.describe('confianza', () => {
	test('/correcciones: texto, correo y lista vacía; enlace desde el pie', async ({ page }) => {
		await page.goto('/');
		await page.locator('footer a[href="/correcciones"]').first().click();
		await expect(page).toHaveURL(/\/correcciones$/);
		await expect(page.locator('h1')).toHaveText('Correcciones');
		await expect(page.getByText('Aquí registramos lo que corregimos.')).toBeVisible();
		await expect(page.getByRole('link', { name: 'hola@asuprecio.com' })).toHaveAttribute('href', 'mailto:hola@asuprecio.com');
		await expect(page.getByText('fecha · página · qué cambió')).toBeVisible();
	});

	test('la nota de los datos de 2024 en la portada y en «Cómo calculamos»; aviso de IA', async ({ page }) => {
		const nota = 'Datos de rentas declaradas en 2024 (SERPAVI); los alquileres han subido desde entonces.';
		await page.goto('/');
		await expect(page.getByText(nota, { exact: true }).first()).toBeVisible();
		await page.goto('/como-calculamos');
		await expect(page.getByText(nota, { exact: true }).first()).toBeVisible();
		await expect(page.getByText('Los textos de esta web se redactan con ayuda de herramientas de IA y se revisan a mano.')).toBeVisible();
	});
});
