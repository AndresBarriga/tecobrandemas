/**
 * Tarjeta compartible y vista previa del enlace, dibujadas en <canvas> en el navegador.
 * Las medidas siguen docs/design (Tarjeta.dc.html y PreviaEnlace.dc.html). Recibe solo
 * TarjetaDatos: no hay precio ni dirección que dibujar.
 */
import {
	CTA_TARJETA, ETIQUETA_POR_DEBAJO, LEMA, NOMBRE, TARJETA, TARJETA_INQUILINO, colocarEtiqueta, OG_ALTO, OG_ANCHO, PIE_TARJETA, TARJETA_ALTO, TARJETA_ANCHO,
	esV2, textosEnlace, type TarjetaDatos, type TarjetaV1
} from '#lib/resultado';
import { dibujarOgV2, dibujarTarjetaV2 } from './tarjeta-canvas-v2';

import {
	ACENTO, COLOR, type Ctx, ICONO, NB, TINTE, ancho, baseline, cargarFuentes, circulo, envolver, fuente, linea, rect, type Fam
} from './tarjeta-lienzo';

export { cargarFuentes };

/** Rótulo de la banda de la barra: lo que pagan los contratos vigentes */
const ROTULO_BANDA = 'contratos vigentes';

/** Etiqueta de nivel (v1): píldora con icono y texto. Devuelve su ancho */
function etiqueta(ctx: Ctx, t: TarjetaV1, texto: string, x: number, y: number, tam: number, fondo: string): { w: number; h: number } {
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
	ctx.stroke(new Path2D(ICONO[t.inquilino?.posicion === 'debajo' || t.etiqueta === ETIQUETA_POR_DEBAJO ? 'abajo' : t.clase]));
	ctx.restore();

	fuente(ctx, 700, tam, 'texto');
	linea(ctx, texto, x + tam * 0.5 + icono + gap, y + padV, lh, { color: ACENTO[t.clase] });
	return { w, h };
}

