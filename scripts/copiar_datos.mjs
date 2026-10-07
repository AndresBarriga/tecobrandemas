// Copia a static/data/ los datos que el navegador carga (generados en data/processed/ por los scripts de ETL).
import { cpSync, existsSync, mkdirSync } from 'node:fs';

const ficheros = ['secciones_madrid.json', 'seccion_barrio.json', 'ipc_alquiler.json', 'secciones_madrid.topo.json', 'vecinas.json', 'viales_sugerencias.json', 'viales_zonas.json', 'viales_portales.json'];
mkdirSync('static/data', { recursive: true });
for (const f of ficheros) {
	if (!existsSync(`data/processed/${f}`)) {
		console.error(`Falta data/processed/${f}: genera los datos con los scripts de scripts/ (Hito 1).`);
		process.exit(1);
	}
	cpSync(`data/processed/${f}`, `static/data/${f}`);
}
console.log(`static/data/: ${ficheros.length} ficheros`);
