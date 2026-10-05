/**
 * Tarjeta compartible y vista previa del enlace, dibujadas en <canvas> en el navegador.
 * Las medidas siguen docs/design (Tarjeta.dc.html y PreviaEnlace.dc.html). Recibe solo
 * TarjetaDatos: no hay precio ni dirección que dibujar.
 */
import {
	CTA_TARJETA, NOMBRE, OG_ALTO, OG_ANCHO, PIE_TARJETA, TARJETA_ALTO, TARJETA_ANCHO,
	textosEnlace, type TarjetaDatos
} from '#lib/resultado';

const COLOR = {
	paja: '#EBC85A', pajaTarjeta: '#D8B44A', papel: '#F6F4EE', tinta: '#1C1B19', grafito: '#5A5750',
	pista: '#E4DFD5', piedra: '#857F74'
} as const;
const ACENTO = { a: '#2E6B52', b: '#2F5F8A', c: '#6A3A8C' } as const;
const TINTE = { a: '#DCE9E1', b: '#DDE6EF', c: '#E9DFF1' } as const;
const ICONO = {
	a: 'M5.5 10.2l3 3 6-6.4',
	b: 'M5 11.5c1.6-2.4 3.4-2.4 5 0s3.4 2.4 5 0',
	c: 'M6 12l4-4.5 4 4.5'
} as const;
const FAMILIA = { texto: '"Sofia Sans"', semi: '"Sofia Sans Semi Condensed"', extra: '"Sofia Sans Extra Condensed"' } as const;

type Fam = keyof typeof FAMILIA;
const NB = ' ';

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

type Ctx = CanvasRenderingContext2D;

