import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { EVENTOS, ORIGENES_BARCELONA, filtrarEvento } from '../src/lib/cliente/analitica-filtro';
import {
	AUTOR, AUTOR_PUESTO, BARCELONA, BARRIOS_PILOTO, ENTRADAS_SITEMAP, ESTADISTICA_SERPAVI_MADRID, PAGINAS_EN, PREGUNTAS, QUIENES_SOMOS, construirBarrio, jsonLdEn, jsonLdPregunta
} from '../src/lib/resultado';

const fuente = (ruta: string) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const URL_ESTADISTICA =
	'https://www.madrid.es/portales/munimadrid/es/Inicio/El-Ayuntamiento/Estadistica/Areas-de-informacion-estadistica/Edificacion-y-vivienda/Mercado-de-la-vivienda/Sistema-estatal-de-indices-de-referencia-del-precio-del-alquiler-de-viviendas/?vgnextfmt=default&vgnextoid=a386d9a1fe930910VgnVCM2000001f4a900aRCRD&vgnextchannel=22613c7ea422a210VgnVCM1000000b205a0aRCRD';
const base = { token: 'phc_x', distinct_id: '$posthog_cookieless', $cookieless_mode: true, $process_person_profile: false, v: 1, navegador_app: 'ninguno', tarjeta_origen: null, interno: false };

describe('estadística SERPAVI del Ayuntamiento de Madrid', () => {
	it('la URL y el texto salen de una constante de configuración', () => {
		expect(ESTADISTICA_SERPAVI_MADRID.texto).toBe('Estadística SERPAVI · Ayuntamiento de Madrid');
		expect(ESTADISTICA_SERPAVI_MADRID.url).toBe(URL_ESTADISTICA);
		expect(JSON.parse(fuente('config/enlaces.json')).estadistica_serpavi_madrid.url).toBe(URL_ESTADISTICA);
		// Ninguna página la escribe a mano: todas usan la constante
		for (const f of ['src/routes/mapa/+page.svelte', 'src/routes/como-calculamos/+page.svelte', 'src/lib/resultado/barrios.ts']) expect(fuente(f), f).not.toContain('madrid.es/portales');
	});
	it('se abre en pestaña nueva con rel="noopener" en /mapa y en «Cómo calculamos»', () => {
		for (const f of ['src/routes/mapa/+page.svelte', 'src/routes/como-calculamos/+page.svelte']) {
			const s = fuente(f);
			expect(s, f).toMatch(/href=\{ESTADISTICA_SERPAVI_MADRID\.url\} target="_blank" rel="noopener">\{ESTADISTICA_SERPAVI_MADRID\.texto\}/);
		}
	});
	it('está en las 15 páginas de barrio, marcada para abrirse en pestaña nueva', () => {
		const datos = {
			secciones: JSON.parse(fuente('data/processed/secciones_madrid.json')),
			barrios: JSON.parse(fuente('data/processed/seccion_barrio.json')).barrios,
			ipc: JSON.parse(fuente('data/processed/ipc_alquiler.json')),
			vecinas: JSON.parse(fuente('data/processed/vecinas.json'))
		};
		for (const b of BARRIOS_PILOTO) {
			const e = construirBarrio(datos, b.slug)!.comoLeer.enlaces.find((x) => x.url === URL_ESTADISTICA);
			expect(e, b.slug).toMatchObject({ texto: 'Estadística SERPAVI · Ayuntamiento de Madrid', nuevaPestana: true });
		}
		expect(fuente('src/routes/alquiler/[slug]/+page.svelte')).toContain('target="_blank" rel="noopener"');
	});
});

