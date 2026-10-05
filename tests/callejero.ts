/** Callejero local (data/processed/geocoder.sqlite) para los tests del geocodificador */
import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { IndiceViales, type Vial } from '../src/lib/ubicacion/indice';
import type { AlmacenCallejero, Portal } from '../src/lib/ubicacion/geocodificar';

const RUTA = fileURLToPath(new URL('../data/processed/geocoder.sqlite', import.meta.url));

/** geocoder.sqlite no va a git: se genera con scripts/03_callejero.py */
export const hayCallejero = existsSync(RUTA);

export function abrirCallejero() {
	const db = new DatabaseSync(RUTA, { readOnly: true });
	const viales = db
		.prepare('SELECT id, tipo, nombre_norm AS nombreNorm, visible, n_portales AS nPortales, nombre FROM viales')
		.all() as unknown as (Vial & { nombre: string })[];
	const consulta = db.prepare('SELECT numero, extension, lon, lat, cusec FROM portales WHERE vial_id = ?');
	const almacen: AlmacenCallejero = {
		portales: async (vialId) => consulta.all(vialId) as unknown as Portal[]
	};
	return { indice: new IndiceViales(viales), almacen, viales };
}
