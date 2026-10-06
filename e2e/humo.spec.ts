/**
 * Prueba de humo contra un despliegue real:
 *   BASE_URL=https://a-su-precio.tiene-sentido.workers.dev npx playwright test e2e/humo.spec.ts --project=movil-390
 * No ensucia las métricas: se bloquea /api/evento y no se registra ningún análisis ni aportación.
 * Es de solo lectura: no escribe nada. La tarjeta de la tercera prueba es una fija (`pruebahumo`),
 * creada una vez a mano, marcada como de prueba y excluida de las métricas.
 * Las cifras exactas cambian con el IPC: se comprueba el nivel y la forma, no los números.
 */
import { expect, test, type Page } from '@playwright/test';
import { abrir, comprobar } from './ayudas';

const bloquearEventos = (page: Page) => page.route('**/api/evento', (r) => r.fulfill({ status: 204 }));

test.describe('humo', () => {
	test('1. calcular: Fuente del Berro da un resultado de nivel c con la barra y sin pedir nada a terceros', async ({ page, baseURL }) => {
		await bloquearEventos(page);
		const ajenas: string[] = [];
		page.on('request', (r) => {
			const u = new URL(r.url());
			if (!['data:', 'blob:'].includes(u.protocol) && u.origin !== new URL(baseURL!).origin) ajenas.push(r.url());
		});
		await abrir(page);
		await comprobar(page, { precio: '2500', superficie: '90' });
		await expect(page.getByText('Por encima del techo para un piso excelente')).toBeVisible();
		await expect(page.getByText(/^\+\d+\s%$/).filter({ visible: true }).first()).toBeVisible();
		await expect(page.getByRole('img', { name: /Tu anuncio, .*Parte alta de la referencia/ })).toBeVisible();
		await expect(page.getByText(/Goya, Salamanca/)).toBeVisible();
		await expect(page.getByRole('checkbox', { name: /Suma este piso/ })).not.toBeChecked();
		expect(ajenas).toEqual([]);
	});

	test('2. casos y páginas: sin datos, calle que no existe, metodología, aportaciones, contadores y cabeceras', async ({ page, request }) => {
		await bloquearEventos(page);
		await abrir(page);
		await comprobar(page, { direccion: 'Calle Granaderos 23', precio: '1400', superficie: '58' });
		await expect(page.getByRole('heading', { name: 'Sin datos aquí' })).toBeVisible();

		await abrir(page);
		await comprobar(page, { direccion: 'Calle del Berro Nuevo 14', precio: '1400', superficie: '58' });
		await expect(page.getByText(/No encontramos esa dirección/)).toBeVisible();

		for (const ruta of ['/como-calculamos', '/cuanto-pagas']) {
			await page.goto(ruta);
			await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		}
		await page.goto('/como-calculamos');
		await expect(page.getByText(/factor 1,\d{3}/)).toBeVisible();

		const contadores = await request.get('/api/contadores');
		expect(contadores.status()).toBe(200);
		expect(await contadores.json()).toHaveProperty('total');

		const mapa = await request.get('/mapa/madrid.pmtiles', { headers: { range: 'bytes=0-15' } });
		expect(mapa.status()).toBe(206);
		expect((await mapa.body()).subarray(0, 7).toString()).toBe('PMTiles');

		// El código del Worker no se publica como fichero
		expect((await request.get('/_worker.js')).status()).toBe(404);
		expect((await request.get('/t/zzzzzzzzzz')).status()).toBe(404);
	});

	test('3. tarjeta de prueba fija: /t/:id la enseña con vista previa y la imagen OG sale', async ({ page, request, baseURL }) => {
		// Solo lectura: la tarjeta se creó una vez a mano en producción (ver docs/operacion.md); en local no existe
		test.skip(!process.env.BASE_URL, 'Solo contra un despliegue: la tarjeta pruebahumo vive en producción');
		const id = 'pruebahumo';
		await page.goto(`/t/${id}`);
		await expect(page.getByText(/Alguien ha comprobado un piso en/)).toBeVisible();
		expect(await page.locator('meta[property="og:image"]').getAttribute('content')).toBe(`${baseURL}/t/${id}/og.jpg`);
		expect(await page.locator('meta[property="og:title"]').getAttribute('content')).toBeTruthy();
		const og = await request.get(`/t/${id}/og.jpg`);
		expect(og.status()).toBe(200);
		expect(og.headers()['content-type']).toBe('image/jpeg');
	});
});
