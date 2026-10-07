// Informe de lanzamiento: comprueba contra un despliegue real lo que el plan promete.
//   BASE_URL=https://asuprecio.com npm run informe:lanzamiento
// Mide el sitio publicado, no `vite dev` (en desarrollo el bundle y el rendimiento no son representativos).
// Sale con código 1 si algo falla y escribe informe-lanzamiento.md.
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { AxeBuilder } from '@axe-core/playwright';
import { chromium } from '@playwright/test';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';

const BASE = (process.env.BASE_URL ?? 'https://asuprecio.com').replace(/\/$/, '');
const ORIGEN = new URL(BASE).origin;
const PAGINAS = ['/', '/como-calculamos', '/cuanto-pagas'];
const LIMITE_BUNDLE = 165 * 1024; // 150 KB hasta añadir PostHog (+50 KB); subido a 165 KB el 07/10/2026
const MINIMO_LIGHTHOUSE = 90;

const filas = [];
const registrar = (comprobacion, ok, detalle) => filas.push({ comprobacion, ok, detalle });
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

// ——— 1. CSP sin orígenes externos ———
async function csp() {
	const problemas = [];
	for (const ruta of PAGINAS) {
		const r = await fetch(BASE + ruta);
		const html = await r.text();
		const cabecera = r.headers.get('content-security-policy');
		const meta = html.match(/<meta[^>]+http-equiv="content-security-policy"[^>]+content="([^"]+)"/i)?.[1];
		const politica = cabecera ?? meta;
		if (!politica) {
			problemas.push(`${ruta}: sin CSP`);
			continue;
		}
		for (const directiva of politica.split(';').map((d) => d.trim()).filter(Boolean)) {
			const [nombre, ...fuentes] = directiva.split(/\s+/);
			for (const f of fuentes) if (/^(https?:|\/\/|\*)/.test(f)) problemas.push(`${ruta}: ${nombre} permite ${f}`);
			if (nombre === 'default-src' && !fuentes.includes("'self'")) problemas.push(`${ruta}: default-src sin 'self'`);
		}
	}
	registrar('CSP sin orígenes externos', problemas.length === 0, problemas.join('; ') || `${PAGINAS.length} páginas con CSP solo de 'self'`);
}

// ——— 2, 3, 5 y 6: navegación real (peticiones, cookies, bundle inicial y axe) ———
async function navegacion() {
	const navegador = await chromium.launch();
	const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'es-ES' });
	const externas = new Set();
	const fuentes = new Set();
	const cabecerasCookie = [];
	const enlaces = [];
	// No se cuentan como visitas reales: se bloquea la analítica (PostHog, vía /r7k)
	await contexto.route('**/r7k/**', (r) => r.fulfill({ status: 204 }));

	const vigilar = (page) => {
		page.on('request', (r) => {
			const u = new URL(r.url());
			if (['data:', 'blob:'].includes(u.protocol)) return;
			if (u.origin !== ORIGEN) externas.add(r.url());
			if (r.resourceType() === 'font') fuentes.add(u.origin === ORIGEN ? 'propia' : r.url());
		});
		page.on('response', (r) => enlaces.push(r.allHeaders().then((h) => h['set-cookie'] && cabecerasCookie.push(r.url()))));
	};

	// Bundle inicial: JS y CSS de la portada en una carga limpia, comprimidos con gzip
	const portada = await contexto.newPage();
	vigilar(portada);
	const recursos = [];
	portada.on('response', (r) => {
		const tipo = r.request().resourceType();
		if (['script', 'stylesheet'].includes(tipo) && new URL(r.url()).origin === ORIGEN) recursos.push(r);
	});
	await portada.goto(BASE + '/', { waitUntil: 'networkidle' });
	let js = 0;
	let css = 0;
	for (const r of recursos) {
		const tamaño = gzipSync(await r.body()).length;
		if (r.request().resourceType() === 'script') js += tamaño;
		else css += tamaño;
	}
	registrar('Bundle inicial < 165 KB gz', js + css < LIMITE_BUNDLE, `JS ${kb(js)} + CSS ${kb(css)} = ${kb(js + css)} (${recursos.length} ficheros)`);

	// Axe en las pantallas principales
	const abrir = async (ruta) => {
		const page = await contexto.newPage();
		vigilar(page);
		await page.goto(BASE + ruta, { waitUntil: 'networkidle' });
		await page.locator('[data-listo=true]').waitFor({ timeout: 10_000 }).catch(() => {});
		return page;
	};
	const rellenar = async (page, direccion, precio, m2) => {
		await page.fill('#direccion', direccion);
		await page.fill('#precio', precio);
		await page.fill('#superficie', m2);
		await page.locator('form').getByRole('button', { name: /^Comprobar el precio$/ }).click();
	};
	const pantallas = [
		['Inicio', async () => abrir('/')],
		['Resultado (por encima del techo)', async () => { const p = await abrir('/'); await rellenar(p, 'Calle de Fuente del Berro 14', '2500', '90'); await p.getByText('Por encima del techo').first().waitFor(); await p.waitForTimeout(1200); return p; }],
		['Resultado (dentro)', async () => { const p = await abrir('/'); await rellenar(p, 'Calle de Fuente del Berro 14', '1400', '90'); await p.getByText(/Dentro de la referencia/).first().waitFor(); await p.waitForTimeout(1200); return p; }],
		['Sin datos', async () => { const p = await abrir('/'); await rellenar(p, 'Calle Granaderos 23', '1400', '58'); await p.getByRole('heading', { name: 'Sin datos aquí' }).waitFor(); return p; }],
		['Cómo calculamos', async () => abrir('/como-calculamos')],
		['¿Cuánto pagas tú?', async () => abrir('/cuanto-pagas')]
	];
	const graves = [];
	const otras = [];
	for (const [nombre, preparar] of pantallas) {
		try {
			const page = await preparar();
			const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
			for (const v of violations) {
				const linea = `${nombre}: ${v.id} (${v.impact}, ${v.nodes.length} elementos) — ${v.help}`;
				(['serious', 'critical'].includes(v.impact) ? graves : otras).push(linea);
			}
			await page.close();
		} catch (e) {
			graves.push(`${nombre}: no se pudo comprobar (${String(e.message).split('\n')[0]})`);
		}
	}
	registrar('axe sin errores graves', graves.length === 0, graves.join('; ') || `${pantallas.length} pantallas sin errores serios ni críticos${otras.length ? `; ${otras.length} avisos menores` : ''}`);
	if (otras.length) filas.push({ comprobacion: 'axe: avisos menores (informativo)', ok: true, detalle: otras.join('; ') });

	await Promise.all(enlaces);
	registrar('Ninguna petición a terceros', externas.size === 0, [...externas].join(', ') || 'Todo sale de ' + ORIGEN);
	registrar('Fuentes alojadas', fuentes.size > 0 && ![...fuentes].some((f) => f !== 'propia'), fuentes.size ? [...fuentes].join(', ') : 'No se cargó ninguna fuente');
	const cookies = await contexto.cookies();
	const enPagina = await portada.evaluate(() => document.cookie);
	registrar('Ninguna cookie', cookies.length === 0 && cabecerasCookie.length === 0 && enPagina === '', cookies.length || cabecerasCookie.length || enPagina ? `cookies: ${cookies.map((c) => c.name).join(', ')}; Set-Cookie en: ${cabecerasCookie.join(', ')}` : 'Sin cookies ni cabeceras Set-Cookie');
	await navegador.close();
}

