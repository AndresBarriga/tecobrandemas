<script lang="ts">
	import Cabecera from '#lib/componentes/Cabecera.svelte';
	import Pie from '#lib/componentes/Pie.svelte';
	import { AUTOR, FECHA_PREGUNTAS, enlaceHerramienta, fechaLegible, jsonLdComoTexto, jsonLdPregunta, preguntaPorSlug } from '#lib/resultado';

	let { data } = $props();
	const p = $derived(data.pregunta);
	const relacionadas = $derived(p.relacionadas.map((s) => preguntaPorSlug(s)!));
</script>

<svelte:head>
	<title>{p.titulo} · A su precio</title>
	<meta name="description" content={p.descripcion} />
	{#each jsonLdPregunta(p) as datos}
		{@html `<script type="application/ld+json">${jsonLdComoTexto(datos)}</script>`}
	{/each}
</svelte:head>

<div class="pagina">
	<Cabecera derecha="nada" volverHref="/preguntas" />

	<main>
		<article>
			<header class="cabecera-articulo">
				<h1>{p.h1}</h1>
				<p class="meta">Última actualización: <time datetime={FECHA_PREGUNTAS}>{fechaLegible(FECHA_PREGUNTAS)}</time> · Autor: {AUTOR}</p>
			</header>

			<div class="respuesta">
				<p>{p.respuesta.join(' ')}</p>
			</div>
			{#if p.aviso}
				<div class="aviso" role="note">
					<p>{p.aviso}</p>
					{#each p.avisoExtra ?? [] as t (t)}<p>{t}</p>{/each}
				</div>
			{/if}

			<section class="herramienta" aria-label="Comprobar con la herramienta">
				<p>Compruébalo con tu dirección. Tarda un minuto, es gratis y no hace falta registrarse.</p>
				<a class="boton" href={enlaceHerramienta(p.modo, p.utm)}>{p.boton}</a>
			</section>

			{#each p.secciones as s (s.h2)}
				<section>
					<h2>{s.h2}</h2>
					{#each s.parrafos as t, i (t)}
						<p>{t}</p>
						{#if i === 0 && s.enlaces}
							<ul class="pasos-enlaces">
								{#each s.enlaces as e (e.url)}<li><a class="boton boton-contorno" href={e.url} rel="noopener noreferrer">{e.texto}</a></li>{/each}
							</ul>
						{/if}
					{/each}
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
					{#if s.cita}
						<blockquote>
							{#each s.cita.texto as t (t)}<p>{t}</p>{/each}
							<footer><a href={s.cita.fuente.url} rel="noopener noreferrer">{s.cita.fuente.texto}</a></footer>
						</blockquote>
					{/if}
					{#if s.despues}{#each s.despues as t (t)}<p>{t}</p>{/each}{/if}
				</section>
			{/each}

			<section>
				<h2>Preguntas frecuentes</h2>
				{#each p.faq as f (f.q)}
					<h3>{f.q}</h3>
					<p>{f.a}</p>
				{/each}
			</section>

			<section>
				<h2>Fuentes</h2>
				<ul class="fuentes">
					{#each p.fuentes as f (f.url)}<li><a href={f.url} rel="noopener noreferrer">{f.texto}</a></li>{/each}
				</ul>
				<p class="meta">Última actualización: {fechaLegible(FECHA_PREGUNTAS)}. A su precio es una estimación independiente; el valor oficial está en <a href="https://serpavi.mivau.gob.es">serpavi.mivau.gob.es</a>.</p>
			</section>

			<nav class="relacionadas" aria-label="Seguir leyendo">
				<h2>Seguir leyendo</h2>
				<ul>
					{#each relacionadas as r (r.slug)}<li><a href="/preguntas/{r.slug}">{r.h1}</a></li>{/each}
					<li><a href="/como-calculamos">Cómo calculamos</a></li>
					<li><a href="/preguntas">Todas las preguntas</a></li>
				</ul>
			</nav>
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
	.aviso {
		padding: 12px 14px;
		border-left: 4px solid var(--paja);
		background: var(--blanco);
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.aviso p {
		font: 600 15px/1.45 var(--f-texto);
	}
	.herramienta {
		padding: 20px 18px;
		border-radius: var(--radio);
		background: var(--blanco);
		gap: 14px;
	}
	.herramienta .boton {
		min-height: 60px;
		font-size: 19px;
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
	blockquote {
		margin: 0;
		padding: 12px 16px;
		border-left: 4px solid var(--tinta);
		background: var(--blanco);
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	blockquote p {
		font: 500 16px/1.5 var(--f-texto);
	}
	blockquote footer {
		font: 500 14px/1.4 var(--f-texto);
	}
	.pasos-enlaces {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.fuentes,
	.relacionadas ul {
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
