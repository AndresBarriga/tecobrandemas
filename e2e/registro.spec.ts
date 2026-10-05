import { expect, test } from '@playwright/test';
import { abrir, comprobar } from './ayudas';

const carpeta = () => `e2e/capturas/${test.info().project.name}`;

test.describe('aportaciones y embudo', () => {
	test('24-cuanto-pagas: sin consentimiento no sale ninguna petición con precio', async ({ page }) => {
		const posts: { ruta: string; cuerpo: string }[] = [];
		page.on('request', (r) => r.method() === 'POST' && posts.push({ ruta: new URL(r.url()).pathname, cuerpo: r.postData() ?? '' }));
		await abrir(page, '/cuanto-pagas');
		await page.fill('#calle', 'Calle de Arturo Soria');
		await page.fill('#renta', '1150');
		await page.fill('#m2', '68');
		await page.fill('#anio', '2023');
		const boton = page.getByRole('button', { name: 'Marca la casilla para enviar' });
		await expect(boton).toBeDisabled();
		await expect(boton).toHaveAttribute('aria-disabled', 'true');
		await boton.click({ force: true }).catch(() => {});
		await page.keyboard.press('Enter');
		await page.waitForTimeout(500);
		expect(posts.filter((p) => p.ruta !== '/api/evento')).toEqual([]);
		await page.screenshot({ path: `${carpeta()}/24-cuanto-pagas.png`, fullPage: true });
	});

	test('25-aportacion: con consentimiento se guarda el barrio, no la calle', async ({ page }) => {
		const posts: { ruta: string; cuerpo: string }[] = [];
		page.on('request', (r) => r.method() === 'POST' && posts.push({ ruta: new URL(r.url()).pathname, cuerpo: r.postData() ?? '' }));
		await abrir(page, '/cuanto-pagas');
		await page.fill('#calle', 'Calle de Fuente del Berro 14');
		await page.fill('#renta', '1150');
		await page.fill('#m2', '68');
		await page.fill('#anio', '2023');
		await page.getByRole('checkbox', { name: 'Gastos de comunidad' }).check();
		await page.getByRole('checkbox', { name: /Acepto que mi aportación/ }).check();
		await page.screenshot({ path: `${carpeta()}/25-aportacion-marcada.png`, fullPage: true });
		await page.getByRole('button', { name: 'Enviar mi aportación' }).click();
		await expect(page.getByRole('heading', { name: 'Gracias, ya cuenta' })).toBeVisible();
		const envio = posts.find((p) => p.ruta === '/api/aportacion')!;
		const cuerpo = JSON.parse(envio.cuerpo);
		expect(Object.keys(cuerpo).sort()).toEqual(['anioContrato', 'barrio', 'incluye', 'm2', 'precio']);
		expect(cuerpo).toMatchObject({ precio: 1150, m2: 68, anioContrato: 2023, incluye: ['comunidad'] });
		expect(envio.cuerpo).not.toMatch(/Berro|2807|Calle/);
		await page.screenshot({ path: `${carpeta()}/26-aportacion-enviada.png`, fullPage: true });
	});

	test('validación de la aportación y calle desconocida', async ({ page }) => {
		await abrir(page, '/cuanto-pagas');
		await page.fill('#calle', 'Calle Zzqxw 3');
		await page.fill('#renta', '1150');
		await page.fill('#m2', '68');
		await page.fill('#anio', '2023');
		await page.getByRole('checkbox', { name: /Acepto que mi aportación/ }).check();
		await page.getByRole('button', { name: 'Enviar mi aportación' }).click();
		await expect(page.getByText(/No encontramos esa calle/)).toBeVisible();
		await page.fill('#calle', 'Calle de Fuente del Berro 14');
		await page.fill('#renta', '20');
		await page.getByRole('button', { name: 'Enviar mi aportación' }).click();
		await expect(page.getByText(/€\/m²/)).toBeVisible();
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
