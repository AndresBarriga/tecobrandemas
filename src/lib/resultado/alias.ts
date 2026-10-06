/**
 * Nombres populares de barrios → nombre oficial (CartoCiudad / Ayuntamiento de Madrid), para el
 * autocompletado. El nombre oficial debe existir en seccion_barrio.json (lo comprueba un test).
 * Lista corta y revisable: se amplía con las que apruebe el usuario.
 */
import type { Alias } from './autocompletar';

export const ALIAS_BARRIOS: Alias = {
	Malasaña: ['Universidad'],
	Lavapiés: ['Embajadores'],
	Chueca: ['Justicia'],
	'El Rastro': ['Embajadores'],
	'Conde Duque': ['Universidad'],
	Tribunal: ['Universidad'],
	Huertas: ['Cortes'],
	'Barrio de las Letras': ['Cortes'],
	Ópera: ['Palacio'],
	Bernabéu: ['Castilla'],
	'Las Tablas': ['Valverde'],
	Sanchinarro: ['Valdefuentes'],
	Valdebebas: ['Valdefuentes'],
	// Ambiguos: apuntan a varios barrios o a un distrito entero
	'La Latina': ['Palacio', 'Embajadores'],
	Vallecas: ['Puente de Vallecas', 'Villa de Vallecas'],
	'Barrio de Salamanca': ['Salamanca']
};
