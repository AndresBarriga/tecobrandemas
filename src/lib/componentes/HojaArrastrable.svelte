<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * Hoja inferior de /mapa. En móvil (menos de 960 px) se arrastra entre tres alturas: cerrada (solo el asa y
	 * la cabecera), media y completa. En escritorio es un panel normal: sin asa y sin altura propia.
	 * Con el teclado abierto la hoja pasa a completa y el campo enfocado se mantiene a la vista.
	 */
	let {
		estado = $bindable('media'),
		alto,
		reservaSuperior = 64,
		altoVisible = $bindable(0),
		cabecera,
		children
	}: {
		estado?: 'cerrada' | 'media' | 'completa';
		/** Alto de la zona de la página (en píxeles) en la que se mueve la hoja */
		alto: number;
		/** Píxeles libres arriba cuando la hoja está completa (el conmutador de capa) */
		reservaSuperior?: number;
		/** Alto visible de la hoja en este momento, para colocar los botones de zoom encima */
		altoVisible?: number;
		cabecera: Snippet;
		children: Snippet;
	} = $props();

	let cabEl: HTMLElement | undefined = $state();
	let asaEl: HTMLElement | undefined = $state();
	const ASA = 36;
	const cerrada = $derived(ASA + (cabEl?.offsetHeight ?? 56) + 8);
	const completa = $derived(Math.max(cerrada + 120, alto - reservaSuperior));
	const media = $derived(Math.min(completa - 60, Math.max(cerrada + 140, Math.round(alto * 0.42))));
	const altura = (e: 'cerrada' | 'media' | 'completa') => (e === 'cerrada' ? cerrada : e === 'media' ? media : completa);

	let arrastre = $state<number | null>(null);
	const visible = $derived(arrastre ?? altura(estado));
	$effect(() => {
		altoVisible = visible;
	});

	let inicio: { y: number; alto: number; t: number } | null = null;
	let movido = false;
	function abajo(e: PointerEvent) {
		inicio = { y: e.clientY, alto: altura(estado), t: e.timeStamp };
		movido = false;
		asaEl?.setPointerCapture(e.pointerId);
	}
	function mueve(e: PointerEvent) {
		if (!inicio) return;
		const dy = inicio.y - e.clientY;
		if (!movido && Math.abs(dy) < 6) return;
		movido = true;
		arrastre = Math.min(completa, Math.max(cerrada, inicio.alto + dy));
	}
	function arriba(e: PointerEvent) {
		if (!inicio) return;
		if (movido && arrastre !== null) {
			// Con un gesto rápido se salta a la siguiente altura en esa dirección
			const v = ((inicio.y - e.clientY) / Math.max(1, e.timeStamp - inicio.t)) * 1000;
			const destino = arrastre + Math.max(-160, Math.min(160, v * 0.2));
			const alturas = (['cerrada', 'media', 'completa'] as const).map((n) => [n, Math.abs(altura(n) - destino)] as const);
			estado = alturas.sort((a, b) => a[1] - b[1])[0]![0];
		}
		arrastre = null;
		inicio = null;
	}
	/** Sin arrastrar, un toque en el asa pasa a la siguiente altura; con teclado, las flechas */
	function alternar() {
		if (movido) return;
		estado = estado === 'cerrada' ? 'media' : estado === 'media' ? 'completa' : 'cerrada';
	}
	function teclaAsa(e: KeyboardEvent) {
		if (e.key === 'ArrowUp') estado = estado === 'cerrada' ? 'media' : 'completa';
		else if (e.key === 'ArrowDown') estado = estado === 'completa' ? 'media' : 'cerrada';
		else return;
		e.preventDefault();
	}

	// Teclado: al enfocar un campo, hoja completa y campo a la vista
	function alEnfocar(e: FocusEvent) {
		const el = e.target as HTMLElement;
		if (!(el instanceof HTMLInputElement) || !window.matchMedia('(max-width: 959px)').matches) return;
		estado = 'completa';
		setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 280);
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<section class="hoja-arr" class:arrastrando={arrastre !== null} style:--vis="{visible}px" aria-label="Ajustes del mapa" onfocusin={alEnfocar}>
	<button
		type="button"
		class="asa"
		bind:this={asaEl}
		aria-label="Cambiar la altura del panel"
		aria-expanded={estado !== 'cerrada'}
		onpointerdown={abajo}
		onpointermove={mueve}
		onpointerup={arriba}
		onpointercancel={arriba}
		onclick={alternar}
		onkeydown={teclaAsa}
	><span></span></button>
	<div class="cab" bind:this={cabEl}>{@render cabecera()}</div>
	<div class="cuerpo">{@render children()}</div>
</section>

<style>
	.hoja-arr {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.asa,
	.cab {
		display: none;
	}
	.cuerpo {
		display: flex;
		flex-direction: column;
		gap: 16px;
		min-width: 0;
	}

	@media (max-width: 959px) {
		.hoja-arr {
			position: absolute;
			left: 0;
			right: 0;
			bottom: 0;
			z-index: 4;
			height: var(--vis);
			background: var(--papel);
			border-radius: 16px 16px 0 0;
			box-shadow: 0 -2px 16px rgb(28 27 25 / 0.22);
			overflow: hidden;
			transition: height 0.22s ease;
		}
		.hoja-arr.arrastrando {
			transition: none;
		}
		.asa {
			display: flex;
			flex: none;
			align-items: center;
			justify-content: center;
			width: 100%;
			height: 36px;
			padding: 0;
			border: 0;
			background: transparent;
			touch-action: none;
			cursor: grab;
		}
		.asa span {
			width: 44px;
			height: 5px;
			border-radius: 3px;
			background: var(--grafito);
		}
		.asa:focus-visible {
			outline: 2px solid var(--tinta);
			outline-offset: -4px;
		}
		.cab {
			display: block;
			flex: none;
			padding: 0 var(--margen) 8px;
		}
		.cuerpo {
			flex: 1;
			min-height: 0;
			overflow-y: auto;
			overscroll-behavior: contain;
			padding: 4px var(--margen) 24px;
			border-top: 1px solid var(--pista);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.hoja-arr {
			transition: none;
		}
	}
</style>
