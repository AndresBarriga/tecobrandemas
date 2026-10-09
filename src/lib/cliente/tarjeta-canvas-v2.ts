/**
 * Tarjeta compartible del rediseño (v2), en <canvas>: la frase resumen en el orden del modo, los dos porcentajes con
 * el mismo tamaño y las dos reglas con el mismo eje (valores del eje visibles). El punto del precio va sin etiqueta.
 * No hay precio exacto, m² ni dirección que dibujar: llegan fracciones del eje y textos ya validados.
 */
import { COMPARATIVA, LEMA, NOMBRE, OG_ALTO, OG_ANCHO, TARJETA, TARJETA_ALTO, TARJETA_ANCHO, type TarjetaV2 } from '#lib/resultado';
import { ACENTO, COLOR, type Ctx, ICONO, TINTE, ancho, circulo, envolver, fuente, linea, rect } from './tarjeta-lienzo';

/** Violeta de los anuncios recientes (el mismo que el mapa) */
const VIOLETA = { fuerte: '#6A4392', claro: '#B79AD0', tinte: '#EDE3F2', oscuro: '#4B2E70' } as const;

/** Píldora (nivel de contratos o veredicto de anuncios); con icono si se le pasa. Devuelve su tamaño */
function pildora(ctx: Ctx, texto: string, x: number, y: number, tam: number, fondo: string, color: string, icono: keyof typeof ICONO | null, dibujar = true): { w: number; h: number } {
	fuente(ctx, 700, tam, 'texto');
	const lh = tam * 1.2;
	const pad = tam * 0.3;
	const dIcono = icono ? tam * 1.1 : 0;
	const gap = icono ? tam * 0.4 : 0;
	const w = tam * 0.5 + dIcono + gap + ancho(ctx, texto) + tam * 0.6;
	const h = lh + pad * 2;
	if (!dibujar) return { w, h };
	rect(ctx, x, y, w, h, fondo, 8);
	if (icono) {
		const cx = x + tam * 0.5 + dIcono / 2;
		const cy = y + h / 2;
		ctx.beginPath();
		ctx.arc(cx, cy, (dIcono * 9) / 20, 0, Math.PI * 2);
		ctx.fillStyle = color;
		ctx.fill();
		ctx.save();
		ctx.translate(cx - dIcono / 2, cy - dIcono / 2);
		ctx.scale(dIcono / 20, dIcono / 20);
		ctx.lineWidth = 2;
		ctx.strokeStyle = fondo;
		ctx.stroke(new Path2D(ICONO[icono]));
		ctx.restore();
	}
	fuente(ctx, 700, tam, 'texto');
	linea(ctx, texto, x + tam * 0.5 + dIcono + gap, y + pad, lh, { color });
	return { w, h };
}

interface Columna {
	titulo: string;
	sub: string;
	cifra: string;
	color: string;
	nota: string;
	pildora: { texto: string; fondo: string; color: string; icono: keyof typeof ICONO | null };
}

function columnas(t: TarjetaV2): Columna[] {
	const c = t.contratos;
	const contratos: Columna = {
		titulo: COMPARATIVA.contratos.titulo.toUpperCase(),
		sub: COMPARATIVA.contratos.sub,
		cifra: c.cifra,
		// Identidad de los contratos: tinta. El color del nivel queda solo en su chip
		color: COLOR.tinta,
		nota: c.nota,
		pildora: { texto: c.etiqueta, fondo: TINTE[c.clase], color: ACENTO[c.clase], icono: c.icono }
	};
	if (!t.anuncios) return [contratos];
	const a = t.anuncios;
	const anuncios: Columna = {
		titulo: COMPARATIVA.anuncios.titulo.toUpperCase(),
		sub: `${COMPARATIVA.anuncios.sub[t.modo]} · ${a.lugar}`,
		cifra: a.cifra,
		color: VIOLETA.fuerte,
		nota: a.nota,
		pildora: { texto: a.veredicto, fondo: VIOLETA.tinte, color: VIOLETA.oscuro, icono: null }
	};
	return t.modo === 'mirando' ? [anuncios, contratos] : [contratos, anuncios];
}

/**
 * Las atribuciones obligatorias en una sola línea muy pequeña, de lado a lado: la letra baja lo justo para caber.
 * Devuelve el tamaño usado
 */
function lineaFuentes(ctx: Ctx, x: number, y: number, w: number, maxTam: number): number {
	let tam = maxTam;
	fuente(ctx, 500, tam, 'semi');
	while (ancho(ctx, TARJETA.fuentes) > w && tam > 6) fuente(ctx, 500, --tam, 'semi');
	linea(ctx, TARJETA.fuentes, x, y, tam * 1.3, { color: COLOR.tinta });
	return tam;
}

