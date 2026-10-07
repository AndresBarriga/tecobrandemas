// Genera static/og-portada.png (1200×630): imagen de vista previa de la portada, con el estilo de las tarjetas
// (panel de Paja a la izquierda con el icono y el nombre; a la derecha, el titular de la portada).
// Uso: node scripts/og_portada.mjs   (usa Playwright y las fuentes de static/fonts; no hace falta servidor)
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const textos = readFileSync('src/lib/resultado/textos.ts', 'utf8');
const dato = (re) => re.exec(textos)?.[1] ?? (() => { throw new Error(`No encuentro ${re}`); })();
const NOMBRE = dato(/export const NOMBRE = '([^']+)'/);
const LEMA = dato(/export const LEMA = '([^']+)'/);
const [t1, t2] = /export const TITULAR_INICIO = \['([^']+)', '([^']+)'\]/.exec(textos).slice(1);
const SUB = dato(/export const SUBTITULAR_INICIO =\s*'([^']+)'/);

const fuente = (n) => pathToFileURL(`${process.cwd()}/static/fonts/${n}.woff2`).href;
const icono = `data:image/svg+xml;base64,${readFileSync('static/brand/avatar-asuprecio.svg').toString('base64')}`;
const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Texto;src:url(${fuente('sofia-sans')});font-weight:100 900}
@font-face{font-family:Extra;src:url(${fuente('sofia-sans-extra-condensed')});font-weight:100 900}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#F6F4EE;color:#1C1B19;display:flex;font-family:Texto}
.izq{flex:none;width:500px;height:630px;background:#EBC85A;padding:56px 48px;display:flex;flex-direction:column;justify-content:space-between}
.icono{width:200px;height:200px;border-radius:22%;box-shadow:0 0 0 6px #1C1B19}
.nombre{font:800 96px/0.9 Extra;text-transform:uppercase;letter-spacing:.01em}
.lema{font:600 34px/1.2 Texto;margin-top:14px}
.der{flex:1;min-width:0;padding:56px 48px;display:flex;flex-direction:column;justify-content:center;gap:36px}
h1{font:800 76px/0.95 Extra;text-transform:uppercase;white-space:nowrap}
h1 span{display:block}
h1 span+span{background:linear-gradient(transparent 70%,#EBC85A 70%);align-self:flex-start;display:inline-block}
p{font:500 30px/1.3 Texto;color:#5A5750}
</style>
<div class="izq"><img class="icono" src="${icono}"><div><div class="nombre">${NOMBRE}</div><div class="lema">${LEMA}</div></div></div>
<div class="der"><h1><span>${t1}</span><span>${t2}</span></h1><p>${SUB}</p></div>`;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
// Desde un fichero (no setContent): así el navegador deja cargar las fuentes locales
const ruta = join(mkdtempSync(join(tmpdir(), 'og-')), 'og.html');
writeFileSync(ruta, html);
await p.goto(pathToFileURL(ruta).href);
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(300);
await p.screenshot({ path: 'static/og-portada.png' });
await b.close();
console.log('static/og-portada.png');
