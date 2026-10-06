/**
 * Nombres populares de barrios → nombre oficial (CartoCiudad / Ayuntamiento de Madrid), para el
 * autocompletado. El nombre oficial debe existir en seccion_barrio.json (lo comprueba un test).
 * Lista corta y revisable: se amplía con las que apruebe el usuario.
 */
import type { Alias } from './autocompletar';

export const ALIAS_BARRIOS: Alias = {
	Malasaña: ['Universidad'],
	Lavapiés: ['Embajadores'],
	Chueca: ['Justicia']
};
