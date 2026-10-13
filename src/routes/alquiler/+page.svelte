<script lang="ts">
	import Cabecera from '#lib/componentes/Cabecera.svelte';
	import MetaSocial from '#lib/componentes/MetaSocial.svelte';
	import Pie from '#lib/componentes/Pie.svelte';
	import { TEXTO_INDICE_BARRIOS as T, jsonLdComoTexto, jsonLdIndiceBarrios } from '#lib/resultado';

	let { data } = $props();
	const i = $derived(data.indice);
</script>

<svelte:head>
	<title>{T.titulo} · A su precio</title>
	<meta name="description" content={T.descripcion} />
	{#each jsonLdIndiceBarrios() as datos}
		{@html `<script type="application/ld+json">${jsonLdComoTexto(datos)}</script>`}
	{/each}
</svelte:head>

<MetaSocial ruta="/alquiler" titulo="{T.titulo} · A su precio" descripcion={T.descripcion} />

<div class="pagina">
	<Cabecera derecha="nada" volverHref="/" />

	<main>
		<header>
			<h1>{T.h1}</h1>
			<p class="intro">{T.intro}</p>
			<p class="meta">{T.nota(i.actualizado)}</p>
		</header>

		<section class="herramienta" aria-label="Comprobar con la herramienta">
			<a class="boton" href="/?utm_source=barrio&utm_content={T.utm}">{T.boton}</a>
		</section>

		{#each i.distritos as d (d.distrito)}
			<section>
				<h2>{d.distrito}</h2>
				<ul>
					{#each d.barrios as b (b.slug)}
						<li><a href="/alquiler/{b.slug}">{b.nombre}</a><span class="rango">{b.rango70}</span></li>
					{/each}
				</ul>
			</section>
		{/each}
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
		padding: 12px var(--margen) 48px;
		display: flex;
		flex-direction: column;
		gap: 28px;
	}
	header {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	h1 {
		font: 800 44px/0.95 var(--f-extra);
		text-transform: uppercase;
		text-wrap: balance;
	}
	h2 {
		font: 700 24px/1.2 var(--f-texto);
	}
	.intro {
		max-width: 70ch;
		font: 500 18px/1.45 var(--f-texto);
	}
	.meta {
		font: 500 14px/1.4 var(--f-texto);
		color: var(--grafito);
	}
	section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.herramienta .boton {
		min-height: 60px;
		font-size: 19px;
	}
	ul {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 10px;
		font: 500 17px/1.4 var(--f-texto);
	}
	li {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 2px 16px;
		padding-bottom: 10px;
		border-bottom: 1px solid var(--pista);
	}
	.rango {
		color: var(--grafito);
		font-variant-numeric: tabular-nums;
	}
	a {
		color: inherit;
		text-underline-offset: 3px;
	}
	.boton {
		text-decoration: none;
	}
	a:focus-visible {
		outline: 2px solid var(--tinta);
		outline-offset: 3px;
	}
	@media (min-width: 720px) {
		h1 {
			font-size: 60px;
		}
	}
</style>
