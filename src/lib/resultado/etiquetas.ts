/**
 * Colocación de las etiquetas de la barra (en pantalla y en la tarjeta). Una etiqueta se alinea
 * a la derecha de su marca; si así se saldría por la izquierda o pisaría el «0 €», pasa a la
 * derecha de la marca. Nunca sale de la barra por ningún lado mientras quepa.
 *
 * @param ancla   posición de la marca (px desde el borde izquierdo de la barra)
 * @param ancho   ancho de la etiqueta
 * @param total   ancho de la barra
 * @param libreIzq  lo primero que está libre por la izquierda (p. ej. ancho del «0 €» y un hueco)
 * @returns       borde izquierdo de la etiqueta
 */
export function colocarEtiqueta(ancla: number, ancho: number, total: number, libreIzq = 0): number {
	if (ancla - ancho >= libreIzq) return ancla - ancho;
	return Math.min(Math.max(ancla, libreIzq), Math.max(total - ancho, libreIzq));
}
