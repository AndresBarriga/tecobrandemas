<script module lang="ts">
	import type { Snippet } from 'svelte';
	import type { TipoTarjeta } from '#lib/resultado';

	/** Las tarjetas que se ofrecen, la elegida y la miniatura de cada una (la dibuja la página) */
	export interface SelectorTarjeta {
		tipos: TipoTarjeta[];
		tipo: TipoTarjeta;
		elegir: (t: TipoTarjeta) => void;
		miniatura: Snippet<[TipoTarjeta]>;
	}
</script>

<script lang="ts">
	import TarjetaAmpliable from './TarjetaAmpliable.svelte';
	import { TARJETA, TARJETA_COSTURA, type Canal, type EnlacesCompartir } from '#lib/resultado';

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
		alCompartirPor,
		selector = null
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
		/** Con varias tarjetas: la persona elige cuál comparte («La costura»). Sin él, una sola miniatura */
		selector?: SelectorTarjeta | null;
	} = $props();

	const clase = $derived(principal ? 'boton' : 'boton boton-contorno');
</script>

<section class="compartir">
	<TarjetaAmpliable {tarjeta} {titulo} {detalle} soloTexto={!!selector} />

	{#if selector}
		<fieldset class="selector">
			<legend class="solo-lectores">{TARJETA_COSTURA.elegir}</legend>
			{#each selector.tipos as t (t)}
				<label class="opcion" class:elegida={selector.tipo === t}>
					<input type="radio" name="tipo-tarjeta" value={t} checked={selector.tipo === t} onchange={() => selector.elegir(t)} />
					<span class="mini" aria-hidden="true">{@render selector.miniatura(t)}</span>
					<span class="nombre"><span class="radio" aria-hidden="true"></span>{TARJETA_COSTURA.tipos[t]}</span>
				</label>
			{/each}
		</fieldset>
	{/if}

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
	/* Selector: miniaturas reales en fila, con su radio; la elegida, con contorno */
	.selector {
		border: 0;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
		max-width: 420px;
	}
	.opcion {
		display: flex;
		flex-direction: column;
		gap: 8px;
		cursor: pointer;
		min-width: 0;
	}
	.opcion input {
		position: absolute;
		opacity: 0;
		width: 1px;
		height: 1px;
	}
	.mini {
		display: block;
		aspect-ratio: 1080 / 1350;
		border-radius: 6px;
		overflow: hidden;
		background: var(--paja);
		outline: 1.5px solid var(--pista);
		outline-offset: 2px;
		transition: outline-color 0.15s;
	}
	.opcion.elegida .mini {
		outline: 3px solid var(--tinta);
	}
	.opcion:has(input:focus-visible) .mini {
		outline: 3px solid var(--tinta);
		outline-offset: 4px;
	}
	.nombre {
		display: flex;
		align-items: center;
		gap: 6px;
		font: 600 13px/1.2 var(--f-texto);
	}
	.radio {
		flex: none;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		border: 1.5px solid var(--tinta);
		box-sizing: border-box;
	}
	.opcion.elegida .radio {
		border-width: 4.5px;
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
