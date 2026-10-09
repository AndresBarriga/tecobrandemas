<script lang="ts">
	import { onMount } from 'svelte';
	import BarraEjemplo from '#lib/componentes/BarraEjemplo.svelte';
	import Cabecera from '#lib/componentes/Cabecera.svelte';
	import Icono from '#lib/componentes/Icono.svelte';
	import Pie from '#lib/componentes/Pie.svelte';
	import { ETIQUETA_NIVEL } from '#lib/resultado';

	let { data } = $props();
	const p = $derived(data.pagina);

	let activo = $state('resumen');
	// La página ya responde (las pruebas esperan a esto antes de usar el índice)
	let listo = $state(false);
	// Tras elegir una sección en el índice, esa es la activa hasta que la persona vuelve a desplazarse
	let elegida: string | null = null;

	// Sección activa del índice: la última cuyo encabezado ya pasó el 25 % superior de la pantalla
	onMount(() => {
		listo = true;
		const secciones = p.indice.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
		let cuadro = 0;
		const calcular = () => {
			cuadro = 0;
			if (elegida) return;
			const umbral = innerHeight * 0.25;
			let actual = secciones[0]?.id ?? 'resumen';
			for (const s of secciones) if (s.getBoundingClientRect().top <= umbral) actual = s.id;
			activo = actual;
		};
		const alDesplazar = () => (cuadro ||= requestAnimationFrame(calcular));
		const soltar = () => (elegida = null);
		addEventListener('scroll', alDesplazar, { passive: true });
		addEventListener('wheel', soltar, { passive: true });
		addEventListener('touchmove', soltar, { passive: true });
		addEventListener('keydown', soltar);
		calcular();
		return () => {
			removeEventListener('scroll', alDesplazar);
			removeEventListener('wheel', soltar);
			removeEventListener('touchmove', soltar);
			removeEventListener('keydown', soltar);
			cancelAnimationFrame(cuadro);
		};
	});

	function ir(id: string, e?: Event) {
		e?.preventDefault();
		const el = document.getElementById(id);
		if (el) {
			const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
			scrollTo({ top: el.getBoundingClientRect().top + scrollY - 72, behavior: reducido ? 'auto' : 'smooth' });
			history.replaceState(null, '', `#${id}`);
		}
		elegida = id;
		activo = id;
	}
</script>

<svelte:head>
	<title>{p.titulo} · A su precio</title>
	<meta name="description" content={p.intro} />
</svelte:head>

