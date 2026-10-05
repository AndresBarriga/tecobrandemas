/**
 * Índice en memoria de los ~9.000 viales de Madrid para buscar por nombre con erratas.
 * Similitud de Dice sobre trigramas del nombre normalizado; el tipo de vía desempata.
 */

export interface Vial {
	id: number;
	/** Tipo de CartoCiudad: CALLE, PASEO… */
	tipo: string;
	nombreNorm: string;
	/** «Calle Peña Pintada» */
	visible: string;
	nPortales: number;
}

export interface Coincidencia {
	vial: Vial;
	puntuacion: number;
}

/** Por debajo de esta similitud no se da un vial por encontrado */
export const UMBRAL_SIMILITUD = 0.6;
const BONUS_TIPO = 0.1;

function trigramas(texto: string): Set<string> {
	const t = `  ${texto} `;
	const out = new Set<string>();
	for (let i = 0; i < t.length - 2; i++) out.add(t.slice(i, i + 3));
	return out;
}

export class IndiceViales {
	private readonly porTrigrama = new Map<string, number[]>();
	private readonly trigramasVial: Set<string>[];

	constructor(private readonly viales: Vial[]) {
		this.trigramasVial = viales.map((v) => trigramas(v.nombreNorm));
		this.trigramasVial.forEach((tri, i) => {
			for (const t of tri) {
				const lista = this.porTrigrama.get(t);
				if (lista) lista.push(i);
				else this.porTrigrama.set(t, [i]);
			}
		});
	}

	/** Viales ordenados por puntuación (similitud + ajuste por tipo), de mayor a menor */
	buscar(nombreNorm: string, tipo: string | null, limite = 5): Coincidencia[] {
		const consulta = trigramas(nombreNorm);
		const comunes = new Map<number, number>();
		for (const t of consulta) {
			for (const i of this.porTrigrama.get(t) ?? []) comunes.set(i, (comunes.get(i) ?? 0) + 1);
		}

		const resultado: Coincidencia[] = [];
		for (const [i, n] of comunes) {
			const vial = this.viales[i]!;
			const dice = (2 * n) / (consulta.size + this.trigramasVial[i]!.size);
			const ajusteTipo = tipo === null ? 0 : vial.tipo === tipo ? BONUS_TIPO : -BONUS_TIPO;
			resultado.push({ vial, puntuacion: dice + ajusteTipo });
		}
		return resultado
			.sort((a, b) => b.puntuacion - a.puntuacion || b.vial.nPortales - a.vial.nPortales)
			.slice(0, limite);
	}
}
