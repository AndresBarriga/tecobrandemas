<script lang="ts">
	import Cabecera from '#lib/componentes/Cabecera.svelte';
	import Pie from '#lib/componentes/Pie.svelte';
	import { BARCELONA } from '#lib/resultado';
</script>

<svelte:head>
	<title>Barcelona · A su precio</title>
	<meta name="description" content="{BARCELONA.titulo}. {BARCELONA.texto}" />
</svelte:head>

<div class="pagina">
	<Cabecera derecha="nada" volverHref="/" />

	<main>
		<h1>{BARCELONA.titulo}</h1>
		<p class="texto">{BARCELONA.texto}</p>
		<a class="boton" href="/">{BARCELONA.volver}</a>
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
		width: 100%;
		max-width: 720px;
		margin: 0 auto;
		padding: 24px var(--margen) 48px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	h1 {
		font: 800 60px/0.9 var(--f-extra);
		text-transform: uppercase;
	}
	.texto {
		max-width: 70ch;
		font: 500 20px/1.45 var(--f-texto);
	}
	.boton {
		max-width: 360px;
		text-decoration: none;
	}
</style>