<div class="pagina" data-listo={listo}>
	<Cabecera derecha="nada" volverHref="/" actual="como" />

	<div class="selector">
		<div class="caja-select">
			<select aria-label="Ir a una sección de la página" value={activo} onchange={(e) => ir(e.currentTarget.value)}>
				{#each p.indice as i (i.id)}<option value={i.id}>Ir a: {i.titulo}</option>{/each}
			</select>
			<svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 8l5 5 5-5" stroke="currentColor" stroke-width="2" fill="none" /></svg>
		</div>
	</div>

	<div class="rejilla">
		<nav class="indice" aria-label="En esta página">
			<span class="indice-titulo">En esta página</span>
			{#each p.indice as i (i.id)}
				<a href="#{i.id}" aria-current={i.id === activo ? 'true' : undefined} onclick={(e) => ir(i.id, e)}>{i.titulo}</a>
			{/each}
		</nav>

		<main>
			<div class="titulo">
				<h1>{p.titulo}</h1>
				<p class="lead">{p.intro}</p>
			</div>

			<section id="resumen" class="caja-blanca">
				<h2 class="grande">En 30 segundos</h2>
				<ol class="treinta">
					{#each p.treintaSegundos as t, i (t)}
						<li><span class="num">{i + 1}</span><span>{t}</span></li>
					{/each}
				</ol>
			</section>

			<section id="ej">
				<h2>Un ejemplo, paso a paso</h2>
				{#if p.ejemplo}
					<p>{p.ejemplo.intro}</p>
					<ol class="pasos">
						{#each p.ejemplo.pasos as paso (paso.n)}
							<li>
								<div class="paso-cab">
									<span class="num-paso">{paso.n}</span>
									<div>
										<span class="paso-titulo">{paso.titulo}</span>
										<span class="paso-texto">{paso.descripcion}</span>
									</div>
								</div>
								<div class="barra-caja"><BarraEjemplo {paso} precio={p.ejemplo.precio} /></div>
								{#if paso.nivel}
									<span class="etiqueta nivel-{paso.nivel}"><Icono clase={paso.nivel} />{ETIQUETA_NIVEL[paso.nivel]}</span>
								{/if}
							</li>
						{/each}
					</ol>
				{/if}
			</section>

			<section id="niv">
				<h2>Los niveles</h2>
				{#if p.niveles}
					<div class="niveles">
						{#each p.niveles.items as n (n.etiqueta)}
							<div class="nivel">
								<div class="nivel-texto">
									<span class="etiqueta nivel-{n.clase}"><Icono clase={n.icono ?? n.clase} />{n.etiqueta}</span>
									<span class="nivel-desc">{n.descripcion}</span>
								</div>
								<div class="mini nivel-{n.clase}" aria-hidden="true">
									<div class="mini-pista"></div>
									<div class="mini-banda" style:left="{p.niveles.mini.banda.desde * 100}%" style:width="{(p.niveles.mini.banda.hasta - p.niveles.mini.banda.desde) * 100}%"></div>
									<div class="mini-techo" style:left="{p.niveles.mini.techo.desde * 100}%" style:width="{(p.niveles.mini.techo.hasta - p.niveles.mini.techo.desde) * 100}%"></div>
									<div class="mini-punto" style:left="{n.x * 100}%"></div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<section id="ped" class="oscura">
				<h2>{p.precioPedido.titulo}</h2>
				<p class="lead">{p.precioPedido.destacado}</p>
				<p class="claro">{p.precioPedido.cuerpo}</p>
				<h3>{p.precioPedido.incluye.titulo}</h3>
				<ul class="claro">
					{#each p.precioPedido.incluye.items as t (t)}<li>{t}</li>{/each}
				</ul>
				<h3>{p.precioPedido.parteAlta.titulo}</h3>
				<p class="claro">{p.precioPedido.parteAlta.texto}</p>
			</section>

			<section id="anu">
				<h2>{p.anuncios.titulo}</h2>
				<p class="lead">{p.anuncios.intro}</p>
				<h3>{p.anuncios.fuentes.titulo}</h3>
				<ul class="lista">
					{#each p.anuncios.fuentes.items as t (t)}<li>{t}</li>{/each}
				</ul>
				<h3>{p.anuncios.estimacion.titulo}</h3>
				{#each p.anuncios.estimacion.parrafos as t (t)}<p>{t}</p>{/each}
				<h3>{p.anuncios.enLinea.titulo}</h3>
				<p>{p.anuncios.enLinea.texto}</p>
				<h3>{p.anuncios.diferencia.titulo}</h3>
				<p>{p.anuncios.diferencia.texto}</p>
				<h3>{p.anuncios.limites.titulo}</h3>
				<ul class="lista">
					{#each p.anuncios.limites.items as t (t)}<li>{t}</li>{/each}
				</ul>
			</section>

			<section id="map">
				<h2>El mapa</h2>
				{#each p.mapa.parrafos as t (t)}<p>{t}</p>{/each}
				<div class="dos">
					<div class="caja-blanca chica">
						<h3>Qué muestra</h3>
						<ul>
							{#each p.mapa.muestra as t (t)}
								<li><svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5l4 4 8-9" stroke="currentColor" stroke-width="2.5" fill="none" /></svg>{t}</li>
							{/each}
						</ul>
					</div>
					<div class="caja-blanca chica">
						<h3>Qué no muestra</h3>
						<ul>
							{#each p.mapa.noMuestra as t (t)}
								<li><svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2.5" /></svg>{t}</li>
							{/each}
						</ul>
					</div>
				</div>
				<a class="enlace" href="/mapa">Ver el mapa de Madrid</a>
			</section>

			<section id="dat">
				<h2>Tus datos</h2>
				{#each p.datos.parrafos as t (t)}<p>{t}</p>{/each}
				<div class="dos">
					<div class="caja-blanca chica">
						<h3>Qué guardamos (solo si marcas la casilla)</h3>
						<ul>
							{#each p.datos.guardamos as t (t)}
								<li><svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5l4 4 8-9" stroke="currentColor" stroke-width="2.5" fill="none" /></svg>{t}</li>
							{/each}
						</ul>
					</div>
					<div class="caja-blanca chica">
						<h3>Qué no guardamos</h3>
						<ul>
							{#each p.datos.noGuardamos as t (t)}
								<li><svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2.5" /></svg>{t}</li>
							{/each}
						</ul>
					</div>
				</div>
				<div class="notas">
					{#each p.datos.notas as n (n.titulo)}
						<div class:ancha={n.ancha}>
							<span class="nota-titulo">{n.titulo}</span>
							{#each n.texto as t (t)}<p>{t}</p>{/each}
						</div>
					{/each}
				</div>
			</section>

			<section id="lo-que-no-calculamos">
				<h2>Lo que no calculamos</h2>
				<p>{p.limites.intro}</p>
				<div class="limites">
					{#each p.limites.items as l (l.clave)}
						<a href="/?motivo={l.clave}">
							<span class="lim-texto"><span class="lim-titulo">{l.titulo}</span><span class="lim-desc">{l.descripcion}</span></span>
							<span class="lim-ver">Ver por qué</span>
						</a>
					{/each}
				</div>
				<p>{p.limites.cierre}</p>
			</section>

			<section id="fue">
				<h2>Fuentes</h2>
				<div class="tabla" role="table" aria-label="Fuentes de datos">
					<div class="fila cabecera-tabla" role="row">
						<span role="columnheader">Fuente</span><span role="columnheader">Para qué la usamos</span><span role="columnheader">Atribución</span>
					</div>
					{#each p.fuentes.filas as f (f.nombre)}
						<div class="fila" role="row">
							<span role="cell" class="fuente-nombre"><span class="fn">{f.nombre}</span><a href={f.url}>{f.host}</a></span>
							<span role="cell">{f.uso}</span>
							<span role="cell" class="atr">{f.atribucion}</span>
						</div>
					{/each}
				</div>
				<p class="ipc">{p.fuentes.ipc}</p>
				<p class="chico">{p.fuentes.validacion}</p>
				<p class="chico">Estimación independiente basada en la metodología SERPAVI; el valor oficial está en <a href={p.fuentes.enlaceOficial}>serpavi.mivau.gob.es</a>.</p>
			</section>

			<section id="qui">
				<h2>Quiénes somos</h2>
				{#each p.quienesSomos.parrafos as t (t)}<p>{t}</p>{/each}
				<p class="contacto">{p.quienesSomos.contacto.texto} <a href="mailto:{p.quienesSomos.contacto.correo}">{p.quienesSomos.contacto.correo}</a></p>
			</section>

			<section id="fin">
				<h2>Financiación</h2>
				{#each p.financiacion as t (t)}<p>{t}</p>{/each}
			</section>

			<div class="cta">
				<span class="cta-pregunta">{p.cta.pregunta}</span>
				<a class="boton-cta" href="/">{p.cta.boton}</a>
			</div>
		</main>
	</div>

	<Pie />
</div>

<style>
	.pagina {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		font-variant-numeric: tabular-nums;
	}
	.pagina > :global(footer) {
		margin-top: auto;
	}
	a {
		color: inherit;
	}
	a:focus-visible,
	select:focus-visible {
		outline: 2px solid var(--tinta);
		outline-offset: 3px;
	}

	/* —— Selector móvil —— */
	.selector {
		position: sticky;
		top: 0;
		z-index: 2;
		background: var(--papel);
		padding: 8px 20px 12px;
	}
	.caja-select {
		position: relative;
		max-width: 680px;
		margin: 0 auto;
	}
	select {
		width: 100%;
		height: 48px;
		appearance: none;
		border: 1.5px solid var(--tinta);
		border-radius: var(--radio);
		background: var(--blanco);
		padding: 0 44px 0 14px;
		font: 600 16px/1 var(--f-texto);
		color: var(--tinta);
		cursor: pointer;
	}
	.caja-select svg {
		position: absolute;
		right: 16px;
		top: 16px;
		pointer-events: none;
	}

	.rejilla {
		display: grid;
		grid-template-columns: minmax(0, 680px);
		justify-content: center;
		gap: 80px;
		padding: 12px 20px 48px;
	}
	.indice {
		display: none;
	}
	main {
		display: flex;
		flex-direction: column;
		gap: 44px;
		min-width: 0;
	}
	.titulo {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	h1 {
		font: 800 60px/0.86 var(--f-extra);
		text-transform: uppercase;
	}
	h2 {
		font: 700 24px/1.2 var(--f-texto);
	}
	h2.grande {
		font: 800 36px/0.9 var(--f-extra);
		text-transform: uppercase;
	}
	h3 {
		font: 700 17px/1.3 var(--f-texto);
	}
	section {
		display: flex;
		flex-direction: column;
		gap: 16px;
		scroll-margin-top: 80px;
	}
	p {
		max-width: 70ch;
		font: 400 16px/1.55 var(--f-texto);
		text-wrap: pretty;
	}
	.lead {
		font: 500 18px/1.45 var(--f-texto);
		color: #3a3935;
	}

	.caja-blanca {
		background: var(--blanco);
		border-radius: var(--radio);
		padding: 20px 18px;
	}
	.treinta {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 14px;
		max-width: 70ch;
	}
	.treinta li {
		display: grid;
		grid-template-columns: 28px minmax(0, 1fr);
		gap: 10px;
		align-items: baseline;
		font: 600 17px/1.4 var(--f-texto);
		text-wrap: pretty;
	}
	.num {
		font: 800 24px/1 var(--f-extra);
	}

	/* Ejemplo */
	.pasos {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.pasos li {
		background: var(--superficie);
		border-radius: var(--radio);
		padding: 16px 16px 14px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		min-width: 0;
	}
	.paso-cab {
		display: grid;
		grid-template-columns: 36px minmax(0, 1fr);
		gap: 10px;
		align-items: baseline;
		max-width: 70ch;
	}
	.paso-cab > div {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.num-paso {
		font: 800 32px/1 var(--f-extra);
	}
	.paso-titulo {
		font: 700 16px/1.35 var(--f-texto);
	}
	.paso-texto {
		font: 400 16px/1.55 var(--f-texto);
		text-wrap: pretty;
	}
	.barra-caja {
		min-width: 0;
		overflow: hidden;
	}
	.etiqueta {
		display: inline-flex;
		align-self: flex-start;
		align-items: center;
		gap: 8px;
		min-height: 32px;
		padding: 4px 12px 4px 8px;
		background: var(--tinte);
		color: var(--acento);
		border-radius: var(--radio);
		font: 700 14px/1.25 var(--f-texto);
	}

	/* Niveles */
	.niveles {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	.nivel {
		display: grid;
		grid-template-columns: 1fr;
		gap: 12px 24px;
		align-items: center;
	}
	.nivel-texto {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.nivel-desc {
		font: 400 16px/1.5 var(--f-texto);
		max-width: 60ch;
		text-wrap: pretty;
	}
	.mini {
		position: relative;
		height: 24px;
		width: 100%;
	}
	.mini > div {
		position: absolute;
	}
	.mini-pista {
		left: 0;
		right: 0;
		top: 7px;
		height: 10px;
		background: #e0dace;
	}
	.mini-banda {
		top: 7px;
		height: 10px;
		background: var(--tinta);
	}
	.mini-techo {
		top: 7px;
		height: 10px;
		background: var(--piedra);
	}
	.mini-punto {
		top: 2px;
		width: 20px;
		height: 20px;
		margin-left: -10px;
		box-sizing: border-box;
		border-radius: 50%;
		border: 3px solid var(--papel);
		background: var(--acento);
	}

	/* Precio pedido */
	.oscura {
		background: var(--tinta);
		color: var(--papel);
		border-radius: var(--radio);
		padding: 20px 18px;
		gap: 12px;
	}
	.oscura h2 {
		color: var(--paja);
	}
	.oscura .lead {
		color: var(--papel);
	}
	.oscura h3 {
		color: var(--paja);
		margin-top: 4px;
	}
	.oscura ul {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding-left: 18px;
		list-style: disc;
	}
	.claro {
		color: var(--pista);
	}

	/* Anuncios recientes: listas con viñeta */
	.lista {
		list-style: disc;
		padding-left: 20px;
		gap: 8px;
		max-width: 70ch;
		font: 400 16px/1.55 var(--f-texto);
	}
	h3 {
		margin-top: 4px;
	}

	/* Datos */
	.dos {
		display: grid;
		grid-template-columns: 1fr;
		gap: 12px;
	}
	.chica {
		padding: 18px 20px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	ul {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.dos li {
		display: flex;
		gap: 10px;
		align-items: baseline;
		font: 500 16px/1.4 var(--f-texto);
	}
	.dos li svg {
		flex: none;
	}
	.notas {
		background: var(--superficie);
		border-radius: var(--radio);
		padding: 16px 18px;
		display: grid;
		grid-template-columns: 1fr;
		gap: 14px 24px;
	}
	.notas div {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font: 400 15px/1.5 var(--f-texto);
	}
	.nota-titulo {
		font-weight: 700;
	}
	/* «Pasos de uso»: texto largo, a todo el ancho de la rejilla */
	.notas .ancha {
		grid-column: 1 / -1;
		gap: 8px;
	}

	/* Límites */
	.limites {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.limites a {
		min-height: 52px;
		background: var(--superficie);
		border-radius: var(--radio);
		padding: 10px 16px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		text-decoration: none;
	}
	.lim-texto {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.lim-titulo {
		font: 700 16px/1.3 var(--f-texto);
	}
	.lim-desc {
		font: 400 14px/1.4 var(--f-texto);
		color: #3a3935;
	}
	.lim-ver {
		flex: none;
		font: 600 14px/1 var(--f-texto);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	/* Fuentes */
	.tabla {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.fila {
		display: grid;
		grid-template-columns: 1fr;
		gap: 6px 20px;
		background: var(--blanco);
		border-radius: var(--radio);
		padding: 16px 18px;
		font: 400 15px/1.5 var(--f-texto);
	}
	.cabecera-tabla {
		display: none;
	}
	.fuente-nombre {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.fn {
		font: 700 16px/1.35 var(--f-texto);
	}
	.fuente-nombre a {
		min-height: 24px;
		font: 600 14px/1.4 var(--f-texto);
		text-underline-offset: 3px;
	}
	.atr {
		font-weight: 500;
	}
	.ipc {
		font: 500 15px/1.5 var(--f-texto);
	}
	.chico {
		font-size: 15px;
	}
	.contacto {
		font-weight: 500;
	}
	.contacto a {
		font-weight: 700;
		text-underline-offset: 3px;
	}

	.cta {
		display: flex;
		flex-direction: column;
		gap: 12px;
		align-items: stretch;
	}
	.cta-pregunta {
		font: 700 24px/1.2 var(--f-texto);
	}
	.boton-cta {
		height: 56px;
		background: var(--paja);
		border-radius: var(--radio);
		display: flex;
		align-items: center;
		justify-content: center;
		font: 800 17px/1 var(--f-texto);
		text-decoration: none;
	}

	/* —— 768 px o más: columna de 680 px centrada —— */
	@media (min-width: 768px) {
		.lead {
			font-size: 19px;
		}
	}

	/* —— Escritorio: índice fijo de 240 px y contenido de 680 px —— */
	@media (min-width: 1024px) {
		.selector {
			display: none;
		}
		.rejilla {
			grid-template-columns: 240px 680px;
			align-items: start;
			padding: 32px 40px 72px;
		}
		.indice {
			position: sticky;
			top: 24px;
			display: flex;
			flex-direction: column;
			gap: 2px;
			padding-top: 8px;
		}
		.indice-titulo {
			font: 600 13px/1 var(--f-texto);
			color: var(--grafito);
			padding: 0 14px 8px;
		}
		.indice a {
			min-height: 44px;
			display: flex;
			align-items: center;
			padding: 0 14px;
			border-radius: var(--radio);
			text-decoration: none;
			font: 500 15px/1 var(--f-texto);
		}
		.indice a[aria-current='true'] {
			background: var(--superficie);
			font-weight: 700;
		}
		main {
			gap: 56px;
		}
		h1 {
			font-size: 96px;
		}
		h2 {
			font-size: 28px;
		}
		h2.grande {
			font-size: 44px;
		}
		p,
		.paso-texto,
		.nivel-desc {
			font-size: 17px;
		}
		.lead {
			font-size: 20px;
		}
		.treinta li {
			font-size: 19px;
		}
		.caja-blanca {
			padding: 28px 32px;
		}
		.oscura {
			padding: 28px 32px;
		}
		.pasos li {
			padding: 20px 24px 18px;
		}
		.nivel {
			grid-template-columns: minmax(0, 1fr) 260px;
		}
		.chica {
			padding: 18px 20px;
		}
		.dos,
		.notas {
			grid-template-columns: 1fr 1fr;
		}
		.fila {
			grid-template-columns: 1.1fr 1fr 1.1fr;
		}
		.cabecera-tabla {
			display: grid;
			background: none;
			padding: 0 18px;
			font: 600 13px/1 var(--f-texto);
			color: var(--grafito);
		}
		.cta {
			align-items: flex-start;
		}
		.boton-cta {
			width: 280px;
		}
	}
</style>
