/**
 * Evolución (R12): mediana de €/m² registrada en la zona en 2015 y en 2024 y la variación, sin descontar la
 * inflación. Con horquilla, el intervalo entre las zonas posibles. Si falta el dato de 2015 (o de 2024) en una
 * zona, esa zona se omite; si faltara en todas, no hay línea.
 */
import { type DatosMadrid } from './datos';
import { numero } from './formato';

export interface Evolucion {
	desde: 2015;
	hasta: 2024;
	puntos: { cusec: string; med2015: number; med2024: number; variacion: number }[];
	/** Variación mínima y máxima (fracción) entre las zonas */
	variacionMin: number;
	variacionMax: number;
	/** Todas suben, todas bajan o hay de ambas */
	tendencia: 'sube' | 'baja' | 'mixta';
	/** La frase en trozos, para destacar las cifras: «La renta registrada en esta zona ha subido un [38 %] entre…» */
	partes: { texto: string; fuerte: boolean }[];
	texto: string;
}

/** Porcentaje entero («38 %»); con signo explícito para los intervalos mixtos */
const entero = (x: number, signo = false) => {
	const n = Math.round(Math.abs(x) * 100);
	return `${signo && n > 0 ? (x < 0 ? '−' : '+') : ''}${numero(n)}\u00A0%`;
};
const abs = (x: number) => entero(x);

export function evolucion(datos: DatosMadrid, cusecs: string[]): Evolucion | null {
	const puntos = cusecs.flatMap((cusec) => {
		const s = datos.secciones[cusec];
		if (!s || s.med2015 === null || s.med2024 === null || s.med2015 <= 0) return [];
		return [{ cusec, med2015: s.med2015, med2024: s.med2024, variacion: s.med2024 / s.med2015 - 1 }];
	});
	if (puntos.length === 0) return null;

	const variaciones = puntos.map((p) => p.variacion);
	const variacionMin = Math.min(...variaciones);
	const variacionMax = Math.max(...variaciones);
	const tendencia = variacionMin >= 0 ? 'sube' : variacionMax <= 0 ? 'baja' : 'mixta';
	const verbo = tendencia === 'baja' ? 'ha bajado' : tendencia === 'sube' ? 'ha subido' : 'ha cambiado';
	const donde = puntos.length === 1 ? 'esta zona' : 'las zonas posibles';

	let partes: Evolucion['partes'];
	if (abs(variacionMin) === abs(variacionMax) && tendencia !== 'mixta') {
		partes = [{ texto: `La renta registrada en ${donde} ${verbo} un `, fuerte: false }, { texto: abs(variacionMin), fuerte: true }];
	} else if (tendencia === 'mixta') {
		partes = [
			{ texto: `La renta registrada en ${donde} ${verbo} entre `, fuerte: false },
			{ texto: entero(variacionMin, true), fuerte: true }, { texto: ' y ', fuerte: false }, { texto: entero(variacionMax, true), fuerte: true }
		];
	} else {
		const [a, b] = tendencia === 'baja' ? [variacionMax, variacionMin] : [variacionMin, variacionMax];
		partes = [
			{ texto: `La renta registrada en ${donde} ${verbo} entre un `, fuerte: false },
			{ texto: abs(a), fuerte: true }, { texto: ' y un ', fuerte: false }, { texto: abs(b), fuerte: true }
		];
	}
	partes.push({ texto: ' entre 2015 y 2024, sin descontar la inflación.', fuerte: false });
	return {
		desde: 2015, hasta: 2024, puntos, variacionMin, variacionMax, tendencia, partes,
		texto: partes.map((p) => p.texto).join('')
	};
}
