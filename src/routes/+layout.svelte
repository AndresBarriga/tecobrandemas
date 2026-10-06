<script lang="ts">
	import '../app.css';
	import { afterNavigate, beforeNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import indexacion from '../../config/indexacion.json';
	import { iniciarAnalitica, paginaSalida, paginaVista } from '#lib/cliente/analitica';
	let { children } = $props();

	beforeNavigate((n) => {
		// Solo cambios de ruta: los de parámetros (p. ej. ?capa= en /mapa) no son otra página
		if (n.type !== 'leave' && !n.willUnload && n.to && n.from?.url.pathname !== n.to.url.pathname) paginaSalida();
	});
	afterNavigate((n) => {
		if (n.type !== 'enter' && n.from?.url.pathname !== n.to?.url.pathname) paginaVista();
	});

	// Analítica sin cookies (solo si PUBLIC_POSTHOG_ENABLED=true); cuando el navegador está libre
	onMount(() => {
		if ('requestIdleCallback' in window) requestIdleCallback(() => void iniciarAnalitica());
		else setTimeout(() => void iniciarAnalitica(), 800);
	});

	// Una sola etiqueta: todo el sitio mientras no sea el lanzamiento, y siempre las tarjetas
	// compartidas (el noindex no afecta a la vista previa de WhatsApp o X)
	const noindex = $derived(
		indexacion.noindex || page.route.id?.startsWith('/t/')
	);
</script>

<svelte:head>
	{#if noindex}<meta name="robots" content="noindex, nofollow" />{/if}
</svelte:head>

{@render children()}
