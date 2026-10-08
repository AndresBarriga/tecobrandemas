import { expect, test } from '@playwright/test';
import { abrir, comprobar, esperarAnimacion, sinCompartirNativo } from './ayudas';

async function parteAlta(page: import('@playwright/test').Page): Promise<number> {
	await abrir(page);
	await comprobar(page, { precio: '2500', superficie: '90' });
	const aria = (await page.locator('.barra[role="img"]').first().getAttribute('aria-label')) ?? '';
	return Number(aria.match(/Parte alta de lo que pagan los contratos de aquí, ([\d.]+)/)![1]!.replace('.', ''));
}

test.describe('aviso de posible error al teclear', () => {
	test('más de 3 veces la parte alta: pide confirmar y, sin confirmar, no hay resultado ni tarjeta', async ({ page }) => {
		await sinCompartirNativo(page);
		const sup = await parteAlta(page);

		await abrir(page);
		await comprobar(page, { precio: String(Math.round(sup * 3.5)), superficie: '90' });
		await expect(page.getByRole('heading', { name: '¿Seguro? Es más de 3 veces la parte alta de lo habitual aquí' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Sí, es correcto' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Corregir' })).toBeVisible();
		// Nada de resultado, tarjeta ni botón de compartir
		await expect(page.getByRole('group', { name: 'Compartir el resultado' })).toHaveCount(0);
		await expect(page.getByLabel('Vista previa de la tarjeta para compartir')).toHaveCount(0);
		await page.screenshot({ path: `e2e/capturas/${test.info().project.name}/35-confirmar-precio.png` });

		// Corregir devuelve al formulario con el foco en el precio
		await page.getByRole('button', { name: 'Corregir' }).click();
		await expect(page.locator('#precio')).toBeFocused();

		// Confirmar muestra el resultado (el evento confirma_precio se comprueba en e2e/analitica.spec.ts)
		await page.fill('#precio', String(Math.round(sup * 3.5)));
		await page.locator('form').getByRole('button', { name: /^Comprobar (el precio|otro anuncio)$/ }).click();
		await page.getByRole('button', { name: 'Sí, es correcto' }).click();
		await expect(page.getByRole('group', { name: 'Compartir el resultado' })).toBeVisible();
		await esperarAnimacion(page);
	});

	test('3 veces la parte alta o menos: sin aviso (el borde exacto, en los tests unitarios)', async ({ page }) => {
		await sinCompartirNativo(page);
		const sup = await parteAlta(page);
		await abrir(page);
		await comprobar(page, { precio: String(Math.floor(sup * 3) - 3), superficie: '90' });
		await expect(page.getByRole('group', { name: 'Compartir el resultado' })).toBeVisible();
		await expect(page.getByText('¿Seguro?')).toHaveCount(0);
	});
});
