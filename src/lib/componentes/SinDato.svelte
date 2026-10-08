<script lang="ts">
	import { BOTON_OFICIAL, BOTON_OTRO_PISO, ETIQUETA_SIN_REFERENCIA, VOLVER_LIMITES, type PantallaSinDato } from '#lib/resultado';

	let {
		pantalla,
		alOtro,
		volver = false,
		modo = 'mirando'
	}: {
		pantalla: PantallaSinDato;
		alOtro: () => void;
		/** Abierta desde «Lo que no calculamos»: enlace «← Volver» arriba */
		volver?: boolean;
		/** El botón «otro»: anuncio (por defecto) o alquiler */
		modo?: 'mirando' | 'vivo';
	} = $props();

	// Si se llegó desde esta web, vuelve atrás en el historial; si no, el enlace lleva a «Lo que no calculamos»
	function alVolver(e: MouseEvent) {
		let mismaWeb = false;
		try {
			mismaWeb = !!document.referrer && new URL(document.referrer).origin === location.origin;
		} catch {
			mismaWeb = false;
		}
		if (mismaWeb && history.length > 1) {
			e.preventDefault();
			history.back();
		}
	}
</script>

<article class="sin-dato">
	{#if volver}<a class="volver" href={VOLVER_LIMITES.href} onclick={alVolver}>{VOLVER_LIMITES.texto}</a>{/if}
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
		<button type="button" class="boton" onclick={alOtro}>{BOTON_OTRO_PISO[modo]}</button>
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
	.volver {
		align-self: flex-start;
		font: 600 15px/1.3 var(--f-texto);
		color: var(--tinta);
		padding: 8px 0;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
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
