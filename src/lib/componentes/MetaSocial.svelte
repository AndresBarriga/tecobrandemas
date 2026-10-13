<script lang="ts">
	import { NOMBRE, SITE_URL, ogDe } from '#lib/resultado';

	/** Etiquetas de vista previa (Open Graph y X) de una página con imagen propia: la imagen sale de la plantilla de scripts/og_paginas.mjs */
	let { ruta, titulo, descripcion, idioma = 'es' }: { ruta: string; titulo: string; descripcion: string; idioma?: 'es' | 'en' } = $props();

	const og = $derived(ogDe(ruta));
	const imagen = $derived(og ? `${SITE_URL}/og/${og.imagen}` : null);
</script>

<svelte:head>
	<meta property="og:site_name" content={NOMBRE} />
	<meta property="og:type" content="website" />
	<meta property="og:locale" content={idioma === 'en' ? 'en_US' : 'es_ES'} />
	<meta property="og:title" content={titulo} />
	<meta property="og:description" content={descripcion} />
	<meta property="og:url" content={`${SITE_URL}${ruta}`} />
	{#if imagen}
		<meta property="og:image" content={imagen} />
		<meta property="og:image:secure_url" content={imagen} />
		<meta property="og:image:type" content="image/png" />
		<meta property="og:image:width" content="1200" />
		<meta property="og:image:height" content="630" />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:image" content={imagen} />
	{/if}
</svelte:head>
