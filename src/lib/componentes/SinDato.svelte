<script lang="ts">
	import { BOTON_OFICIAL, BOTON_OTRO_PISO, ETIQUETA_SIN_REFERENCIA, type PantallaSinDato } from '#lib/resultado';

	let { pantalla, alOtro }: { pantalla: PantallaSinDato; alOtro: () => void } = $props();
</script>

<article class="sin-dato">
	{#if pantalla.lugar}
		<div class="lugar">
			<h1>{pantalla.lugar}</h1>
			{#if pantalla.contexto}<p>{pantalla.contexto}</p>{/if}
		</div>
	{/if}

	<p class="etiqueta">
		<svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" style="flex: none">
			<circle cx="10" cy="10" r="8.5" stroke="var(--tinta)" stroke-width="1.5" fill="none" />
			<path d="M6 10h8" stroke="var(--tinta)" stroke-width="2" />
		</svg>
		{ETIQUETA_SIN_REFERENCIA}
	</p>

	<svelte:element this={pantalla.lugar ? 'h2' : 'h1'} class="titular">{pantalla.titular}</svelte:element>
	<p class="frase">{pantalla.frase}</p>
	<p class="extra">{pantalla.extra}</p>

	<div class="botones">
		<a class="boton boton-contorno oficial" href={pantalla.enlaceOficial} target="_blank" rel="noopener noreferrer">
			<span>{BOTON_OFICIAL}</span>
			<span class="detalle">serpavi.mivau.gob.es</span>
		</a>
		<button type="button" class="boton" onclick={alOtro}>{BOTON_OTRO_PISO}</button>
	</div>
</article>

<style>
	.sin-dato {
		padding: 24px var(--margen) 0;
		display: flex;
		flex-direction: column;
		gap: 18px;
		width: 100%;
		max-width: 600px;
	}
	.lugar h1 {
		font: 700 17px/1.3 var(--f-texto);
	}
	.lugar p {
		font: 400 15px/1.4 var(--f-texto);
		color: var(--grafito);
	}
	.etiqueta {
		display: inline-flex;
		align-self: flex-start;
		align-items: center;
		gap: 8px;
		min-height: 32px;
		padding: 4px 12px 4px 8px;
		border: 1.5px solid var(--tinta);
		border-radius: var(--radio);
		font: 700 14px/1.25 var(--f-texto);
	}
	.titular {
		font: 800 60px/0.88 var(--f-extra);
		text-transform: uppercase;
	}
	.frase {
		font: 600 21px/1.3 var(--f-texto);
		text-wrap: pretty;
	}
	.extra {
		font: 400 16px/1.5 var(--f-texto);
		text-wrap: pretty;
	}
	.botones {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.oficial {
		flex-direction: column;
		gap: 0;
		padding: 8px 14px;
		min-height: 52px;
	}
	.detalle {
		font: 500 13px/1.3 var(--f-texto);
		color: var(--grafito);
	}
</style>
