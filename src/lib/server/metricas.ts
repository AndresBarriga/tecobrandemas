/**
 * Métricas internas del producto (PRD: H1-H4). Solo lee agregados y respeta las reglas del registro:
 * por barrio solo salen los que tienen 10 o más observaciones y `analisis` y `aportaciones` no se cruzan.
 * Sin imports de ejecución: lo usa tanto el Worker (si hiciera falta) como scripts/metricas.ts.
 */
import type { D1Registro } from './db';
import { ID_TARJETA_PRUEBA } from './tarjetas';

const MINIMO_PUBLICO = 10;

export interface Objetivo {
	id: string;
	nombre: string;
	/** Fracción o razón; null si el denominador es 0 */
	valor: number | null;
	objetivo: number | null;
	cumple: boolean | null;
	numerador: number;
	denominador: number;
}

export interface FilaBarrio {
	barrio: string;
	n: number;
	medianaPrecio: number;
	medianaEurosM2: number;
	/** Fracción de análisis por encima del techo (nivel c) */
	porEncima: number;
}

export interface FilaAportaciones {
	barrio: string;
	n: number;
	medianaPrecio: number;
	medianaEurosM2: number;
}

export interface Metricas {
	desde: string | null;
	embudo: { llegadas: number; empiezan: number; completan: number; comparten: number; desdeTarjeta: number; segundo: number; aportan: number; habitacion: number; servidoSi: number; servidoNo: number };
	/** Visitas que usaron cada canal de compartir (nativo = hoja del móvil) */
	canales: Record<string, number>;
	tarjetasCreadas: number;
	analisisTotales: number;
	objetivos: Objetivo[];
	barrios: FilaBarrio[];
	aportaciones: FilaAportaciones[];
}

