import type { Page } from '@playwright/test';

export const NB = ' ';

export interface Piso {
	direccion?: string;
	precio: string;
	superficie: string;
	modo?: 'direccion' | 'calle';
	obraNueva?: boolean;
	largaDuracion?: boolean;
	tipo?: 'piso' | 'habitacion' | 'casa';
	/** «Ya vivo aquí»: fecha de firma (o «hace menos de un año») y renta al firmar */
	vivo?: { mes?: number; ano?: number; reciente?: boolean; rentaFirma?: string };
}

/** Un piso de Madrid con dato en su sección (la referencia sale de data/processed, no está escrita aquí) */
export const BERRO = 'Calle de Fuente del Berro 14';

/** Abre la portada y espera a que esté lista para escribir */
export async function abrir(page: Page, ruta = '/') {
	await page.goto(ruta);
	await page.locator('[data-listo=true]').waitFor();
}

export async function rellenar(page: Page, p: Piso) {
	if (p.vivo) await page.getByRole('radio', { name: 'Ya vivo aquí' }).check();
	if (p.modo === 'calle') await page.getByRole('radio', { name: 'Solo calle' }).check();
	if (p.modo === 'direccion') await page.getByRole('radio', { name: 'Dirección', exact: true }).check();
	const tipo = page.getByRole('radiogroup', { name: 'Tipo de vivienda' });
	if (p.tipo === 'casa') await tipo.getByRole('radio', { name: 'Casa' }).check();
	if (p.tipo === 'habitacion') await tipo.getByRole('radio', { name: 'Habitación' }).check();
	await page.fill('#direccion', p.direccion ?? BERRO);
	await page.fill('#precio', p.precio);
	if (p.tipo !== 'habitacion') await page.fill('#superficie', p.superficie);
	else await page.getByRole('radio', { name: 'No lo sé' }).check();
	if (p.vivo) {
		if (p.vivo.reciente) await page.getByRole('checkbox', { name: 'Hace menos de un año' }).check();
		else if (p.vivo.ano) {
			await page.selectOption('#firma-mes', String(p.vivo.mes ?? 1));
			await page.selectOption('#firma-ano', String(p.vivo.ano));
		}
		if (p.vivo.rentaFirma) await page.fill('#renta-firma', p.vivo.rentaFirma);
	}
	// Obra nueva y larga duración viven en el resumen plegado
	if (p.obraNueva || p.largaDuracion === false) await page.getByRole('button', { name: 'cambiar', exact: true }).click();
	if (p.obraNueva) await page.getByRole('radiogroup', { name: /obra nueva/ }).getByRole('radio', { name: 'Sí' }).check();
	if (p.largaDuracion === false) await page.getByRole('radiogroup', { name: /larga duración/ }).getByRole('radio', { name: 'No' }).check();
}

export async function comprobar(page: Page, p: Piso) {
	await rellenar(page, p);
	await page.locator('form').getByRole('button', { name: /^(Comprobar (el precio|otro piso|mi alquiler|otro alquiler)|Comparar (mi|la) habitación)$/ }).click();
}

/** Espera a que el punto de la barra termine de deslizarse */
export const esperarAnimacion = (page: Page) => page.waitForTimeout(1300);

/** Fuerza el modo de escritorio (cuatro canales): sin hoja nativa de compartir, aunque el navegador la tenga */
export const sinCompartirNativo = (page: Page) =>
	page.addInitScript(() => Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }));

/** Simula la hoja nativa de un móvil y guarda lo que se le pasa en `window.__compartido` */
export const conCompartirNativo = (page: Page) =>
	page.addInitScript(() => {
		Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
		Object.defineProperty(navigator, 'share', {
			configurable: true,
			value: async (datos: { files?: File[]; url?: string; title?: string; text?: string }) => {
				(window as unknown as { __compartido: unknown }).__compartido = {
					ficheros: (datos.files ?? []).map((f) => ({ nombre: f.name, tipo: f.type, bytes: f.size })),
					url: datos.url ?? null,
					texto: datos.text ?? null
				};
			}
		});
	});
