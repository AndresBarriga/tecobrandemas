<script lang="ts">
	import { ATRIBUCIONES, AVISO_INDEPENDIENTE, ENLACE_OFICIAL } from '#lib/resultado';

	// Las atribuciones obligatorias. «© OpenStreetMap contributors» saldrá con el mapa base (Hito 7).
	const atribuciones = ATRIBUCIONES.filter((a) => !a.includes('OpenStreetMap'));
	const datos = atribuciones.slice(0, 2).join('. ') + '.';
	const otras = atribuciones.slice(2).join('. ');
	const [antes, despues] = AVISO_INDEPENDIENTE.split('serpavi.mivau.gob.es');
</script>

<footer>
	<p>{antes}<a href={ENLACE_OFICIAL}>serpavi.mivau.gob.es</a>{despues}</p>
	<p>{datos}</p>
	<p>{otras}</p>
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
