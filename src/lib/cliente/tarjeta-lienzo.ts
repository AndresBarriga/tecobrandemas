/**
 * Piezas comunes del dibujo de las tarjetas en <canvas> (v1 y v2): colores, fuentes y primitivas de texto y forma.
 */
export const COLOR = {
	paja: '#EBC85A', pajaTarjeta: '#D8B44A', papel: '#F6F4EE', tinta: '#1C1B19', grafito: '#5A5750',
	pista: '#E4DFD5', piedra: '#857F74'
} as const;
export const ACENTO = { a: '#2E6B52', b: '#2F5F8A', c: '#6A3A8C' } as const;
export const TINTE = { a: '#DCE9E1', b: '#DDE6EF', c: '#E9DFF1' } as const;
export const ICONO = {
	abajo: 'M6 8l4 4.5 4-4.5',
	a: 'M5.5 10.2l3 3 6-6.4',
	b: 'M5 11.5c1.6-2.4 3.4-2.4 5 0s3.4 2.4 5 0',
	c: 'M6 12l4-4.5 4 4.5'
} as const;
export const FAMILIA = { texto: '"Sofia Sans"', semi: '"Sofia Sans Semi Condensed"', extra: '"Sofia Sans Extra Condensed"' } as const;

export type Fam = keyof typeof FAMILIA;
export const NB = ' ';

export async function cargarFuentes(): Promise<void> {
	if (!document.fonts) return;
	await Promise.all(
		[
			'900 100px "Sofia Sans Extra Condensed"',
			'800 100px "Sofia Sans Extra Condensed"',
			'800 40px "Sofia Sans"',
			'700 40px "Sofia Sans"',
			'600 40px "Sofia Sans"',
			'500 40px "Sofia Sans"',
			'700 40px "Sofia Sans Semi Condensed"',
			'600 40px "Sofia Sans Semi Condensed"'
		].map((f) => document.fonts.load(f, 'Aá0€'))
	);
}

export type Ctx = CanvasRenderingContext2D;

export function fuente(ctx: Ctx, peso: number, tam: number, fam: Fam, espaciado = 0): void {
	ctx.font = `${peso} ${tam}px ${FAMILIA[fam]}, sans-serif`;
	// letterSpacing no existe en todos los navegadores: sin él solo cambia el tracking
	if ('letterSpacing' in ctx) (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${espaciado}px`;
}

/** Baseline dentro de una caja de altura `lh`, como la calcula CSS: el medio de la caja y del texto coinciden */
export function baseline(ctx: Ctx, top: number, lh: number): number {
	const m = ctx.measureText('Hgáñ');
	const a = m.fontBoundingBoxAscent;
	const d = m.fontBoundingBoxDescent;
	return top + (lh - (a + d)) / 2 + a;
}

export function ancho(ctx: Ctx, s: string): number {
	return ctx.measureText(s).width;
}

export function envolver(ctx: Ctx, s: string, max: number): string[] {
	const lineas: string[] = [];
	let actual = '';
	for (const palabra of s.split(' ')) {
		const prueba = actual ? `${actual} ${palabra}` : palabra;
		if (actual && ancho(ctx, prueba) > max) {
			lineas.push(actual);
			actual = palabra;
		} else actual = prueba;
	}
	if (actual) lineas.push(actual);
	return lineas;
}

export interface Opciones {
	color: string;
	align?: CanvasTextAlign;
}

/** Dibuja una línea de texto en una caja que empieza en `top` y mide `lh` */
export function linea(ctx: Ctx, s: string, x: number, top: number, lh: number, o: Opciones): void {
	ctx.fillStyle = o.color;
	ctx.textAlign = o.align ?? 'left';
	ctx.textBaseline = 'alphabetic';
	ctx.fillText(s, x, baseline(ctx, top, lh));
}

export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, radio = 0): void {
	ctx.fillStyle = color;
	ctx.beginPath();
	if (radio) ctx.roundRect(x, y, w, h, radio);
	else ctx.rect(x, y, w, h);
	ctx.fill();
}

export function circulo(ctx: Ctx, cx: number, cy: number, d: number, relleno: string, borde: string, grosor: number): void {
	ctx.beginPath();
	ctx.arc(cx, cy, d / 2, 0, Math.PI * 2);
	ctx.fillStyle = relleno;
	ctx.fill();
	ctx.lineWidth = grosor;
	ctx.strokeStyle = borde;
	ctx.beginPath();
	ctx.arc(cx, cy, d / 2 - grosor / 2, 0, Math.PI * 2);
	ctx.stroke();
}

