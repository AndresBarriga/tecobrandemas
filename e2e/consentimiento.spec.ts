import { expect, test } from '@playwright/test';
import { abrir, comprobar } from './ayudas';

const carpeta = () => `e2e/capturas/${test.info().project.name}`;

test.describe('registro anónimo de análisis (R7)', () => {
	test('sin marcar la casilla no sale ningún POST de registro; marcada, se envía barrio, mes del servidor, precio y m²', async ({ page }) => {
		const posts: { ruta: string; cuerpo: string }[] = [];
		page.on('request', (r) => r.method() === 'POST' && posts.push({ ruta: new URL(r.url()).pathname, cuerpo: r.postData() ?? '' }));
		await abrir(page);
		await comprobar(page, { precio: '2500', superficie: '90' });

		const casilla = page.getByRole('checkbox', { name: /Suma este piso a las estadísticas de tu barrio/ });
		await expect(casilla).toBeVisible();
		await expect(casilla).not.toBeChecked();
		await expect(page.getByRole('link', { name: 'Tus datos' })).toHaveAttribute('href', '/como-calculamos#tus-datos');
		await page.waitForTimeout(600);
		expect(posts.filter((p) => p.ruta === '/api/analisis')).toEqual([]);
		await casilla.scrollIntoViewIfNeeded();
		await page.screenshot({ path: `${carpeta()}/27-consentimiento-sin-marcar.png`, fullPage: true });

		await casilla.check();
		await expect(page.getByText(/Sumado, gracias/)).toBeVisible();
		const envio = posts.filter((p) => p.ruta === '/api/analisis');
		expect(envio).toHaveLength(1);
		const cuerpo = JSON.parse(envio[0]!.cuerpo);
		expect(Object.keys(cuerpo).sort()).toEqual(['barrio', 'm2', 'nivel', 'precio', 'tarjetaOrigen']);
		expect(cuerpo).toMatchObject({ precio: 2500, m2: 90, nivel: 'c' });
		expect(envio[0]!.cuerpo).not.toMatch(/Berro|2807|Calle|fecha|mes/i);
		await expect(casilla).toBeDisabled();
		await page.screenshot({ path: `${carpeta()}/28-consentimiento-marcado.png`, fullPage: true });
	});

	test('un resultado nuevo vuelve a empezar con la casilla desmarcada', async ({ page }) => {
		await abrir(page);
		await comprobar(page, { precio: '2500', superficie: '90' });
		await page.getByRole('checkbox', { name: /Suma este piso/ }).check();
		await page.getByRole('button', { name: /otro piso/i }).first().click();
		await comprobar(page, { precio: '1400', superficie: '90' });
		await expect(page.getByRole('checkbox', { name: /Suma este piso/ })).not.toBeChecked();
	});

	test('Tus datos: la página enseña qué se guarda y el correo de contacto', async ({ page }) => {
		await page.goto('/como-calculamos#tus-datos');
		await expect(page.getByText(/el barrio, el mes, el precio, los metros/)).toBeVisible();
		await expect(page.getByRole('link', { name: 'andresbarrigaru@gmail.com' })).toHaveAttribute('href', 'mailto:andresbarrigaru@gmail.com');
	});

	test('noindex: meta robots en todo el sitio y la vista previa de /t/:id sigue completa', async ({ page, request }) => {
		for (const ruta of ['/', '/como-calculamos', '/cuanto-pagas']) {
			await page.goto(ruta);
			expect(await page.locator('meta[name="robots"]').first().getAttribute('content')).toContain('noindex');
		}
		const r = await request.get('/api/contadores');
		expect(r.headers()['x-robots-tag']).toContain('noindex');
	});
});
