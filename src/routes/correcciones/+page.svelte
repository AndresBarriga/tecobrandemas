<script lang="ts">
	import Cabecera from '#lib/componentes/Cabecera.svelte';
	import Pie from '#lib/componentes/Pie.svelte';
	import { CORRECCIONES, CORREO, TEXTO_CORRECCIONES as T, fechaLegible } from '#lib/resultado';

	const [antes, despues] = T.intro.split(CORREO);
</script>

<svelte:head>
	<title>{T.titulo} · A su precio</title>
	<meta name="description" content={T.descripcion} />
</svelte:head>

<div class="pagina">
	<Cabecera derecha="nada" volverHref="/" />

	<main>
		<h1>{T.h1}</h1>
		<p class="intro">{antes}<a href="mailto:{CORREO}">{CORREO}</a>{despues}</p>

		<section aria-label="Registro de correcciones">
			<p class="formato">{T.formato}</p>
			{#if CORRECCIONES.length}
				<ol>
					{#each CORRECCIONES as c (c.fecha + c.pagina + c.cambio)}
						<li><time datetime={c.fecha}>{fechaLegible(c.fecha)}</time> · {c.pagina} · {c.cambio}</li>
					{/each}
				</ol>
			{:else}
				<ol class="vacia"></ol>
				<p class="vacio">{T.vacio}</p>
			{/if}
		</section>
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
		gap: 20px;
	}
	h1 {
		font: 800 60px/0.9 var(--f-extra);
		text-transform: uppercase;
	}
	.intro {
		max-width: 70ch;
		font: 500 18px/1.45 var(--f-texto);
	}
	section {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding-top: 8px;
		border-top: 1.5px solid var(--tinta);
	}
	.formato {
		font: 700 14px/1.3 var(--f-texto);
		color: var(--grafito);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	ol {
		margin: 0;
		padding-left: 20px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		font: 400 16px/1.45 var(--f-texto);
	}
	ol.vacia {
		display: none;
	}
	.vacio {
		font: 400 16px/1.45 var(--f-texto);
		color: var(--grafito);
	}
	a {
		color: inherit;
		text-underline-offset: 3px;
	}
</style>
