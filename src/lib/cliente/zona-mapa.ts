/**
 * Geometría de «Tu zona» (diseño 6a-6f): proyección a píxeles, trazados SVG y colocación de los nombres de
 * barrio. Todo puro y en el navegador; el componente solo pinta lo que sale de aquí.
 *
 * Escala del diseño: el círculo de 1,5 km ocupa el 44 % del menor lado del mapa, que mide 350×310 en móvil
 * y 600×531 en escritorio (misma proporción). Mapa centrado en el punto de la ubicación.
 */
export const ASPECTO = 310 / 350;
export const RADIO_M = 1500;
/** Mitad del alto visible en metros: el círculo ocupa el 44 % del alto */
export const MEDIA_ALTURA_M = RADIO_M / 0.44 / 2;
export const MEDIA_ANCHURA_M = MEDIA_ALTURA_M / ASPECTO;

export type Anillos = [number, number][][];

export interface CeldaGeometria {
	cusec: string;
	anillos: Anillos;
	/** Índice del tono (0-4); null = sin dato (rayado); 'fuera' = fuera del círculo, sin colorear */
	tono: number | null | 'fuera';
	esUsuario: boolean;
	barrio: string | null;
	/** Centro representativo, en metros */
	centro: [number, number];
}

export interface GeometriaZona {
	/** Punto de la ubicación, en metros */
	centro: [number, number];
	celdas: CeldaGeometria[];
	/** Líneas entre barrios, en metros */
	lineasBarrio: [number, number][][];
	nombresBarrio: Map<string, string>;
}

export interface Proyeccion {
	w: number;
	h: number;
	/** Píxeles por metro */
	s: number;
	cx: number;
	cy: number;
}

export function proyeccion(centro: [number, number], w: number): Proyeccion {
	return { w, h: w * ASPECTO, s: w / (2 * MEDIA_ANCHURA_M), cx: centro[0], cy: centro[1] };
}

export const aPx = (p: Proyeccion, [x, y]: [number, number]): [number, number] => [(x - p.cx) * p.s + p.w / 2, (p.cy - y) * p.s + p.h / 2];

export function trazado(p: Proyeccion, anillos: Anillos): string {
	return anillos
		.map((a) => 'M' + a.map((pt) => aPx(p, pt)).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L') + 'Z')
		.join('');
}

export function trazadoLineas(p: Proyeccion, lineas: [number, number][][]): string {
	return lineas.map((l) => 'M' + l.map((pt) => aPx(p, pt)).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')).join('');
}

export type Caja = [number, number, number, number];

export function cajaDe(p: Proyeccion, anillos: Anillos): Caja {
	const pts = anillos.flat().map((pt) => aPx(p, pt));
	return [Math.min(...pts.map((q) => q[0])), Math.min(...pts.map((q) => q[1])), Math.max(...pts.map((q) => q[0])), Math.max(...pts.map((q) => q[1]))];
}

const choca = (a: Caja, b: Caja) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

export interface EntradaNombres {
	/** Nombre y posición en píxeles (centroide de las zonas del barrio) */
	candidatos: { texto: string; x: number; y: number }[];
	/** Cajas que no se pueden pisar: tu zona (con margen), su línea, los marcadores */
	obstaculos: Caja[];
	w: number;
	h: number;
	/** Cuerpo del texto en px (11,5 en móvil, 13 en escritorio; nunca menos de 11) */
	cuerpo: number;
	medir: (texto: string) => number;
	/** Con false, un nombre que no cabe en su sitio se omite en lugar de moverse (mapa de toda la ciudad) */
	desplazar?: boolean;
}

/** Cada nombre, en el centro de su barrio y solo si cabe; si no, desplazado en vertical; y si aun así no, se omite */
export function colocarNombres({ candidatos, obstaculos, w, h, cuerpo, medir, desplazar = true }: EntradaNombres) {
	const salida: { texto: string; x: number; y: number; cuerpo: number }[] = [];
	const ocupado = [...obstaculos];
	const alto = cuerpo + 6;
	for (const c of candidatos) {
		const ancho = medir(c.texto) + 6;
		const x = Math.min(Math.max(c.x, ancho / 2 + 4), w - ancho / 2 - 4);
		const y = Math.min(Math.max(c.y, alto / 2 + 4), h - alto / 2 - 4);
		for (const dy of desplazar ? [0, -alto, alto, -2 * alto, 2 * alto] : [0]) {
			const caja: Caja = [x - ancho / 2, y + dy - alto / 2, x + ancho / 2, y + dy + alto / 2];
			if (caja[1] < 4 || caja[3] > h - 4 || ocupado.some((o) => choca(o, caja))) continue;
			ocupado.push(caja);
			salida.push({ texto: c.texto, x, y: y + dy, cuerpo });
			break;
		}
	}
	return salida;
}
