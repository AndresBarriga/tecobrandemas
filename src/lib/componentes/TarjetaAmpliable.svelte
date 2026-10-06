<script lang="ts">
	import type { Snippet } from 'svelte';
	import { TARJETA } from '#lib/resultado';

	/**
	 * La tarjeta para compartir: miniatura, texto y «Ver en grande», que abre la tarjeta ampliada en un
	 * diálogo modal. Usa <dialog>.showModal(): el foco queda dentro, Esc cierra, el resto de la página
	 * queda inerte y el foco vuelve al botón. La imagen es la del canvas que se comparte, así que lo que
	 * se ve es lo que se envía; su descripción es el aria-label que la página pone al canvas.
	 */
	let { tarjeta, titulo, detalle }: { tarjeta: Snippet; titulo: string; detalle: string } = $props();

	let miniatura: HTMLElement | undefined = $state();
	let dialogo: HTMLDialogElement | undefined = $state();
	let imagen = $state<string | null>(null);
	let descripcion = $state('');

	function abrir() {
		const canvas = miniatura?.querySelector('canvas');
		if (!canvas || !dialogo || canvas.width < 2) return;
		try {
			imagen = canvas.toDataURL('image/jpeg', 0.92);
		} catch {
			return;
		}
		descripcion = canvas.getAttribute('aria-label') ?? titulo;
		dialogo.showModal();
	}
	// Un clic fuera de la tarjeta (en el fondo oscuro) también cierra
	const alPulsar = (e: MouseEvent) => {
		if (e.target === dialogo) dialogo.close();
	};
</script>

<div class="tarjeta">
	<!-- Para quien usa ratón o dedo; con teclado o lector se usa el botón de al lado -->
	<button type="button" class="miniatura" bind:this={miniatura} onclick={abrir} tabindex="-1" aria-hidden="true">{@render tarjeta()}</button>
	<div class="tarjeta-texto">
		<span class="tarjeta-titulo">{titulo}</span>
		<span class="tarjeta-detalle">{detalle}</span>
		<button type="button" class="ampliar" onclick={abrir} aria-haspopup="dialog">{TARJETA.ampliar}</button>
	</div>
</div>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog bind:this={dialogo} class="ampliada" aria-labelledby="tarjeta-ampliada-titulo" onclose={() => (imagen = null)} onclick={alPulsar}>
	<div class="caja">
		<div class="cabeza">
			<h2 id="tarjeta-ampliada-titulo">{TARJETA.ampliadaTitulo}</h2>
			<button type="button" class="cerrar" onclick={() => dialogo?.close()}>{TARJETA.cerrar}</button>
		</div>
		{#if imagen}<img src={imagen} alt={descripcion} />{/if}
	</div>
</dialog>

<style>
	.tarjeta {
		display: flex;
		gap: 14px;
		align-items: center;
	}
	.miniatura {
		width: 96px;
		height: 120px;
		flex: none;
		padding: 0;
		border: 0;
		border-radius: 6px;
		overflow: hidden;
		background: none;
		cursor: zoom-in;
	}
	.tarjeta-texto {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 4px;
	}
	.tarjeta-titulo {
		font: 700 16px/1.3 var(--f-texto);
	}
	.tarjeta-detalle {
		font: 400 13px/1.4 var(--f-texto);
		color: var(--grafito);
	}
	.ampliar {
		min-height: 44px;
		padding: 0;
		border: 0;
		background: none;
		color: var(--tinta);
		font: 700 15px/1.2 var(--f-texto);
		text-decoration: underline;
		text-decoration-color: var(--paja);
		text-decoration-thickness: 2px;
		text-underline-offset: 4px;
		cursor: pointer;
	}
	.ampliar:focus-visible,
	.cerrar:focus-visible {
		outline: 2px solid var(--tinta);
		outline-offset: 3px;
	}

	.ampliada {
		width: min(92vw, 520px);
		max-height: 96dvh;
		padding: 0;
		border: 0;
		border-radius: 12px;
		background: var(--papel);
		color: var(--tinta);
		overflow: hidden;
	}
	.ampliada::backdrop {
		background: rgb(28 27 25 / 0.74);
	}
	.caja {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 16px;
		max-height: 96dvh;
	}
	.cabeza {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	h2 {
		font: 700 18px/1.3 var(--f-texto);
	}
	.cerrar {
		min-height: 44px;
		padding: 0 18px;
		border: 1.5px solid var(--tinta);
		border-radius: var(--radio);
		background: var(--blanco);
		color: var(--tinta);
		font: 700 15px/1 var(--f-texto);
		cursor: pointer;
	}
	img {
		display: block;
		width: auto;
		max-width: 100%;
		max-height: calc(96dvh - 112px);
		margin: 0 auto;
		border-radius: 8px;
		object-fit: contain;
	}
	:global(body:has(dialog.ampliada[open])) {
		overflow: hidden;
	}
</style>