/** El mismo tamaño para las dos cifras: el mayor con el que caben las dos en su columna */
function tamCifra(ctx: Ctx, cifras: string[], maxW: number, maxTam: number): number {
	fuente(ctx, 900, maxTam, 'extra');
	const w = Math.max(...cifras.map((c) => ancho(ctx, c)), 1);
	return Math.min(maxTam, (maxTam * maxW) / w);
}

interface GeomReglas {
	x: number;
	w: number;
	/** Alto de cada barra y del punto */
	barra: number;
	punto: number;
	tamTitulo: number;
	tamEje: number;
	sep: number;
}

/** Las dos reglas con el mismo eje y el punto alineado. Devuelve la altura que ocupan */
function reglas(ctx: Ctx, t: TarjetaV2, y0: number, g: GeomReglas, dibujar: boolean, fondoPista: string): number {
	const r = t.reglas;
	const X = (f: number) => g.x + Math.min(Math.max(f, 0), 1) * g.w;
	const orden = (t.modo === 'mirando' ? ['anuncios', 'contratos'] : ['contratos', 'anuncios']).filter((o) => o === 'contratos' || r.anuncios);
	let y = y0;
	const yPuntos: number[] = [];
	for (const o of orden) {
		const titulo = o === 'contratos' ? COMPARATIVA.reglas.contratos : COMPARATIVA.reglas.anuncios(t.anuncios!.lugar);
		if (dibujar) {
			fuente(ctx, 700, g.tamTitulo, 'semi');
			linea(ctx, titulo, g.x, y, g.tamTitulo * 1.3, { color: COLOR.tinta });
		}
		y += g.tamTitulo * 1.3 + g.tamTitulo * 0.35;
		if (dibujar) {
			rect(ctx, g.x, y, g.w, g.barra, fondoPista, 3);
			// Banda mínima: el equivalente a 6 px de la pantalla
			const banda = (d: number, h: number, color: string | CanvasPattern) => {
				const min = g.w * 0.018;
				const ancho = Math.max(min, X(h) - X(d));
				const izq = Math.min(Math.max((X(d) + X(h)) / 2 - ancho / 2, g.x), g.x + g.w - ancho);
				ctx.fillStyle = color;
				ctx.fillRect(izq, y, ancho, g.barra);
			};
			if (o === 'contratos') {
				const c = r.contratos;
				banda(c.banda.desde, c.banda.hasta, COLOR.tinta);
				if (c.incertidumbre) banda(c.incertidumbre.desde, c.incertidumbre.hasta, COLOR.grafito);
				// «Si fuera un piso excelente»: contorno sin el lado izquierdo
				const grosor = Math.max(2, g.barra * 0.08);
				ctx.strokeStyle = COLOR.tinta;
				ctx.lineWidth = grosor;
				ctx.beginPath();
				ctx.moveTo(X(c.parteAlta), y + grosor / 2);
				ctx.lineTo(X(c.techo) - grosor / 2, y + grosor / 2);
				ctx.lineTo(X(c.techo) - grosor / 2, y + g.barra - grosor / 2);
				ctx.lineTo(X(c.parteAlta), y + g.barra - grosor / 2);
				ctx.stroke();
			} else if (r.anuncios) {
				// La oferta estimada: una marca vertical violeta (la banda de ±10 % no se dibuja: solo clasifica)
				const grosor = Math.max(4, g.barra * 0.14);
				rect(ctx, X(r.anuncios.media) - grosor / 2, y - g.barra * 0.22, grosor, g.barra * 1.44, VIOLETA.fuerte, grosor / 2);
			}
		}
		yPuntos.push(y + g.barra / 2);
		y += g.barra + g.sep;
	}
	// Guía vertical que une los dos puntos y, encima, el punto (amarillo con borde oscuro) en cada regla
	if (dibujar) {
		const px = X(r.punto);
		if (yPuntos.length > 1) rect(ctx, px - 1, yPuntos[0]!, 2, yPuntos[yPuntos.length - 1]! - yPuntos[0]!, COLOR.tinta);
		for (const yp of yPuntos) circulo(ctx, px, yp, g.punto, COLOR.paja, COLOR.tinta, Math.max(3, g.punto * 0.12));
	}
	// Eje: línea, marcas y valores (extremos y alguna intermedia)
	y = y - g.sep + g.barra * 0.35;
	if (dibujar) {
		rect(ctx, g.x, y, g.w, 2, COLOR.piedra);
		fuente(ctx, 500, g.tamEje, 'semi');
		r.marcas.forEach((m, i) => {
			const mx = X(m.x);
			rect(ctx, mx - 1, y, 2, g.tamEje * 0.4, COLOR.piedra);
			const align: CanvasTextAlign = i === 0 ? 'left' : i === r.marcas.length - 1 ? 'right' : 'center';
			linea(ctx, m.texto, align === 'left' ? g.x : align === 'right' ? g.x + g.w : mx, y + g.tamEje * 0.5, g.tamEje * 1.3, { color: COLOR.grafito, align });
		});
	}
	return y + g.tamEje * 1.8 - y0;
}

