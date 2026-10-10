/**
 * «Tu zona» ya formateada (diseño 6a-6f): lo que pinta el componente, salvo la geometría del mapa, que
 * llega aparte (polígonos). Tres modos:
 *  - «lista» (niveles b y c): el mapa y hasta 5 zonas cercanas donde este precio entraría en la referencia;
 *  - «vacia» (b y c): ninguna zona a 1,5 km cumple;
 *  - «contexto» (nivel a): solo el mapa.
 * Todo sale del mismo motor que el resultado y se calcula en el navegador; nunca se envía al servidor.
 */
import type { Anuncio } from '../motor';
import type { Punto } from '../ubicacion/geocodificar';
import { aquiEstariasDentro } from './aqui';
import { type DatosMadrid } from './datos';
import { type Evolucion, evolucion } from './evolucion';
import { euros, mesAnio, numero } from './formato';
import { type EtiquetaEscala, capaReferenciaAnuncios, zonasDelMapa } from './mapa';
import { OFERTA, TU_ZONA } from './textos';
import { type CeldaZona, claseZona, CORTES_ZONA, zona } from './zona';

const NB = ' ';

/** Colores de la escala (paja en 5 tonos) en el orden de las clases 0-4 */
export const TONOS_ZONA = ['#F3E4B0', '#E2BE55', '#BF962F', '#8E6B1D', '#5A4413'] as const;

export interface MuestraLeyenda {
	/** Índice en TONOS_ZONA; null = «sin dato» (rayado) */
	tono: number | null;
	etiqueta: string;
}

export interface FilaZona {
	n: number;
	cusec: string;
	nombre: string;
	referencia: string;
	posicion: string;
	distancia: string;
}

export interface VistaTuZona {
	modo: 'lista' | 'vacia' | 'contexto';
	intro: string;
	celdas: CeldaZona[];
	leyenda: MuestraLeyenda[];
	/** «24,4 €/m²» */
	precioM2: string;
	/** Posición de la muesca (0-100 % del ancho de la leyenda) y a qué lado queda su etiqueta */
	muesca: { x: number; alineada: 'izquierda' | 'centro' | 'derecha' };
	lista: { titulo: string; subtitulo: string; aviso: string; filas: FilaZona[]; pie: string } | null;
	vacia: { titulo: string; texto: string } | null;
	contexto: string | null;
	/** Con horquilla: «Tu calle cruza 2 zonas» (todas las zonas afectadas van con contorno grueso) */
	cruce: string | null;
	evolucion: Evolucion | null;
	/** Fuente y periodo de la capa de contratos (SERPAVI, ajustado por el IPC) */
	fuenteContratos: string;
	/**
	 * Capa «Oferta» (solo con los anuncios recientes cargados): cada zona con el €/m² de oferta de su barrio o, si el barrio
	 * no tiene dato, el de su distrito (punteada). Los mismos cortes y colores que /mapa con «Anuncios»
	 */
	oferta: { tonos: Map<string, number | null>; punteadas: Set<string>; leyenda: EtiquetaEscala[]; fuente: string } | null;
}

export interface EntradaTuZona {
	anuncio: Pick<Anuncio, 'precio' | 'superficie' | 'obraNueva' | 'tipo' | 'largaDuracion'>;
	clase: 'a' | 'b' | 'c';
	origen: Punto;
	/** Zonas de la ubicación (la tuya) */
	cusecs: string[];
	/** Por qué la ubicación es aproximada, si lo es */
	motivo?: string | null;
	/** Resultado del inquilino: solo contexto, sin la lista de zonas */
	inquilino?: boolean;
	datos: DatosMadrid;
	centros: Map<string, Punto>;
}

const km = (m: number) => `${(m / 1000).toFixed(1).replace('.', ',')}${NB}km`;

export function construirTuZona({ anuncio, clase, origen, cusecs, motivo = null, inquilino = false, datos, centros }: EntradaTuZona): VistaTuZona {
	const z = zona(anuncio.superficie, origen, cusecs, datos, centros);
	const pm2 = anuncio.precio / anuncio.superficie;
	const precioM2 = `${numero(pm2, 1)}${NB}€/m²`;

	const tramo = claseZona(pm2);
	const bajo = [0, ...CORTES_ZONA][tramo]!;
	const alto = [...CORTES_ZONA, CORTES_ZONA[3] + 3][tramo]!;
	const inicio = tramo === 0 ? 12 : bajo;
	const f = Math.min(0.85, Math.max(0.15, (pm2 - inicio) / (alto - inicio)));
	const x = ((tramo + f) / 6.15) * 100;

	const leyenda: MuestraLeyenda[] = [
		{ tono: 0, etiqueta: `<${NB}15` },
		{ tono: 1, etiqueta: '15–18' },
		{ tono: 2, etiqueta: '18–21' },
		{ tono: 3, etiqueta: '21–24' },
		{ tono: 4, etiqueta: `≥${NB}24` },
		{ tono: null, etiqueta: TU_ZONA.sinDato }
	];

	let modo: VistaTuZona['modo'] = 'contexto';
	let lista: VistaTuZona['lista'] = null;
	let vacia: VistaTuZona['vacia'] = null;
	if (clase !== 'a') {
		const { opciones } = aquiEstariasDentro({ ...anuncio, precio: anuncio.precio }, origen, cusecs, datos, centros);
		if (opciones.length) {
			modo = 'lista';
			lista = {
				...TU_ZONA.lista,
				filas: opciones.map((o, i) => ({
					n: i + 1,
					cusec: o.cusec,
					nombre: `una zona de ${o.barrio?.nombre ?? 'Madrid'}`,
					referencia: `Referencia para ${numero(anuncio.superficie)}${NB}m²: ${numero(o.refInf)} a ${euros(o.refSup)} al mes`,
					posicion: `Este precio caería en su parte ${o.posicion}`,
					distancia: km(o.distanciaM)
				}))
			};
		} else {
			modo = 'vacia';
			vacia = { titulo: TU_ZONA.vacia.titulo, texto: TU_ZONA.vacia.texto(precioM2) };
		}
	}

	return {
		modo,
		intro: modo === 'lista' ? `${TU_ZONA.intro} ${TU_ZONA.introNumeros}` : TU_ZONA.intro,
		celdas: z.celdas,
		leyenda,
		precioM2,
		muesca: { x, alineada: x > 62 ? 'derecha' : x < 20 ? 'izquierda' : 'centro' },
		lista,
		vacia,
		contexto: modo === 'contexto' ? (inquilino ? (cusecs.length > 1 ? TU_ZONA.contextoInquilinoVarias : TU_ZONA.contextoInquilino) : TU_ZONA.contexto) : null,
		cruce: cusecs.length > 1 ? (motivo === 'calle' ? TU_ZONA.cruce.calle : motivo === 'pin' ? TU_ZONA.cruce.pin : TU_ZONA.cruce.otro)(cusecs.length) : null,
		evolucion: evolucion(datos, cusecs),
		fuenteContratos: TU_ZONA.capas.fuenteContratos(mesAnio(datos.ipc.ultimo_mes)),
		oferta: datos.oferta ? capaOferta(datos) : null
	};
}

/** La capa de oferta de toda la ciudad (los cortes son de toda la ciudad); el €/m² no depende de la superficie */
function capaOferta(datos: DatosMadrid): NonNullable<VistaTuZona['oferta']> {
	const c = capaReferenciaAnuncios(zonasDelMapa(datos, 70));
	return { tonos: c.tonos, punteadas: c.punteadas ?? new Set(), leyenda: c.leyenda, fuente: OFERTA.fuente(mesAnio(datos.oferta!.mes)) };
}
