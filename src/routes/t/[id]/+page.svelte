<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import Cabecera from '#lib/componentes/Cabecera.svelte';
	import Pie from '#lib/componentes/Pie.svelte';
	import { NOMBRE, PAGINA_TARJETA, TARJETA_INQUILINO, textosEnlace } from '#lib/resultado';
	import { dibujarTarjeta } from '#lib/cliente/tarjeta-canvas';

	let { data } = $props();
	const enlace = $derived(textosEnlace(data.tarjeta));
	const imagen = $derived(`${page.url.origin}/t/${data.id}/og.jpg`);

	let canvas: HTMLCanvasElement;
	onMount(() => void dibujarTarjeta(canvas, data.tarjeta));
</script>

<svelte:head>
	<title>{enlace.titulo}</title>
	<meta name="description" content={enlace.descripcion} />
	<meta property="og:site_name" content={NOMBRE} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={enlace.titulo} />
	<meta property="og:description" content={enlace.descripcion} />
	<meta property="og:url" content={page.url.href} />
	<meta property="og:image" content={imagen} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={enlace.titulo} />
	<meta name="twitter:description" content={enlace.descripcion} />
	<meta name="twitter:image" content={imagen} />
</svelte:head>

<div class="pagina">
	<Cabecera derecha="nada" />
	<main>
		<div class="tarjeta">
			<canvas bind:this={canvas} width="1080" height="1350" aria-label="Tarjeta compartida: {enlace.descripcion}"></canvas>
		</div>
		<div class="texto">
			<p class="intro">{data.tarjeta.inquilino ? PAGINA_TARJETA.introInquilino(data.tarjeta.barrio) : PAGINA_TARJETA.intro(data.tarjeta.barrio)}</p>
			<h1>{PAGINA_TARJETA.titular}</h1>
			<p class="explicacion">{data.tarjeta.inquilino ? PAGINA_TARJETA.explicacionInquilino : PAGINA_TARJETA.explicacion}</p>
			<a class="boton" href={data.tarjeta.inquilino ? `/?t=${data.id}&modo=vivo` : `/?t=${data.id}`}>{data.tarjeta.inquilino ? TARJETA_INQUILINO.cta : PAGINA_TARJETA.boton}</a>
			<p class="nota">{data.tarjeta.inquilino ? PAGINA_TARJETA.notaInquilino : PAGINA_TARJETA.nota}</p>
		</div>
	</main>
	<Pie />
</div>

<style>
	.pagina {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}
	.pagina > :global(footer) {
		margin-top: auto;
	}
	main {
		display: flex;
		flex-direction: column;
		gap: 24px;
		padding: 24px var(--margen) 8px;
	}
	.tarjeta {
		width: 100%;
		max-width: 480px;
		aspect-ratio: 1080 / 1350;
		border-radius: var(--radio);
		overflow: hidden;
		background: var(--paja);
	}
	canvas {
		width: 100%;
		height: 100%;
		display: block;
	}
	.texto {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.intro {
		font: 400 17px/1.5 var(--f-texto);
		color: var(--grafito);
		text-wrap: pretty;
	}
	h1 {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
	}
	.explicacion {
		font: 400 19px/1.5 var(--f-texto);
		text-wrap: pretty;
	}
	.boton {
		margin-top: 8px;
	}
	.nota {
		font: 400 13px/1.45 var(--f-texto);
		color: var(--grafito);
		display: none;
	}
	@media (min-width: 1024px) {
		main {
			flex-direction: row;
			align-items: center;
			justify-content: center;
			gap: 80px;
			padding: 40px;
		}
		.tarjeta {
			flex: none;
			width: 480px;
		}
		.texto {
			width: 540px;
			gap: 24px;
		}
		h1 {
			position: static;
			width: auto;
			height: auto;
			overflow: visible;
			clip: auto;
			font: 800 96px/0.86 var(--f-extra);
			text-transform: uppercase;
		}
		.explicacion {
			font-size: 19px;
		}
		.boton {
			width: 280px;
			align-self: flex-start;
		}
		.nota {
			display: block;
		}
	}
</style>