export const mediana = (xs: number[]): number => {
	if (!xs.length) return NaN;
	const s = [...xs].sort((a, b) => a - b);
	const m = s.length >> 1;
	return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

function objetivo(id: string, nombre: string, numerador: number, denominador: number, meta: number | null): Objetivo {
	const valor = denominador > 0 ? numerador / denominador : null;
	return { id, nombre, valor, objetivo: meta, numerador, denominador, cumple: valor === null || meta === null ? null : valor >= meta };
}

/** Canales de compartir con evento propio; la hoja nativa del móvil sigue siendo `comparte` */
export const CANALES = ['whatsapp', 'x', 'copiar', 'descarga'] as const;

export async function calcularMetricas(db: D1Registro, desde: Date | null = null): Promise<Metricas> {
	const ts = desde ? desde.getTime() : 0;
	const visitas = async (tipo: string) =>
		(await db.prepare('SELECT COUNT(DISTINCT visita) AS n FROM eventos WHERE tipo = ? AND ts >= ?').bind(tipo, ts).first<{ n: number }>())?.n ?? 0;
	const visitasDe = async (tipos: string[]) =>
		(await db
			.prepare(`SELECT COUNT(DISTINCT visita) AS n FROM eventos WHERE tipo IN (${tipos.map(() => '?').join(',')}) AND ts >= ?`)
			.bind(...tipos, ts)
			.first<{ n: number }>())?.n ?? 0;
	const eventos = async (tipo: string) =>
		(await db.prepare('SELECT COUNT(*) AS n FROM eventos WHERE tipo = ? AND ts >= ?').bind(tipo, ts).first<{ n: number }>())?.n ?? 0;

	const embudo = {
		llegadas: await visitas('llegada'),
		empiezan: await visitas('empieza'),
		completan: await visitas('completa'),
		comparten: await visitasDe(['comparte', ...CANALES.map((c) => `comparte_${c}`)]),
		desdeTarjeta: await visitas('desde_tarjeta'),
		segundo: await visitas('segundo'),
		aportan: await visitas('aporta'),
		habitacion: await visitas('habitacion'),
		servidoSi: await eventos('servido_si'),
		servidoNo: await eventos('servido_no')
	};
	const canales: Record<string, number> = { nativo: await visitas('comparte') };
	for (const c of CANALES) canales[c] = await visitas(`comparte_${c}`);
	const analisisTotales = await eventos('completa');
	const tarjetasCreadas = (await db.prepare('SELECT COUNT(*) AS n FROM tarjetas WHERE id <> ?').bind(ID_TARJETA_PRUEBA).first<{ n: number }>())?.n ?? 0;

	const objetivos = [
		objetivo('H1', 'Utilidad: empiezan / llegadas', embudo.empiezan, embudo.llegadas, 0.25),
		objetivo('H2', 'Completado: completan / empiezan', embudo.completan, embudo.empiezan, 0.7),
		objetivo('H3', 'Compartible: comparten / completan', embudo.comparten, embudo.completan, 0.1),
		objetivo('H4', 'Conversión desde tarjeta: visitas con análisis desde una tarjeta / tarjetas creadas', embudo.desdeTarjeta, tarjetasCreadas, 0.3),
		objetivo('util', 'Utilidad percibida: «sí» / respuestas', embudo.servidoSi, embudo.servidoSi + embudo.servidoNo, 0.6),
		objetivo('segundo', 'Uso repetido: hacen un segundo análisis / completan', embudo.segundo, embudo.completan, null),
		objetivo('aporta', 'Aportación: aportan / completan', embudo.aportan, embudo.completan, null)
	];

	// Por barrio, solo desde 10 observaciones; cada tabla por separado
	const barrios: FilaBarrio[] = [];
	const grandes = (await db.prepare('SELECT barrio FROM analisis GROUP BY barrio HAVING COUNT(*) >= ? ORDER BY barrio').bind(MINIMO_PUBLICO).all<{ barrio: string }>()).results;
	for (const { barrio } of grandes) {
		const filas = (await db.prepare('SELECT precio, m2, nivel FROM analisis WHERE barrio = ?').bind(barrio).all<{ precio: number; m2: number; nivel: string }>()).results;
		barrios.push({
			barrio,
			n: filas.length,
			medianaPrecio: mediana(filas.map((f) => f.precio)),
			medianaEurosM2: mediana(filas.map((f) => f.precio / f.m2)),
			porEncima: filas.filter((f) => f.nivel === 'c').length / filas.length
		});
	}
	const aportaciones: FilaAportaciones[] = [];
	const grandesA = (await db.prepare('SELECT barrio FROM aportaciones GROUP BY barrio HAVING COUNT(*) >= ? ORDER BY barrio').bind(MINIMO_PUBLICO).all<{ barrio: string }>()).results;
	for (const { barrio } of grandesA) {
		const filas = (await db.prepare('SELECT precio, m2 FROM aportaciones WHERE barrio = ?').bind(barrio).all<{ precio: number; m2: number }>()).results;
		aportaciones.push({ barrio, n: filas.length, medianaPrecio: mediana(filas.map((f) => f.precio)), medianaEurosM2: mediana(filas.map((f) => f.precio / f.m2)) });
	}

	return { desde: desde ? desde.toISOString().slice(0, 10) : null, embudo, canales, tarjetasCreadas, analisisTotales, objetivos, barrios, aportaciones };
}

const celda = (x: unknown) => {
	const t = typeof x === 'number' ? (Number.isFinite(x) ? String(Math.round(x * 1000) / 1000) : '') : String(x ?? '');
	return /[",;\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};
const csv = (cabecera: string[], filas: unknown[][]) => [cabecera, ...filas].map((f) => f.map(celda).join(',')).join('\n') + '\n';

/** CSV de los agregados: nada que identifique a una persona ni a un piso */
export function aCsv(m: Metricas, nombreBarrio: (codigo: string) => string = (c) => c) {
	return {
		embudo: csv(
			['id', 'metrica', 'numerador', 'denominador', 'valor', 'objetivo', 'cumple'],
			m.objetivos.map((o) => [o.id, o.nombre, o.numerador, o.denominador, o.valor, o.objetivo, o.cumple === null ? '' : o.cumple ? 'si' : 'no'])
		),
		barrios: csv(
			['barrio', 'nombre', 'analisis', 'mediana_precio', 'mediana_euros_m2', 'fraccion_por_encima_del_techo'],
			m.barrios.map((b) => [b.barrio, nombreBarrio(b.barrio), b.n, b.medianaPrecio, b.medianaEurosM2, b.porEncima])
		),
		aportaciones: csv(
			['barrio', 'nombre', 'aportaciones', 'mediana_precio', 'mediana_euros_m2'],
			m.aportaciones.map((b) => [b.barrio, nombreBarrio(b.barrio), b.n, b.medianaPrecio, b.medianaEurosM2])
		)
	};
}
