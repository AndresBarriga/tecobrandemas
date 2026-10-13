// Genera static/og/*.png (1200×630): la imagen de vista previa (og:image) de /preguntas, cada pregunta, /mapa y /en.
// UNA plantilla: panel de Paja a la izquierda con el icono y el nombre (como las tarjetas y og-portada.png) y, a la derecha,
// el título de la página y «asuprecio.com». La lista de páginas y sus títulos está en src/lib/resultado/og-paginas.json
// (un test comprueba que cada título es el H1 de su página y que cada imagen existe y pesa menos de 300 KB).
// Uso: node scripts/og_paginas.mjs   (usa Playwright y las fuentes de static/fonts; no hace falta servidor)
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const paginas = JSON.parse(readFileSync('src/lib/resultado/og-paginas.json', 'utf8'));
const textos = readFileSync('src/lib/resultado/textos.ts', 'utf8');
const NOMBRE = /export const NOMBRE = '([^']+)'/.exec(textos)[1];
const LEMA = /export const LEMA = '([^']+)'/.exec(textos)[1];

const fuente = (n) => pathToFileURL(`${process.cwd()}/static/fonts/${n}.woff2`).href;
const icono = `data:image/svg+xml;base64,${readFileSync('static/brand/avatar-asuprecio.svg').toString('base64')}`;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
// Tamaño del título según su longitud, para que quepa en 4 líneas como mucho y se lea en una miniatura
const tamano = (t) => (t.length <= 34 ? 104 : t.length <= 52 ? 88 : t.length <= 66 ? 78 : 70);

const plantilla = (titulo) => `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Texto;src:url(${fuente('sofia-sans')});font-weight:100 900}
@font-face{font-family:Extra;src:url(${fuente('sofia-sans-extra-condensed')});font-weight:100 900}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#F6F4EE;color:#1C1B19;display:flex;font-family:Texto}
.izq{flex:none;width:380px;height:630px;background:#EBC85A;padding:48px 40px;display:flex;flex-direction:column;justify-content:space-between}
.icono{width:160px;height:160px;border-radius:22%;box-shadow:0 0 0 5px #1C1B19}
.nombre{font:800 78px/0.9 Extra;text-transform:uppercase;letter-spacing:.01em}
.lema{font:600 24px/1.2 Texto;margin-top:12px}
.der{flex:1;min-width:0;padding:56px 56px 48px;display:flex;flex-direction:column;justify-content:space-between}
h1{font:800 ${tamano(titulo)}px/0.95 Extra;text-transform:uppercase;text-wrap:balance}
.dominio{font:700 44px/1 Texto;align-self:flex-start;background:linear-gradient(transparent 62%,#EBC85A 62%)}
</style>
<div class="izq"><img class="icono" src="${icono}"><div><div class="nombre">${NOMBRE}</div><div class="lema">${LEMA}</div></div></div>
<div class="der"><h1>${esc(titulo)}</h1><div class="dominio">asuprecio.com</div></div>`;

mkdirSync('static/og', { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
const dir = mkdtempSync(join(tmpdir(), 'og-'));
for (const { imagen, titulo } of paginas) {
	// Desde un fichero (no setContent): así el navegador deja cargar las fuentes locales
	const ruta = join(dir, 'og.html');
	writeFileSync(ruta, plantilla(titulo));
	await p.goto(pathToFileURL(ruta).href);
	await p.evaluate(() => document.fonts.ready);
	await p.waitForTimeout(200);
	await p.screenshot({ path: `static/og/${imagen}` });
	console.log(`static/og/${imagen}`);
}
await b.close();
