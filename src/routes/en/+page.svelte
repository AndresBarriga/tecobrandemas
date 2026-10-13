<script lang="ts">
	import ArticuloEn from '#lib/componentes/ArticuloEn.svelte';
	import { paginaEnPorRuta } from '#lib/resultado';
</script>

<ArticuloEn p={paginaEnPorRuta('/en')!} />
