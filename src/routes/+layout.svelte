<script lang="ts">
	import '../app.css';
	import { afterNavigate, beforeNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import indexacion from '../../config/indexacion.json';
	import { SITE_URL, alternativas, urlAbsoluta } from '#lib/resultado';
	import { iniciarAnalitica, paginaSalida, paginaVista } from '#lib/cliente/analitica';
	let { children } = $props();

	beforeNavigate((n) => {
		// Solo cambios de ruta: los de parámetros (p. ej. ?capa= en /mapa) no son otra página
		if (n.type !== 'leave' && !n.willUnload && n.to && n.from?.url.pathname !== n.to.url.pathname) paginaSalida();
	});
	afterNavigate((n) => {
		if (n.type !== 'enter' && n.from?.url.pathname !== n.to?.url.pathname) paginaVista();
	});

	// Analítica sin cookies (solo si PUBLIC_POSTHOG_ENABLED=true). El SDK se baja con import() dinámico cuando la
	// página ya ha cargado y el navegador está libre (con un tope de 2 s): no forma parte de lo que hace falta para pintar
	onMount(() => {
		const arrancar = () => {
			if ('requestIdleCallback' in window) requestIdleCallback(() => void iniciarAnalitica(), { timeout: 2000 });
			else setTimeout(() => void iniciarAnalitica(), 2000);
		};
		if (document.readyState === 'complete') arrancar();
		else addEventListener('load', arrancar, { once: true });
	});

	// Páginas equivalentes en español e inglés (hreflang, en las dos direcciones; x-default, la española)
	const alt = $derived(alternativas(page.url.pathname));

	// Una sola etiqueta: todo el sitio mientras no sea el lanzamiento, y siempre las tarjetas
	// compartidas (el noindex no afecta a la vista previa de WhatsApp o X)
	const noindex = $derived(
		indexacion.noindex || page.route.id?.startsWith('/t/')
	);
</script>

<svelte:head>
	<link rel="canonical" href={urlAbsoluta(page.url.pathname, page.url.origin)} />
	{#if alt}
		<link rel="alternate" hreflang="es" href={`${SITE_URL}${alt.es}`} />
		<link rel="alternate" hreflang="en" href={`${SITE_URL}${alt.en}`} />
		<link rel="alternate" hreflang="x-default" href={`${SITE_URL}${alt.es}`} />
	{/if}
	{#if noindex}<meta name="robots" content="noindex, nofollow" />{/if}
</svelte:head>

{@render children()}
