/** Lo que la persona ha escrito en el formulario; son textos tal cual, sin interpretar */
export type ModoUbicacion = 'direccion' | 'calle' | 'mapa';
/** «Estoy mirando un piso» (un anuncio) o «Ya vivo aquí» (mi alquiler) */
export type Situacion = 'mirando' | 'vivo';
export type TipoVivienda = 'piso' | 'habitacion' | 'casa';
export type TamanoPiso = 'hasta60' | '60-90' | '90-120' | 'mas120' | 'nose';

export interface EstadoFormulario {
	situacion: Situacion;
	modo: ModoUbicacion;
	direccion: string;
	precio: string;
	superficie: string;
	obraNueva: boolean;
	largaDuracion: boolean;
	tipo: TipoVivienda;
	/** «Somos N» (2-12) de un piso compartido con un solo contrato; solo en pantalla, no se guarda */
	somos: string;
	/** Fecha de firma («Ya vivo aquí»): «hace menos de un año», o mes (1-12) y año */
	firmaReciente: boolean;
	firmaMes: string;
	firmaAno: string;
	/** Lo que se pagaba al firmar (opcional) */
	rentaFirma: string;
	/** Habitación: habitaciones del piso (1-6, 6 = 6 o más), tamaño aproximado y gastos incluidos */
	habitaciones: number;
	tamano: TamanoPiso | '';
	gastos: boolean;
}

export const estadoInicial = (): EstadoFormulario => ({
	situacion: 'mirando',
	modo: 'direccion',
	direccion: '',
	precio: '',
	superficie: '',
	obraNueva: false,
	largaDuracion: true,
	tipo: 'piso',
	somos: '',
	firmaReciente: false,
	firmaMes: '',
	firmaAno: '',
	rentaFirma: '',
	habitaciones: 3,
	tamano: '',
	gastos: true
});
