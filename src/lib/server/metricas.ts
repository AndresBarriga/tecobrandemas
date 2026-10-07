/**
 * Métricas internas del producto: análisis y aportaciones con consentimiento y tarjetas. Solo lee agregados y respeta las reglas del registro:
 * por barrio solo salen los que tienen 10 o más observaciones y `analisis` y `aportaciones` no se cruzan.
 * El embudo de uso (llegadas, empieza, completa…) ya no está aquí: se mira en PostHog.
 * Sin imports de ejecución: lo usa tanto el Worker (si hiciera falta) como scripts/metricas.ts.
 */
import type { D1Registro } from './db';
import { ID_TARJETA_PRUEBA } from './tarjetas';

const MINIMO_PUBLICO = 10;

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
	tarjetasCreadas: number;
	barrios: FilaBarrio[];
	aportaciones: FilaAportaciones[];
}

export const mediana = (xs: number[]): number => {
	if (!xs.length) return NaN;
	const s = [...xs].sort((a, b) => a - b);
	const m = s.length >> 1;
	return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

export async function calcularMetricas(db: D1Registro, desde: Date | null = null): Promise<Metricas> {
	const tarjetasCreadas = (await db.prepare('SELECT COUNT(*) AS n FROM tarjetas WHERE id <> ?').bind(ID_TARJETA_PRUEBA).first<{ n: number }>())?.n ?? 0;

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

	return { desde: desde ? desde.toISOString().slice(0, 10) : null, tarjetasCreadas, barrios, aportaciones };
}

const celda = (x: unknown) => {
	const t = typeof x === 'number' ? (Number.isFinite(x) ? String(Math.round(x * 1000) / 1000) : '') : String(x ?? '');
	return /[",;\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};
const csv = (cabecera: string[], filas: unknown[][]) => [cabecera, ...filas].map((f) => f.map(celda).join(',')).join('\n') + '\n';

/** CSV de los agregados: nada que identifique a una persona ni a un piso */
export function aCsv(m: Metricas, nombreBarrio: (codigo: string) => string = (c) => c) {
	return {
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
