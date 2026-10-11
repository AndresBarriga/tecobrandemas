import { expect, test } from '@playwright/test';

// «¿Dónde me llega?» (/mapa, «Mi presupuesto» con la oferta): barras con número, mapa en tiempo real, móvil con controles fijos
test.skip(({ isMobile }) => !isMobile, 'solo móvil');

const carpeta = () => `e2e/capturas/${test.info().project.name}`;

async function abrirMapa(page: import('@playwright/test').Page, ruta = '/mapa') {
	await page.goto(ruta);
	await page.locator('[data-listo=true]').waitFor();
	// El mapa carga ya pintado: con los valores iniciales hay frase de resumen sin tocar nada
	await expect(page.locator('.resumen-cab')).toContainText(/\([\d.]{3,} de [\d.]{3,}\)/, { timeout: 30_000 });
}

test('«¿Dónde me llega?» es la vista por defecto, sin la opción de contratos, con las barras en sus valores iniciales', async ({ page }) => {
	await abrirMapa(page);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('¿Dónde me llega?');
	const pestanas = page.locator('.conmutador .seg label');
	await expect(pestanas).toHaveText(['Mi presupuesto', 'Referencia', 'Evolución']);
	await expect(page.locator('.conmutador .seg').first().locator('label.activo')).toHaveText('Mi presupuesto');
	// «Mi presupuesto» ya no tiene selector Contratos | Oferta
	await expect(page.getByRole('radiogroup', { name: 'Fuente' })).toHaveCount(0);
	await expect(page.locator('#presupuesto')).toHaveValue('1.200');
	await expect(page.locator('#metros')).toHaveValue('60');
	await expect(page.getByRole('slider', { name: 'Tu presupuesto al mes' })).toHaveValue('1200');
	await expect(page.getByRole('slider', { name: 'Metros del piso' })).toHaveValue('60');
	await expect(page.getByText(/Escribe tu presupuesto/)).toHaveCount(0);
	await page.screenshot({ path: `${carpeta()}/mapa-donde-me-llega.png` });
});

test('mover la barra o escribir el número: se sincronizan, se ajustan al rango y el mapa se recolorea sin peticiones', async ({ page }) => {
	await abrirMapa(page);
	const peticiones: string[] = [];
	page.on('request', (r) => ['fetch', 'xhr'].includes(r.resourceType()) && peticiones.push(r.url()));
	const resumen = page.locator('.resumen-cab');
	const antes = await resumen.innerText();

	// La barra mueve el número
	await page.getByRole('slider', { name: 'Tu presupuesto al mes' }).fill('2500');
	await expect(page.locator('#presupuesto')).toHaveValue('2.500');
	await expect(resumen).not.toHaveText(antes);
	const conMucho = await resumen.innerText();

	// El número mueve la barra; fuera de rango, al límite
	await page.locator('#presupuesto').fill('99999');
	await page.locator('#presupuesto').blur();
	await expect(page.locator('#presupuesto')).toHaveValue('3.000');
	await expect(page.getByRole('slider', { name: 'Tu presupuesto al mes' })).toHaveValue('3000');
	await page.locator('#presupuesto').fill('10');
	await page.locator('#presupuesto').blur();
	await expect(page.locator('#presupuesto')).toHaveValue('500');
	await page.locator('#metros').fill('400');
	await page.locator('#metros').blur();
	await expect(page.locator('#metros')).toHaveValue('150');
	await page.locator('#metros').fill('5');
	await page.locator('#metros').blur();
	await expect(page.locator('#metros')).toHaveValue('30');
	await expect(page.getByRole('slider', { name: 'Metros del piso' })).toHaveValue('30');

	// Más presupuesto, más zonas a las que llega
	await page.locator('#metros').fill('60');
	await page.locator('#presupuesto').fill('3000');
	await expect(resumen).not.toHaveText(conMucho === antes ? 'x' : antes);
	expect(peticiones).toEqual([]);
});

test('en móvil el mapa se ve mientras arrastras: controles fijos sobre el mapa y la hoja cerrada', async ({ page }) => {
	await abrirMapa(page);
	const vista = page.viewportSize()!;
	const barra = page.getByRole('slider', { name: 'Tu presupuesto al mes' });
	const cuadro = await page.locator('.controles-fijos').boundingBox();
	const hoja = await page.locator('.hoja-arr').boundingBox();
	expect(cuadro!.y + cuadro!.height).toBeLessThan(vista.height * 0.4);
	expect(hoja!.y).toBeGreaterThan(vista.height * 0.65);
	// Aunque la hoja esté abierta, al empezar a arrastrar se cierra
	await page.getByRole('button', { name: 'Cambiar la altura del panel' }).click();
	await expect.poll(async () => (await page.locator('.hoja-arr').boundingBox())!.y).toBeLessThan(vista.height * 0.6);
	const b = (await barra.boundingBox())!;
	await page.mouse.move(b.x + b.width * 0.2, b.y + b.height / 2);
	await page.mouse.down();
	await expect.poll(async () => (await page.locator('.hoja-arr').boundingBox())!.y).toBeGreaterThan(vista.height * 0.65);
	await page.mouse.move(b.x + b.width * 0.8, b.y + b.height / 2, { steps: 6 });
	await page.mouse.up();
	await expect(page.locator('.mapa svg').first()).toBeVisible();
	await page.screenshot({ path: `${carpeta()}/mapa-donde-me-llega-arrastrando.png` });
});

test('un enlace antiguo con contratos en «Mi presupuesto» abre la oferta; los metros de la URL se ajustan al rango', async ({ page }) => {
	await abrirMapa(page, '/mapa?capa=presupuesto&fuente=contratos&m2=9999');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('¿Dónde me llega?');
	await expect(page.getByRole('radiogroup', { name: 'Fuente' })).toHaveCount(0);
	await expect(page.locator('#metros')).toHaveValue('60');
	await page.goto('/mapa?capa=presupuesto&m2=85');
	await page.locator('[data-listo=true]').waitFor();
	await expect(page.locator('#metros')).toHaveValue('85');
	await page.locator('.conmutador .seg label', { hasText: 'Referencia' }).click();
	await expect(page.getByRole('radiogroup', { name: 'Fuente' })).toBeVisible();
});
