/** Datos SERPAVI 2024 de una sección censal (vivienda colectiva), tal como salen de
 * data/processed/secciones_madrid.json. Importes en €/m²·mes, superficie en m². */
export interface DatosSeccion {
	cusec: string;
	smed: number | null;
	p25: number | null;
	p75: number | null;
	/** Alquileres registrados (testigos) */
	n: number | null;
}

/** Sección con los cuatro valores que necesita el cálculo */
export interface SeccionConDato extends DatosSeccion {
	smed: number;
	p25: number;
	p75: number;
	n: number;
}

/** Lo que teclea el usuario sobre el anuncio */
export interface Anuncio {
	/** €/mes */
	precio: number;
	/** m² construidos */
	superficie: number;
	obraNueva: boolean;
	tipo: 'piso' | 'casa';
	largaDuracion: boolean;
}

/** Rango en €/mes */
export interface Rango {
	inf: number;
	sup: number;
}

/** Rango inicial ajustado por IPC y máximo con el cuestionario más favorable (x = 1) */
export interface Referencia extends Rango {
	max: number;
}

export type Posicion = 'baja' | 'media' | 'alta';

export type Nivel =
	| { nivel: 'dentro'; posicion: Posicion }
	/** Supera R_sup pero no R_max: podría explicarse con características excelentes */
	| { nivel: 'explicable' }
	/** Supera R_max: por encima incluso para un piso de máxima calidad */
	| { nivel: 'por_encima' };

/** Cuánto más te piden sobre la parte alta de la referencia (R_sup) */
export interface Brecha {
	/** Fracción: 0,47 = +47 % */
	pct: number;
	euroMes: number;
	euroAño: number;
}

export type MotivoSinDato =
	| 'unifamiliar'
	| 'temporal'
	| 'obra_nueva'
	| 'superficie'
	| 'sin_dato_seccion'
	| 'testigos';
