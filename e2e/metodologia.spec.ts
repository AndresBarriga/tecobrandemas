import { expect, test } from '@playwright/test';

test('Cómo calculamos: secciones, enlaces y capturas', async ({ page }, info) => {
	await page.goto('/como-calculamos');
	await expect(page.getByRole('heading', { level: 1, name: 'Cómo calculamos' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Quiénes somos' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Financiación' })).toBeVisible();
	await expect(page.getByText(/factor 1,0\d\d/)).toBeVisible();
	await expect(page.locator('main a[href="https://serpavi.mivau.gob.es"]')).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
	await page.screenshot({ path: `e2e/capturas/metodologia-${info.project.name}.png`, fullPage: true });
});
