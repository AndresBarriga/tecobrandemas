/**
 * Orquesta una comprobación en el navegador: valida lo escrito, resuelve la ubicación
 * (dirección → /api/geocode; mapa → pin local), carga los datos y construye la pantalla.
 * El cálculo vive en el motor y en resultado/; aquí solo se encadenan los pasos.
 */
import {
	FORMULARIO_VIVO, type ErroresFormulario, type ExtraInquilino, type Pantalla, type Ubicacion, aInquilino, construirPantalla,
	interpretarRentaFirma, interpretarSomos, pantallaSinDato, validarFirma, validarFormulario
} from '#lib/resultado';
import { cargarDatos } from './datos';
import { DemasiadasBusquedas, buscarDireccion } from './direccion';
import type { EstadoFormulario } from './estado';

export type ErroresCampos = ErroresFormulario & { direccion?: string; mapa?: string; firma?: string; rentaFirma?: string };

export type Comprobacion =
	| { tipo: 'pantalla'; pantalla: Pantalla; ubicacion: Ubicacion | null }
	| { tipo: 'errores'; errores: ErroresCampos }
	| { tipo: 'no_encontrada'; sugerencias: string[] }
	| { tipo: 'pedir_numero'; calle: string; nSecciones: number }
	| { tipo: 'demasiadas' };

const crudo = (f: EstadoFormulario) => ({
	precio: f.precio,
	superficie: f.superficie,
	obraNueva: f.obraNueva,
	largaDuracion: f.largaDuracion,
	// La habitación tiene su propio recorrido; aquí solo llegan pisos y casas
	tipo: f.tipo === 'casa' ? ('casa' as const) : ('piso' as const)
});

/** Validación al salir de un campo: solo ese campo */
export function validarCampo(f: EstadoFormulario, campo: 'precio' | 'superficie'): string | undefined {
	const v = validarFormulario(crudo(f));
	return v.ok ? undefined : v.errores[campo];
}

/**
 * `pin`: ubicación del punto marcado en el mapa (null si no hay punto o cae fuera de Madrid).
 * Lanza SinConexion si falla la geocodificación por red.
 */
export async function comprobar(f: EstadoFormulario, pin: Ubicacion | null | 'fuera'): Promise<Comprobacion> {
	const v = validarFormulario(crudo(f));
	const errores: ErroresCampos = v.ok ? {} : { ...v.errores };

	// «Ya vivo aquí»: fecha de firma obligatoria y renta al firmar opcional
	let extra: ExtraInquilino | null = null;
	if (f.situacion === 'vivo') {
		const hoy = new Date();
		const firma = validarFirma({ reciente: f.firmaReciente, mes: f.firmaMes, ano: f.firmaAno }, { ano: hoy.getFullYear(), mes: hoy.getMonth() + 1 });
		const rentaFirma = interpretarRentaFirma(f.rentaFirma);
		if (!firma.ok) errores.firma = FORMULARIO_VIVO.errorFirma;
		if (rentaFirma === 'error') errores.rentaFirma = FORMULARIO_VIVO.errorRentaFirma;
		if (firma.ok && rentaFirma !== 'error') extra = { firma: firma.firma, rentaFirma, somos: interpretarSomos(f.somos) };
	}

	if (f.modo === 'mapa') {
		if (pin === null) errores.mapa = 'Marca en el mapa el punto donde está el piso.';
	} else if (!f.direccion.trim()) {
		errores.direccion =
			f.modo === 'calle' ? 'Escribe el nombre de la calle del anuncio.' : 'Escribe la calle y el número del anuncio.';
	}
	if (Object.keys(errores).length) return { tipo: 'errores', errores };
	if (!v.ok) return { tipo: 'errores', errores };

	const datos = await cargarDatos();

	let ubicacion: Ubicacion;
	if (f.modo === 'mapa') {
		if (pin === 'fuera') return { tipo: 'pantalla', pantalla: pantallaSinDato('fuera_de_madrid'), ubicacion: null };
		ubicacion = pin!;
	} else {
		let r;
		try {
			r = await buscarDireccion(f.direccion);
		} catch (e) {
			if (e instanceof DemasiadasBusquedas) return { tipo: 'demasiadas' };
			throw e;
		}
		if (r.tipo === 'no_encontrada') return { tipo: 'no_encontrada', sugerencias: r.sugerencias };
		if (r.tipo === 'pedir_numero_o_mapa') return { tipo: 'pedir_numero', calle: r.calle, nSecciones: r.nSecciones };
		ubicacion = r.ubicacion;
	}
	const pantalla = construirPantalla(v.anuncio, ubicacion, datos);
	return { tipo: 'pantalla', pantalla: extra && pantalla.tipo === 'resultado' ? aInquilino(pantalla, v.anuncio, extra) : pantalla, ubicacion };
}
