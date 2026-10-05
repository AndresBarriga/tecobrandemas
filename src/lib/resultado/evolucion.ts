/**
 * Evolución (R12): mediana de €/m² registrada en la sección en 2015 y en 2024 y la
 * variación. Con horquilla, el intervalo entre las secciones posibles. Si falta el dato
 * de 2015 (o de 2024) en una sección, esa sección se omite; si faltara en todas, no hay línea.
 */
import { type DatosMadrid } from './datos';
import { eurosM2, porcentaje } from './formato';

export interface Evolucion {
	desde: 2015;
	hasta: 2024;
	puntos: { cusec: string; med2015: number; med2024: number; variacion: number }[];
	/** Variación mínima y máxima (fracción) entre las secciones */
	variacionMin: number;
	variacionMax: number;
	texto: string;
}

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
	const texto =
		puntos.length === 1
			? `En esta sección, la mediana de los alquileres registrados pasó de ${eurosM2(puntos[0]!.med2015)} en 2015 a ${eurosM2(puntos[0]!.med2024)} en 2024 (${porcentaje(variacionMin, true)}).`
			: `En las secciones posibles, la mediana de los alquileres registrados cambió entre 2015 y 2024 entre ${porcentaje(variacionMin, true)} y ${porcentaje(variacionMax, true)}.`;
	return { desde: 2015, hasta: 2024, puntos, variacionMin, variacionMax, texto };
}
