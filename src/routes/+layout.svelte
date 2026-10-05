<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import indexacion from '../../config/indexacion.json';
	let { children } = $props();

	// Una sola etiqueta: todo el sitio mientras no sea el lanzamiento, y siempre las tarjetas
	// compartidas y la página de aportaciones (el noindex no afecta a la vista previa de WhatsApp o X)
	const noindex = $derived(
		indexacion.noindex || page.route.id?.startsWith('/t/') || page.route.id === '/cuanto-pagas'
	);
</script>

<svelte:head>
	{#if noindex}<meta name="robots" content="noindex, nofollow" />{/if}
</svelte:head>

{@render children()}
