// Informe interno de métricas (no es una página pública): embudo H1-H4, análisis por barrio con 10 o más
// observaciones y exportación a CSV de los agregados. Lee D1 con wrangler (hace falta `wrangler login`).
//   node scripts/metricas.ts [--local] [--desde=2026-10-20] [--salida=informe-metricas]
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { aCsv, calcularMetricas } from '../src/lib/server/metricas.ts';

const arg = (nombre: string) => process.argv.find((a) => a.startsWith(`--${nombre}=`))?.split('=')[1];
const local = process.argv.includes('--local');
const desde = arg('desde') ? new Date(`${arg('desde')}T00:00:00Z`) : null;
const salida = arg('salida') ?? 'informe-metricas';

// D1 por la CLI: no admite parámetros, así que se escapan aquí (solo entran números y códigos de barrio)
const literal = (v: unknown) => (typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const consulta = (sql: string, valores: unknown[]) => {
	let i = 0;
	const cerrada = sql.replace(/\?/g, () => literal(valores[i++]));
	const out = execFileSync('npx', ['wrangler', 'd1', 'execute', 'a-su-precio-registro', local ? '--local' : '--remote', '--json', '--command', cerrada], {
		encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore']
	});
	return (JSON.parse(out) as { results: unknown[] }[])[0]!.results;
};
const sentencia = (sql: string, valores: unknown[] = []): any => ({
	bind: (...v: unknown[]) => sentencia(sql, v),
	run: async () => consulta(sql, valores),
	first: async () => consulta(sql, valores)[0] ?? null,
	all: async () => ({ results: consulta(sql, valores) })
});

const barrios = (JSON.parse(readFileSync('data/processed/seccion_barrio.json', 'utf8')) as { barrios: Record<string, { nombre: string }> }).barrios;
const m = await calcularMetricas({ prepare: (sql: string) => sentencia(sql) }, desde).catch(() => {
	console.error(`No se pudo leer D1${local ? ' local (¿has aplicado las migraciones con `wrangler d1 migrations apply --local`?)' : ' (¿has hecho `wrangler login`?)'}.`);
	process.exit(1);
});

const pct = (x: number | null) => (x === null ? 'sin datos' : `${(x * 100).toFixed(1).replace('.', ',')} %`);
console.log(`Métricas ${local ? '(D1 local)' : '(D1 en producción)'}${m.desde ? ` desde ${m.desde}` : ''}\n`);
console.log(`Visitas: ${m.embudo.llegadas} · empiezan ${m.embudo.empiezan} · completan ${m.embudo.completan} · comparten ${m.embudo.comparten} · análisis totales ${m.analisisTotales} · tarjetas creadas ${m.tarjetasCreadas}`);
console.log(`Canales de compartir (visitas): ${Object.entries(m.canales).map(([c, n]) => `${c} ${n}`).join(' · ')}\n`);
for (const o of m.objetivos) {
	const estado = o.cumple === null ? (o.objetivo === null ? 'medir' : 'sin datos') : o.cumple ? 'cumple' : 'NO cumple';
	console.log(`${o.id.padEnd(8)} ${pct(o.valor).padStart(10)}  (${o.numerador}/${o.denominador})  objetivo ${o.objetivo === null ? '—' : pct(o.objetivo)}  ${estado}  ${o.nombre}`);
}
console.log(`\nBarrios con 10 o más análisis: ${m.barrios.length}`);
for (const b of m.barrios) console.log(`  ${barrios[b.barrio]?.nombre ?? b.barrio}: ${b.n} análisis, mediana ${Math.round(b.medianaEurosM2 * 10) / 10} €/m², ${pct(b.porEncima)} por encima del techo`);
console.log(`Barrios con 10 o más aportaciones de residentes (aparte): ${m.aportaciones.length}`);

const csv = aCsv(m, (c) => barrios[c]?.nombre ?? c);
mkdirSync(salida, { recursive: true });
for (const [nombre, texto] of Object.entries(csv)) writeFileSync(`${salida}/${nombre}.csv`, texto);
console.log(`\nCSV en ${salida}/ (embudo, barrios, aportaciones)`);
