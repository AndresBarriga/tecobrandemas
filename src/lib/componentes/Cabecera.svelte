<script lang="ts">
	import Logo from './Logo.svelte';
	import { INQUILINO, NAVEGACION } from '#lib/resultado';

	/** «otro»: enlace «Otro piso» (pantallas de resultado); «madrid»: etiqueta fija; «nada»: solo el logotipo */
	let {
		derecha = 'madrid', alOtroPiso, alVolver, volverHref, actual
	}: {
		derecha?: 'otro' | 'volver' | 'madrid' | 'editar' | 'nada';
		alOtroPiso?: () => void;
		alVolver?: () => void;
		/** Con enlace en lugar de botón: «Volver» a otra página */
		volverHref?: string;
		/** Página actual, para marcarla en la navegación de escritorio */
		actual?: 'comprobar' | 'mapa' | 'como';
	} = $props();
</script>

<header>
	<a class="marca" href="/" aria-label="A su precio, inicio"><Logo /></a>
	{#if volverHref}
		<a class="otro" href={volverHref}>Volver</a>
	{:else if derecha === 'otro'}
		<button class="otro" type="button" onclick={alOtroPiso}>{NAVEGACION.otroPiso}</button>
	{:else if derecha === 'editar'}
		<button class="otro" type="button" onclick={alOtroPiso}>{INQUILINO.editar}</button>
	{:else if derecha === 'volver'}
		<button class="otro" type="button" onclick={alVolver}>Volver al resultado</button>
	{/if}
	<nav class="nav" class:en-movil={derecha === 'madrid' && !volverHref}>
		<a href="/" aria-current={actual === 'comprobar' ? 'page' : undefined}>Comprobar</a>
		<a href="/mapa" aria-current={actual === 'mapa' ? 'page' : undefined}>{NAVEGACION.mapa}</a>
		<a href="/como-calculamos" aria-current={actual === 'como' ? 'page' : undefined}>Cómo calculamos</a>
	</nav>
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
	/* En la portada, el menú ocupa el sitio de «Madrid» también en móvil */
	.nav.en-movil {
		display: flex;
		gap: 16px;
	}
	.nav.en-movil a {
		display: flex;
		align-items: center;
		min-height: 44px;
		font: 600 15px/1 var(--f-texto);
		text-decoration: none;
	}
	.nav.en-movil a[aria-current='page'] {
		text-decoration: underline;
		text-decoration-color: var(--paja);
		text-decoration-thickness: 3px;
		text-underline-offset: 6px;
	}
	/* Con tres enlaces no caben junto al logotipo en un móvil estrecho: el menú pasa a una segunda fila */
	@media (max-width: 479px) {
		header {
			flex-wrap: wrap;
			padding-bottom: 0;
		}
		.nav.en-movil {
			width: 100%;
			gap: 20px;
		}
	}
	@media (min-width: 1024px) {
		.nav {
			display: flex;
			gap: 24px;
		}
		.nav a[aria-current='page'] {
			font-weight: 700;
			text-decoration: underline;
			text-decoration-color: var(--paja);
			text-decoration-thickness: 3px;
			text-underline-offset: 6px;
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
		.otro {
			display: none;
		}
	}
</style>
