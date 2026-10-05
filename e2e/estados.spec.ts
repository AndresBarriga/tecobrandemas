/**
 * Cada pantalla y cada estado de la interfaz, con su captura por tamaño (390, 360 y 1280 px).
 * Las capturas van a e2e/capturas/<proyecto>/ y se comparan a mano con docs/design.
 * Las referencias salen del motor con los datos reales: las cifras de aquí son solo entradas.
 */
import { type Page, expect, test } from '@playwright/test';
import { BERRO, abrir, comprobar, esperarAnimacion, rellenar } from './ayudas';

const captura = (page: Page, nombre: string) =>
	page.screenshot({ path: `e2e/capturas/${test.info().project.name}/${nombre}.png`, fullPage: true });

test('01-inicio', async ({ page }) => {
	await abrir(page);
	await expect(page.getByRole('heading', { level: 1 })).toContainText('El anuncio pide.');
	await captura(page, '01-inicio');
});

test.describe('niveles', () => {
	const niveles: [string, string, string, RegExp][] = [
		['02-nivel-a-dentro', '1700', 'Dentro de la referencia', /PARTE (BAJA|MEDIA|ALTA)/i],
		['03-nivel-b-explicable', '2100', 'Por encima, explicable si es excelente', /sobre la parte alta/i],
		['04-nivel-c-por-encima', '2500', 'Por encima del techo para un piso excelente', /\+\d+(,\d)? %/],
		['05-nivel-c-extremo', '4000', 'Por encima del techo para un piso excelente', /Casi el doble/]
	];
	for (const [nombre, precio, etiqueta, texto] of niveles) {
		test(nombre, async ({ page }) => {
			await abrir(page);
			await comprobar(page, { precio, superficie: '90' });
			await expect(page.getByText(etiqueta, { exact: true }).first()).toBeVisible();
			await expect(page.locator('main')).toContainText(texto);
			await esperarAnimacion(page);
			await captura(page, nombre);
		});
	}

	test('06-horquilla: calle sin número', async ({ page }) => {
		await abrir(page);
		await comprobar(page, { modo: 'calle', direccion: 'Calle Sabadell', precio: '1400', superficie: '58' });
		await expect(page.getByText('Ubicación aproximada.')).toBeVisible();
		await expect(page.locator('main')).toContainText(/entre\s*\+\d+/);
		await expect(page.getByRole('button', { name: 'Añadir el número del portal' })).toBeVisible();
		await esperarAnimacion(page);
		await captura(page, '06-horquilla');
	});

	test('el contador del barrio no sale sin dato real', async ({ page }) => {
		await abrir(page);
		await comprobar(page, { precio: '2500', superficie: '90' });
		await expect(page.getByText('Por encima del techo')).toBeVisible();
		await expect(page.locator('main')).not.toContainText('personas han comprobado');
		});
});

test.describe('sin dato', () => {
	const casos = [
		['07-sin-dato-menos-de-30', { precio: '950', superficie: '26' }, /MENOS DE 30/i],
		['08-sin-dato-mas-de-150', { precio: '4500', superficie: '180' }, /MÁS DE 150/i],
		['09-sin-dato-obra-nueva', { precio: '1900', superficie: '85', obraNueva: true }, /OBRA NUEVA/i],
		['10-sin-dato-casa', { precio: '3000', superficie: '120', tipo: 'casa' as const }, /CASA UNIFAMILIAR/i],
		['11-sin-dato-temporal', { precio: '1800', superficie: '60', largaDuracion: false }, /ALQUILER TEMPORAL/i],
		['12-sin-dato-pocos-datos', { direccion: 'Calle Doctor Esquerdo 177', precio: '1400', superficie: '58' }, /POCOS DATOS/i],
		['13-sin-dato-sin-seccion', { direccion: 'Calle Granaderos 23', precio: '1400', superficie: '58' }, /SIN DATOS AQUÍ/i]
	] as const;
	for (const [nombre, piso, titular] of casos) {
		test(nombre, async ({ page }) => {
			await abrir(page);
			await comprobar(page, piso);
			await expect(page.getByText('Sin referencia para este caso')).toBeVisible();
			// Sin lugar, el titular es el h1 de la pantalla
			await expect(page.getByRole('heading').filter({ hasText: titular })).toBeVisible();
			const cuerpo = await page.locator('main').innerText();
			expect(cuerpo).not.toMatch(/\d\s?%/); // nunca lleva porcentaje
			await expect(page.getByRole('link', { name: /Consultar el sistema oficial/ })).toHaveAttribute('href', 'https://serpavi.mivau.gob.es');
			await captura(page, nombre);
		});
	}

	test('14-sin-dato-habitacion', async ({ page }) => {
		await abrir(page);
		await page.getByRole('button', { name: '¿Es una habitación?' }).click();
		await expect(page.getByRole('heading', { level: 2, name: /Una habitación/i })).toBeVisible();
		await captura(page, '14-sin-dato-habitacion');
	});
});

