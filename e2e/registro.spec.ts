import { expect, test } from '@playwright/test';
import { abrir, comprobar } from './ayudas';

const carpeta = () => `e2e/capturas/${test.info().project.name}`;

test.describe('aportaciones y embudo', () => {
	test('24-aportar: sin pulsar «Aportar mi alquiler» no sale ninguna petición con precio', async ({ page }) => {
		const posts: { ruta: string; cuerpo: string }[] = [];
		page.on('request', (r) => r.method() === 'POST' && posts.push({ ruta: new URL(r.url()).pathname, cuerpo: r.postData() ?? '' }));
		await abrir(page);
		await comprobar(page, { precio: '1620', superficie: '90', vivo: { mes: 3, ano: 2023, rentaFirma: '1500' } });
		await expect(page.getByRole('button', { name: 'Aportar mi alquiler' })).toBeVisible();
		await page.waitForTimeout(500);
		// Solo la geocodificación y los eventos: nada de aportación, análisis ni tarjeta
		expect(posts.filter((p) => !['/api/evento', '/api/geocode'].includes(p.ruta))).toEqual([]);
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
		// Los eventos del inquilino van aparte de los de los anuncios
		const eventos = posts.filter((p) => p.ruta === '/api/evento').map((p) => JSON.parse(p.cuerpo).tipo);
		expect(eventos).toEqual(expect.arrayContaining(['vivo_empieza', 'vivo_completa', 'vivo_aporta']));
		expect(eventos).not.toContain('completa');
		await page.screenshot({ path: `${carpeta()}/26-aportacion-enviada.png`, fullPage: true });
	});

	test('validación de «Ya vivo aquí»: la fecha de firma es obligatoria y la renta al firmar, plausible', async ({ page }) => {
		await abrir(page);
		await comprobar(page, { precio: '1620', superficie: '90', vivo: { rentaFirma: '20' } });
		await expect(page.getByText(/Elige el mes y el año de la firma/)).toBeVisible();
		await expect(page.getByText(/Escribe lo que pagabas al mes/)).toBeVisible();
		await page.getByRole('checkbox', { name: 'Hace menos de un año' }).check();
		await page.fill('#renta-firma', '');
		await page.locator('form').getByRole('button', { name: 'Comprobar mi alquiler' }).click();
		await expect(page.getByText('Contrato de hace menos de un año:')).toBeVisible();
	});

	test('el embudo: «¿Te ha servido?» y el id de tarjeta llegan al servidor sin precio', async ({ page }) => {
		const eventos: { tipo: string; tarjeta: string | null }[] = [];
		const cuerpos: string[] = [];
		page.on('request', (r) => {
			if (r.method() === 'POST' && r.url().endsWith('/api/evento')) {
				cuerpos.push(r.postData() ?? '');
				eventos.push(JSON.parse(r.postData() ?? '{}'));
			}
		});
		await abrir(page, '/?t=abcdefghij');
		await comprobar(page, { precio: '2500', superficie: '90' });
		await expect(page.getByText('Por encima del techo')).toBeVisible();
		await page.getByRole('button', { name: 'Sí', exact: true }).last().click();
		await expect.poll(() => eventos.map((e) => e.tipo)).toEqual(expect.arrayContaining(['llegada', 'empieza', 'completa', 'desde_tarjeta', 'servido_si']));
		expect(eventos.find((e) => e.tipo === 'desde_tarjeta')?.tarjeta).toBe('abcdefghij');
		for (const c of cuerpos) expect(c).not.toMatch(/2500|2\.500|Berro/);
		// Segundo análisis dentro de la visita
		await page.getByRole('button', { name: /Comparar con otro piso/ }).click();
		await comprobar(page, { precio: '2600', superficie: '90' });
		await expect.poll(() => eventos.map((e) => e.tipo)).toContain('segundo');
	});

	test('los recuentos del servidor llegan a la portada', async ({ page }) => {
		await abrir(page);
		const r = await page.request.get('/api/contadores');
		const { total } = await r.json();
		expect(typeof total).toBe('number');
		await expect(page.getByRole('region', { name: /Qué hace/ })).toContainText(total === 0 ? 'Sé de los primeros' : 'pisos comprobados');
	});
});