function fuente(ctx: Ctx, peso: number, tam: number, fam: Fam, espaciado = 0): void {
	ctx.font = `${peso} ${tam}px ${FAMILIA[fam]}, sans-serif`;
	// letterSpacing no existe en todos los navegadores: sin él solo cambia el tracking
	if ('letterSpacing' in ctx) (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${espaciado}px`;
}

/** Baseline dentro de una caja de altura `lh`, como la calcula CSS: el medio de la caja y del texto coinciden */
function baseline(ctx: Ctx, top: number, lh: number): number {
	const m = ctx.measureText('Hgáñ');
	const a = m.fontBoundingBoxAscent;
	const d = m.fontBoundingBoxDescent;
	return top + (lh - (a + d)) / 2 + a;
}

function ancho(ctx: Ctx, s: string): number {
	return ctx.measureText(s).width;
}

function envolver(ctx: Ctx, s: string, max: number): string[] {
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

interface Opciones {
	color: string;
	align?: CanvasTextAlign;
}

/** Dibuja una línea de texto en una caja que empieza en `top` y mide `lh` */
function linea(ctx: Ctx, s: string, x: number, top: number, lh: number, o: Opciones): void {
	ctx.fillStyle = o.color;
	ctx.textAlign = o.align ?? 'left';
	ctx.textBaseline = 'alphabetic';
	ctx.fillText(s, x, baseline(ctx, top, lh));
}

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, radio = 0): void {
	ctx.fillStyle = color;
	ctx.beginPath();
	if (radio) ctx.roundRect(x, y, w, h, radio);
	else ctx.rect(x, y, w, h);
	ctx.fill();
}

function circulo(ctx: Ctx, cx: number, cy: number, d: number, relleno: string, borde: string, grosor: number): void {
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

/** Etiqueta de nivel: píldora con icono y texto. Devuelve su ancho */
function etiqueta(ctx: Ctx, t: TarjetaDatos, texto: string, x: number, y: number, tam: number, fondo: string): { w: number; h: number } {
	const icono = tam * 1.125;
	const gap = tam * 0.4375;
	fuente(ctx, 700, tam, 'texto');
	const lh = tam * 1.2;
	const padV = tam * 0.3125;
	const w = tam * 0.5 + icono + gap + ancho(ctx, texto) + tam * 0.75;
	const h = lh + padV * 2;
	rect(ctx, x, y, w, h, fondo, 8);

	const cx = x + tam * 0.5 + icono / 2;
	const cy = y + h / 2;
	ctx.beginPath();
	ctx.arc(cx, cy, (icono * 9) / 20, 0, Math.PI * 2);
	ctx.fillStyle = ACENTO[t.clase];
	ctx.fill();
	ctx.save();
	ctx.translate(cx - icono / 2, cy - icono / 2);
	ctx.scale(icono / 20, icono / 20);
	ctx.lineWidth = 2;
	ctx.strokeStyle = fondo;
	ctx.stroke(new Path2D(ICONO[t.clase]));
	ctx.restore();

	fuente(ctx, 700, tam, 'texto');
	linea(ctx, texto, x + tam * 0.5 + icono + gap, y + padV, lh, { color: ACENTO[t.clase] });
	return { w, h };
}

/** Cifra o titular: devuelve la altura que ocupa (cajas de línea como en el diseño) */
function hero(ctx: Ctx, t: TarjetaDatos, x: number, y: number, maxW: number, k: { cifra: number; titular: number; rango: number; lhCifra: number; palabra: number }, dibujar: boolean): number {
	const h = t.hero;
	if (h.tipo === 'cifra') {
		fuente(ctx, 900, k.cifra, 'extra', -k.cifra * 0.015);
		if (dibujar) linea(ctx, h.texto, x - k.cifra * 0.03, y, k.cifra * k.lhCifra, { color: COLOR.tinta });
		return k.cifra * k.lhCifra;
	}
	if (h.tipo === 'titular') {
		fuente(ctx, 900, k.titular, 'extra');
		const lineas = envolver(ctx, h.texto.toUpperCase(), maxW);
		const lh = k.titular * 0.8;
		if (dibujar) lineas.forEach((l, i) => linea(ctx, l, x, y + i * lh, lh, { color: COLOR.tinta }));
		return lineas.length * lh;
	}
	// rango: «entre +40 % y +47 %», con salto de línea si no cabe
	const piezas: { s: string; fam: Fam; peso: number; tam: number }[] = [
		{ s: 'entre', fam: 'texto', peso: 700, tam: k.palabra },
		{ s: h.desde, fam: 'extra', peso: 900, tam: k.rango },
		{ s: 'y', fam: 'texto', peso: 700, tam: k.palabra },
		{ s: h.hasta, fam: 'extra', peso: 900, tam: k.rango }
	];
	const gapX = k.palabra / 2;
	const lh = k.rango * 0.8;
	let cx = 0;
	let fila = 0;
	for (const p of piezas) {
		fuente(ctx, p.peso, p.tam, p.fam);
		const w = ancho(ctx, p.s);
		if (cx > 0 && cx + w > maxW) {
			cx = 0;
			fila++;
		}
		if (dibujar) {
			const tb = baseline(ctx, y + fila * lh, lh);
			// Todas las piezas de una fila comparten la baseline de la cifra
			fuente(ctx, 900, k.rango, 'extra');
			const comun = baseline(ctx, y + fila * lh, lh);
			fuente(ctx, p.peso, p.tam, p.fam);
			ctx.fillStyle = COLOR.tinta;
			ctx.textAlign = 'left';
			ctx.fillText(p.s, x + cx, p.fam === 'extra' ? tb : comun);
		}
		cx += w + gapX;
	}
	return (fila + 1) * lh;
}

interface Geom {
	/** Ancho útil de la barra en px */
	W: number;
}

function barraTarjeta(ctx: Ctx, t: TarjetaDatos, x: number, y: number, g: Geom): void {
	const b = t.barra;
	const X = (f: number) => f * g.W;
	const bandL = X(b.banda.desde);
	const bandW = X(b.banda.hasta) - bandL;
	const supMax = X(b.incertidumbre ? b.incertidumbre.hasta : b.techo.desde);
	const techoE = X(b.techo.hasta);
	const dotX = X(b.punto);

	// «tu anuncio» sobre el punto
	fuente(ctx, 700, 30, 'semi');
	linea(ctx, 'tu anuncio', x + Math.min(Math.max(dotX, ancho(ctx, 'tu anuncio') / 2), g.W - ancho(ctx, 'tu anuncio') / 2), y, 36, { color: COLOR.tinta, align: 'center' });

	const dentro = bandW >= 150 && t.clase !== 'a';
	if (!dentro && t.clase !== 'a') {
		fuente(ctx, 700, 30, 'semi');
		linea(ctx, 'referencia', x + bandL + bandW / 2, y, 36, { color: COLOR.tinta, align: 'center' });
		rect(ctx, x + bandL + bandW / 2 - 1.5, y + 38, 3, 12, COLOR.tinta);
	}

	rect(ctx, x, y + 50, g.W, 60, COLOR.pajaTarjeta, 2);
	rect(ctx, x + bandL, y + 50, bandW, 60, COLOR.tinta);
	if (dentro) {
		fuente(ctx, 700, 30, 'semi');
		linea(ctx, 'referencia', x + bandL + bandW / 2, y + 50, 60, { color: COLOR.papel, align: 'center' });
	}
	if (b.incertidumbre) rect(ctx, x + X(b.incertidumbre.desde), y + 50, X(b.incertidumbre.hasta) - X(b.incertidumbre.desde), 60, COLOR.grafito);

	// Techo: contorno de 4 px sin el lado izquierdo
	ctx.strokeStyle = COLOR.tinta;
	ctx.lineWidth = 4;
	ctx.beginPath();
	ctx.moveTo(x + supMax, y + 52);
	ctx.lineTo(x + techoE - 2, y + 52);
	ctx.lineTo(x + techoE - 2, y + 108);
	ctx.lineTo(x + supMax, y + 108);
	ctx.stroke();

	if (t.clase === 'c') rect(ctx, x + techoE, y + 78, Math.max(0, dotX - techoE - 30), 4, ACENTO.c);
	circulo(ctx, x + dotX, y + 80, 72, ACENTO[t.clase], COLOR.paja, 6);

	fuente(ctx, 600, 30, 'semi');
	linea(ctx, `0${NB}€`, x, y + 118, 36, { color: COLOR.tinta });
	if (t.clase === 'a') {
		const tercio = t.barra.tercio ?? 1;
		['baja', 'media', 'alta'].forEach((s, i) => {
			const cx = x + bandL + (bandW / 3) * (i + 0.5);
			fuente(ctx, i === tercio ? 800 : 500, 30, 'semi');
			linea(ctx, s, cx, y + 118, 36, { color: COLOR.tinta, align: 'center' });
			if (i === tercio) rect(ctx, cx - ancho(ctx, s) / 2, y + 118 + 36 - 2, ancho(ctx, s), 3, COLOR.tinta);
		});
	} else {
		fuente(ctx, 600, 30, 'semi');
		linea(ctx, `techo para un piso excelente`, x + techoE, y + 118, 36, { color: COLOR.tinta, align: 'right' });
	}
}

/** Tarjeta de 1080×1350 */
export async function dibujarTarjeta(canvas: HTMLCanvasElement, t: TarjetaDatos): Promise<void> {
	await cargarFuentes();
	canvas.width = TARJETA_ANCHO;
	canvas.height = TARJETA_ALTO;
	const ctx = canvas.getContext('2d')!;
	rect(ctx, 0, 0, TARJETA_ANCHO, TARJETA_ALTO, COLOR.paja);

	const X0 = 88;
	const W = TARJETA_ANCHO - 2 * X0;
	const TOP = 76;
	const ALTO_UTIL = TARJETA_ALTO - 76 - 72;

	// Medidas de cada bloque, para repartir el espacio libre entre ellos
	const k = { cifra: 340, titular: 210, rango: 210, lhCifra: 0.78, palabra: 48 };
	const etiquetaH = 30 * 1.2 + 2 * 12;
	const alturaHero = hero(ctx, t, X0, 0, W, k, false);
	fuente(ctx, 600, 34, 'texto');
	const subLineas = envolver(ctx, t.nota, W);
	const subH = subLineas.length * 34 * 1.25;
	const hTop = 44 + 30 + etiquetaH + 30 + alturaHero + 12 + subH;

	fuente(ctx, 800, 54, 'texto', -0.54);
	const fraseLineas = envolver(ctx, t.frase, W);
	const fraseH = fraseLineas.length * 54 * 1.08;

	fuente(ctx, 500, 30, 'texto');
	const pieLineas = envolver(ctx, PIE_TARJETA, W);
	const botonH = 36 * 1.2 + 40;
	const hBottom = botonH + 28 + pieLineas.length * 30 * 1.3;

	const libre = Math.max(0, ALTO_UTIL - (hTop + fraseH + 184 + hBottom));
	const gap = libre / 3;

	// Cabecera
	let y = TOP;
	fuente(ctx, 800, 44, 'extra', 0.44);
	linea(ctx, NOMBRE.toUpperCase(), X0, y, 44, { color: COLOR.tinta });
	fuente(ctx, 600, 32, 'texto');
	linea(ctx, 'Madrid', X0 + W, y + 4, 40, { color: COLOR.tinta, align: 'right' });
	y += 44 + 30;
	etiqueta(ctx, t, t.etiqueta, X0, y, 32, COLOR.papel);
	y += etiquetaH + 30;
	y += hero(ctx, t, X0, y, W, k, true) + 12;
	fuente(ctx, 600, 34, 'texto');
	subLineas.forEach((l, i) => linea(ctx, l, X0, y + i * 34 * 1.25, 34 * 1.25, { color: COLOR.tinta }));

	// Frase
	y = TOP + hTop + gap;
	fuente(ctx, 800, 54, 'texto', -0.54);
	fraseLineas.forEach((l, i) => linea(ctx, l, X0, y + i * 54 * 1.08, 54 * 1.08, { color: COLOR.tinta }));

	// Barra
	y += fraseH + gap;
	barraTarjeta(ctx, t, X0, y, { W });

	// Botón y pie
	y += 184 + gap;
	fuente(ctx, 800, 36, 'texto');
	const bw = ancho(ctx, CTA_TARJETA) + 60;
	rect(ctx, X0, y, bw, botonH, COLOR.tinta, 8);
	linea(ctx, CTA_TARJETA, X0 + 30, y + 20, 36 * 1.2, { color: COLOR.paja });
	y += botonH + 28;
	fuente(ctx, 500, 30, 'texto');
	pieLineas.forEach((l, i) => linea(ctx, l, X0, y + i * 30 * 1.3, 30 * 1.3, { color: COLOR.tinta }));
}

/** Vista previa del enlace de 1200×630 */
export async function dibujarOg(canvas: HTMLCanvasElement, t: TarjetaDatos): Promise<void> {
	await cargarFuentes();
	canvas.width = OG_ANCHO;
	canvas.height = OG_ALTO;
	const ctx = canvas.getContext('2d')!;
	const txt = textosEnlace(t).og;
	rect(ctx, 0, 0, OG_ANCHO, OG_ALTO, COLOR.papel);
	rect(ctx, 0, 0, 500, OG_ALTO, COLOR.paja);

	// Panel izquierdo
	fuente(ctx, 800, 36, 'extra', 0.36);
	linea(ctx, NOMBRE.toUpperCase(), 48, 56, 36, { color: COLOR.tinta });
	const maxL = 500 - 96;
	const k = { cifra: 200, titular: 110, rango: 110, lhCifra: 0.78, palabra: 30 };
	fuente(ctx, 600, 32, 'texto');
	const notaL = envolver(ctx, txt.nota, maxL);
	const notaH = notaL.length * 32 * 1.2;
	const hH = hero(ctx, t, 48, 0, maxL, k, false);
	const yHero = OG_ALTO - 52 - notaH - 8 - hH;
	hero(ctx, t, 48, yHero, maxL, k, true);
	fuente(ctx, 600, 32, 'texto');
	notaL.forEach((l, i) => linea(ctx, l, 48, yHero + hH + 8 + i * 32 * 1.2, 32 * 1.2, { color: COLOR.tinta }));

	// Panel derecho
	const X0 = 500 + 56;
	const W = 588;
	const tag = etiqueta(ctx, t, txt.etiqueta, X0, 56, 30, TINTE[t.clase]);
	fuente(ctx, 800, 48, 'texto');
	const tit = envolver(ctx, txt.titular, W);
	tit.forEach((l, i) => linea(ctx, l, X0, 56 + tag.h + 20 + i * 48 * 1.08, 48 * 1.08, { color: COLOR.tinta }));

	// Tres bloques con el espacio libre repartido entre ellos (space-between)
	const topH = tag.h + 20 + tit.length * 48 * 1.08;
	const ctaH = 32 * 1.2;
	const libre = Math.max(0, OG_ALTO - 56 - 52 - (topH + 56 + ctaH)) / 2;
	const barY = 56 + topH + libre;
	const b = t.barra;
	const X = (f: number) => f * W;
	rect(ctx, X0, barY + 12, W, 32, COLOR.pista);
	rect(ctx, X0 + X(b.banda.desde), barY + 12, X(b.banda.hasta) - X(b.banda.desde), 32, COLOR.tinta);
	const hiX = X(b.incertidumbre ? b.incertidumbre.hasta : b.techo.desde);
	rect(ctx, X0 + hiX, barY + 12, X(b.techo.hasta) - hiX, 32, COLOR.piedra);
	if (t.clase === 'c') rect(ctx, X0 + X(b.techo.hasta), barY + 26, Math.max(0, X(b.punto) - X(b.techo.hasta) - 20), 4, ACENTO.c);
	circulo(ctx, X0 + X(b.punto), barY + 28, 44, ACENTO[t.clase], COLOR.papel, 5);

	fuente(ctx, 700, 32, 'texto');
	linea(ctx, txt.cta, X0, barY + 56 + libre, ctaH, { color: COLOR.tinta });
}

export function aBlob(canvas: HTMLCanvasElement, calidad = 0.9): Promise<Blob> {
	return new Promise((ok, ko) => canvas.toBlob((b) => (b ? ok(b) : ko(new Error('canvas vacío'))), 'image/jpeg', calidad));
}

