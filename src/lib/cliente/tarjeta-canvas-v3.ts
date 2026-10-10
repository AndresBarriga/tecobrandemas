/**
 * Tarjetas de «La costura» (v3), en <canvas>, según docs/design/new design handoff (TarjetaCostura):
 *  - «Dos veredictos»: mitad negra (contratos) y mitad paja (oferta), con la palabra, el % y el lugar en la costura;
 *  - «La costura»: el mismo dibujo que la pantalla, sin euros ni %; «yo» o «el anuncio» sobre el precio;
 *  - «La cifra»: el % frente a los contratos, en grande (solo si hay %);
 *  - vista previa del enlace (1200×630): siempre «Dos veredictos».
 * Las palabras y las cifras grandes se miden y se reducen hasta caber. Nada por debajo de 30 px salvo las
 * atribuciones, que van literales en dos líneas pequeñas al pie. No hay euros, renta, m² ni dirección que dibujar.
 */
import { OG_ALTO, OG_ANCHO, TARJETA_ALTO, TARJETA_ANCHO, TARJETA_COSTURA as T, type TarjetaV3 } from '#lib/resultado';
import { type Ctx, ancho, circulo, envolver, fuente, linea, rect } from './tarjeta-lienzo';

const C = {
	negro: '#0B0A0A', papel: '#F6F4EE', paja: '#EBC85A', pajaOscura: '#D8B44A', tinta: '#1C1B19', grafito: '#5A5750',
	ciruela: '#6A3A8C', pista: '#5A5750', incertidumbre: '#D6D1C6', excelente: '#857F74', suave: '#D6D1C6'
} as const;

const X0 = 72;
const W = TARJETA_ANCHO - 2 * X0;

/** Tamaño con el que `texto` cabe en `max` px, sin pasar de `tam` */
function ajustar(ctx: Ctx, texto: string, max: number, tam: number, peso: number, fam: 'texto' | 'semi' | 'extra'): number {
	fuente(ctx, peso, tam, fam);
	const w = ancho(ctx, texto);
	return w > max ? Math.floor((tam * max) / w) : tam;
}

/**
 * La palabra del veredicto: 200 px (128 con más de 10 caracteres), y menos si no cabe. Devuelve lo que ha bajado por
 * una tilde, para que lo de debajo baje lo mismo
 */
function palabra(ctx: Ctx, texto: string, x: number, top: number, max: number, grande: number, chica: number, color: string): number {
	const tam = ajustar(ctx, texto, max, texto.length > 10 ? chica : grande, 800, 'extra');
	fuente(ctx, 800, tam, 'extra');
	// Una mayúscula con tilde («MÁS», «LÍNEA») sube por encima de la caja: se baja la palabra lo justo
	const tilde = /[ÁÉÍÓÚ]/.test(texto) ? tam * 0.1 : 0;
	linea(ctx, texto, x - tam * 0.02, top + tilde, tam * 0.86, { color });
	return tilde;
}

/** Logo: el cuadro paja con «AsP» y el nombre al lado */
function logo(ctx: Ctx, x: number, y: number, lado: number, color: string): void {
	rect(ctx, x, y, lado, lado, C.paja, lado * 0.175);
	fuente(ctx, 900, lado / 2, 'extra');
	linea(ctx, 'AsP', x + lado / 2, y, lado, { color: C.tinta, align: 'center' });
	fuente(ctx, 800, lado * 0.55, 'extra', lado * 0.005);
	linea(ctx, 'A SU PRECIO', x + lado + lado / 4, y, lado, { color });
}

/** «Un anuncio» / «Mi alquiler», a la derecha del logo */
function contexto(ctx: Ctx, t: TarjetaV3, y: number, lado: number): void {
	fuente(ctx, 600, 32, 'semi');
	linea(ctx, T.contexto[t.modo], X0 + W, y, lado, { color: C.suave, align: 'right' });
}

/** La cifra y su texto en una fila (baseline común); sin cifra, solo el texto. Devuelve el alto */
function filaCifra(ctx: Ctx, cifra: string, texto: string, top: number, color: string, tamCifra: number, tamTexto: number): number {
	if (!cifra) {
		fuente(ctx, 600, tamTexto + 6, 'texto');
		const l = envolver(ctx, texto, W);
		l.forEach((s, i) => linea(ctx, s, X0, top + i * (tamTexto + 6) * 1.15, (tamTexto + 6) * 1.15, { color }));
		return l.length * (tamTexto + 6) * 1.15;
	}
	const tam = ajustar(ctx, cifra, W * 0.62, tamCifra, 900, 'extra');
	fuente(ctx, 900, tam, 'extra');
	const wc = ancho(ctx, cifra);
	ctx.fillStyle = color;
	ctx.textAlign = 'left';
	ctx.textBaseline = 'alphabetic';
	const base = top + tam * 0.86;
	ctx.fillText(cifra, X0 - tam * 0.02, base);
	fuente(ctx, 600, tamTexto, 'texto');
	const lineas = envolver(ctx, texto, W - wc - 28);
	// El texto se apoya en la baseline de la cifra; con dos líneas, la última es la que se apoya
	lineas.forEach((s, i) => ctx.fillText(s, X0 + wc + 28, base - (lineas.length - 1 - i) * tamTexto * 1.15));
	return tam * 0.86;
}

