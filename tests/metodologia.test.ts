import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	type BarrioJson, type DatosMadrid, type OfertaJson, type SeccionJson, CUSEC_EJEMPLO, construirMetodologia
} from '../src/lib/resultado';

const leer = <T>(f: string) => JSON.parse(readFileSync(`data/processed/${f}`, 'utf8')) as T;
const datos: DatosMadrid = {
	secciones: leer<Record<string, SeccionJson>>('secciones_madrid.json'),
	barrios: leer<{ barrios: Record<string, BarrioJson> }>('seccion_barrio.json').barrios,
	oferta: leer<OfertaJson>('oferta_madrid.json')
};
const m = construirMetodologia(datos);
const texto = JSON.stringify(m);

describe('página «Cómo calculamos»', () => {
	it('usa el nombre definitivo y ningún nombre anterior', () => {
		expect(texto).toContain('A su precio');
		expect(texto).not.toMatch(/De Más/i);
	});

	it('no aplica ningún factor de IPC: dice de qué año son los datos y que los alquileres han subido desde entonces', () => {
		const nota = 'Datos de rentas declaradas en 2024 (SERPAVI); los alquileres han subido desde entonces.';
		expect(m.notaDatos).toBe(nota);
		expect(m.fuentes.datos).toBe(nota);
		const todo = JSON.stringify(m);
		expect(todo).not.toMatch(/IPC|factor 1,|ajuste del IPC/);
		expect(m.fuentes.filas.map((f) => f.host)).not.toContain('ine.es');
	});

	it('el ejemplo sale del motor con los datos de la zona: dos pasos de contratos, uno de oferta y el resultado, en la misma escala', () => {
		const e = m.ejemplo!;
		expect(e.pasos.map((p) => p.fuente)).toEqual(['contratos', 'contratos', 'oferta', 'precio']);
		expect(datos.secciones[CUSEC_EJEMPLO]).toBeTruthy();
		const [con, exc, ofe] = e.pasos.map((p) => p.carril);
		expect(exc!.excelente!.desde).toBeCloseTo(con!.banda!.hasta, 6);
		// La oferta: la marca en el centro de su margen «en línea»
		expect(ofe!.marca!).toBeCloseTo((ofe!.margen!.desde + ofe!.margen!.hasta) / 2, 2);
		for (const c of [con, exc]) for (const x of [c!.banda!.desde, c!.banda!.hasta]) expect(x).toBeGreaterThanOrEqual(0), expect(x).toBeLessThanOrEqual(1);
		// El último paso es el resultado tal cual: «Un anuncio», con las dos mitades
		expect(e.pasos.at(-1)!.carril).toBeNull();
		expect(e.costura.modo).toBe('mirando');
		expect(e.costura.mitades.map((x) => x.fuente)).toEqual(['oferta', 'contratos']);
		expect(e.intro).toContain('Delicias');
	});

	it('cómo se lee: las palabras del resultado, con su punto dentro de la escala y en orden', () => {
		const [c, o] = m.lectura!.grupos;
		expect(c!.items.map((n) => n.palabra)).toEqual(['POR DEBAJO', 'DENTRO', 'ALGO POR ENCIMA', 'POR ENCIMA']);
		expect(o!.items.map((n) => n.palabra)).toEqual(['EN LÍNEA', 'POR ENCIMA', 'POR DEBAJO', 'PIDEN MÁS']);
		const xs = c!.items.map((n) => n.carril.punto!);
		expect(xs).toEqual([...xs].sort((a, b) => a - b));
		expect(xs.every((x) => x > 0 && x < 1)).toBe(true);
		expect(m.lectura!.asuPrecio.titulo).toBe('A su precio.');
		// Nada de las etiquetas de antes
		expect(texto).not.toMatch(/Se sale de lo habitual|Dentro de rango|parte alta»/);
	});

	it('Tus datos refleja lo que se guarda, y no más', () => {
		const d = m.datos.parrafos.join(' ');
		expect(d).toMatch(/barrio, el mes, el precio, los metros/);
		expect(d).toMatch(/nunca la dirección ni tu IP/);
		expect(m.datos.guardamos).toEqual([
			'El barrio', 'El mes', 'El precio o la renta', 'Los metros', 'El nivel del resultado',
			'El mes y año de firma, si aportas tu alquiler', 'Habitaciones del piso, tramo de tamaño y gastos, si aportas una habitación'
		]);
		expect(m.datos.noGuardamos).toContain('Tu IP');
		// Aportaciones de inquilinos y habitaciones: qué se guarda, y lo que no
		expect(d).toMatch(/Aportar mi alquiler/);
		expect(d).toMatch(/Aportar mi habitación/);
		expect(d).toMatch(/nunca los metros exactos/);
		expect(d).toMatch(/las coordenadas no se envían ni se guardan/);
	});

	it('Lo que no calculamos enlaza a las siete pantallas sin dato', () => {
		expect(m.limites.items.map((l) => l.clave)).toEqual([
			'superficie_menor', 'superficie_mayor', 'obra_nueva', 'unifamiliar', 'temporal', 'testigos', 'habitacion'
		]);
	});

	it('Quiénes somos y Financiación llevan los textos y el correo; nunca «sección» ni palabras prohibidas', () => {
		expect(m.quienesSomos.contacto.correo).toBe('hola@asuprecio.com');
		expect(m.financiacion.join(' ')).toMatch(/independiente/);
		expect(texto).not.toMatch(/ilegal|abusiv|actualizado a hoy/i);
	});

	it('las atribuciones son las literales y hay enlace al valor oficial', () => {
		expect(m.atribuciones).toContain('Origen de los datos: Ministerio de Vivienda y Agenda Urbana');
		expect(m.atribuciones).toContain('Elaboración propia con datos extraídos del sitio web del INE: www.ine.es');
		expect(m.fuentes.enlaceOficial).toContain('serpavi.mivau.gob.es');
		expect(texto).toContain('CartoCiudad CC-BY 4.0 scne.es');
	});

	it('sin datos de la sección, la página se ve igual pero sin ejemplo ni «cómo se lee» dibujados', () => {
		const vacia = construirMetodologia({ ...datos, secciones: {} });
		expect(vacia.ejemplo).toBeNull();
		expect(vacia.lectura).toBeNull();
	});
});
