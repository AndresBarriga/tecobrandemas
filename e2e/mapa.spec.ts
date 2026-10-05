import { expect, test } from '@playwright/test';
import { abrir } from './ayudas';

const carpeta = () => `e2e/capturas/${test.info().project.name}`;

test('mapa base autoalojado: calles de OSM, solo peticiones propias y atribución', async ({ page }) => {
	const externas: string[] = [];
	const rangos: { url: string; estado: number }[] = [];
	const origen = new URL(page.url() === 'about:blank' ? 'http://localhost:5173' : page.url()).origin;
	page.on('request', (r) => {
		const u = new URL(r.url());
		if (!['data:', 'blob:'].includes(u.protocol) && u.origin !== new URL(test.info().project.use.baseURL ?? origin).origin) externas.push(r.url());
	});
	page.on('response', (r) => r.url().includes('madrid.pmtiles') && rangos.push({ url: r.url(), estado: r.status() }));

	await abrir(page);
	await page.getByRole('radio', { name: 'En el mapa' }).check();
	const mapa = page.getByLabel(/Mapa de Madrid/);
	await expect(mapa).toBeVisible();
	await page.waitForFunction(() => !document.body.innerText.includes('Cargando el mapa'));
	await expect(page.getByText('© OpenStreetMap contributors').first()).toBeVisible();

	// Un acercamiento hasta ver calles con nombre alrededor de Goya
	await mapa.hover({ position: { x: 160, y: 200 } });
	for (let i = 0; i < 16; i++) await page.mouse.wheel(0, -300);
	await page.waitForTimeout(2500);
	await mapa.screenshot({ path: `${carpeta()}/29-mapa-base-cerca.png` });

	expect(rangos.length).toBeGreaterThan(0);
	expect(rangos.every((r) => r.estado === 206)).toBe(true);
	expect(externas).toEqual([]);
});
