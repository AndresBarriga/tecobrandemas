<script lang="ts">
	import { LEMA, NOMBRE } from '#lib/resultado';

	/** Tamaño del nombre en px (21 en móvil, 28 en escritorio); el lema va a 0,57 de ese tamaño y el icono mide 1,9 veces */
	let { tamano = 21 }: { tamano?: number } = $props();
</script>

<!-- Icono + texto en Extra Condensed con el lema debajo (subrayado de Paja); un único componente, fácil de sustituir (data-logo) -->
<span class="logo" data-logo="true" style:font-size="{tamano}px">
	<img class="icono" src="/brand/avatar-asuprecio.svg" alt="" width="40" height="40" />
	<span class="texto">
		<span class="nombre">{NOMBRE}</span>
		<span class="lema">{LEMA}</span>
	</span>
</span>

<style>
	.logo {
		display: inline-flex;
		align-items: center;
		gap: 0.5em;
		white-space: nowrap;
	}
	.icono {
		flex: none;
		width: 1.9em;
		height: 1.9em;
		border-radius: 22%;
	}
	.texto {
		display: inline-flex;
		flex-direction: column;
		gap: 0.14em;
	}
	.nombre {
		font: 800 1em/1 var(--f-extra);
		text-transform: uppercase;
		letter-spacing: 0.01em;
	}
	.lema {
		font: 500 0.57em/1.2 var(--f-texto);
		/* Marcador de Paja en la mitad de abajo del lema */
		background: linear-gradient(transparent 55%, var(--paja) 55%);
		align-self: flex-start;
		padding: 0 0.2em;
		margin-left: -0.2em;
	}
	@media (min-width: 960px) {
		.logo {
			font-size: 28px !important;
		}
	}
</style>
