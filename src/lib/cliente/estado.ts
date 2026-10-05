/** Lo que la persona ha escrito en el formulario; son textos tal cual, sin interpretar */
export type ModoUbicacion = 'direccion' | 'calle' | 'mapa';

export interface EstadoFormulario {
	modo: ModoUbicacion;
	direccion: string;
	precio: string;
	superficie: string;
	obraNueva: boolean;
	largaDuracion: boolean;
	tipo: 'piso' | 'casa';
}

export const estadoInicial = (): EstadoFormulario => ({
	modo: 'direccion',
	direccion: '',
	precio: '',
	superficie: '',
	obraNueva: false,
	largaDuracion: true,
	tipo: 'piso'
});
