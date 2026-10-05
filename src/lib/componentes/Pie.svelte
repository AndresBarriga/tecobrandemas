<script lang="ts">
	import { ATRIBUCIONES, AVISO_INDEPENDIENTE, ENLACE_OFICIAL } from '#lib/resultado';

	const atribuciones = ATRIBUCIONES;
	const datos = atribuciones.slice(0, 2).join('. ') + '.';
	const otras = atribuciones.slice(2).join('. ');
	const [antes, despues] = AVISO_INDEPENDIENTE.split('serpavi.mivau.gob.es');
</script>

<footer>
	<p>{antes}<a href={ENLACE_OFICIAL}>serpavi.mivau.gob.es</a>{despues}</p>
	<p>{datos}</p>
	<p>{otras}</p>
	<a class="enlace-pie" href="/como-calculamos">Cómo calculamos</a>
	<a class="enlace-pie" href="/cuanto-pagas">¿Cuánto pagas tú?</a>
</footer>

<style>
	footer {
		margin-top: 28px;
		padding: 20px var(--margen) 24px;
		background: var(--superficie);
		display: flex;
		flex-direction: column;
		gap: 8px;
		font: 400 12.5px/1.5 var(--f-texto);
		color: var(--grafito);
	}
	.enlace-pie {
		display: flex;
		align-items: center;
		min-height: 44px;
		font: 700 14px/1 var(--f-texto);
		color: var(--tinta);
		text-underline-offset: 4px;
	}
	@media (min-width: 1024px) {
		.enlace-pie:not([href='/como-calculamos']) {
			display: none;
		}
	}
	@media (min-width: 960px) {
		footer {
			margin-top: 0;
			padding: 36px 40px 40px;
			flex-direction: row;
			gap: 48px;
		}
		footer p {
			flex: 1;
		}
	}
</style>