/** Pie de las tarjetas de 1080×1350: dominio, «¿Y EL TUYO?» y las atribuciones literales en dos líneas */
function pie(ctx: Ctx): void {
	const y = 1196;
	fuente(ctx, 700, 34, 'semi');
	linea(ctx, T.dominio, X0, y + 8, 48, { color: C.tinta });
	fuente(ctx, 800, 48, 'extra');
	linea(ctx, T.pie, X0 + W, y, 56, { color: C.tinta, align: 'right' });
	const tam = Math.min(...T.fuentes.map((f) => ajustar(ctx, f, W, 19, 500, 'semi')));
	fuente(ctx, 500, tam, 'semi');
	T.fuentes.forEach((f, i) => linea(ctx, f, X0, 1270 + i * tam * 1.4, tam * 1.4, { color: C.tinta }));
}

/** Píldora clara con texto, centrada en `cx` y ajustada a los bordes */
function pastilla(ctx: Ctx, texto: string, cx: number, top: number, tam: number, padX: number): void {
	fuente(ctx, 700, tam, 'semi');
	const w = ancho(ctx, texto) + padX * 2;
	const h = tam * 1.2 + 22;
	const x = Math.min(Math.max(cx - w / 2, X0), X0 + W - w);
	rect(ctx, x, top, w, h, C.papel, h / 2);
	linea(ctx, texto, x + w / 2, top, h, { color: C.tinta, align: 'center' });
}

// ——— Dos veredictos ———

function dosVeredictos(ctx: Ctx, t: TarjetaV3): void {
	rect(ctx, 0, 0, TARJETA_ANCHO, TARJETA_ALTO, C.paja);
	rect(ctx, 0, 0, TARJETA_ANCHO, 675, C.negro);
	logo(ctx, X0, 64, 80, C.papel);
	contexto(ctx, t, 64, 80);

	fuente(ctx, 600, 38, 'texto');
	linea(ctx, T.frenteContratos, X0, 206, 46, { color: C.papel });
	palabra(ctx, t.contratos.palabra, X0, 272, W, 200, 128, C.papel);
	filaCifra(ctx, t.contratos.cifra, t.contratos.texto, 466, C.papel, 120, 38);

	fuente(ctx, 600, 38, 'texto');
	linea(ctx, T.frenteOferta, X0, 760, 46, { color: C.tinta });
	if (t.oferta) {
		const baja = palabra(ctx, t.oferta.palabra, X0, 822, W, 200, 128, C.tinta);
		filaCifra(ctx, t.oferta.cifra, t.oferta.texto, 1016 + baja, C.tinta, 120, 38);
	} else {
		fuente(ctx, 700, 56, 'texto');
		linea(ctx, T.sinOferta, X0, 840, 70, { color: C.grafito });
	}
	// El lugar, en la costura
	pastilla(ctx, t.lugar, TARJETA_ANCHO / 2, 640, 34, 36);
	pie(ctx);
}

// ——— La costura ———