test.describe('errores', () => {
	test('15-direccion-no-encontrada con sugerencia y salidas', async ({ page }) => {
		await abrir(page);
		await comprobar(page, { direccion: 'Calle del Berro Nuevo 14', precio: '2200', superficie: '90' });
		await expect(page.getByText('No encontramos esa dirección en Madrid.')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Calle Fuente del Berro' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Solo la calle' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'En el mapa' })).toBeVisible();
		await captura(page, '15-direccion-no-encontrada');
		// La sugerencia conserva el número y completa la comprobación
		await page.getByRole('button', { name: 'Calle Fuente del Berro' }).click();
		await expect(page.getByText('Por encima')).toBeVisible();
	});

	test('16-calle-demasiado-larga pide el número o el mapa', async ({ page }) => {
		await abrir(page);
		await comprobar(page, { modo: 'calle', direccion: 'Calle de Alcalá', precio: '1400', superficie: '58' });
		await expect(page.getByText(/cruza \d+ zonas con referencias distintas/)).toBeVisible();
		await captura(page, '16-calle-larga');
	});

	test('17-sin-conexion conserva lo escrito y permite reintentar', async ({ page }) => {
		await abrir(page);
		await page.route('**/api/geocode', (r) => r.abort());
		await comprobar(page, { precio: '2200', superficie: '90' });
		await expect(page.getByRole('heading', { level: 1, name: /Sin conexión/i })).toBeVisible();
		await expect(page.getByText('Tus datos siguen aquí')).toBeVisible();
		await expect(page.getByText(BERRO)).toBeVisible();
		await captura(page, '17-sin-conexion');
		await page.unroute('**/api/geocode');
		await page.getByRole('button', { name: 'Reintentar' }).click();
		await expect(page.getByText('Por encima')).toBeVisible();
	});

	test('18-validacion con mensajes en ciruela', async ({ page }) => {
		await abrir(page);
		await page.fill('#precio', 'abc');
		await page.fill('#superficie', '3');
		await page.locator('#direccion').focus();
		await expect(page.getByText(/Escribe el precio al mes/)).toBeVisible();
		await expect(page.getByText(/entre 10 y 500/)).toBeVisible();
		await captura(page, '18-validacion');
	});
});

test.describe('otras pantallas', () => {
	test('19-negociar con el dato: copia el texto sin enviar nada', async ({ page, context }) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		await abrir(page);
		const posts: string[] = [];
		page.on('request', (r) => r.method() === 'POST' && !r.url().endsWith('/api/evento') && posts.push(new URL(r.url()).pathname));
		await comprobar(page, { precio: '2500', superficie: '90' });
		await page.getByRole('button', { name: /Negociar con el dato/ }).click();
		await expect(page.getByRole('heading', { level: 1, name: /Negociar con el dato/i })).toBeVisible();
		await expect(page.getByLabel(/Tu mensaje/)).toHaveValue(/2\.500 € al mes/);
		await page.getByRole('radio', { name: 'Tú' }).check();
		await expect(page.getByLabel(/Tu mensaje/)).toHaveValue(/te agradecería/);
		await page.getByRole('radio', { name: 'Usted' }).check();
		await captura(page, '19-negociar');
		await page.getByRole('button', { name: 'Copiar el texto' }).click();
		await expect(page.getByRole('button', { name: 'Texto copiado' })).toBeVisible();
		expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('serpavi.mivau.gob.es');
		expect(posts).toEqual(['/api/geocode']);
	});

	test('20-en el mapa: marca un punto y comprueba sin geocodificar', async ({ page }) => {
		await abrir(page);
		const posts: string[] = [];
		page.on('request', (r) => r.method() === 'POST' && !r.url().endsWith('/api/evento') && posts.push(new URL(r.url()).pathname));
		await page.getByRole('radio', { name: 'En el mapa' }).check();
		const mapa = page.getByLabel(/Mapa de Madrid/);
		await expect(mapa).toBeVisible();
		await page.getByText('Todavía no has marcado').waitFor();
		await page.waitForFunction(() => !document.body.innerText.includes('Cargando el mapa'));
		await page.getByRole('button', { name: 'Acercar' }).click();
		await page.getByRole('button', { name: 'Acercar' }).click();
		await page.getByRole('button', { name: 'Acercar' }).click();
		await mapa.click({ position: { x: 150, y: 150 } });
		await expect(page.getByText(/Punto marcado|fuera del municipio/)).toBeVisible();
		await captura(page, '20-mapa');
		await page.fill('#precio', '2500');
		await page.fill('#superficie', '90');
		await page.getByRole('button', { name: 'Comprobar el precio' }).click();
		await expect(page.locator('main h1, main h2').first()).toBeVisible();
		expect(posts).toEqual([]);
	});

	test('21-historial de la sesión (escritorio)', async ({ page }, info) => {
		test.skip(!info.project.name.startsWith('escritorio'), 'solo en escritorio');
		await abrir(page);
		await comprobar(page, { precio: '1700', superficie: '90' });
		await expect(page.getByText('Dentro de la referencia', { exact: true })).toBeVisible();
		await comprobar(page, { precio: '2500', superficie: '90' });
		await expect(page.getByText('Por encima del techo')).toBeVisible();
		const filas = page.getByRole('button', { name: /Goya/ });
		await expect(filas).toHaveCount(2);
		await captura(page, '21-historial');
		await filas.nth(1).click();
		await expect(page.getByText('Dentro de la referencia', { exact: true })).toBeVisible();
		await expect(page.locator('#precio')).toHaveValue('1.700');
		// Se guarda en sessionStorage, no en localStorage
		expect(await page.evaluate(() => localStorage.length)).toBe(0);
	});
});
