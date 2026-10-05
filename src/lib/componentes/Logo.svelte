<script lang="ts">
	import { NOMBRE } from '#lib/resultado';

	/** Tamaño del logotipo en px (18 en móvil, 24 en escritorio, 44 en la tarjeta) */
	let { tamano = 18 }: { tamano?: number } = $props();
</script>

<!-- Logotipo provisional: texto en Extra Condensed, fácil de sustituir (data-logo) -->
<span class="logo" data-logo="true" style:font-size="{tamano}px">{NOMBRE}</span>

<style>
	.logo {
		font: 800 1em/1 var(--f-extra);
		text-transform: uppercase;
		letter-spacing: 0.01em;
		white-space: nowrap;
	}
</style>
