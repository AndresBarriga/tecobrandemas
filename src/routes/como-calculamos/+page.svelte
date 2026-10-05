<script lang="ts">
	import Cabecera from '#lib/componentes/Cabecera.svelte';
	import Pie from '#lib/componentes/Pie.svelte';

	let { data } = $props();
	const p = $derived(data.pagina);
</script>

<svelte:head>
	<title>{p.titulo} · A su precio</title>
	<meta name="description" content={p.intro} />
</svelte:head>

<div class="pagina">
	<Cabecera derecha="nada" />
	<main>
		<h1>{p.titulo}</h1>
		<p class="intro">{p.intro}</p>

		<nav aria-label="Secciones">
			{#each p.secciones as s (s.id)}<a href="#{s.id}">{s.titulo}</a>{/each}
		</nav>

		{#each p.secciones as s (s.id)}
			<section id={s.id}>
				<h2>{s.titulo}</h2>
				{#each s.parrafos as t (t)}<p>{t}</p>{/each}
				{#if s.puntos}
					<ul>{#each s.puntos as t (t)}<li>{t}</li>{/each}</ul>
				{/if}
			</section>
		{/each}

		<a class="volver" href="/">Comprobar un piso</a>
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
		max-width: 680px;
		margin: 0 auto;
		padding: 20px var(--margen) 8px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	h1 {
		font: 800 60px/0.88 var(--f-extra);
		text-transform: uppercase;
	}
	h2 {
		font: 800 32px/0.95 var(--f-extra);
		text-transform: uppercase;
		margin-top: 18px;
	}
	.intro {
		font: 600 19px/1.35 var(--f-texto);
		text-wrap: pretty;
	}
	section {
		display: flex;
		flex-direction: column;
		gap: 12px;
		scroll-margin-top: 16px;
	}
	section p,
	li {
		font: 400 16px/1.55 var(--f-texto);
	}
	ul {
		margin: 0;
		padding-left: 20px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.gris {
		font-size: 13px;
		color: var(--grafito);
	}
	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 16px;
	}
	nav a,
	.volver {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		font: 600 15px/1 var(--f-texto);
		text-decoration: underline;
		text-decoration-color: var(--paja);
		text-decoration-thickness: 2px;
		text-underline-offset: 4px;
	}
</style>