// ——— 4. Lighthouse móvil ———
async function faros() {
	const chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new', '--no-sandbox'] });
	try {
		for (const ruta of ['/', '/como-calculamos']) {
			const { lhr } = await lighthouse(BASE + ruta, // No se cuentan como visitas reales: se bloquea la analítica (PostHog, vía /r7k)
				{ port: chrome.port, output: 'json', logLevel: 'error', blockedUrlPatterns: ['*r7k*'] }, undefined);
			const puntos = Object.fromEntries(Object.entries(lhr.categories).map(([k, c]) => [k, Math.round((c.score ?? 0) * 100)]));
			const exigidas = ['performance', 'accessibility', 'best-practices'].filter((k) => puntos[k] < MINIMO_LIGHTHOUSE);
			const seo = lhr.audits['is-crawlable']?.score === 0 ? ' (SEO baja solo por el noindex activo, esperado hasta el lanzamiento)' : '';
			const peores = exigidas.flatMap((k) =>
				lhr.categories[k].auditRefs.filter((a) => a.weight > 0 && lhr.audits[a.id].score !== null && lhr.audits[a.id].score < 0.9).slice(0, 3).map((a) => lhr.audits[a.id].title)
			);
			registrar(
				`Lighthouse móvil ≥ 90 · ${ruta}`,
				exigidas.length === 0,
				`rendimiento ${puntos.performance}, accesibilidad ${puntos.accessibility}, buenas prácticas ${puntos['best-practices']}, SEO ${puntos.seo}${seo}` + (peores.length ? `. Peor: ${peores.join('; ')}` : '')
			);
		}
	} finally {
		await chrome.kill();
	}
}

console.log(`Informe de lanzamiento de ${BASE}\n`);
for (const paso of [csp, navegacion, faros]) {
	try {
		await paso();
	} catch (e) {
		registrar(paso.name, false, `no se pudo ejecutar: ${String(e.message).split('\n')[0]}`);
	}
}

const orden = ['CSP', 'Ninguna petición', 'Fuentes', 'Ninguna cookie', 'Bundle', 'axe', 'Lighthouse'];
filas.sort((a, b) => orden.findIndex((o) => a.comprobacion.startsWith(o)) - orden.findIndex((o) => b.comprobacion.startsWith(o)));
const md = [
	`# Informe de lanzamiento`,
	``,
	`${BASE} · ${new Date().toISOString()}`,
	``,
	`| Comprobación | Resultado | Detalle |`,
	`|---|---|---|`,
	...filas.map((f) => `| ${f.comprobacion} | ${f.ok ? 'pasa' : '**FALLA**'} | ${f.detalle.replace(/\|/g, '/')} |`)
].join('\n');
console.log(md);
writeFileSync('informe-lanzamiento.md', md + '\n');
process.exit(filas.some((f) => !f.ok) ? 1 : 0);
