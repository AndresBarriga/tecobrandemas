import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { construirMetodologia, type IpcJson } from '../src/lib/resultado';

const ipc = JSON.parse(readFileSync('data/processed/ipc_alquiler.json', 'utf8')) as IpcJson;
const m = construirMetodologia(ipc);
const texto = JSON.stringify(m);

describe('página de metodología', () => {
	it('usa el nombre definitivo y ningún nombre anterior', () => {
		expect(texto).toContain('A su precio');
		expect(texto).not.toMatch(/De Más|Tiene sentido/i);
	});
	it('lee el factor y el mes del IPC, no los copia', () => {
		expect(texto).toContain('factor 1,054');
		expect(texto).toContain('agosto de 2026');
		const otro = JSON.stringify(construirMetodologia({ ...ipc, factor: 1.1, ultimo_mes: '2027-01' }));
		expect(otro).toContain('factor 1,1');
		expect(otro).toContain('enero de 2027');
	});
	it('Tus datos refleja lo que se guarda y Quiénes somos tiene el correo', () => {
		const datos = m.secciones.find((x) => x.id === 'tus-datos')!.parrafos.join(' ');
		expect(datos).toMatch(/barrio, el mes, el precio, los metros/);
		expect(datos).toMatch(/nunca guardamos la dirección ni tu IP/i);
		expect(m.secciones.find((x) => x.id === 'quienes-somos')!.contacto?.correo).toBe('andresbarrigaru@gmail.com');
	});
	it('no usa palabras prohibidas', () => {
		expect(texto).not.toMatch(/ilegal|abusiv|actualizado a hoy/i);
	});
	it('incluye quiénes somos, financiación y las atribuciones obligatorias', () => {
		const ids = m.secciones.map((s) => s.id);
		expect(ids).toEqual(expect.arrayContaining(['quienes-somos', 'financiacion', 'limites', 'precio-pedido']));
		expect(m.atribuciones).toContain('Origen de los datos: Ministerio de Vivienda y Agenda Urbana');
		expect(m.enlaceOficial).toContain('serpavi.mivau.gob.es');
	});
});