/** Tarjeta de 1080×1350 */
export function dibujarTarjetaV2(canvas: HTMLCanvasElement, t: TarjetaV2): void {
	canvas.width = TARJETA_ANCHO;
	canvas.height = TARJETA_ALTO;
	const ctx = canvas.getContext('2d')!;
	rect(ctx, 0, 0, TARJETA_ANCHO, TARJETA_ALTO, COLOR.paja);

	const X0 = 88;
	const W = TARJETA_ANCHO - 2 * X0;
	const TOP = 72;
	const ABAJO = TARJETA_ALTO - 64;
	const cols = columnas(t);
	const GAP = 32;
	const CW = (W - GAP) / 2;
	const PAD = 28;

	// Alturas de cada bloque, para repartir el espacio libre entre ellos
	const cabeceraH = 44 + 46 + 50;
	let tamResumen = 64;
	const lineasResumen = () => {
		fuente(ctx, 800, tamResumen, 'texto', -tamResumen * 0.01);
		return envolver(ctx, t.resumen, W);
	};
	let resumen = lineasResumen();
	const tam = tamCifra(ctx, cols.map((c) => c.cifra), CW - 2 * PAD, 150);
	const altoColumna = (c: Columna) => {
		fuente(ctx, 500, 24, 'texto');
		const sub = envolver(ctx, c.sub, CW - 2 * PAD);
		fuente(ctx, 500, 26, 'texto');
		const nota = envolver(ctx, c.nota, CW - 2 * PAD);
		return PAD + 24 * 1.3 + sub.length * 24 * 1.3 + 16 + pildora(ctx, c.pildora.texto, 0, 0, 26, '', '', null, false).h + 14 + tam * 0.86 + 12 + nota.length * 26 * 1.3 + PAD;
	};
	const colH = Math.max(...cols.map(altoColumna));
	const g: GeomReglas = { x: X0, w: W, barra: 44, punto: 44, tamTitulo: 26, tamEje: 24, sep: 30 };
	const reglasH = reglas(ctx, t, 0, g, false, COLOR.papel);
	fuente(ctx, 800, 36, 'texto');
	const cierreH = 36 * 1.25;
	const fuentesH = 16 * 1.3;
	const pieH = cierreH + 18 + fuentesH;
	const ocupado = () => cabeceraH + resumen.length * tamResumen * 1.05 + colH + reglasH + pieH;
	while (ABAJO - TOP - ocupado() < 120 && tamResumen > 44) {
		tamResumen -= 4;
		resumen = lineasResumen();
	}
	const gap = Math.max(0, ABAJO - TOP - ocupado()) / 4;

	// Cabecera: nombre, Madrid, lema y de qué es la tarjeta
	let y = TOP;
	fuente(ctx, 800, 44, 'extra', 0.44);
	linea(ctx, NOMBRE.toUpperCase(), X0, y, 44, { color: COLOR.tinta });
	fuente(ctx, 600, 32, 'texto');
	linea(ctx, 'Madrid', X0 + W, y + 4, 40, { color: COLOR.tinta, align: 'right' });
	y += 44;
	fuente(ctx, 500, 30, 'texto');
	linea(ctx, LEMA, X0, y + 6, 30 * 1.3, { color: COLOR.tinta });
	y += 46;
	fuente(ctx, 700, 32, 'texto');
	linea(ctx, `${t.modo === 'vivo' ? 'Mi alquiler' : 'Un anuncio'} en ${t.barrio ?? 'Madrid'}`, X0, y + 8, 40, { color: COLOR.tinta });
	y += 50 + gap * 0.6;

	// Frase resumen
	fuente(ctx, 800, tamResumen, 'texto', -tamResumen * 0.01);
	resumen.forEach((l, i) => linea(ctx, l, X0, y + i * tamResumen * 1.05, tamResumen * 1.05, { color: COLOR.tinta }));
	y += resumen.length * tamResumen * 1.05 + gap;

	// Las dos tarjetas, del mismo peso y con las cifras del mismo tamaño
	cols.forEach((c, i) => {
		const x = X0 + i * (CW + GAP);
		rect(ctx, x, y, CW, colH, COLOR.papel, 12);
		rect(ctx, x, y, CW, 8, c.color, 0);
		let yy = y + PAD;
		fuente(ctx, 800, 24, 'semi', 1);
		linea(ctx, c.titulo, x + PAD, yy, 24 * 1.3, { color: COLOR.tinta });
		yy += 24 * 1.3;
		fuente(ctx, 500, 24, 'texto');
		envolver(ctx, c.sub, CW - 2 * PAD).forEach((l) => {
			linea(ctx, l, x + PAD, yy, 24 * 1.3, { color: COLOR.grafito });
			yy += 24 * 1.3;
		});
		yy += 16;
		yy += pildora(ctx, c.pildora.texto, x + PAD, yy, 26, c.pildora.fondo, c.pildora.color, c.pildora.icono).h + 14;
		fuente(ctx, 900, tam, 'extra', -tam * 0.01);
		linea(ctx, c.cifra, x + PAD - tam * 0.02, yy, tam * 0.86, { color: c.color });
		yy += tam * 0.86 + 12;
		fuente(ctx, 500, 26, 'texto');
		envolver(ctx, c.nota, CW - 2 * PAD).forEach((l) => {
			linea(ctx, l, x + PAD, yy, 26 * 1.3, { color: COLOR.grafito });
			yy += 26 * 1.3;
		});
	});
	y += colH + gap;

	// Reglas con el mismo eje
	y += reglas(ctx, t, y, g, true, COLOR.papel) + gap * 0.4;

	// Cierre y fuentes en una línea
	y = ABAJO - pieH;
	fuente(ctx, 800, 36, 'texto');
	linea(ctx, TARJETA.cierre, X0, y, cierreH, { color: COLOR.tinta });
	y += cierreH + 18;
	// Atribuciones en una línea, de margen a margen de la tarjeta (más ancha que el contenido)
	lineaFuentes(ctx, 40, y, TARJETA_ANCHO - 80, 16);
}

