/**
 * «Usar mi ubicación»: todo en el navegador. La lectura de `navigator.geolocation` se convierte en
 * zonas con los polígonos (carga diferida al pulsar); las coordenadas no se envían ni se guardan, y
 * esta función no las devuelve: solo la ubicación (zonas), el barrio y la precisión redondeada.
 */
import { barrioDe, type BarrioDeSeccion, type Ubicacion } from '#lib/resultado';
import { cargarDatos } from './datos';
import { cargarMapa, ubicacionDelPunto } from './mapa';

/** Más allá de esta precisión (m) se avisa y se ofrece colocar el punto a mano */
export const PRECISION_BAJA_M = 150;

export type LecturaGps =
	| { estado: 'lista'; ubicacion: Ubicacion; barrio: BarrioDeSeccion; precisionM: number; baja: boolean }
	| { estado: 'denegado' | 'tiempo' | 'fuera' | 'sin_gps' };

/** «(±30 m)»: la precisión se redondea a 10 m */
export const redondear10 = (m: number) => Math.max(10, Math.round(m / 10) * 10);

export async function ubicarme(): Promise<LecturaGps> {
	if (!('geolocation' in navigator)) return { estado: 'sin_gps' };
	let pos: GeolocationPosition;
	try {
		pos = await new Promise((ok, ko) => navigator.geolocation.getCurrentPosition(ok, ko, { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 }));
	} catch (e) {
		return { estado: (e as GeolocationPositionError).code === 1 ? 'denegado' : 'tiempo' };
	}
	const [mapa, datos] = await Promise.all([cargarMapa(), cargarDatos()]);
	// La precisión de la lectura es el radio de la horquilla, con tope en el de la ubicación aproximada
	const radio = Math.min(PRECISION_BAJA_M, Math.max(1, Math.round(pos.coords.accuracy)));
	const ubicacion = ubicacionDelPunto(mapa, { lon: pos.coords.longitude, lat: pos.coords.latitude }, radio);
	const barrio = ubicacion ? barrioDe(datos, ubicacion.cusecs[0]!) : null;
	if (!ubicacion || !barrio) return { estado: 'fuera' };
	return { estado: 'lista', ubicacion, barrio, precisionM: redondear10(pos.coords.accuracy), baja: pos.coords.accuracy > PRECISION_BAJA_M };
}
