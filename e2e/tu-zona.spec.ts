import { expect, test } from '@playwright/test';
import { abrir, comprobar } from './ayudas';

const carpeta = () => `e2e/capturas/${test.info().project.name}`;

test.describe('Tu zona', () => {
	test('nivel c: mapa, leyenda con muesca, lista numerada y selección en el mapa', async ({ page }) => {
		const posts: string[] = [];
		page.on('request', (r) => r.method() === 'POST' && posts.push(new URL(r.url()).pathname));
		await abrir(page);
		await comprobar(page, { precio: '2500', superficie: '90' });
		const zona = page.getByRole('region', { name: 'Tu zona' });
		await expect(zona.getByRole('heading', { level: 2, name: 'Tu zona' })).toBeVisible();
		await expect(zona.getByRole('img', { name: /Mapa de tu zona y las zonas a 1,5 km o menos/ })).toBeVisible({ timeout: 15_000 });
		await expect(zona.getByText(/tu precio: 27,8\s€\/m²/)).toBeVisible();
		await expect(zona.getByText('Parte alta de la referencia, en €/m² al mes')).toBeVisible();
		await expect(zona.getByText('Cortes iguales para toda la ciudad')).toBeVisible();

		const filas = zona.locator('.fila');
		const n = await filas.count();
		if (n > 0) {
			expect(n).toBeLessThanOrEqual(5);
			await expect(zona.getByText('No son pisos disponibles')).toBeVisible();
			await expect(filas.first()).toContainText(/una zona de /);
			await expect(filas.first()).toContainText(/Referencia para 90\sm²: [\d.]+ a [\d.]+\s€ al mes/);
			await expect(filas.first()).toContainText(/Este precio caería en su parte (baja|media|alta)/);
			// Tocar una fila la resalta; un segundo toque la deselecciona
			await filas.first().click();
			await expect(filas.first()).toHaveAttribute('aria-pressed', 'true');
			await filas.first().click();
			await expect(filas.first()).toHaveAttribute('aria-pressed', 'false');
			// Y el marcador del mapa hace lo mismo
			await zona.getByRole('button', { name: /^Zona 1, una zona de/ }).click();
			await expect(filas.first()).toHaveAttribute('aria-pressed', 'true');
		} else {
			await expect(zona.getByText('Zonas cercanas donde la referencia llega a este precio: ninguna')).toBeVisible();
		}
		await expect(zona.getByText(/La renta registrada en esta zona ha (subido|bajado) un \d+\s%/)).toBeVisible();
		await zona.scrollIntoViewIfNeeded();
		await zona.screenshot({ path: `${carpeta()}/31-tu-zona-c.png` });

		// Todo se calcula en el navegador: nada de «Tu zona» sale en peticiones
		expect(posts.filter((p) => p !== '/api/geocode')).toEqual([]);
	});

	test('nivel a: solo el mapa de contexto, sin lista', async ({ page }) => {
		await abrir(page);
		await comprobar(page, { precio: '1000', superficie: '90' });
		const zona = page.getByRole('region', { name: 'Tu zona' });
		await expect(zona.getByRole('img', { name: /Mapa de tu zona/ })).toBeVisible({ timeout: 15_000 });
		await expect(zona.getByText('solo tienes el contexto')).toBeVisible();
		await expect(zona.locator('.fila')).toHaveCount(0);
		await zona.screenshot({ path: `${carpeta()}/32-tu-zona-a.png` });
	});

	test('no hay «Tu zona» en las pantallas sin dato', async ({ page }) => {
		await abrir(page);
		await comprobar(page, { precio: '950', superficie: '26' });
		await expect(page.getByText('Sin referencia para este caso')).toBeVisible();
		await expect(page.getByRole('region', { name: 'Tu zona' })).toHaveCount(0);
	});
});
