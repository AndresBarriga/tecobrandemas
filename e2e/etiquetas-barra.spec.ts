import { writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { abrir, comprobar, esperarAnimacion } from './ayudas';

const carpeta = () => `e2e/capturas/${test.info().project.name}`;

/** Parte alta de la referencia (€/mes) de Fuente del Berro para 90 m², leída de la propia barra */
async function parteAlta(page: Page): Promise<number> {
	await abrir(page);
	await comprobar(page, { precio: '2500', superficie: '90' });
	const aria = (await page.locator('.barra[role="img"]').first().getAttribute('aria-label')) ?? '';
	const m = aria.match(/Parte alta de la referencia, ([\d.]+)/);
	if (!m) throw new Error(`sin parte alta en «${aria}»`);
	return Number(m[1]!.replace('.', ''));
}

interface Caja {
	nombre: string;
	x0: number;
	x1: number;
	y0: number;
	y1: number;
}

async function cajas(page: Page): Promise<{ barra: Caja; etiquetas: Caja[] }> {
	return page.locator('.barra[role="img"]').first().evaluate((el) => {
		const r = el.getBoundingClientRect();
		const c = (e: Element, nombre: string) => {
			const b = e.getBoundingClientRect();
			return { nombre, x0: b.left, x1: b.right, y0: b.top, y1: b.bottom };
		};
		return {
			barra: c(el, 'barra'),
			etiquetas: [...el.querySelectorAll('.et')].map((e) => c(e, (e.textContent ?? '').trim().replace(/\s+/g, ' ')))
		};
	});
}

// Brechas de +100 %, +240 % y +400 % sobre la parte alta (ratio 2, 3,4 y 5)
for (const [pct, ratio] of [[100, 2], [240, 3.4], [400, 5]] as const) {
	test(`etiquetas de la barra enteras y sin solaparse con +${pct} %`, async ({ page }) => {
		const sup = await parteAlta(page);
		const precio = Math.round(sup * ratio) + 1;
		await abrir(page);
		await comprobar(page, { precio: String(precio), superficie: '90' });
		// Por encima de 3 veces la parte alta se pide confirmar
		const confirmar = page.getByRole('button', { name: 'Sí, es correcto' });
		if (ratio > 3) await confirmar.click();
		await esperarAnimacion(page);

		const { barra, etiquetas } = await cajas(page);
		expect(etiquetas.length).toBeGreaterThan(3);
		for (const e of etiquetas) {
			expect(e.x0, `«${e.nombre}» se sale por la izquierda`).toBeGreaterThanOrEqual(barra.x0 - 0.5);
			expect(e.x1, `«${e.nombre}» se sale por la derecha`).toBeLessThanOrEqual(barra.x1 + 0.5);
		}
		for (let i = 0; i < etiquetas.length; i++) {
			for (let j = i + 1; j < etiquetas.length; j++) {
				const a = etiquetas[i]!;
				const b = etiquetas[j]!;
				const solapa = a.x0 < b.x1 - 0.5 && b.x0 < a.x1 - 0.5 && a.y0 < b.y1 - 0.5 && b.y0 < a.y1 - 0.5;
				expect(solapa, `«${a.nombre}» pisa «${b.nombre}»`).toBe(false);
			}
		}
		await page.locator('.barra[role="img"]').first().screenshot({ path: `${carpeta()}/33-barra-mas${pct}.png` });

		// La cifra grande («5,0 veces») cabe entera en el ancho de la pantalla
		const cifra = await page.locator('main .cifra').first().evaluate((e) => {
			const r = document.createRange();
			r.selectNodeContents(e);
			const b = r.getBoundingClientRect();
			return { derecha: b.right, ancho: document.documentElement.clientWidth };
		});
		expect(cifra.derecha).toBeLessThanOrEqual(cifra.ancho);
		await page.locator('main').screenshot({ path: `${carpeta()}/36-resultado-mas${pct}.png` });

		// La tarjeta compartible (1080×1350) se dibuja con la misma regla: se guarda para mirarla
		const png = await page
			.getByLabel('Vista previa de la tarjeta para compartir')
			.evaluate((c: HTMLCanvasElement) => c.toDataURL('image/png').split(',')[1]!);
		writeFileSync(`${carpeta()}/34-tarjeta-mas${pct}.png`, Buffer.from(png, 'base64'));
	});
}
