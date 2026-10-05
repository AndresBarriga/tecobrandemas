<script lang="ts">
	import { page } from '$app/state';
	import Cabecera from '#lib/componentes/Cabecera.svelte';
	import Pie from '#lib/componentes/Pie.svelte';
	import { PAGINA_TARJETA } from '#lib/resultado';

	const noExiste = $derived(page.status === 404);
</script>

<svelte:head><title>A su precio</title></svelte:head>

<div class="pagina">
	<Cabecera derecha="nada" />
	<main>
		<h1>{noExiste ? PAGINA_TARJETA.noExiste.titulo : 'Algo ha fallado'}</h1>
		<p>{noExiste ? PAGINA_TARJETA.noExiste.texto : 'No hemos podido cargar esta página. Inténtalo de nuevo en unos minutos.'}</p>
		<a class="boton" href="/">{PAGINA_TARJETA.boton}</a>
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
		padding: 32px var(--margen) 0;
		display: flex;
		flex-direction: column;
		gap: 18px;
		max-width: 600px;
	}
	h1 {
		font: 800 60px/0.88 var(--f-extra);
		text-transform: uppercase;
	}
	p {
		font: 400 17px/1.5 var(--f-texto);
	}
</style>
