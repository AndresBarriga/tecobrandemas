// Los datos de data/processed/ que usan las páginas de barrio. Solo en el servidor (se prerenderizan al compilar)
import barrios from '../../../data/processed/seccion_barrio.json';
import secciones from '../../../data/processed/secciones_madrid.json';
import vecinas from '../../../data/processed/vecinas.json';
import { BARRIOS_PILOTO, barrioPublicable, type BarrioPiloto, type DatosBarrios, type SeccionJson, type BarrioJson, type VecinasJson } from '#lib/resultado';

export const datosBarrios = (): DatosBarrios => ({
	secciones: secciones as unknown as Record<string, SeccionJson>,
	barrios: (barrios as unknown as { barrios: Record<string, BarrioJson> }).barrios,
	vecinas: vecinas as unknown as VecinasJson
});

/** Los barrios del piloto con dato suficiente para 50, 70 y 90 m²: los únicos que se publican */
export function barriosPublicados(): BarrioPiloto[] {
	const datos = datosBarrios();
	return BARRIOS_PILOTO.filter((b) => barrioPublicable(datos, b.codigo));
}
