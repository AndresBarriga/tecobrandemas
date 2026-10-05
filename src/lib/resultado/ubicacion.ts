/**
 * Ubicación ya resuelta, con lo mínimo que necesita el resultado. Se construye a partir de
 * la respuesta del geocodificador o del pin; la dirección escrita no pasa de aquí.
 */
import type { Geocodificacion, Punto } from '../ubicacion/geocodificar';
import type { ResultadoPin } from '../ubicacion/pin';

export type MotivoAproximada = 'numero_inexistente' | 'portal_en_varias_secciones' | 'calle' | 'pin';

export interface Ubicacion {
	cusecs: string[];
	/** Sale aviso de ubicación aproximada; con más de una sección, además, horquilla */
	aproximada: boolean;
	motivo: MotivoAproximada | null;
	/** Portales usados cuando el número no existe */
	numerosUsados: number[];
	punto: Punto | null;
	/** Nombre de la calle cuando se buscó sin número (solo para el aviso; no se guarda) */
	via: string | null;
}

/** Lo que la interfaz hace tras geocodificar */
export type ResolucionDireccion =
	| { tipo: 'ubicacion'; ubicacion: Ubicacion }
	| { tipo: 'pedir_numero_o_mapa'; calle: string; nSecciones: number }
	| { tipo: 'no_encontrada'; sugerencias: string[] };

export function resolverDireccion(g: Geocodificacion): ResolucionDireccion {
	switch (g.estado) {
		case 'exacta':
			return { tipo: 'ubicacion', ubicacion: { cusecs: g.cusecs, aproximada: false, motivo: null, numerosUsados: [], punto: g.punto, via: null } };
		case 'aproximada':
			return {
				tipo: 'ubicacion',
				ubicacion: { cusecs: g.cusecs, aproximada: true, motivo: g.motivo, numerosUsados: g.numerosUsados, punto: g.punto, via: null }
			};
		case 'calle':
			return { tipo: 'ubicacion', ubicacion: { cusecs: g.cusecs, aproximada: true, motivo: 'calle', numerosUsados: [], punto: g.punto, via: g.vial.nombre } };
		case 'demasiadas_secciones':
			return { tipo: 'pedir_numero_o_mapa', calle: g.vial.nombre, nSecciones: g.nSecciones };
		case 'no_encontrada':
			return { tipo: 'no_encontrada', sugerencias: g.sugerencias.map((v) => v.nombre) };
	}
}

/** null = el punto cae fuera del municipio de Madrid */
export function ubicacionDesdePin(r: ResultadoPin, punto: Punto): Ubicacion | null {
	if (r.estado === 'fuera') return null;
	return {
		cusecs: r.cusecs,
		aproximada: r.cusecs.length > 1,
		motivo: r.cusecs.length > 1 ? 'pin' : null,
		numerosUsados: [],
		punto,
		via: null
	};
}
