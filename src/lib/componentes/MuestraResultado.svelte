<script lang="ts">
	import { onMount } from 'svelte';
	import Comparativa from './Comparativa.svelte';
	import { MUESTRA, construirMuestra, type Muestra, type ModoMuestra } from '#lib/resultado';
	import { cargarDatos } from '#lib/cliente/datos';

	/** `modo`: la pestaña activa («Un anuncio» o «Mi alquiler»). `alListo` avisa a la página de que la muestra está lista (entonces el esquema gris sobra) */
	let { modo, alListo }: { modo: ModoMuestra; alListo?: () => void } = $props();

	let datos = $state<Awaited<ReturnType<typeof cargarDatos>> | null>(null);

	// Solo en escritorio: en móvil la portada no la enseña, así que ni se calcula
	onMount(() => {
		if (!matchMedia('(min-width: 1024px)').matches) return;
		void cargarDatos()
			.then((d) => {
				datos = d;
				if (construirMuestra(d, modo)) alListo?.();
			})
			.catch(() => {});
	});

	const muestra = $derived<Muestra | null>(datos ? construirMuestra(datos, modo) : null);
</script>

{#if muestra}
	<section class="muestra nivel-{muestra.clase}" aria-labelledby="muestra-titulo">
		<div class="cabeza">
			<h2 id="muestra-titulo">{MUESTRA.titulo}</h2>
			<span class="sello">{MUESTRA.ejemplo}</span>
		</div>
		<div class="lugar">
			<p class="nombre">{muestra.lugar}</p>
			<p class="contexto">{muestra.contexto}</p>
		</div>
		<!-- El mismo diseño que el resultado, con valores reales del motor -->
		<Comparativa comparativa={muestra.comparativa} conImpacto={false} />
		<p class="pie">{MUESTRA.nota}</p>
	</section>
{/if}

<style>
	.muestra {
		display: none;
	}
	@media (min-width: 1024px) {
		.muestra {
			display: flex;
			flex-direction: column;
			gap: 18px;
			background: var(--superficie);
			border-radius: var(--radio);
			padding: 28px;
		}
	}
	.cabeza {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	h2 {
		font: 500 17px/1.3 var(--f-texto);
	}
	.sello {
		border: 1.5px dashed var(--ciruela);
		color: var(--ciruela);
		border-radius: 4px;
		padding: 3px 8px;
		font: 800 12px/1 var(--f-texto);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.nombre {
		font: 700 17px/1.3 var(--f-texto);
	}
	.contexto {
		font: 400 15px/1.4 var(--f-texto);
		color: var(--grafito);
	}
	.pie {
		font: 400 14px/1.4 var(--f-texto);
		color: var(--grafito);
	}
</style>
