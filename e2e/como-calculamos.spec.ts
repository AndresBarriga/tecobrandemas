import { expect, test } from '@playwright/test';
import { abrir } from './ayudas';

const carpeta = () => `e2e/capturas/${test.info().project.name}`;

test.describe('Cómo calculamos', () => {
	test('estructura, ejemplo con el motor, índice y enlaces a las pantallas sin dato', async ({ page }) => {
		await page.goto('/como-calculamos');
		await expect(page.getByRole('heading', { level: 1, name: 'Cómo calculamos' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'En 30 segundos' })).toBeVisible();
		await expect(page.locator('#resumen')).toContainText(/\+5,4\s%/);

		// El ejemplo: cuatro barras con su descripción accesible y la misma escala
		const barras = page.locator('#ej [role="img"]');
		await expect(barras).toHaveCount(4);
		await expect(barras.nth(1)).toHaveAttribute('aria-label', /Referencia ajustada, de [\d.]+ a [\d.]+/);
		await expect(page.locator('#ej')).toContainText('Con el ajuste del IPC (×1,054)');

		await expect(page.locator('#dat')).toContainText('Qué guardamos (solo si marcas la casilla)');
		await expect(page.locator('#lim a')).toHaveCount(7);
		await expect(page.getByRole('link', { name: 'andresbarrigaru@gmail.com' })).toHaveAttribute('href', 'mailto:andresbarrigaru@gmail.com');
		await expect(page.getByRole('table', { name: 'Fuentes de datos' })).toBeVisible();
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
		await page.screenshot({ path: `${carpeta()}/30-como-calculamos.png`, fullPage: true });
	});

	test('el índice (escritorio) o el selector (móvil) llevan a la sección', async ({ page }, info) => {
		await abrir(page, '/como-calculamos');
		if (info.project.name === 'escritorio-1280') {
			await page.getByRole('navigation', { name: 'En esta página' }).getByRole('link', { name: 'Fuentes' }).click();
			await expect(page.locator('#fue')).toBeInViewport();
			await expect(page.getByRole('navigation', { name: 'En esta página' }).getByRole('link', { name: 'Fuentes' })).toHaveAttribute('aria-current', 'true');
		} else {
			await page.getByLabel('Ir a una sección de la página').selectOption('fue');
			await expect(page.locator('#fue')).toBeInViewport();
		}
	});

	test('«Ver por qué» abre la pantalla sin dato correspondiente, sin contarla como comprobación', async ({ page }) => {
		const eventos: string[] = [];
		page.on('request', (r) => r.url().includes('/api/evento') && eventos.push(r.postData() ?? ''));
		await page.goto('/como-calculamos');
		await page.locator('#lim').getByRole('link', { name: /Obra nueva/ }).click();
		await page.locator('[data-listo=true]').waitFor();
		await expect(page.getByRole('heading', { name: 'Obra nueva' })).toBeVisible();
		await expect(page.getByRole('link', { name: /Consultar el sistema oficial/ })).toBeVisible();
		expect(eventos.some((e) => e.includes('completa'))).toBe(false);
		await abrir(page, '/?motivo=no_existe');
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	});
});
