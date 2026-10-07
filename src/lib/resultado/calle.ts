/**
 * «Calle» + número del portal (opcional), todo en el navegador y con ficheros estáticos:
 *  - qué número hay escrito al final de la calle («Robledal 32», «Alcalá, nº 14 bis»);
 *  - el campo «Nº» («12», «12 bis», «12b»);
 *  - qué portales tiene una calle (viales_portales.json: grupos de barrio, código postal y números en rangos);
 *  - la línea de confirmación y el texto de cada sugerencia con número.
 * Lo escrito no se envía a ningún sitio hasta que se comprueba el piso.
 */

/** Número del portal tal como se escribe en «Nº»: 12, 12b o 12 bis */
const NUMERO_CAMPO = /^(\d{1,4})\s*(bis|[a-zA-Z])?$/i;
const NUMERO_FINAL = /^(.*[^\d\s,.º°-])[\s,]+(?:n[ºo°.]?\s*)?(\d{1,4}(?:\s*(?:bis|[a-zA-Z]))?)$/i;

export interface NumeroPortal {
	numero: number;
	/** «b» en «12b» o «bis»; para mostrar */
	letra: string;
}

/** «12 bis» → { numero: 12, letra: 'bis' }; vacío o no válido → null */
export function interpretarPortal(texto: string): NumeroPortal | null {
	const m = NUMERO_CAMPO.exec(texto.trim());
	return m ? { numero: Number(m[1]), letra: (m[2] ?? '').toLowerCase() } : null;
}

/** El campo «Nº» se acepta vacío o con un número de portal */
export const numeroValido = (texto: string) => texto.trim() === '' || interpretarPortal(texto) !== null;

/**
 * «Robledal 32» → { calle: 'Robledal', numero: '32' }. Solo si lo que queda es un nombre (con letras) y el final es un
 * número de portal; un código postal («28038») no cuenta.
 */
export function separarNumeroFinal(texto: string): { calle: string; numero: string } | null {
	const m = NUMERO_FINAL.exec(texto.trim());
	if (!m || !/[a-zA-ZñÑáéíóúÁÉÍÓÚ]{2}/.test(m[1]!)) return null;
	return { calle: m[1]!.replace(/[\s,]+n[ºo°.]?$/i, '').trim(), numero: m[2]!.replace(/\s+/g, ' ').trim() };
}

/** La dirección que se envía a comprobar: calle fijada (o escrita) más el número, si lo hay */
export function textoDireccion(f: { via: string | null; direccion: string; numero: string }): string {
	return [(f.via ?? f.direccion).trim(), f.numero.trim()].filter(Boolean).join(' ');
}

// ——— Portales de una calle ———

/** [código de barrio, código postal, rangos]; el primer grupo es el más numeroso */
export type GrupoPortales = readonly [barrio: string, cp: string, rangos: string];

/** Los números que describe un grupo: «2-6,1-9» son 2, 4, 6, 1, 3, 5, 7, 9 (a-b va de dos en dos) */
export function numerosDeRangos(rangos: string): number[] {
	const salida: number[] = [];
	for (const trozo of rangos.split(',')) {
		const [a, b] = trozo.split('-').map(Number);
		if (a === undefined || !Number.isFinite(a)) continue;
		for (let n = a; n <= (b ?? a); n += 2) salida.push(n);
	}
	return salida;
}

const contiene = (rangos: string, n: number) =>
	rangos.split(',').some((t) => {
		const [a, b] = t.split('-').map(Number);
		return a !== undefined && (b === undefined ? a === n : n >= a && n <= b && (n - a) % 2 === 0);
	});

export interface PortalHallado {
	numero: number;
	barrio: string;
	cp: string;
	/** El portal existe; si no, es el más cercano de la misma paridad (como hace el geocodificador) */
	existe: boolean;
}

/** El portal `n` de una calle o, si no existe, el más cercano de su paridad (si no hay de su paridad, el más cercano) */
export function buscarPortal(grupos: readonly GrupoPortales[], n: number): PortalHallado | null {
	for (const [barrio, cp, rangos] of grupos) if (contiene(rangos, n)) return { numero: n, barrio, cp, existe: true };
	let mejor: PortalHallado | null = null;
	let distancia = Infinity;
	for (const mismaParidad of [true, false]) {
		for (const [barrio, cp, rangos] of grupos) {
			for (const m of numerosDeRangos(rangos)) {
				if ((m % 2 === n % 2) !== mismaParidad) continue;
				const d = Math.abs(m - n);
				if (d < distancia) {
					distancia = d;
					mejor = { numero: m, barrio, cp, existe: false };
				}
			}
		}
		if (mejor) return mejor;
	}
	return mejor;
}

/** «280»… «28038»: un código postal de Madrid escrito solo, o con parte del nombre de la calle */
export function separarCodigoPostal(texto: string): { cp: string; resto: string } | null {
	const m = /(?:^|\s|,)(28\d{3})(?=$|\s|,)/.exec(texto);
	if (!m) return null;
	return { cp: m[1]!, resto: (texto.slice(0, m.index) + ' ' + texto.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim() };
}