/** Vista previa del enlace de 1200×630 */
export function dibujarOgV2(canvas: HTMLCanvasElement, t: TarjetaV2): void {
	canvas.width = OG_ANCHO;
	canvas.height = OG_ALTO;
	const ctx = canvas.getContext('2d')!;
	rect(ctx, 0, 0, OG_ANCHO, OG_ALTO, COLOR.papel);
	rect(ctx, 0, 0, 500, OG_ALTO, COLOR.paja);

	// Panel izquierdo: nombre, lema, lugar y la frase resumen
	fuente(ctx, 800, 36, 'extra', 0.36);
	linea(ctx, NOMBRE.toUpperCase(), 48, 52, 36, { color: COLOR.tinta });
	fuente(ctx, 500, 24, 'texto');
	linea(ctx, LEMA, 48, 92, 30, { color: COLOR.tinta });
	const maxL = 500 - 96;
	let tamR = 46;
	let lineas: string[];
	do {
		fuente(ctx, 800, tamR, 'texto');
		lineas = envolver(ctx, t.resumen, maxL);
		tamR -= 2;
	} while (lineas.length * (tamR + 2) * 1.08 > 300 && tamR > 28);
	tamR += 2;
	const yR = OG_ALTO - 52 - lineas.length * tamR * 1.08;
	fuente(ctx, 600, 26, 'texto');
	linea(ctx, `${t.modo === 'vivo' ? 'Mi alquiler' : 'Un anuncio'} en ${t.barrio ?? 'Madrid'}`, 48, yR - 50, 34, { color: COLOR.tinta });
	fuente(ctx, 800, tamR, 'texto');
	lineas.forEach((l, i) => linea(ctx, l, 48, yR + i * tamR * 1.08, tamR * 1.08, { color: COLOR.tinta }));

	// Panel derecho: las dos cifras con el mismo tamaño, las reglas con su eje y el cierre
	const X0 = 556;
	const W = 588;
	const cols = columnas(t);
	const CW = (W - 24) / 2;
	const tam = tamCifra(ctx, cols.map((c) => c.cifra), CW, 104);
	cols.forEach((c, i) => {
		const x = X0 + i * (CW + 24);
		rect(ctx, x, 52, CW, 5, c.color);
		fuente(ctx, 800, 18, 'semi', 0.6);
		linea(ctx, c.titulo, x, 66, 24, { color: COLOR.tinta });
		fuente(ctx, 900, tam, 'extra');
		linea(ctx, c.cifra, x - tam * 0.02, 96, tam * 0.86, { color: c.color });
		pildora(ctx, c.pildora.texto, x, 104 + tam * 0.86, 18, c.pildora.fondo, c.pildora.color, c.pildora.icono);
	});
	const yReglas = 104 + tam * 0.86 + 54;
	const g: GeomReglas = { x: X0, w: W, barra: 22, punto: 24, tamTitulo: 17, tamEje: 17, sep: 16 };
	reglas(ctx, t, yReglas, g, true, COLOR.pista);
	fuente(ctx, 700, 26, 'texto');
	linea(ctx, TARJETA.cierre, X0, OG_ALTO - 52 - 40, 32, { color: COLOR.tinta });
	// Atribuciones en una línea al pie, de lado a lado
	lineaFuentes(ctx, 24, OG_ALTO - 26, OG_ANCHO - 48, 14);
}
