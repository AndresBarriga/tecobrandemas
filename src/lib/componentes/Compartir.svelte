<script lang="ts">
	import type { Snippet } from 'svelte';
	import TarjetaAmpliable from './TarjetaAmpliable.svelte';
	import { TARJETA, type Canal, type EnlacesCompartir } from '#lib/resultado';

	/**
	 * Compartir la tarjeta (los dos modos). En el móvil con hoja de compartir, un botón que abre la hoja nativa con la
	 * imagen y el enlace. En escritorio, WhatsApp, X, «Copiar enlace» y «Descargar imagen».
	 */
	let {
		tarjeta,
		titulo,
		detalle,
		boton,
		principal = false,
		compartiendo = false,
		nativo = false,
		enlaces = null,
		mensaje = null,
		alCompartir,
		alCompartirPor
	}: {
		/** Miniatura de la tarjeta (el canvas lo dibuja la página) */
		tarjeta: Snippet;
		titulo: string;
		detalle: string;
		/** «Compartir mi resultado» */
		boton: string;
		/** Botón principal en Paja o secundario con contorno */
		principal?: boolean;
		compartiendo?: boolean;
		nativo?: boolean;
		enlaces?: EnlacesCompartir | null;
		mensaje?: string | null;
		alCompartir: () => void;
		alCompartirPor: (canal: Canal) => void;
	} = $props();

	const clase = $derived(principal ? 'boton' : 'boton boton-contorno');
</script>

<section class="compartir">
	<TarjetaAmpliable {tarjeta} {titulo} {detalle} />

	{#if nativo}
		<button type="button" class={clase} onclick={alCompartir} disabled={compartiendo}>{compartiendo ? TARJETA.generando : boton}</button>
	{:else if enlaces}
		<div class="canales" role="group" aria-label={boton}>
			<a class="{clase} canal" href={enlaces.whatsapp} target="_blank" rel="noopener noreferrer" onclick={(e) => { e.preventDefault(); alCompartirPor('whatsapp'); }}>{TARJETA.canales.whatsapp}</a>
			<a class="{clase} canal" href={enlaces.x} target="_blank" rel="noopener noreferrer" onclick={(e) => { e.preventDefault(); alCompartirPor('x'); }}>{TARJETA.canales.x}</a>
			<button type="button" class="boton boton-contorno canal" onclick={() => alCompartirPor('copiar')}>{TARJETA.canales.copiar}</button>
			<button type="button" class="boton boton-contorno canal" onclick={() => alCompartirPor('descarga')}>{TARJETA.canales.descarga}</button>
		</div>
		<p class="mensaje">{TARJETA.canalesAviso}</p>
	{/if}
	<p class="mensaje" role="status">{mensaje ?? ''}</p>
</section>

<style>
	.compartir {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.canales {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	.canal {
		min-height: 48px;
		font-size: 16px;
	}
	.mensaje {
		font: 500 13px/1.4 var(--f-texto);
		color: var(--grafito);
		min-height: 1px;
	}
</style>
