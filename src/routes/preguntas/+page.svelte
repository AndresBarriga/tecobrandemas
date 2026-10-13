<script lang="ts">
	import Cabecera from '#lib/componentes/Cabecera.svelte';
	import MetaSocial from '#lib/componentes/MetaSocial.svelte';
	import Pie from '#lib/componentes/Pie.svelte';
	import { HUB_PREGUNTAS as H, enlaceHerramienta, jsonLdComoTexto, jsonLdHubPreguntas, preguntaPorSlug } from '#lib/resultado';
</script>

<svelte:head>
	<title>{H.titulo} · A su precio</title>
	<meta name="description" content={H.descripcion} />
	{#each jsonLdHubPreguntas() as datos}
		{@html `<script type="application/ld+json">${jsonLdComoTexto(datos)}</script>`}
	{/each}
</svelte:head>

<MetaSocial ruta="/preguntas" titulo="{H.titulo} · A su precio" descripcion={H.descripcion} />

<div class="pagina">
	<Cabecera derecha="nada" volverHref="/" />

	<main>
		<header>
			<h1>{H.h1}</h1>
			<p class="intro">{H.intro}</p>
		</header>

		<section class="herramienta" aria-label="Comprobar con la herramienta">
			<a class="boton" href={enlaceHerramienta('vivo', H.utm)}>{H.boton}</a>
		</section>

		{#each H.grupos as g (g.titulo)}
			<section>
				<h2>{g.titulo}</h2>
				<ul>
					{#each g.paginas as slug (slug)}
						{@const q = preguntaPorSlug(slug)!}
						<li><a href="/preguntas/{q.slug}">{q.h1}</a></li>
					{/each}
					{#if g.extra}<li><a href={g.extra.href}>{g.extra.texto}</a></li>{/if}
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
		color: #3a3935;
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
		padding-left: 20px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		font: 500 17px/1.4 var(--f-texto);
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
