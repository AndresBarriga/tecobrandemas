<script lang="ts">
	import { onMount } from 'svelte';
	import Logo from './Logo.svelte';
	import MetaSocial from './MetaSocial.svelte';
	import Pie from './Pie.svelte';
	import {
		AUTOR_EN, CONSEJO_TRADUCCION_EN, ENLACE_HERRAMIENTA_EN, FECHA_EN, fechaEn, jsonLdComoTexto, jsonLdEn, paginaEnPorRuta, type PaginaEn
	} from '#lib/resultado';

	let { p }: { p: PaginaEn } = $props();
	const relacionadas = $derived(p.relacionadas.map((r) => paginaEnPorRuta(r)!));

	// <html lang="en"> viene del servidor (hooks.server.ts); al llegar desde otra página del sitio se ajusta aquí y se restablece al salir
	onMount(() => {
		const anterior = document.documentElement.lang;
		document.documentElement.lang = 'en';
		return () => (document.documentElement.lang = anterior || 'es');
	});
</script>

<svelte:head>
	<title>{p.titulo} · A su precio</title>
	<meta name="description" content={p.descripcion} />
	{#each jsonLdEn(p) as datos}
		{@html `<script type="application/ld+json">${jsonLdComoTexto(datos)}</script>`}
	{/each}
</svelte:head>

<MetaSocial ruta={p.ruta} titulo={`${p.titulo} · A su precio`} descripcion={p.descripcion} idioma="en" />

<div class="pagina">
	<header class="cabecera">
		<a class="marca" href="/en" aria-label="A su precio, home"><Logo /></a>
		<a class="idioma" href={p.rutaEs} hreflang="es" lang="es">Español</a>
	</header>

	<main>
		<article>
			<header class="cabecera-articulo">
				<h1>{p.h1}</h1>
				<p class="meta">Last updated: <time datetime={FECHA_EN}>{fechaEn(FECHA_EN)}</time> · Author: {AUTOR_EN}</p>
			</header>

			<div class="respuesta"><p>{p.respuesta.join(' ')}</p></div>

			<section class="herramienta" aria-label="Use the tool">
				<p>The tool is in Spanish. It takes about a minute, it is free and you do not need to register.</p>
				<a class="boton" href={ENLACE_HERRAMIENTA_EN}>{p.boton}</a>
				<p class="consejo">{CONSEJO_TRADUCCION_EN}</p>
			</section>

			{#each p.secciones as s (s.h2)}
				<section>
					<h2>{s.h2}</h2>
					{#each s.parrafos as t (t)}<p>{t}</p>{/each}
					{#if s.definiciones}
						<dl>
							{#each s.definiciones as d (d.termino)}
								<div><dt>{d.termino}</dt><dd>{d.texto}</dd></div>
							{/each}
						</dl>
					{/if}
					{#if s.tabla}
						<div class="tabla-caja">
							<p class="ejemplo">{s.tabla.titulo}</p>
							<div class="desborde">
								<table>
									<thead><tr>{#each s.tabla.cabecera as c (c)}<th scope="col">{c}</th>{/each}</tr></thead>
									<tbody>
										{#each s.tabla.filas as fila (fila.join('|'))}
											<tr>{#each fila as celda, i (i)}<td>{celda}</td>{/each}</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					{/if}
					{#if s.despues}{#each s.despues as t (t)}<p>{t}</p>{/each}{/if}
				</section>
			{/each}

			<section>
				<h2>Frequently asked questions</h2>
				{#each p.faq as f (f.q)}
					<h3>{f.q}</h3>
					<p>{f.a}</p>
				{/each}
			</section>

			{#if p.enlacesEs}
				<section>
					<h2>In Spanish</h2>
					<ul class="lista">
						{#each p.enlacesEs as e (e.href)}<li><a href={e.href} hreflang="es" lang="es" rel={e.href.startsWith('http') ? 'noopener noreferrer' : undefined}>{e.texto}</a></li>{/each}
					</ul>
				</section>
			{/if}

			<section>
				<h2>Sources</h2>
				<ul class="lista">
					{#each p.fuentes as f (f.url)}<li><a href={f.url} rel="noopener noreferrer">{f.texto}</a></li>{/each}
				</ul>
				<p class="meta">Last updated: {fechaEn(FECHA_EN)}. A su precio is an independent estimate; the official value is at <a href="https://serpavi.mivau.gob.es">serpavi.mivau.gob.es</a>.</p>
			</section>

			<nav class="relacionadas" aria-label="Keep reading">
				<h2>Keep reading</h2>
				<ul class="lista">
					{#each relacionadas as r (r.ruta)}<li><a href={r.ruta}>{r.h1}</a></li>{/each}
				</ul>
			</nav>
		</article>
	</main>

	<Pie idioma="en" />
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
	.cabecera {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 44px;
		padding: 8px var(--margen);
	}
	.marca {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		text-decoration: none;
	}
	.idioma {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		font: 600 15px/1 var(--f-texto);
		text-decoration: underline;
		text-decoration-color: var(--paja);
		text-decoration-thickness: 2px;
		text-underline-offset: 4px;
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
		font: 800 44px/0.95 var(--f-extra);
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
	.consejo {
		font: 500 14px/1.4 var(--f-texto);
		color: var(--grafito);
	}
	dl {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	dt {
		font: 700 17px/1.4 var(--f-texto);
	}
	dd {
		margin: 2px 0 0;
		max-width: 70ch;
		font: 400 17px/1.55 var(--f-texto);
	}
	.tabla-caja {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.ejemplo {
		font: 600 14px/1.4 var(--f-texto);
		color: var(--grafito);
	}
	.desborde {
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font: 500 15px/1.4 var(--f-texto);
		background: var(--blanco);
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
	.relacionadas {
		display: flex;
		flex-direction: column;
		gap: 12px;
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
			font-size: 60px;
		}
	}
</style>