function laCostura(ctx: Ctx, t: TarjetaV3): void {
	rect(ctx, 0, 0, TARJETA_ANCHO, TARJETA_ALTO, C.paja);
	rect(ctx, 0, 0, TARJETA_ANCHO, 700, C.negro);
	logo(ctx, X0, 64, 80, C.papel);
	contexto(ctx, t, 64, 80);

	const r = t.carriles;
	const X = (f: number) => X0 + Math.min(Math.max(f, 0), 1) * W;
	const ux = X(r.punto);
	const k = r.contratos;

	fuente(ctx, 600, 36, 'texto');
	linea(ctx, T.frenteContratos, X0, 204, 44, { color: C.papel });
	palabra(ctx, t.contratos.palabra, X0, 266, W, 170, 120, C.papel);

	// Carril de contratos
	const yC = 540;
	const hC = 56;
	rect(ctx, X0, yC, W, hC, C.pista, 8);
	const lo = X(k.banda.desde);
	const hi = X(k.banda.hasta);
	const hm = k.incertidumbre ? X(k.incertidumbre.hasta) : hi;
	const te = X(k.excelente.hasta);
	rect(ctx, lo, yC, Math.max(6, hi - lo), hC, C.papel);
	if (k.incertidumbre) rect(ctx, hi, yC, Math.max(0, hm - hi), hC, C.incertidumbre);
	rect(ctx, hm, yC, Math.max(0, te - hm), hC, C.excelente);
	// «lo habitual» dentro de la franja, donde no lo tape el punto (centrado, a la izquierda o a la derecha); si no cabe, debajo
	fuente(ctx, 700, 30, 'semi');
	const wh = ancho(ctx, T.habitual);
	const libre = (x: number) => x + wh < ux - 40 || x > ux + 40;
	const sitio = [(lo + hi) / 2 - wh / 2, lo + 16, hi - 16 - wh].find((x) => x >= lo + 12 && x + wh <= hi - 12 && libre(x));
	if (sitio !== undefined) linea(ctx, T.habitual, sitio, yC, hC, { color: C.tinta });
	else {
		fuente(ctx, 600, 30, 'texto');
		linea(ctx, T.habitual, Math.min(lo, X0 + W - ancho(ctx, T.habitual)), yC + hC + 10, 36, { color: C.suave });
	}

	// La línea del precio: amarilla en la mitad negra, oscura en la paja
	rect(ctx, ux - 4, yC + hC / 2, 8, 700 - (yC + hC / 2), C.paja);
	const yO = 784;
	const hO = 56;
	if (t.oferta && r.oferta) {
		rect(ctx, ux - 4, 700, 8, yO + hO / 2 - 700, C.tinta);
		rect(ctx, X0, yO, W, hO, C.pajaOscura, 8);
		// Margen «en línea»: línea fina bajo el carril
		const b0 = X(r.oferta.margen.desde);
		const b1 = X(r.oferta.margen.hasta);
		rect(ctx, b0, yO + hO + 12, Math.max(4, b1 - b0), 5, C.ciruela, 2);
		const ox = X(r.oferta.marca);
		rect(ctx, ox - 6, yO - 20, 12, hO + 40, C.ciruela, 3);
		fuente(ctx, 600, 30, 'texto');
		const wl = ancho(ctx, T.sePide);
		const xl = ox > TARJETA_ANCHO / 2 ? Math.max(X0, ox - wl) : Math.min(ox, X0 + W - wl);
		linea(ctx, T.sePide, xl, yO + hO + 26, 38, { color: C.tinta });
		circulo(ctx, ux, yO + hO / 2, 56, C.papel, C.tinta, 7);
	}
	circulo(ctx, ux, yC + hC / 2, 56, C.paja, C.negro, 7);
	// «yo» o «el anuncio», apoyado en la costura
	pastilla(ctx, T.punto[t.modo], Math.min(Math.max(ux, 130), TARJETA_ANCHO - 130), 656, 36, 32);

	let baja = 0;
	if (t.oferta) baja = palabra(ctx, t.oferta.palabra, X0, 948, W, 170, 120, C.tinta);
	else {
		fuente(ctx, 700, 56, 'texto');
		linea(ctx, T.sinOferta, X0, 800, 70, { color: C.grafito });
	}
	fuente(ctx, 600, 36, 'texto');
	const l = envolver(ctx, t.oferta ? `${T.frenteOferta} · ${t.lugar}` : t.lugar, W);
	l.slice(0, 2).forEach((s, i) => linea(ctx, s, X0, 1092 + baja + i * 44, 44, { color: C.tinta }));
	pie(ctx);
}

// ——— La cifra ———

function laCifra(ctx: Ctx, t: TarjetaV3): void {
	rect(ctx, 0, 0, TARJETA_ANCHO, TARJETA_ALTO, C.paja);
	rect(ctx, 0, 0, TARJETA_ANCHO, 860, C.negro);
	logo(ctx, X0, 64, 80, C.papel);

	const lugar = `${T.contexto[t.modo]} · ${t.lugar}`;
	const tl = ajustar(ctx, lugar, W, 38, 700, 'semi');
	fuente(ctx, 700, tl, 'semi');
	linea(ctx, lugar, X0, 204, 48, { color: C.papel });

	const cifra = t.contratos.cifra;
	const tam = ajustar(ctx, cifra, TARJETA_ANCHO - 2 * 52, cifra.length > 7 ? 240 : 380, 900, 'extra');
	fuente(ctx, 900, tam, 'extra');
	linea(ctx, cifra, 52, 250 + (380 - tam) * 0.3, tam * 0.9, { color: C.papel });

	fuente(ctx, 700, 52, 'texto');
	envolver(ctx, T.cifra.texto(/veces/.test(cifra), t.modo), 900)
		.slice(0, 3)
		.forEach((s, i) => linea(ctx, s, X0, 620 + i * 60, 60, { color: C.papel }));

	if (t.oferta) {
		fuente(ctx, 600, 42, 'texto');
		linea(ctx, T.cifra.oferta(t.oferta.nivel).trim(), X0, 916, 52, { color: C.tinta });
		const valor =
			t.oferta.clave === 'pidenmas' ? T.cifra.pidenMas(t.oferta.cifra.replace(/^[+−]/, '')) : `${t.oferta.palabra.toLowerCase()} (${t.oferta.cifra})`;
		const tv = ajustar(ctx, `${valor}.`, W, 64, 800, 'texto');
		fuente(ctx, 800, tv, 'texto');
		linea(ctx, `${valor}.`, X0, 976, tv * 1.15, { color: C.tinta });
	}
	pie(ctx);
}

