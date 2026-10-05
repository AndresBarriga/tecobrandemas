<script lang="ts">
	import { CONFIRMAR_PRECIO, UMBRAL_ERROR_TECLEO } from '#lib/resultado';

	let { precio, m2, alCorregir, alConfirmar }: { precio: string; m2: string; alCorregir: () => void; alConfirmar: () => void } = $props();
</script>

<section class="confirmar" aria-labelledby="confirmar-titulo">
	<h1 id="confirmar-titulo">{CONFIRMAR_PRECIO.titulo(UMBRAL_ERROR_TECLEO)}</h1>
	<p class="escrito">{CONFIRMAR_PRECIO.escrito(precio, m2)}</p>
	<p class="texto">{CONFIRMAR_PRECIO.texto}</p>
	<div class="botones">
		<button type="button" class="boton" onclick={alConfirmar}>{CONFIRMAR_PRECIO.confirmar}</button>
		<button type="button" class="boton boton-contorno" onclick={alCorregir}>{CONFIRMAR_PRECIO.corregir}</button>
	</div>
</section>

<style>
	.confirmar {
		padding: 32px var(--margen) 0;
		display: flex;
		flex-direction: column;
		gap: 18px;
		width: 100%;
		max-width: 600px;
	}
	h1 {
		font: 800 48px/0.92 var(--f-extra);
		text-transform: uppercase;
		text-wrap: balance;
	}
	.escrito {
		font: 600 21px/1.3 var(--f-texto);
	}
	.texto {
		font: 400 16px/1.5 var(--f-texto);
	}
	.botones {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	@media (min-width: 480px) {
		.botones {
			flex-direction: row;
		}
	}
</style>
