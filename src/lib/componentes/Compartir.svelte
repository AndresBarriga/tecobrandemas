<script lang="ts">
	import type { Snippet } from 'svelte';
	import TarjetaAmpliable from './TarjetaAmpliable.svelte';
	import { TARJETA, type Canal, type EnlacesCompartir } from '#lib/resultado';

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
		textos = [],
		elegido = 0,
		etiquetaTextos = '',
		alElegirTexto,
		alCompartir,
		alCompartirPor
	}: {
		/** Miniatura de la tarjeta (el canvas lo dibuja la página) */
		tarjeta: Snippet;
		titulo: string;
		detalle: string;
		/** «Compartir mi resultado» */
		boton: string;
		/** Botón principal en Paja (tras aportar) o secundario con contorno */
		principal?: boolean;
		compartiendo?: boolean;
		nativo?: boolean;
		enlaces?: EnlacesCompartir | null;
		mensaje?: string | null;
		/** Los textos entre los que se elige (tarjeta del inquilino) */
		textos?: string[];
		elegido?: number;
		etiquetaTextos?: string;
		alElegirTexto?: (i: number) => void;
		alCompartir: () => void;
		alCompartirPor: (canal: Canal) => void;
	} = $props();

	const clase = $derived(principal ? 'boton' : 'boton boton-contorno');
</script>

<section class="compartir">
	{#if textos.length}
		<fieldset class="textos">
			<legend>{etiquetaTextos}</legend>
			{#each textos as t, i (i)}
				<label class="texto" class:activo={elegido === i}>
					<input type="radio" name="texto-tarjeta" checked={elegido === i} onchange={() => alElegirTexto?.(i)} />
					<span>{t}</span>
				</label>
			{/each}
		</fieldset>
	{/if}

	<TarjetaAmpliable {tarjeta} {titulo} {detalle} />

	{#if nativo}
		<button type="button" class={clase} onclick={alCompartir} disabled={compartiendo}>{compartiendo ? TARJETA.generando : boton}</button>
	{:else if enlaces}
		<div class="canales" role="group" aria-label={boton}>
			<a class="{clase} canal" href={enlaces.whatsapp} target="_blank" rel="noopener noreferrer" onclick={() => alCompartirPor('whatsapp')}>{TARJETA.canales.whatsapp}</a>
			<a class="{clase} canal" href={enlaces.x} target="_blank" rel="noopener noreferrer" onclick={() => alCompartirPor('x')}>{TARJETA.canales.x}</a>
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
	.textos {
		border: 0;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.textos legend {
		font: 700 16px/1.3 var(--f-texto);
		padding: 0;
		margin-bottom: 8px;
	}
	.texto {
		position: relative;
		display: flex;
		align-items: center;
		min-height: 52px;
		padding: 10px 14px;
		border: 1.5px solid var(--tinta);
		border-radius: var(--radio);
		background: var(--blanco);
		font: 500 15px/1.35 var(--f-texto);
		cursor: pointer;
	}
	.texto.activo {
		background: var(--tinta);
		color: var(--blanco);
	}
	.texto input {
		position: absolute;
		opacity: 0;
		inset: 0;
		cursor: pointer;
	}
	.texto:focus-within {
		outline: 2px solid var(--tinta);
		outline-offset: 3px;
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
