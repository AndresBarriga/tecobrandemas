/**
 * Orquesta una comprobación en el navegador: valida lo escrito, resuelve la ubicación
 * (dirección → /api/geocode; mapa → pin local), carga los datos y construye la pantalla.
 * El cálculo vive en el motor y en resultado/; aquí solo se encadenan los pasos.
 */
import {
	FORMULARIO_VIVO, type ErroresFormulario, type ExtraInquilino, type Pantalla, type Ubicacion, aInquilino, barriosDe, construirPantalla,
	construirPantallaHabitacion, interpretarRentaFirma, interpretarSomos, pantallaSinDato, validarFirma, validarFormulario, validarHabitacion
} from '#lib/resultado';
import { cargarDatos } from './datos';
import { DemasiadasBusquedas, buscarDireccion } from './direccion';
import type { EstadoFormulario } from './estado';

export type ErroresCampos = ErroresFormulario & { direccion?: string; mapa?: string; firma?: string; rentaFirma?: string; habitacion?: string };

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

type Resuelta = { ok: true; ubicacion: Ubicacion } | { ok: false; salida: Comprobacion };

/** Dónde está: el punto del mapa o la dirección (geocodificada en nuestro Worker) */
async function resolver(f: EstadoFormulario, pin: Ubicacion | null | 'fuera'): Promise<Resuelta> {
	if (f.modo === 'mapa') {
		if (pin === 'fuera') return { ok: false, salida: { tipo: 'pantalla', pantalla: pantallaSinDato('fuera_de_madrid'), ubicacion: null } };
		return { ok: true, ubicacion: pin! };
	}
	let r;
	try {
		r = await buscarDireccion(f.direccion);
	} catch (e) {
		if (e instanceof DemasiadasBusquedas) return { ok: false, salida: { tipo: 'demasiadas' } };
		throw e;
	}
	if (r.tipo === 'no_encontrada') return { ok: false, salida: { tipo: 'no_encontrada', sugerencias: r.sugerencias } };
	if (r.tipo === 'pedir_numero_o_mapa') return { ok: false, salida: { tipo: 'pedir_numero', calle: r.calle, nSecciones: r.nSecciones } };
	return { ok: true, ubicacion: r.ubicacion };
}

function erroresDeUbicacion(f: EstadoFormulario, pin: Ubicacion | null | 'fuera', errores: ErroresCampos): void {
	if (f.modo === 'mapa') {
		if (pin === null) errores.mapa = 'Marca en el mapa el punto donde está el piso.';
	} else if (!f.direccion.trim()) {
		errores.direccion = f.modo === 'calle' ? 'Escribe el nombre de la calle.' : 'Escribe la calle y el número.';
	}
}

/** Habitación: sin referencia oficial; solo se necesita el barrio (los m² no se piden) */
async function comprobarHabitacion(f: EstadoFormulario, pin: Ubicacion | null | 'fuera'): Promise<Comprobacion> {
	const v = validarHabitacion({ precio: f.precio, habitaciones: f.habitaciones, tamano: f.tamano, gastos: f.gastos });
	const errores: ErroresCampos = v.ok ? {} : { ...v.errores };
	erroresDeUbicacion(f, pin, errores);
	if (Object.keys(errores).length || !v.ok) return { tipo: 'errores', errores };

	const datos = await cargarDatos();
	const u = await resolver(f, pin);
	if (!u.ok) return u.salida;
	const barrios = barriosDe(datos, u.ubicacion.cusecs);
	// Una calle que cruza varios barrios no da un barrio fiable: se pide el número o el mapa
	if (barrios.length !== 1) return { tipo: 'pedir_numero', calle: u.ubicacion.via ?? 'Esa calle', nSecciones: Math.max(barrios.length, 2) };
	const pantalla = construirPantallaHabitacion(v.datos, barrios[0]!.codigo, f.situacion === 'vivo', datos);
	if (!pantalla) return { tipo: 'pantalla', pantalla: pantallaSinDato('sin_dato_seccion'), ubicacion: u.ubicacion };
	return { tipo: 'pantalla', pantalla, ubicacion: u.ubicacion };
}

/**
 * `pin`: ubicación del punto marcado en el mapa (null si no hay punto o cae fuera de Madrid).
 * Lanza SinConexion si falla la geocodificación por red.
 */
export async function comprobar(f: EstadoFormulario, pin: Ubicacion | null | 'fuera'): Promise<Comprobacion> {
	if (f.tipo === 'habitacion') return comprobarHabitacion(f, pin);

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

	erroresDeUbicacion(f, pin, errores);
	if (Object.keys(errores).length) return { tipo: 'errores', errores };
	if (!v.ok) return { tipo: 'errores', errores };

	const datos = await cargarDatos();
	const u = await resolver(f, pin);
	if (!u.ok) return u.salida;
	const pantalla = construirPantalla(v.anuncio, u.ubicacion, datos);
	return {
		tipo: 'pantalla',
		pantalla: extra && pantalla.tipo === 'resultado' ? aInquilino(pantalla, v.anuncio, extra) : pantalla,
		ubicacion: u.ubicacion
	};
}
