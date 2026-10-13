<script lang="ts">
	import ArticuloEn from '#lib/componentes/ArticuloEn.svelte';

	let { data } = $props();
</script>

<ArticuloEn p={data.pagina} />
