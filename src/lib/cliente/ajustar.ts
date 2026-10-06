/**
 * Acción de Svelte: mantiene un titular en una sola línea reduciendo el tamaño de letra lo justo para que
 * quepa en el ancho disponible (p. ej. «+13 % a +31 %» en 390 px). Se recalcula al cambiar el texto, el ancho
 * o cuando cargan las fuentes.
 */
export function unaLinea(nodo: HTMLElement, _texto?: unknown) {
	const ajustar = () => {
		nodo.style.whiteSpace = 'nowrap';
		nodo.style.fontSize = '';
		const disponible = nodo.clientWidth;
		const necesario = nodo.scrollWidth;
		if (disponible > 0 && necesario > disponible) {
			nodo.style.fontSize = `${Math.floor(parseFloat(getComputedStyle(nodo).fontSize) * (disponible / necesario) * 100) / 100 - 0.5}px`;
		}
	};
	ajustar();
	void document.fonts?.ready.then(ajustar);
	const observador = new ResizeObserver(() => ajustar());
	if (nodo.parentElement) observador.observe(nodo.parentElement);
	return {
		update: ajustar,
		destroy: () => observador.disconnect()
	};
}
