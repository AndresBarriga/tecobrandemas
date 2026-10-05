<script lang="ts">
	import { ERRORES, euros, numero } from '#lib/resultado';
	import type { EstadoFormulario } from '#lib/cliente/estado';

	let { formulario, alReintentar, alEditar }: { formulario: EstadoFormulario; alReintentar: () => void; alEditar: () => void } = $props();
	const NB = ' ';
</script>

<section class="sin-conexion">
	<h1>{ERRORES.sinConexion.titulo}</h1>
	<p class="frase">{ERRORES.sinConexion.frase}</p>
	<p class="texto">{ERRORES.sinConexion.texto}</p>
	<div class="resumen">
		<span>{formulario.direccion}</span>
		<span class="cifras">{formulario.precio}{NB}€ al mes, {formulario.superficie}{NB}m²</span>
		<span class="gris">{formulario.tipo === 'casa' ? 'Casa' : 'Piso'}, {formulario.largaDuracion ? 'larga duración' : 'no es de larga duración'}</span>
	</div>
	<button type="button" class="boton" onclick={alReintentar}>{ERRORES.sinConexion.reintentar}</button>
	<button type="button" class="enlace editar" onclick={alEditar}>{ERRORES.sinConexion.editar}</button>
</section>

<style>
	.sin-conexion {
		padding: 32px var(--margen) 0;
		display: flex;
		flex-direction: column;
		gap: 18px;
		width: 100%;
		max-width: 600px;
	}
	h1 {
		font: 800 60px/0.88 var(--f-extra);
		text-transform: uppercase;
	}
	.frase {
		font: 600 21px/1.3 var(--f-texto);
		text-wrap: pretty;
	}
	.texto {
		font: 400 16px/1.5 var(--f-texto);
	}
	.resumen {
		background: var(--superficie);
		border-radius: var(--radio);
		padding: 14px 16px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		font: 500 15px/1.4 var(--f-texto);
	}
	.cifras {
		font-family: var(--f-semi);
	}
	.gris {
		color: var(--grafito);
	}
	.editar {
		align-self: center;
		border: 0;
		background: none;
		padding: 0;
		text-decoration-color: var(--tinta);
	}
</style>