describe('«¿Y Barcelona?»', () => {
	it('textos pedidos y página estática sin formulario ni correo', () => {
		expect(BARCELONA.enlace).toBe('¿Y Barcelona?');
		expect(`${BARCELONA.titulo}. ${BARCELONA.texto}`).toBe('Barcelona todavía no. Medimos el interés antes de decidir.');
		const s = fuente('src/routes/barcelona/+page.svelte');
		expect(s).not.toMatch(/<form|<input|<textarea|mailto:|@asuprecio|hola@/);
		expect(s.match(/<h1[\s>]/g)).toHaveLength(1);
	});
	it('el enlace está bajo la tarjeta compartible y en «Cómo calculamos», y cuenta el clic con su origen', () => {
		const compartir = fuente('src/lib/componentes/Compartir.svelte');
		expect(compartir).toContain(`href="/barcelona" onclick={() => barcelonaClic('resultado')}`);
		expect(compartir.indexOf('/barcelona')).toBeGreaterThan(compartir.indexOf('role="status"'));
		expect(fuente('src/routes/como-calculamos/+page.svelte')).toContain(`href="/barcelona" onclick={() => barcelonaClic('como_calculamos')}`);
	});
	it('barcelona_clic: lista blanca con solo «origen» (resultado | como_calculamos)', () => {
		expect(EVENTOS.barcelona_clic).toEqual(['origen']);
		expect(ORIGENES_BARCELONA).toEqual(['resultado', 'como_calculamos']);
		expect(filtrarEvento({ event: 'barcelona_clic', properties: { ...base, origen: 'resultado' } })!.properties).toHaveProperty('origen', 'resultado');
		expect(filtrarEvento({ event: 'barcelona_clic', properties: { ...base, origen: 'como_calculamos' } })!.properties).toHaveProperty('origen', 'como_calculamos');
		// Otro origen no sale; tampoco dirección, precio, coordenadas ni nada que no sea del evento
		const r = filtrarEvento({ event: 'barcelona_clic', properties: { ...base, origen: 'portada', direccion: 'Calle Mayor 1', precio: 1500, metros: 70, lat: 40.4, lng: -3.7 } })!.properties!;
		expect(r).not.toHaveProperty('origen');
		for (const k of ['direccion', 'precio', 'metros', 'lat', 'lng']) expect(r).not.toHaveProperty(k);
	});
});

describe('/barcelona no se indexa', () => {
	it('meta robots, X-Robots-Tag del Worker y de los ficheros estáticos; fuera del sitemap', () => {
		expect(fuente('src/routes/+layout.svelte')).toContain("page.route.id === '/barcelona'");
		expect(fuente('src/hooks.server.ts')).toContain("event.url.pathname === '/barcelona'");
		expect(fuente('scripts/cabeceras.mjs')).toMatch(/\/barcelona\\n {2}X-Robots-Tag: noindex, nofollow/);
		expect(ENTRADAS_SITEMAP.some((e) => e.ruta === '/barcelona')).toBe(false);
	});
});

describe('«Quiénes somos» y el autor de las páginas', () => {
	it('el autor es quien nombra «Quiénes somos», con su puesto, en el JSON-LD y en la página', () => {
		expect(AUTOR).toBe('Andres Barriga');
		expect(QUIENES_SOMOS.join(' ')).toContain(`${AUTOR}, ${AUTOR_PUESTO} de Madrid`);
		const art = (jsonLdPregunta(PREGUNTAS[0]!) as Record<string, any>[])[0]!;
		expect(art.author).toMatchObject({ '@type': 'Person', name: 'Andres Barriga', jobTitle: 'Product Manager' });
		expect(art.publisher).toMatchObject({ '@type': 'Organization', name: 'A su precio' });
		const en = (jsonLdEn(PAGINAS_EN[0]!) as Record<string, any>[])[0]!;
		expect(en.author).toMatchObject({ '@type': 'Person', name: 'Andres Barriga' });
	});
});

describe('«Quiénes somos» (texto)', () => {
	it('nombra a quien creó A su precio', () => {
		expect(QUIENES_SOMOS.join(' ')).toContain('Andres Barriga, Product Manager de Madrid');
	});
});
