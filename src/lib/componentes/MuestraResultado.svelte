<script lang="ts">
	import { onMount } from 'svelte';
	import Barra from './Barra.svelte';
	import Icono from './Icono.svelte';
	import { MUESTRA, construirMuestra, heroEnVeces, type Muestra, type ModoMuestra } from '#lib/resultado';
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
	const v = $derived(muestra?.vista);
	const principal = $derived(muestra?.principal);
</script>

{#if muestra && v && principal}
	<section class="muestra nivel-{muestra.clase}" aria-labelledby="muestra-titulo">
		<div class="cabeza">
			<h2 id="muestra-titulo">{MUESTRA.titulo}</h2>
			<span class="sello">{MUESTRA.ejemplo}</span>
		</div>
		<div class="lugar">
			<p class="nombre">{muestra.lugar}</p>
			<p class="contexto">{muestra.contexto}</p>
		</div>
		<p class="etiqueta"><Icono clase={muestra.icono} />{muestra.etiqueta}</p>
		{#if principal.tipo === 'cifra'}
			<div class="principal">
				<p class="cifra" class:veces={heroEnVeces(principal.texto)}>{principal.texto}</p>
				<p class="nota">{principal.nota}</p>
			</div>
		{:else}
			<div class="principal">
				<p class="titular">{principal.texto}</p>
				<p class="nota">{principal.nota}</p>
			</div>
		{/if}
		{#if muestra.frase}<p class="frase">{muestra.frase}</p>{/if}
		{#if muestra.oferta}
			<div class="oferta">
				<p class="oferta-linea">{muestra.oferta.linea}</p>
				<p class="oferta-pie">{muestra.oferta.pie}</p>
			</div>
		{/if}
		<div class="barra"><Barra barra={muestra.barra} vista={v} etiquetaPrecio={muestra.etiquetaPrecio} /></div>
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
	.etiqueta {
		display: inline-flex;
		align-self: flex-start;
		align-items: center;
		gap: 8px;
		min-height: 32px;
		padding: 4px 12px 4px 8px;
		background: var(--tinte);
		color: var(--acento);
		border-radius: var(--radio);
		font: 700 14px/1.25 var(--f-texto);
	}
	.principal {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 6px;
	}
	.cifra {
		font: 900 88px/0.85 var(--f-extra);
		color: var(--acento);
	}
	.cifra.veces {
		font-size: 60px;
	}
	.titular {
		font: 800 60px/0.88 var(--f-extra);
		text-transform: uppercase;
		color: var(--acento);
	}
	.nota {
		font: 500 15px/1.4 var(--f-texto);
		color: var(--grafito);
	}
	.frase {
		font: 500 19px/1.3 var(--f-texto);
	}
	.oferta {
		display: flex;
		flex-direction: column;
		gap: 4px;
		border-left: 3px solid var(--tinta);
		padding-left: 10px;
	}
	.oferta-linea {
		font: 600 16px/1.4 var(--f-texto);
		text-wrap: pretty;
	}
	.oferta-pie {
		font: 400 13px/1.4 var(--f-texto);
		color: var(--grafito);
	}
	.pie {
		font: 400 14px/1.4 var(--f-texto);
		color: var(--grafito);
	}
</style>
