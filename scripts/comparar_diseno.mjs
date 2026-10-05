// Herramienta de desarrollo: pone cada captura de la interfaz junto a su pantalla del diseño.
// 1) renderiza docs/design (que carga Google Fonts: solo para esta comparación, no es parte del producto);
// 2) lee e2e/capturas/<proyecto>/ (npx playwright test) y escribe e2e/capturas/comparativa/*.png y index.html.
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { chromium } from '@playwright/test';

const RAIZ = process.cwd();
const DISENO = join(RAIZ, 'docs/design');
const CAPT = join(RAIZ, 'e2e/capturas');
const SALIDA = join(CAPT, 'comparativa');
mkdirSync(join(CAPT, 'diseno'), { recursive: true });
mkdirSync(SALIDA, { recursive: true });

// nombre de la captura → ids del diseño
const MOVIL = [
	['01-inicio', '3d'], ['02-nivel-a-dentro', '3e'], ['03-nivel-b-explicable', '3f'], ['04-nivel-c-por-encima', '3a'],
	['05-nivel-c-extremo', '3g'], ['06-horquilla', '3h'], ['07-sin-dato-menos-de-30', '5j'], ['08-sin-dato-mas-de-150', '5k'],
	['09-sin-dato-obra-nueva', '5l'], ['10-sin-dato-casa', '5m'], ['11-sin-dato-temporal', '5n'], ['12-sin-dato-pocos-datos', '5o'],
	['14-sin-dato-habitacion', '5p'], ['15-direccion-no-encontrada', '4i'], ['17-sin-conexion', '4k'], ['19-negociar', '4g'],
	['23-pagina-t', '5f']
];
const ESCRITORIO = [
	['01-inicio', '5a'], ['02-nivel-a-dentro', '5c'], ['03-nivel-b-explicable', '5d'], ['04-nivel-c-por-encima', '5b'],
	['06-horquilla', '5e'], ['23-pagina-t', '5g']
];

// Servidor estático para el lienzo del diseño
const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' };
const servidor = createServer((req, res) => {
	const ruta = join(RAIZ, decodeURIComponent(new URL(req.url, 'http://x').pathname));
	if (!ruta.startsWith(RAIZ) || !existsSync(ruta) || !statSync(ruta).isFile()) return res.writeHead(404).end();
	res.writeHead(200, { 'content-type': tipos[extname(ruta)] ?? 'application/octet-stream' });
	createReadStream(ruta).pipe(res);
}).listen(0);
const base = `http://localhost:${servidor.address().port}`;

const nav = await chromium.launch();
const lienzo = await nav.newPage({ viewport: { width: 1500, height: 1000 } });
await lienzo.goto(`${base}/docs/design/${encodeURIComponent('Tiene sentido este precio.dc.html')}`);
await lienzo.waitForTimeout(6000);
const ids = [...new Set([...MOVIL, ...ESCRITORIO, ['', '4a'], ['', '5h']].map((p) => p[1]))];
for (const id of ids) {
	const el = await lienzo.$(`[id="${id}"]`);
	if (!el) { console.log('falta en el diseño:', id); continue; }
	await el.scrollIntoViewIfNeeded();
	await lienzo.waitForTimeout(400);
	await el.screenshot({ path: join(CAPT, 'diseno', `${id}.png`) });
}

const datos = (ruta) => `data:image/${ruta.endsWith('.jpg') ? 'jpeg' : 'png'};base64,${readFileSync(ruta).toString('base64')}`;
const html = (columnas) => `<!doctype html><meta charset=utf-8><body style="margin:0;padding:16px;background:#d9d6cf;font:12px system-ui">
<div style="display:flex;gap:16px;align-items:flex-start">${columnas
	.filter(([, src]) => existsSync(src))
	.map(([titulo, src]) => `<figure style="margin:0"><figcaption style="padding:0 0 6px;font-weight:600">${titulo}</figcaption><img src="${datos(src)}" style="display:block"></figure>`)
	.join('')}</div>`;

const hoja = await nav.newPage({ viewport: { width: 1600, height: 900 } });
const indice = [];
async function par(nombre, idDiseno, proyectos, etiqueta) {
	const columnas = [[`Diseño ${idDiseno}`, join(CAPT, 'diseno', `${idDiseno}.png`)]];
	for (const p of proyectos) columnas.push([`Implementación ${p.replace(/^\D+-/, '')} px`, join(CAPT, p, `${nombre}.png`)]);
	await hoja.setContent(html(columnas));
	await hoja.waitForLoadState('load');
	const destino = join(SALIDA, `${etiqueta ?? 'movil'}-${nombre}.png`);
	await hoja.screenshot({ path: destino, fullPage: true });
	indice.push(destino.replace(`${CAPT}/`, ''));
}
for (const [n, id] of MOVIL) await par(n, id, ['movil-390', 'movil-360'], 'movil');
for (const [n, id] of ESCRITORIO) await par(n, id, ['escritorio-1280'], 'escritorio');

// Tarjeta y vista previa (imágenes, no capturas de pantalla)
for (const [nombre, id, archivo] of [['tarjeta', '4a', '22-tarjeta.jpg'], ['og', '5h', '24-og.jpg']]) {
	const origen = join(CAPT, 'movil-390', archivo);
	if (!existsSync(origen)) continue;
	await hoja.setContent(html([[`Diseño ${id}`, join(CAPT, 'diseno', `${id}.png`)], [`Implementación (${archivo})`, origen]]));
	await hoja.evaluate(() => document.querySelectorAll('img').forEach((i) => (i.style.maxHeight = '700px')));
	const destino = join(SALIDA, `${nombre}.png`);
	await hoja.screenshot({ path: destino, fullPage: true });
	indice.push(destino.replace(`${CAPT}/`, ''));
}

writeFileSync(
	join(CAPT, 'index.html'),
	`<!doctype html><meta charset=utf-8><title>Comparativa con el diseño</title><body style="font:14px system-ui;padding:16px">${indice
		.map((f) => `<h3>${f}</h3><img src="${f}" style="max-width:100%">`)
		.join('')}`
);
console.log(`${indice.length} comparativas en e2e/capturas/comparativa/ (índice: e2e/capturas/index.html)`);
await nav.close();
servidor.close();