/** Tarjeta de 1080×1350, en el formato que eligió la persona */
export function dibujarTarjetaV3(canvas: HTMLCanvasElement, t: TarjetaV3): void {
	canvas.width = TARJETA_ANCHO;
	canvas.height = TARJETA_ALTO;
	const ctx = canvas.getContext('2d')!;
	if (t.tipo === 'costura') laCostura(ctx, t);
	else if (t.tipo === 'cifra' && t.contratos.cifra) laCifra(ctx, t);
	else dosVeredictos(ctx, t);
}

// ——— Vista previa del enlace: siempre «Dos veredictos» ———

function mitadOg(ctx: Ctx, x: number, frente: string, p: string | null, cifra: string, texto: string, color: string, fuentes: string[]): void {
	const w = OG_ANCHO / 2 - 104;
	const xi = x + 52;
	// Atribuciones al pie, dos líneas pequeñas
	const tf = Math.min(...fuentes.map((f) => ajustar(ctx, f, w, 15, 500, 'semi')));
	fuente(ctx, 500, tf, 'semi');
	fuentes.forEach((f, i) => linea(ctx, f, xi, 566 + i * tf * 1.35, tf * 1.35, { color: color === C.papel ? C.suave : C.tinta }));

	let y = 548;
	if (cifra) {
		const tc = ajustar(ctx, cifra, w, 64, 900, 'extra');
		y -= tc * 0.9;
		fuente(ctx, 900, tc, 'extra');
		linea(ctx, cifra, xi - tc * 0.02, y, tc * 0.9, { color });
	} else if (texto) {
		fuente(ctx, 600, 28, 'texto');
		const l = envolver(ctx, texto, w).slice(0, 2);
		y -= l.length * 34;
		l.forEach((s, i) => linea(ctx, s, xi, y + i * 34, 34, { color }));
	}
	if (p) {
		const tp = ajustar(ctx, p, w, p.length > 10 ? 76 : 112, 800, 'extra');
		y -= tp * 0.86 + 8;
		fuente(ctx, 800, tp, 'extra');
		linea(ctx, p, xi - tp * 0.02, y, tp * 0.86, { color });
	}
	fuente(ctx, 600, 28, 'texto');
	y -= 36 + 6;
	linea(ctx, frente, xi, y, 36, { color });
}

export function dibujarOgV3(canvas: HTMLCanvasElement, t: TarjetaV3): void {
	canvas.width = OG_ANCHO;
	canvas.height = OG_ALTO;
	const ctx = canvas.getContext('2d')!;
	const mitad = OG_ANCHO / 2;
	rect(ctx, 0, 0, mitad, OG_ALTO, C.negro);
	rect(ctx, mitad, 0, mitad, OG_ALTO, C.paja);
	logo(ctx, 52, 48, 64, C.papel);
	const tl = ajustar(ctx, t.lugar, mitad - 104, 30, 700, 'semi');
	fuente(ctx, 700, tl, 'semi');
	linea(ctx, t.lugar, mitad + 52, 48, 64, { color: C.tinta });

	const [ministerio, ine] = T.fuentes[0].split(' · ');
	const [ayuntamiento, dominio] = T.fuentes[1].split(' · ');
	mitadOg(ctx, 0, T.frenteContratos, t.contratos.palabra, t.contratos.cifra, t.contratos.texto, C.papel, [ministerio!, ine!]);
	if (t.oferta) mitadOg(ctx, mitad, T.frenteOferta, t.oferta.palabra, t.oferta.cifra, t.oferta.texto, C.tinta, [ayuntamiento!, dominio!]);
	else mitadOg(ctx, mitad, T.frenteOferta, null, '', T.sinOferta, C.tinta, [ayuntamiento!, dominio!]);
}
