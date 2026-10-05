<script lang="ts">
	import Logo from './Logo.svelte';
	import { NAVEGACION } from '#lib/resultado';

	/** «otro»: enlace «Otro piso» (pantallas de resultado); «madrid»: etiqueta fija; «nada»: solo el logotipo */
	let { derecha = 'madrid', alOtroPiso, alVolver }: { derecha?: 'otro' | 'volver' | 'madrid' | 'nada'; alOtroPiso?: () => void; alVolver?: () => void } = $props();
</script>

<header>
	<a class="marca" href="/" aria-label="A su precio, inicio"><Logo /></a>
	{#if derecha === 'otro'}
		<button class="otro" type="button" onclick={alOtroPiso}>{NAVEGACION.otroPiso}</button>
	{:else if derecha === 'volver'}
		<button class="otro" type="button" onclick={alVolver}>Volver al resultado</button>
	{:else if derecha === 'madrid'}
		<span class="madrid">{NAVEGACION.madrid}</span>
	{/if}
	<nav class="nav"><a href="/cuanto-pagas">¿Cuánto pagas tú?</a></nav>
</header>

<style>
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 44px;
		padding: 8px var(--margen);
	}
	.marca {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		text-decoration: none;
	}
	.madrid {
		font: 600 15px/1 var(--f-texto);
		color: var(--grafito);
	}
	.otro {
		min-height: 44px;
		border: 0;
		background: none;
		padding: 0;
		font: 600 15px/1 var(--f-texto);
		text-decoration: underline;
		text-decoration-color: var(--paja);
		text-decoration-thickness: 2px;
		text-underline-offset: 4px;
	}
	.nav {
		display: none;
	}
	@media (min-width: 1024px) {
		.nav {
			display: flex;
		}
		.nav a {
			display: flex;
			align-items: center;
			min-height: 44px;
			font: 600 15px/1 var(--f-texto);
			text-decoration: none;
		}
	}
	@media (min-width: 960px) {
		header {
			height: 72px;
			padding: 0 40px;
		}
		.otro,
		.madrid {
			display: none;
		}
	}
</style>
