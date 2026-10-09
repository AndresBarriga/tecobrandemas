// Copia a static/data/ los datos que el navegador carga (generados en data/processed/ por los scripts de ETL).
// Los ficheros de calles (viales_*) llevan el hash de su contenido en el nombre y se sirven con caché larga
// e immutable (ver scripts/cabeceras.mjs); su ruta se escribe en src/lib/cliente/datos-rutas.json, que importa el cliente.
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';

const ficheros = ['secciones_madrid.json', 'seccion_barrio.json', 'ipc_alquiler.json', 'secciones_madrid.topo.json', 'vecinas.json', 'oferta_madrid.json'];
const conHash = ['viales_sugerencias', 'viales_zonas', 'viales_portales'];

mkdirSync('static/data', { recursive: true });
const falta = (f) => {
	if (!existsSync(`data/processed/${f}`)) {
		console.error(`Falta data/processed/${f}: genera los datos con los scripts de scripts/ (Hito 1).`);
		process.exit(1);
	}
};
for (const f of ficheros) {
	falta(f);
	cpSync(`data/processed/${f}`, `static/data/${f}`);
}

// Quita las copias antiguas (sin hash o con otro hash) de los ficheros con hash
for (const f of readdirSync('static/data')) if (/^viales_[a-z]+(\.[0-9a-f]{10})?\.json$/.test(f)) rmSync(`static/data/${f}`);
const rutas = {};
for (const nombre of conHash) {
	falta(`${nombre}.json`);
	const contenido = readFileSync(`data/processed/${nombre}.json`);
	const hash = createHash('sha256').update(contenido).digest('hex').slice(0, 10);
	writeFileSync(`static/data/${nombre}.${hash}.json`, contenido);
	rutas[nombre] = `/data/${nombre}.${hash}.json`;
}
writeFileSync('src/lib/cliente/datos-rutas.json', JSON.stringify(rutas, null, '\t') + '\n');
console.log(`static/data/: ${ficheros.length + conHash.length} ficheros`);
