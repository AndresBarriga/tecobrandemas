<script lang="ts">
	import { page } from '$app/state';
	import { ATRIBUCIONES, AVISO_INDEPENDIENTE, ENLACE_OFICIAL, HABITACION, alternativas } from '#lib/resultado';

	/**
	 * En el resultado de una habitación: aviso de que son datos aportados, no una referencia oficial. `idioma="en"`: el pie de las
	 * páginas en inglés (las atribuciones obligatorias van literales, en español, como las exigen las fuentes)
	 */
	let { habitacion = false, idioma = 'es' }: { habitacion?: boolean; idioma?: 'es' | 'en' } = $props();

	// «English» y «Español» llevan a la página equivalente si existe, y si no, a la portada del otro idioma
	const alt = $derived(alternativas(page.url.pathname));
	const hrefEn = $derived(alt?.en ?? '/en');
	const hrefEs = $derived(alt?.es ?? '/');

	const atribuciones = ATRIBUCIONES;
	const datos = atribuciones.slice(0, 2).join('. ') + '.';
	const otras = atribuciones.slice(2).join('. ');
	const [antes, despues] = AVISO_INDEPENDIENTE.split('serpavi.mivau.gob.es');
</script>

<footer lang={idioma === 'en' ? 'en' : undefined}>
	{#if habitacion}<p>{HABITACION.pie}</p>{/if}
	{#if idioma === 'en'}
		<p>Independent estimate based on the SERPAVI methodology; the official value is at <a href={ENLACE_OFICIAL}>serpavi.mivau.gob.es</a>.</p>
	{:else}
		<p>{antes}<a href={ENLACE_OFICIAL}>serpavi.mivau.gob.es</a>{despues}</p>
	{/if}
	<p>{datos}</p>
	<p>{otras}</p>
	{#if idioma === 'en'}
		<nav class="enlaces-pie" aria-label="More information">
			<a class="enlace-pie" href={hrefEs} hreflang="es" lang="es">Español</a>
			<a class="enlace-pie" href="/en">Home</a>
		</nav>
	{:else}
		<nav class="enlaces-pie" aria-label="Más información">
			<a class="enlace-pie" href="/como-calculamos">Cómo calculamos</a>
			<a class="enlace-pie" href="/preguntas">Preguntas</a>
			<a class="enlace-pie" href="/alquiler">Alquiler por barrios</a>
			<a class="enlace-pie" href="/correcciones">Correcciones</a>
			<a class="enlace-pie discreto" href={hrefEn} hreflang="en" lang="en">English</a>
		</nav>
	{/if}
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
	.enlace-pie.discreto {
		font-weight: 500;
		font-size: 13px;
		color: var(--grafito);
	}
	.enlaces-pie {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 24px;
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
