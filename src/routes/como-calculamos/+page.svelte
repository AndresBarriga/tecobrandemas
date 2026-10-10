<script lang="ts">
	import { onMount } from 'svelte';
	import Cabecera from '#lib/componentes/Cabecera.svelte';
	import CarrilMini from '#lib/componentes/CarrilMini.svelte';
	import Costura from '#lib/componentes/Costura.svelte';
	import Pie from '#lib/componentes/Pie.svelte';

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

			<!-- Cómo se lee: las dos mitades del resultado, cada palabra con su línea y dónde caería el precio -->
			<section id="leer">
				<h2>Cómo se lee el resultado</h2>
				{#if p.lectura}
					<p>{p.lectura.intro}</p>
					<div class="lectura">
						{#each p.lectura.grupos as g (g.fuente)}
							<div class="grupo {g.fuente}">
								<div class="grupo-cab">
									<span class="sello">{g.etiqueta}</span>
									<span class="grupo-pregunta">{g.pregunta}</span>
								</div>
								<dl>
									{#each g.items as it (it.palabra)}
										<div class="palabra-fila">
											<div class="palabra-texto">
												<dt class="palabra">{it.palabra}</dt>
												<dd>{it.texto}</dd>
											</div>
											<div class="palabra-carril" aria-hidden="true"><CarrilMini carril={it.carril} alto={16} /></div>
										</div>
									{/each}
								</dl>
							</div>
						{/each}
					</div>
					<div class="asu">
						<span class="asu-titulo">{p.lectura.asuPrecio.titulo}</span>
						<p>{p.lectura.asuPrecio.texto}</p>
					</div>
					<p class="nota-color">{p.lectura.color}</p>
				{/if}
			</section>

			<section id="ej">
				<h2>Paso a paso</h2>
				{#if p.ejemplo}
					<p>{p.ejemplo.intro}</p>
					<ol class="pasos">
						{#each p.ejemplo.pasos as paso (paso.n)}
							<li class="paso {paso.fuente}">
								<div class="paso-cab">
									<span class="num-paso">{paso.n}</span>
									<div>
										<span class="paso-titulo">{paso.titulo}</span>
										<span class="paso-texto">{paso.descripcion}</span>
									</div>
								</div>
								{#if paso.carril}
									<div class="tira {paso.carril.fuente}">
										<div role="img" aria-label={paso.aria}><CarrilMini carril={paso.carril} /></div>
										<ul class="leyenda">
											{#each paso.leyenda as l (l.clave)}
												<li><span class="muestra-l {l.clave}" aria-hidden="true"></span>{l.texto} <strong>{l.valor}</strong></li>
											{/each}
										</ul>
									</div>
								{:else}
									<div class="resultado-ej"><Costura costura={p.ejemplo.costura} demo /></div>
								{/if}
							</li>
						{/each}
					</ol>
				{/if}
			</section>

			<!-- Las dos referencias: dos tarjetas con las mismas filas (negra y clara, unidas en móvil como la costura) -->
			<section id="ref">
				<h2>{p.referencias.titulo}</h2>
				<p>{p.referencias.intro}</p>
				<div class="referencias">
					{#each p.referencias.tarjetas as t (t.fuente)}
						<div class="referencia {t.fuente}">
							<div class="grupo-cab">
								<span class="sello">{t.etiqueta}</span>
								<span class="grupo-pregunta">{t.pregunta}</span>
							</div>
							<dl class="filas-ref">
								{#each t.filas as f (f.etiqueta)}
									<div><dt>{f.etiqueta}</dt><dd>{f.texto}</dd></div>
								{/each}
							</dl>
							<dl class="terminos">
								{#each t.terminos as f (f.titulo)}
									<div><dt>{f.titulo}</dt><dd>{f.texto}</dd></div>
								{/each}
							</dl>
						</div>
					{/each}
				</div>
				{#each p.referencias.cierre as t (t)}<p class="cierre-ref">{t}</p>{/each}
				<details>
					<summary>{p.referencias.limites.titulo}</summary>
					<div class="limites-ref">
						{#each p.referencias.limites.grupos as g (g.titulo)}
							<div>
								<h3>{g.titulo}</h3>
								<ul class="lista">
									{#each g.items as t (t)}<li>{t}</li>{/each}
								</ul>
							</div>
						{/each}
					</div>
				</details>
			</section>

			<section id="map">
				<h2>{p.mapa.titulo}</h2>
				{#each p.mapa.parrafos as t (t)}<p>{t}</p>{/each}
				<h3>{p.mapa.tuZona.titulo}</h3>
				{#each p.mapa.tuZona.parrafos as t (t)}<p>{t}</p>{/each}
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

			<section id="tus-datos">
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

	/* —— Cómo se lee: dos tarjetas unidas, como la costura —— */
	.lectura {
		--negro: #0b0a0a;
		border-radius: var(--radio);
		overflow: hidden;
	}
	.grupo {
		padding: 20px 18px 8px;
	}
	.grupo.contratos {
		background: var(--negro);
		color: var(--papel);
	}
	.grupo.oferta {
		background: var(--superficie);
	}
	.grupo-cab {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding-bottom: 6px;
	}
	.sello {
		align-self: flex-start;
		font: 700 12px/1 var(--f-semi);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		padding: 5px 8px;
		border-radius: 4px;
	}
	.contratos .sello {
		background: #2a2926;
		color: var(--papel);
	}
	.oferta .sello {
		background: var(--ciruela-tinte);
		color: var(--ciruela);
	}
	.grupo-pregunta {
		font: 600 17px/1.3 var(--f-texto);
	}
	dl {
		margin: 0;
	}
	.palabra-fila {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 10px;
		padding: 16px 0;
		border-top: 1px solid #2a2926;
	}
	.oferta .palabra-fila {
		border-top-color: #d6d1c6;
	}
	.palabra-fila:first-child {
		border-top: 0;
	}
	.palabra-texto {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.palabra {
		font: 800 32px/0.9 var(--f-extra);
	}
	.oferta .palabra {
		color: var(--ciruela);
	}
	dd {
		margin: 0;
		font: 400 15px/1.45 var(--f-texto);
		text-wrap: pretty;
	}
	.contratos dd {
		color: #d6d1c6;
	}
	.oferta dd {
		color: #3a3935;
	}
	.palabra-carril {
		min-width: 0;
	}
	.asu {
		display: flex;
		flex-direction: column;
		gap: 6px;
		border-left: 4px solid var(--paja);
		padding: 2px 0 2px 16px;
	}
	.asu-titulo {
		font: 800 34px/0.95 var(--f-extra);
	}
	.nota-color {
		font-size: 15px;
		color: var(--grafito);
	}

	/* —— Paso a paso: cada paso, con la tira de su referencia —— */
	.pasos {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
		counter-reset: none;
	}
	.paso {
		background: var(--blanco);
		border-radius: var(--radio);
		padding: 18px 16px 16px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		min-width: 0;
	}
	.paso-cab {
		display: grid;
		grid-template-columns: 34px minmax(0, 1fr);
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
	.paso.oferta .num-paso {
		color: var(--ciruela);
	}
	.paso-titulo {
		font: 700 16px/1.35 var(--f-texto);
	}
	.paso-texto {
		font: 400 16px/1.55 var(--f-texto);
		text-wrap: pretty;
	}
	.tira {
		border-radius: 6px;
		padding: 14px 16px 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.tira.contratos {
		background: #0b0a0a;
		color: var(--papel);
	}
	.tira.oferta {
		background: var(--superficie);
	}
	.leyenda {
		display: flex;
		flex-flow: row wrap;
		gap: 6px 18px;
		font: 500 13px/1.3 var(--f-semi);
	}
	.tira.contratos .leyenda {
		color: #d6d1c6;
	}
	.leyenda strong {
		font-weight: 700;
		color: var(--tinta);
	}
	.tira.contratos .leyenda strong {
		color: var(--papel);
	}
	.leyenda li {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.muestra-l {
		flex: none;
		width: 14px;
		height: 10px;
		border-radius: 2px;
	}
	.muestra-l.banda {
		background: #f6f4ee;
	}
	.muestra-l.anterior {
		border: 1.5px dashed #d6d1c6;
		box-sizing: border-box;
	}
	.muestra-l.excelente {
		background: #857f74;
	}
	.muestra-l.marca {
		width: 3px;
		height: 14px;
		background: var(--ciruela);
		border-radius: 0;
	}
	.muestra-l.margen {
		height: 2px;
		background: var(--ciruela);
		opacity: 0.55;
	}
	.resultado-ej {
		min-width: 0;
	}

	/* —— Las dos referencias —— */
	.referencias {
		--negro: #0b0a0a;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		border-radius: var(--radio);
		overflow: hidden;
	}
	.referencia {
		padding: 20px 18px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.referencia.contratos {
		background: var(--negro);
		color: var(--papel);
	}
	.referencia.oferta {
		background: var(--superficie);
	}
	.filas-ref {
		margin: 0;
		display: flex;
		flex-direction: column;
	}
	.filas-ref div {
		display: grid;
		grid-template-columns: 76px minmax(0, 1fr);
		gap: 12px;
		padding: 9px 0;
		border-top: 1px solid #2a2926;
	}
	.oferta .filas-ref div {
		border-top-color: #d6d1c6;
	}
	.filas-ref dt {
		font: 700 13px/1.45 var(--f-semi);
		letter-spacing: 0.02em;
	}
	.contratos .filas-ref dt {
		color: var(--paja);
	}
	.oferta .filas-ref dt {
		color: var(--ciruela);
	}
	.filas-ref dd,
	.terminos dd {
		margin: 0;
		font: 400 15px/1.45 var(--f-texto);
		text-wrap: pretty;
	}
	.contratos .filas-ref dd,
	.contratos .terminos dd {
		color: #d6d1c6;
	}
	.terminos {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding-top: 14px;
		border-top: 2px solid #2a2926;
	}
	.oferta .terminos {
		border-top-color: #d6d1c6;
	}
	.terminos dt {
		font: 700 16px/1.3 var(--f-texto);
	}
	.oferta .terminos dt {
		color: var(--ciruela);
	}
	.cierre-ref {
		font-weight: 500;
	}
	.limites-ref {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 0 16px 16px;
	}
	.limites-ref .lista {
		padding-left: 20px;
	}

	/* Anuncios recientes: listas con viñeta y desplegables nativos */
	.lista {
		list-style: disc;
		padding-left: 20px;
		gap: 8px;
		max-width: 70ch;
		font: 400 16px/1.55 var(--f-texto);
	}
	details {
		background: var(--blanco);
		border-radius: var(--radio);
	}
	summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		min-height: 48px;
		padding: 10px 16px;
		font: 700 16px/1.3 var(--f-texto);
		cursor: pointer;
		list-style: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary::after {
		content: '';
		flex: none;
		width: 8px;
		height: 8px;
		border-right: 2px solid currentColor;
		border-bottom: 2px solid currentColor;
		transform: rotate(45deg);
		margin-top: -4px;
	}
	details[open] summary::after {
		transform: rotate(-135deg);
		margin-top: 4px;
	}
	summary:focus-visible {
		outline: 2px solid var(--tinta);
		outline-offset: 2px;
		border-radius: var(--radio);
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
		.paso-texto {
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
		.referencias {
			grid-template-columns: 1fr 1fr;
		}
		.referencia {
			padding: 26px 24px;
		}
		.paso {
			padding: 22px 24px 20px;
		}
		.tira {
			margin-left: 44px;
		}
		.resultado-ej {
			margin-left: 44px;
		}
		.grupo {
			padding: 26px 28px 10px;
		}
		.palabra-fila {
			grid-template-columns: minmax(0, 1fr) 220px;
			gap: 28px;
			align-items: center;
		}
		.palabra {
			font-size: 38px;
		}
		.asu-titulo {
			font-size: 42px;
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
