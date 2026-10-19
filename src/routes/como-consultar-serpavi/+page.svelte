<script lang="ts">
	import Cabecera from '#lib/componentes/Cabecera.svelte';
	import MetaSocial from '#lib/componentes/MetaSocial.svelte';
	import Pie from '#lib/componentes/Pie.svelte';
	import { CTA_SERPAVI, FECHA_SERPAVI, RUTA_SERPAVI, TEXTO_SERPAVI as T, URL_CATASTRO, fechaLegible, jsonLdComoTexto, jsonLdSerpavi } from '#lib/resultado';
</script>

<svelte:head>
	<title>{T.titulo}</title>
	<meta name="description" content={T.descripcion} />
	<link rel="canonical" href="https://asuprecio.com{RUTA_SERPAVI}" />
	{#each jsonLdSerpavi() as datos}
		{@html `<script type="application/ld+json">${jsonLdComoTexto(datos)}</script>`}
	{/each}
</svelte:head>

<MetaSocial ruta={RUTA_SERPAVI} titulo={T.titulo} descripcion={T.descripcion} />

<div class="pagina">
	<Cabecera derecha="nada" volverHref="/" />

	<main>
		<article>
			<header class="hero">
				<h1>{T.h1}</h1>
				<p class="subtitulo">{T.subtitulo}</p>
				<div class="cta">
					<a class="boton" href={CTA_SERPAVI.href('arriba')}>{CTA_SERPAVI.texto}</a>
					<small>{CTA_SERPAVI.nota}</small>
				</div>
			</header>

			<section aria-labelledby="h-pasos">
				<h2 id="h-pasos">{T.pasos.h2}</h2>
				<ol class="pasos">
					{#each T.pasos.items as p (p.h3)}
						<li>
							<h3>{p.h3}</h3>
							<p>{p.texto}</p>
						</li>
					{/each}
				</ol>
				<p>{T.pasos.fuente}</p>
				<a class="boton boton-contorno" href={T.pasos.url} rel="noopener noreferrer">{T.pasos.boton}</a>
			</section>

			<section class="prosa" aria-labelledby="h-catastral">
				<h2 id="h-catastral">{T.catastral.h2}</h2>
				<p>{T.catastral.parrafo}</p>
				<div class="donde">
					{#each T.catastral.donde as d (d.h3)}
						<div>
							<h3>{d.h3}</h3>
							<p>{d.texto}</p>
							{#if 'enlace' in d}<a class="texto-enlace" href={URL_CATASTRO} rel="noopener noreferrer">{d.enlace}</a>{/if}
						</div>
					{/each}
				</div>
			</section>

			<section class="prosa" aria-labelledby="h-resultado">
				<h2 id="h-resultado">{T.resultado.h2}</h2>
				{#each T.resultado.parrafos as t (t)}<p>{t}</p>{/each}
			</section>

			<section class="herramienta" aria-labelledby="h-falta">
				<h2 id="h-falta">{T.falta.h2}</h2>
				{#each T.falta.parrafos as t (t)}<p>{t}</p>{/each}
				<a class="boton" href={CTA_SERPAVI.href('medio')}>{CTA_SERPAVI.texto}</a>
			</section>

			<section aria-labelledby="h-faq">
				<h2 id="h-faq">{T.faq.h2}</h2>
				<div class="faq">
					{#each T.faq.items as f (f.q)}
						<details>
							<summary>{f.q}</summary>
							<p>{f.a}</p>
						</details>
					{/each}
				</div>
			</section>

			<section aria-labelledby="h-mas">
				<h2 id="h-mas">{T.mas.h2}</h2>
				<p>{T.mas.parrafo}</p>
				<ul class="enlaces">
					{#each T.mas.enlaces as e (e.href)}<li><a href={e.href}>{e.texto}</a></li>{/each}
				</ul>
			</section>

			<p class="meta">{T.fuente} Última actualización: <time datetime={FECHA_SERPAVI}>{fechaLegible(FECHA_SERPAVI)}</time>.</p>

			<section class="cierre" aria-label="Comparar tu alquiler">
				<p>{T.cierre}</p>
				<a class="boton" href={CTA_SERPAVI.href('final')}>{CTA_SERPAVI.texto}</a>
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
		padding: 12px var(--margen) 56px;
	}
	article {
		display: flex;
		flex-direction: column;
		gap: 44px;
	}
	section {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	h1 {
		font: 800 38px/0.97 var(--f-extra);
		text-transform: uppercase;
		text-wrap: balance;
	}
	h2 {
		font: 700 24px/1.2 var(--f-texto);
		text-wrap: balance;
	}
	h3 {
		font: 700 18px/1.3 var(--f-texto);
	}
	p {
		max-width: 62ch;
		font: 400 17px/1.55 var(--f-texto);
		text-wrap: pretty;
	}
	.texto-enlace {
		text-decoration: underline;
		text-decoration-color: var(--paja);
		text-decoration-thickness: 2px;
		text-underline-offset: 3px;
		font-weight: 600;
	}
	.meta {
		font: 500 14px/1.4 var(--f-texto);
		color: var(--grafito);
	}
	.hero {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding-top: 8px;
	}
	.subtitulo {
		font: 600 20px/1.4 var(--f-texto);
		max-width: 34ch;
	}
	.cta {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.cta .boton {
		min-height: 60px;
		font-size: 19px;
	}
	.cta small {
		font: 500 14px/1.4 var(--f-texto);
		color: var(--grafito);
	}
	.pasos {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 12px;
		counter-reset: paso;
	}
	.pasos li {
		counter-increment: paso;
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 16px 18px;
		border-radius: var(--radio);
		background: var(--blanco);
	}
	.pasos li::before {
		content: counter(paso);
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--paja);
		font: 800 17px/1 var(--f-texto);
	}
	.pasos p {
		font-size: 16px;
	}
	.herramienta {
		padding: 20px 18px;
		border-radius: var(--radio);
		background: var(--blanco);
	}
	.donde {
		display: grid;
		gap: 10px;
	}
	.donde > div {
		padding: 14px 16px;
		border-radius: var(--radio);
		background: var(--superficie);
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.donde p {
		font-size: 16px;
	}
	.faq {
		display: flex;
		flex-direction: column;
		border-top: 1px solid var(--pista);
	}
	.faq details {
		border-bottom: 1px solid var(--pista);
	}
	.faq summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		min-height: 56px;
		padding: 8px 0;
		cursor: pointer;
		list-style: none;
		font: 700 18px/1.3 var(--f-texto);
	}
	.faq summary::-webkit-details-marker {
		display: none;
	}
	.faq summary::after {
		content: '+';
		flex: none;
		font: 600 26px/1 var(--f-texto);
	}
	.faq details[open] summary::after {
		content: '–';
	}
	.faq details p {
		padding: 0 0 16px;
		font-size: 16px;
	}
	.enlaces {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}
	.enlaces a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0 16px;
		border-radius: 22px;
		border: 1.5px solid var(--tinta);
		font: 700 15px/1 var(--f-texto);
		text-decoration: none;
	}
	.enlaces a:hover {
		background: var(--paja);
		border-color: var(--paja);
	}
	.cierre {
		padding: 22px 18px;
		border-radius: var(--radio);
		background: var(--paja);
	}
	.cierre p {
		font: 700 20px/1.3 var(--f-texto);
	}
	.cierre .boton {
		background: var(--tinta);
		color: var(--papel);
	}
	@media (min-width: 960px) {
		main {
			max-width: 960px;
			padding: 40px 40px 80px;
		}
		article {
			gap: 64px;
		}
		.hero {
			max-width: 720px;
			gap: 20px;
			padding-top: 24px;
		}
		h1 {
			font-size: 68px;
		}
		h2 {
			font-size: 30px;
		}
		.subtitulo {
			font-size: 24px;
			max-width: 40ch;
		}
		.cta {
			flex-direction: row;
			align-items: center;
			gap: 20px;
		}
		.cta .boton {
			width: auto;
			min-width: 340px;
		}
		.pasos {
			grid-template-columns: repeat(3, 1fr);
			gap: 16px;
		}
		.pasos li {
			padding: 20px;
		}
		.donde {
			grid-template-columns: repeat(3, 1fr);
		}
		.prosa > p,
		.faq {
			max-width: 720px;
		}
		.cierre {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
			padding: 28px 32px;
		}
		.cierre p {
			max-width: 26ch;
			font-size: 26px;
		}
		.cierre .boton {
			width: auto;
			min-width: 320px;
		}
	}
</style>
