/** Lo que la persona ha escrito en el formulario; son textos tal cual, sin interpretar */
export type ModoUbicacion = 'calle' | 'mapa';
/** «Un anuncio» o «Mi alquiler» */
export type Situacion = 'mirando' | 'vivo';
export type TipoVivienda = 'piso' | 'habitacion' | 'casa';
export type TamanoPiso = 'hasta60' | '60-90' | '90-120' | 'mas120' | 'nose';

export interface EstadoFormulario {
	situacion: Situacion;
	modo: ModoUbicacion;
	/** Lo escrito en «Calle» mientras no se haya elegido una sugerencia */
	direccion: string;
	/** Calle elegida de las sugerencias (nombre oficial): sustituye a lo escrito */
	via: string | null;
	/** Número del portal (opcional): «12», «12 bis» */
	numero: string;
	precio: string;
	superficie: string;
	obraNueva: boolean;
	largaDuracion: boolean;
	tipo: TipoVivienda;
	/** «Somos N» (2-12) de un piso compartido con un solo contrato; solo en pantalla, no se guarda */
	somos: string;
	/** Fecha de firma («Mi alquiler»): «hace menos de un año», o mes (1-12) y año */
	firmaReciente: boolean;
	firmaMes: string;
	firmaAno: string;
	/** Lo que se pagaba al firmar (opcional) */
	rentaFirma: string;
	/** Habitación: habitaciones del piso (1-6, 6 = 6 o más), tamaño aproximado y gastos incluidos */
	habitaciones: number;
	tamano: TamanoPiso | '';
	gastos: boolean;
	/** «Usar mi ubicación»: barrio y precisión (±m, redondeada a 10) de la lectura activa; las coordenadas no se guardan aquí */
	ubicacionActual: { barrio: string; precisionM: number } | null;
}

export const estadoInicial = (): EstadoFormulario => ({
	situacion: 'vivo',
	modo: 'calle',
	direccion: '',
	via: null,
	numero: '',
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
	gastos: true,
	ubicacionActual: null
});

/** Un formulario guardado con los modos antiguos («direccion», «Solo calle») pasa a «Calle» */
export const modoGuardado = (m: unknown): ModoUbicacion => (m === 'mapa' ? 'mapa' : 'calle');