/** Cifra o titular: devuelve la altura que ocupa (cajas de línea como en el diseño) */
function hero(ctx: Ctx, t: TarjetaV1, x: number, y: number, maxW: number, k: { cifra: number; titular: number; rango: number; lhCifra: number; palabra: number }, dibujar: boolean): number {
	const h = t.hero;
	if (h.tipo === 'cifra') {
		// «5,0 veces» es más ancha que «+240 %»: la cifra se reduce lo justo para caber entera
		fuente(ctx, 900, k.cifra, 'extra', -k.cifra * 0.015);
		const tam = Math.min(k.cifra, (k.cifra * maxW) / Math.max(ancho(ctx, h.texto), 1));
		fuente(ctx, 900, tam, 'extra', -tam * 0.015);
		if (dibujar) linea(ctx, h.texto, x - tam * 0.03, y, tam * k.lhCifra, { color: COLOR.tinta });
		// La coma de «3,4 veces» baja de la línea: más aire debajo
		return tam * k.lhCifra + (/\bveces\b/.test(h.texto) ? tam * 0.12 : 0);
	}
	if (h.tipo === 'titular') {
		fuente(ctx, 900, k.titular, 'extra');
		const lineas = envolver(ctx, h.texto.toUpperCase(), maxW);
		const lh = k.titular * 0.8;
		// Una mayúscula con tilde («LÍMITE») sube por encima de la línea: se baja el titular
		const tilde = /[ÁÉÍÓÚ]/.test(lineas.join('')) ? k.titular * 0.16 : 0;
		if (dibujar) lineas.forEach((l, i) => linea(ctx, l, x, y + tilde + i * lh, lh, { color: COLOR.tinta }));
		return lineas.length * lh + tilde;
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

function barraTarjeta(ctx: Ctx, t: TarjetaV1, x: number, y: number, g: Geom): void {
	const b = t.barra;
	const X = (f: number) => f * g.W;
	const bandL = X(b.banda.desde);
	const bandW = X(b.banda.hasta) - bandL;
	const supMax = X(b.incertidumbre ? b.incertidumbre.hasta : b.techo.desde);
	const techoE = X(b.techo.hasta);
	const dotX = X(b.punto);

	// «tu anuncio» sobre el punto
	const rotuloPunto = t.inquilino ? 'mi alquiler' : 'tu anuncio';
	fuente(ctx, 700, 30, 'semi');
	const wPunto = ancho(ctx, rotuloPunto);
	const cPunto = Math.min(Math.max(dotX, wPunto / 2), g.W - wPunto / 2);
	linea(ctx, rotuloPunto, x + cPunto, y, 36, { color: COLOR.tinta, align: 'center' });

	// «contratos de aquí» cabe dentro de la banda desde unos 280 px
	const dentro = bandW >= 280 && t.clase !== 'a';
	// Fuera de la banda, el rótulo cede el sitio a «tu anuncio» si se pisan
	const choca = Math.abs(bandL + bandW / 2 - cPunto) < (ancho(ctx, ROTULO_BANDA) + wPunto) / 2 + 12;
	if (!dentro && t.clase !== 'a' && !choca) {
		fuente(ctx, 700, 30, 'semi');
		linea(ctx, ROTULO_BANDA, x + bandL + bandW / 2, y, 36, { color: COLOR.tinta, align: 'center' });
		rect(ctx, x + bandL + bandW / 2 - 1.5, y + 38, 3, 12, COLOR.tinta);
	}

	rect(ctx, x, y + 50, g.W, 60, COLOR.pajaTarjeta, 2);
	rect(ctx, x + bandL, y + 50, bandW, 60, COLOR.tinta);
	if (dentro) {
		fuente(ctx, 700, 30, 'semi');
		linea(ctx, ROTULO_BANDA, x + bandL + bandW / 2, y + 50, 60, { color: COLOR.papel, align: 'center' });
	}
	if (b.incertidumbre) rect(ctx, x + X(b.incertidumbre.desde), y + 50, X(b.incertidumbre.hasta) - X(b.incertidumbre.desde), 60, COLOR.grafito);

	// «Si fuera un piso excelente» (R_max): contorno de 4 px sin el lado izquierdo
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
		// Sin tercio («por debajo»): ninguna posición queda marcada
		const tercio = t.barra.tercio;
		['baja', 'media', 'alta'].forEach((s, i) => {
			const cx = x + bandL + (bandW / 3) * (i + 0.5);
			fuente(ctx, i === tercio ? 800 : 500, 30, 'semi');
			linea(ctx, s, cx, y + 118, 36, { color: COLOR.tinta, align: 'center' });
			if (i === tercio) rect(ctx, cx - ancho(ctx, s) / 2, y + 118 + 36 - 2, ancho(ctx, s), 3, COLOR.tinta);
		});
	} else {
		// Entera y sin pisar el «0 €»: a la izquierda de su marca si cabe; si no, a su derecha
		fuente(ctx, 600, 30, 'semi');
		const texto = 'si fuera un piso excelente';
		const izq = colocarEtiqueta(techoE, ancho(ctx, texto), g.W, ancho(ctx, `0${NB}€`) + 16);
		linea(ctx, texto, x + izq, y + 118, 36, { color: COLOR.tinta });
	}
}

/** Tarjeta de 1080×1350: la del rediseño (v2) o, para los enlaces antiguos, la de antes (v1) */
export async function dibujarTarjeta(canvas: HTMLCanvasElement, t: TarjetaDatos): Promise<void> {
	await cargarFuentes();
	if (esV2(t)) return dibujarTarjetaV2(canvas, t);
	dibujarTarjetaV1(canvas, t);
}

function dibujarTarjetaV1(canvas: HTMLCanvasElement, t: TarjetaV1): void {
	canvas.width = TARJETA_ANCHO;
	canvas.height = TARJETA_ALTO;
	const ctx = canvas.getContext('2d')!;
	rect(ctx, 0, 0, TARJETA_ANCHO, TARJETA_ALTO, COLOR.paja);

	const X0 = 88;
	const W = TARJETA_ANCHO - 2 * X0;
	const TOP = 76;
	const ALTO_UTIL = TARJETA_ALTO - 76 - 72;

	// Medidas de cada bloque, para repartir el espacio libre entre ellos
	const K0 = { cifra: 340, titular: 210, rango: 210, lhCifra: 0.78, palabra: 48 };
	let k = K0;
	const etiquetaH = 30 * 1.2 + 2 * 12;
	let alturaHero = hero(ctx, t, X0, 0, W, k, false);
	fuente(ctx, 600, 34, 'texto');
	const subLineas = envolver(ctx, t.nota, W);
	const subH = subLineas.length * 34 * 1.25;
	// Las dos tarjetas llevan el lema bajo el logotipo; la del inquilino, además, «Mi alquiler en [barrio]» sobre la cifra
	const inq = !!t.inquilino;
	const lemaH = 30 * 1.3 + 6;
	const miAlquilerH = inq ? 34 * 1.25 + 14 : 0;
	let hTop = 44 + lemaH + 30 + etiquetaH + 30 + miAlquilerH + alturaHero + 12 + subH;

	fuente(ctx, 800, 54, 'texto', -0.54);
	const fraseLineas = envolver(ctx, t.frase, W);
	const fraseH = fraseLineas.length * 54 * 1.08;

	fuente(ctx, 500, 30, 'texto');
	const pieLineas = envolver(ctx, PIE_TARJETA, W);
	const botonH = 36 * 1.2 + 40;
	const hBottom = botonH + 28 + pieLineas.length * 30 * 1.3;

	// Si el contenido no cabe (titular de dos líneas y frase larga), la cifra o el titular se reducen lo justo
	const sobra = () => ALTO_UTIL - (hTop + fraseH + 184 + hBottom);
	for (let escala = 1; sobra() < 60 && escala > 0.6; ) {
		escala -= 0.05;
		k = { ...K0, cifra: K0.cifra * escala, titular: K0.titular * escala, rango: K0.rango * escala };
		const nueva = hero(ctx, t, X0, 0, W, k, false);
		hTop += nueva - alturaHero;
		alturaHero = nueva;
	}
	const libre = Math.max(0, sobra());
	const gap = libre / 3;

	// Cabecera
	let y = TOP;
	fuente(ctx, 800, 44, 'extra', 0.44);
	linea(ctx, NOMBRE.toUpperCase(), X0, y, 44, { color: COLOR.tinta });
	fuente(ctx, 600, 32, 'texto');
	linea(ctx, 'Madrid', X0 + W, y + 4, 40, { color: COLOR.tinta, align: 'right' });
	y += 44;
	fuente(ctx, 500, 30, 'texto');
	linea(ctx, LEMA, X0, y + 6, 30 * 1.3, { color: COLOR.tinta });
	y += lemaH;
	y += 30;
	etiqueta(ctx, t, t.etiqueta, X0, y, 32, COLOR.papel);
	y += etiquetaH + 30;
	if (inq) {
		fuente(ctx, 500, 34, 'texto');
		linea(ctx, TARJETA_INQUILINO.miAlquilerEn(t.barrio ?? 'Madrid'), X0, y, 34 * 1.25, { color: COLOR.tinta });
		y += miAlquilerH;
	}
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
	const cta = inq ? TARJETA_INQUILINO.cta : CTA_TARJETA;
	const bw = ancho(ctx, cta) + 60;
	rect(ctx, X0, y, bw, botonH, COLOR.tinta, 8);
	linea(ctx, cta, X0 + 30, y + 20, 36 * 1.2, { color: COLOR.paja });
	// El dominio va dentro de la imagen: las capturas viajan sin enlace
	linea(ctx, TARJETA.dominio, X0 + W, y + 20, 36 * 1.2, { color: COLOR.tinta, align: 'right' });
	y += botonH + 28;
	fuente(ctx, 500, 30, 'texto');
	pieLineas.forEach((l, i) => linea(ctx, l, X0, y + i * 30 * 1.3, 30 * 1.3, { color: COLOR.tinta }));
}

/** Vista previa del enlace de 1200×630 */
export async function dibujarOg(canvas: HTMLCanvasElement, t: TarjetaDatos): Promise<void> {
	await cargarFuentes();
	if (esV2(t)) return dibujarOgV2(canvas, t);
	dibujarOgV1(canvas, t);
}

function dibujarOgV1(canvas: HTMLCanvasElement, t: TarjetaV1): void {
	canvas.width = OG_ANCHO;
	canvas.height = OG_ALTO;
	const ctx = canvas.getContext('2d')!;
	const txt = textosEnlace(t).og;
	rect(ctx, 0, 0, OG_ANCHO, OG_ALTO, COLOR.papel);
	rect(ctx, 0, 0, 500, OG_ALTO, COLOR.paja);

	// Panel izquierdo
	fuente(ctx, 800, 36, 'extra', 0.36);
	linea(ctx, NOMBRE.toUpperCase(), 48, 56, 36, { color: COLOR.tinta });
	fuente(ctx, 500, 24, 'texto');
	linea(ctx, LEMA, 48, 98, 30, { color: COLOR.tinta });
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

