import { describe, expect, it } from 'vitest';
import { aCsv, calcularMetricas, mediana } from '../src/lib/server/metricas';
import { d1Registro } from './d1';

function con(filas: { eventos?: [string, string][]; analisis?: [string, number, number, string][]; aportaciones?: [string, number, number][]; tarjetas?: number }) {
	const { db, d1 } = d1Registro();
	for (const [tipo, visita] of filas.eventos ?? []) db.prepare('INSERT INTO eventos (tipo, ts, visita, tarjeta) VALUES (?, ?, ?, NULL)').run(tipo, Date.now(), visita);
	for (const [b, p, m2, n] of filas.analisis ?? []) db.prepare('INSERT INTO analisis (mes, barrio, precio, m2, nivel) VALUES (?, ?, ?, ?, ?)').run('2026-10', b, p, m2, n);
	for (const [b, p, m2] of filas.aportaciones ?? []) db.prepare('INSERT INTO aportaciones (mes, barrio, precio, m2, anio_contrato) VALUES (?, ?, ?, ?, 2022)').run('2026-10', b, p, m2);
	for (let i = 0; i < (filas.tarjetas ?? 0); i++) db.prepare("INSERT INTO tarjetas (id, mes, barrio, nivel, datos) VALUES (?, '2026-10', '071', 'c', '{}')").run(`t${i}`);
	return d1;
}
const ev = (tipo: string, n: number, prefijo = 'v') => Array.from({ length: n }, (_, i): [string, string] => [tipo, `${prefijo}${i}`]);

describe('métricas internas', () => {
	it('el embudo cuenta visitas distintas y calcula H1-H4 con sus objetivos', async () => {
		const d1 = con({
			eventos: [...ev('llegada', 100), ...ev('empieza', 30), ...ev('completa', 24), ...ev('comparte', 3), ...ev('desde_tarjeta', 2), ...ev('servido_si', 7), ...ev('servido_no', 3), ['completa', 'v0']],
			tarjetas: 5
		});
		const m = await calcularMetricas(d1);
		const por = Object.fromEntries(m.objetivos.map((o) => [o.id, o]));
		expect(m.embudo.completan).toBe(24); // v0 completa dos veces: una sola visita
		expect(m.analisisTotales).toBe(25); // pero son 25 análisis
		expect(por.H1).toMatchObject({ valor: 0.3, cumple: true });
		expect(por.H2).toMatchObject({ valor: 0.8, cumple: true });
		expect(por.H3).toMatchObject({ valor: 0.125, cumple: true });
		expect(por.H4).toMatchObject({ numerador: 2, denominador: 5, valor: 0.4, cumple: true });
		expect(por.util).toMatchObject({ valor: 0.7, cumple: true });
		expect(por.segundo!.cumple).toBeNull(); // «medir»: sin objetivo
	});

	it('sin datos, los ratios son null y no cumplen ni fallan', async () => {
		const m = await calcularMetricas(con({}));
		expect(m.objetivos.every((o) => o.valor === null && o.cumple === null)).toBe(true);
	});

	it('por barrio solo salen los de 10 o más observaciones, y las aportaciones van aparte', async () => {
		const analisis: [string, number, number, string][] = [
			...Array.from({ length: 10 }, (_, i): [string, number, number, string] => ['071', 1000 + i * 100, 50, i < 3 ? 'c' : 'a']),
			...Array.from({ length: 9 }, (): [string, number, number, string] => ['072', 1500, 50, 'c'])
		];
		const m = await calcularMetricas(con({ analisis, aportaciones: Array.from({ length: 4 }, (): [string, number, number] => ['071', 900, 60]) }));
		expect(m.barrios.map((b) => b.barrio)).toEqual(['071']);
		expect(m.barrios[0]).toMatchObject({ n: 10, porEncima: 0.3 });
		expect(m.barrios[0]!.medianaPrecio).toBe(1450);
		expect(m.aportaciones).toEqual([]); // 4 aportaciones: por debajo de 10, aunque haya 10 análisis en ese barrio
	});

	it('el CSV solo lleva agregados: ni precios sueltos, ni sesiones, ni tarjetas', async () => {
		const m = await calcularMetricas(
			con({ eventos: ev('llegada', 5), analisis: Array.from({ length: 10 }, (): [string, number, number, string] => ['071', 1234, 50, 'b']) })
		);
		const csv = aCsv(m, () => 'Goya');
		expect(csv.barrios.split('\n')[0]).toBe('barrio,nombre,analisis,mediana_precio,mediana_euros_m2,fraccion_por_encima_del_techo');
		expect(csv.barrios).toContain('071,Goya,10,1234,24.68,0');
		expect(Object.values(csv).join('')).not.toMatch(/v0|v1/);
	});

	it('mediana', () => {
		expect(mediana([3, 1, 2])).toBe(2);
		expect(mediana([4, 1, 2, 3])).toBe(2.5);
	});
});
