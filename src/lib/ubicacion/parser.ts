/**
 * Texto libre → interpretaciones posibles (tipo de vía, nombre, número, extensión),
 * de más a menos probable. El geocodificador prueba cada una hasta encontrar un vial.
 *
 * «C/ de Alcalá, nº 45, 3º B, 28009 Madrid» → { CALLE, «alcala», 45, extensión «b»? }
 * El piso y la puerta se descartan: solo cuenta lo que va hasta el número del portal.
 */
import { TIPOS_VIA, normalizar, quitarTildes } from './normalizar';

export interface Interpretacion {
	/** Tipo de CartoCiudad («CALLE», «PASEO»…) o null si no se ha escrito */
	tipo: string | null;
	/** Nombre normalizado, comparable con viales.nombre_norm */
	nombre: string;
	numero: number | null;
	/** Letra pegada al número («45b») o justo detrás («45 b»): se usa si existe ese portal */
	extension: string | null;
}

const RUIDO = new Set(['madrid', 'espana', 'n', 'no', 'num', 'numero', 'nro', 'portal']);
const NUMERO = /^(\d{1,4})([a-z])?$/;

function tokens(texto: string): string[] {
	return quitarTildes(texto.toLowerCase())
		.replace(/\b28\d{3}\b/g, ' ') // código postal
		.replace(/[^a-z0-9]+/g, ' ')
		.split(' ')
		.filter((t) => t && !RUIDO.has(t));
}

export function parsearDireccion(texto: string): Interpretacion[] {
	let resto = tokens(texto);
	let tipo: string | null = null;
	if (resto.length > 1 && TIPOS_VIA[resto[0]!]) {
		tipo = TIPOS_VIA[resto[0]!]!;
		resto = resto.slice(1);
	}

	const interpretaciones: Interpretacion[] = [];
	for (let i = 1; i < resto.length; i++) {
		const m = NUMERO.exec(resto[i]!);
		if (!m) continue;
		const nombre = normalizar(resto.slice(0, i).join(' '));
		if (!nombre) continue;
		const siguiente = resto[i + 1];
		const extension = m[2] ?? (siguiente && /^[a-z]$/.test(siguiente) ? siguiente : null);
		interpretaciones.push({ tipo, nombre, numero: Number(m[1]), extension });
	}

	// Sin número: la calle entera (o un nombre de vía que contiene dígitos)
	const nombreCompleto = normalizar(resto.join(' '));
	if (nombreCompleto && interpretaciones.length === 0) {
		interpretaciones.push({ tipo, nombre: nombreCompleto, numero: null, extension: null });
	}
	return interpretaciones;
}
