<script lang="ts">
	import { LEMA, NOMBRE } from '#lib/resultado';

	/** Tamaño del nombre en px (21 en móvil, 28 en escritorio); el lema va a 0,57 de ese tamaño */
	let { tamano = 21 }: { tamano?: number } = $props();
</script>

<!-- Logotipo provisional: texto en Extra Condensed con el lema debajo; un único componente, fácil de sustituir (data-logo) -->
<span class="logo" data-logo="true" style:font-size="{tamano}px">
	<span class="nombre">{NOMBRE}</span>
	<span class="lema">{LEMA}</span>
</span>

<style>
	.logo {
		display: inline-flex;
		flex-direction: column;
		gap: 0.14em;
		white-space: nowrap;
	}
	.nombre {
		font: 800 1em/1 var(--f-extra);
		text-transform: uppercase;
		letter-spacing: 0.01em;
	}
	.lema {
		font: 500 0.57em/1.2 var(--f-texto);
	}
	@media (min-width: 960px) {
		.logo {
			font-size: 28px !important;
		}
	}
</style>
