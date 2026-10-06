<script lang="ts">
	import { QUE_HARAS, type RespuestaQueHaras } from '#lib/resultado';

	/**
	 * «¿Qué vas a hacer con este resultado?»: una sola elección, opcional y sin bloquear nada (compartir
	 * sigue disponible). Sustituye a «¿Te ha servido?». La respuesta solo sale como categoría, sin texto libre.
	 */
	let { modo, alElegir }: { modo: 'mirando' | 'vivo'; alElegir: (r: RespuestaQueHaras) => void } = $props();

	let elegida = $state<RespuestaQueHaras | null>(null);
	const opciones = $derived(QUE_HARAS[modo]);
</script>

<div class="que-haras">
	<div class="cabeza">
		<span class="pregunta" id="que-haras">{QUE_HARAS.pregunta}</span>
		<span class="opcional">{QUE_HARAS.opcional}</span>
	</div>
	{#if elegida}
		<span class="gracias" role="status">{QUE_HARAS.gracias}</span>
	{:else}
		<div class="opciones" role="group" aria-labelledby="que-haras">
			{#each opciones as o (o.valor)}
				<button
					type="button"
					class="boton boton-contorno"
					onclick={() => {
						elegida = o.valor;
						alElegir(o.valor);
					}}>{o.etiqueta}</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.que-haras {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 8px 0;
	}
	.cabeza {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 4px 10px;
	}
	.pregunta {
		font: 700 17px/1.3 var(--f-texto);
	}
	.opcional {
		font: 500 13px/1.3 var(--f-texto);
		color: var(--grafito);
	}
	.opciones {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.opciones :global(.boton) {
		width: 100%;
		min-height: 48px;
		justify-content: flex-start;
		text-align: left;
		font-size: 15px;
	}
	.gracias {
		font: 500 15px/1.4 var(--f-texto);
	}
</style>
