/**
 * Resultado de muestra de la portada de escritorio («Así se ve un resultado», marcado EJEMPLO): un caso
 * real (Fuente del Berro, 2.200 €, 90 m²) calculado por el motor con el IPC de hoy. No son cifras del
 * diseño: cambian si cambia el IPC.
 */
import { analizar } from '../motor';
import { barrioDe, datosSeccion, type DatosMadrid } from './datos';
import { construirBarra } from './barra';
import { ANUNCIO_EJEMPLO, CUSEC_EJEMPLO } from './metodologia';
import { construirVista } from './vista';
import type { Vista } from './vista';
import type { Barra } from './barra';

export interface Muestra {
	lugar: string;
	/** «90 m², 2.200 €/mes · precio del anuncio» */
	contexto: string;
	vista: Vista;
	barra: Barra;
}

export function construirMuestra(datos: DatosMadrid): Muestra | null {
	const an = analizar(ANUNCIO_EJEMPLO, [datosSeccion(datos, CUSEC_EJEMPLO)], datos.ipc.factor);
	if (an.tipo !== 'resultado') return null;
	const barrio = barrioDe(datos, CUSEC_EJEMPLO);
	const barra = construirBarra(ANUNCIO_EJEMPLO.precio, an.secciones.map((s) => s.referencia));
	const vista = construirVista({
		anuncio: ANUNCIO_EJEMPLO,
		ubicacion: { cusecs: [CUSEC_EJEMPLO], aproximada: false, motivo: null, numerosUsados: [], punto: { lon: -3.67, lat: 40.425 }, via: null },
		analisis: an,
		barra,
		barrio,
		ipcMes: datos.ipc.ultimo_mes
	});
	return { lugar: vista.lugar, contexto: `${vista.contexto} · precio del anuncio`, vista, barra };
}
