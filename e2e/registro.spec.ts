import { expect, test } from '@playwright/test';
import { abrir, comprobar } from './ayudas';

const carpeta = () => `e2e/capturas/${test.info().project.name}`;

test.describe('aportaciones y recuentos', () => {
	test('24-aportar: sin pulsar «Aportar mi alquiler» no sale ninguna petición con precio', async ({ page }) => {
		const posts: { ruta: string; cuerpo: string }[] = [];
		page.on('request', (r) => r.method() === 'POST' && posts.push({ ruta: new URL(r.url()).pathname, cuerpo: r.postData() ?? '' }));
		await abrir(page);
		await comprobar(page, { precio: '1620', superficie: '90', vivo: { mes: 3, ano: 2023, rentaFirma: '1500' } });
		await expect(page.getByRole('button', { name: 'Aportar mi alquiler' })).toBeVisible();
		await page.waitForTimeout(500);
		// Solo la geocodificación: nada de aportación, análisis ni tarjeta
		expect(posts.filter((p) => p.ruta !== '/api/geocode')).toEqual([]);
		await page.screenshot({ path: `${carpeta()}/24-aportar-antes.png`, fullPage: true });
	});

	test('25-aportacion: al pulsar se guarda el barrio, no la calle, con mes de firma y renta al firmar', async ({ page }) => {
		const posts: { ruta: string; cuerpo: string }[] = [];
		page.on('request', (r) => r.method() === 'POST' && posts.push({ ruta: new URL(r.url()).pathname, cuerpo: r.postData() ?? '' }));
		await abrir(page);
		await comprobar(page, { precio: '1620', superficie: '90', vivo: { mes: 3, ano: 2023, rentaFirma: '1500' } });
		await page.getByRole('button', { name: 'Aportar mi alquiler' }).click();
		await expect(page.getByText('Alquiler aportado')).toBeVisible();
		const envio = posts.find((p) => p.ruta === '/api/aportacion')!;
		const cuerpo = JSON.parse(envio.cuerpo);
		expect(Object.keys(cuerpo).sort()).toEqual(['anioContrato', 'barrio', 'firmaMes', 'incluye', 'm2', 'precio', 'rentaFirma']);
		expect(cuerpo).toMatchObject({ precio: 1620, m2: 90, anioContrato: 2023, firmaMes: '2023-03', rentaFirma: 1500, incluye: [] });
		expect(envio.cuerpo).not.toMatch(/Berro|2807|Calle/);
		await page.screenshot({ path: `${carpeta()}/26-aportacion-enviada.png`, fullPage: true });
	});

	test('validación de «Mi alquiler»: la fecha de firma es obligatoria y la renta al firmar, plausible', async ({ page }) => {
		await abrir(page);
		await comprobar(page, { precio: '1620', superficie: '90', vivo: { rentaFirma: '20' } });
		await expect(page.getByText(/Elige el mes y el año de la firma/)).toBeVisible();
		await expect(page.getByText(/Escribe lo que pagabas al mes/)).toBeVisible();
		await page.getByRole('checkbox', { name: 'Hace menos de un año' }).check();
		await page.fill('#renta-firma', '');
		await page.locator('form').getByRole('button', { name: 'Comprobar mi alquiler' }).click();
		await expect(page.getByText('Contrato de hace menos de un año:')).toBeVisible();
	});

	test('un análisis iniciado desde una tarjeta (/?t=ID) llega al registro con ese id, solo con la casilla marcada', async ({ page }) => {
		const analisis: string[] = [];
		page.on('request', (r) => r.method() === 'POST' && r.url().endsWith('/api/analisis') && analisis.push(r.postData() ?? ''));
		await abrir(page, '/?t=abcdefghij');
		await comprobar(page, { precio: '2500', superficie: '90' });
		await expect(page.getByText('Se sale de lo habitual')).toBeVisible();
		expect(analisis).toHaveLength(0);
		await page.getByRole('checkbox', { name: /Suma este piso/ }).check();
		await expect.poll(() => analisis.length).toBe(1);
		expect(JSON.parse(analisis[0]!)).toMatchObject({ tarjetaOrigen: 'abcdefghij' });
	});

	test('los recuentos del servidor son por barrio, y la portada ya no enseña un contador general', async ({ page }) => {
		await abrir(page);
		const r = await page.request.get('/api/contadores');
		expect(Object.keys(await r.json()).sort()).toEqual(['aportacionesBarrio', 'barrio']);
		await expect(page.getByText(/pisos comprobados|Sé de los primeros/)).toHaveCount(0);
	});
});
