<script lang="ts">
	import Cabecera from '#lib/componentes/Cabecera.svelte';
	import MetaSocial from '#lib/componentes/MetaSocial.svelte';
	import Pie from '#lib/componentes/Pie.svelte';
	import { enlaceHerramientaBarrio, fechaLegible, jsonLdBarrio, jsonLdComoTexto } from '#lib/resultado';

	let { data } = $props();
	const p = $derived(data.pagina);
</script>

<svelte:head>
	<title>{p.titulo} · A su precio</title>
	<meta name="description" content={p.descripcion} />
	{#each jsonLdBarrio(p) as datos}
		{@html `<script type="application/ld+json">${jsonLdComoTexto(datos)}</script>`}
	{/each}
</svelte:head>

<MetaSocial ruta="/alquiler/{p.slug}" titulo="{p.titulo} · A su precio" descripcion={p.descripcion} />

<div class="pagina">
	<Cabecera derecha="nada" volverHref="/alquiler" />

	<main>
		<article>
			<header class="cabecera-articulo">
				<h1>{p.h1}</h1>
				<p class="meta">Datos actualizados a {p.actualizado}.</p>
			</header>

			<div class="respuesta"><p>{p.respuesta.join(' ')}</p></div>

			<section class="herramienta" aria-label="Comprobar con la herramienta">
				<p>Compruébalo con tu dirección: la cifra del barrio es una media de sus zonas y la tuya depende de tu calle.</p>
				<a class="boton" href={enlaceHerramientaBarrio(p.slug)}>{p.boton}</a>
			</section>

			<section>
				<h2>Referencia para 50, 70 y 90&nbsp;m²</h2>
				<div class="desborde">
					<table>
						<thead><tr>{#each p.tabla.cabecera as c (c)}<th scope="col">{c}</th>{/each}</tr></thead>
						<tbody>
							{#each p.tabla.filas as fila (fila[0])}
								<tr>{#each fila as celda, i (i)}<td>{celda}</td>{/each}</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>

			<section>
				<h2>{p.comoLeer.h2}</h2>
				{#each p.comoLeer.parrafos as t (t)}<p>{t}</p>{/each}
				<ul class="lista">
					{#each p.comoLeer.enlaces as e (e.url)}<li><a href={e.url} rel="noopener noreferrer">{e.texto}</a></li>{/each}
				</ul>
			</section>

			<section>
				<h2>{p.donde.h2}</h2>
				{#each p.donde.parrafos as t (t)}<p>{t}</p>{/each}
				<ul class="lista">
					{#each p.donde.vecinos as v (v.slug)}<li><a href="/alquiler/{v.slug}">Alquiler en {v.nombre}</a></li>{/each}
					<li><a href="/mapa">Mapa del índice de referencia del alquiler en Madrid</a></li>
					<li><a href="/alquiler">Alquiler por barrios</a></li>
				</ul>
			</section>

			<section>
				<h2>Preguntas frecuentes</h2>
				{#each p.faq as f (f.q)}
					<h3>{f.q}</h3>
					<p>{f.a}</p>
				{/each}
			</section>

			<section>
				<h2>Fuentes</h2>
				<ul class="lista">
					{#each p.fuentes as f (f.url)}<li><a href={f.url} rel="noopener noreferrer">{f.texto}</a></li>{/each}
				</ul>
				<p class="meta">Datos actualizados a {p.actualizado} (fecha de los datos: {fechaLegible(p.modificado)}). <a href="/como-calculamos">Cómo calculamos</a>.</p>
			</section>
		</article>
	</main>

	<Pie />
</div>

<style>
	.pagina {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}
	.pagina > :global(footer) {
		margin-top: auto;
	}
	main {
		width: 100%;
		max-width: 720px;
		margin: 0 auto;
		padding: 12px var(--margen) 48px;
	}
	article {
		display: flex;
		flex-direction: column;
		gap: 28px;
	}
	.cabecera-articulo {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	h1 {
		font: 800 40px/0.95 var(--f-extra);
		text-transform: uppercase;
		text-wrap: balance;
	}
	h2 {
		font: 700 24px/1.2 var(--f-texto);
		text-wrap: balance;
	}
	h3 {
		font: 700 18px/1.3 var(--f-texto);
		margin-top: 8px;
	}
	section {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	p {
		max-width: 70ch;
		font: 400 17px/1.55 var(--f-texto);
		text-wrap: pretty;
	}
	.meta {
		font: 500 14px/1.4 var(--f-texto);
		color: var(--grafito);
	}
	.respuesta p {
		font: 600 20px/1.45 var(--f-texto);
	}
	.herramienta {
		padding: 20px 18px;
		border-radius: var(--radio);
		background: var(--blanco);
	}
	.herramienta .boton {
		min-height: 60px;
		font-size: 19px;
	}
	.desborde {
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font: 500 15px/1.4 var(--f-texto);
		background: var(--blanco);
		font-variant-numeric: tabular-nums;
	}
	th,
	td {
		padding: 10px 12px;
		text-align: left;
		border-bottom: 1px solid var(--pista);
		vertical-align: top;
	}
	th {
		font-weight: 700;
		background: var(--superficie);
	}
	.lista {
		margin: 0;
		padding-left: 20px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		font: 400 16px/1.45 var(--f-texto);
	}
	a {
		color: inherit;
		text-underline-offset: 3px;
	}
	.boton {
		text-decoration: none;
	}
	a:focus-visible {
		outline: 2px solid var(--tinta);
		outline-offset: 3px;
	}
	@media (min-width: 720px) {
		h1 {
			font-size: 54px;
		}
	}
</style>
