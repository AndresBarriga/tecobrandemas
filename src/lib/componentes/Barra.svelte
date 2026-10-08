<script lang="ts">
	import { onMount } from 'svelte';
	import { colocarEtiqueta, type Barra, type Vista } from '#lib/resultado';

	let { barra, vista, etiquetaPrecio = 'tu anuncio' }: { barra: Barra; vista: Vista; etiquetaPrecio?: string } = $props();

	const NB = ' ';
	const clase = $derived(vista.clase);
	const esA = $derived(clase === 'a');
	const esC = $derived(clase === 'c');
	const etiquetas = $derived(vista.barra);

	// Ancho real del contenedor y de cada etiqueta: se miden, no se estiman
	let W = $state(350);
	let wAnuncio = $state(0);
	let wParte = $state(0);
	let wTecho = $state(0);
	let wDelta = $state(0);
	let wRef = $state(0);
	let wCero = $state(0);

	let armado = $state(false);
	let reducido = $state(false);
	let temporizador: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reducido) armado = true;
		else temporizador = setTimeout(() => (armado = true), 400);
		return () => clearTimeout(temporizador);
	});

	function repetir() {
		if (reducido) return;
		clearTimeout(temporizador);
		armado = false;
		temporizador = setTimeout(() => (armado = true), 60);
	}

	const X = (f: number) => f * W;
	const centrar = (x: number, w: number) => Math.min(Math.max(x - w / 2, 0), W - w);
	// A la izquierda de su marca; si no cabe (o pisaría `libre`, el «0 €»), a su derecha, siempre dentro de la barra
	const anclarDerecha = colocarEtiqueta;

	const precioX = $derived(X(barra.posiciones.precio));
	const bandaIzq = $derived(X(barra.banda.desde));
	const bandaAncho = $derived(X(barra.banda.hasta) - X(barra.banda.desde));
	const bandaMedio = $derived(bandaIzq + bandaAncho / 2);
	const parteMin = $derived(X(barra.posiciones.sup.min));
	const parteMax = $derived(X(barra.posiciones.sup.max));
	const techoMin = $derived(X(barra.posiciones.techo.min));
	const techoMax = $derived(X(barra.posiciones.techo.max));
	const hayTramoParte = $derived(barra.horquilla && barra.posiciones.sup.max > barra.posiciones.sup.min);
	const hayTramoTecho = $derived(barra.horquilla && barra.posiciones.techo.max > barra.posiciones.techo.min);

	// «contratos de aquí» cabe dentro de la banda desde unos 120 px
	const referenciaDentro = $derived(bandaAncho >= 120 && !esA);
	const referenciaFuera = $derived(bandaAncho < 120 && !esA);
	// Con horquilla las cifras de rango van en una leyenda bajo la barra: sin etiquetas largas que se pisen
	const horquilla = $derived(barra.horquilla);
	const filaParte = $derived(horquilla ? 60 : esA ? 84 : 62);
	const filaTecho = $derived(horquilla ? 60 : esA ? 106 : 84);
	const alto = $derived(horquilla ? 84 : esA ? 124 : 102);

	const anuncioIzq = $derived(centrar(precioX, wAnuncio));
	// El rótulo de la banda, fuera de ella, cede el sitio a la etiqueta del precio si se pisan
	const refIzq = $derived(centrar(bandaMedio, wRef));
	const refChoca = $derived(refIzq < anuncioIzq + wAnuncio + 8 && refIzq + wRef + 8 > anuncioIzq);
	// La fila de «parte alta» es la del «0 €» (salvo en el nivel a); la del techo queda debajo
	const parteIzq = $derived(anclarDerecha(parteMax, wParte, W, esA ? 0 : wCero + 8));
	const techoIzq = $derived(anclarDerecha(techoMax, wTecho, W));
	const deltaIzq = $derived(
		Math.min(Math.max((parteMax + precioX) / 2 - wDelta / 2, parteIzq + wParte + 8, techoMax + 6), W - wDelta)
	);

	const descripcion = $derived(
		`${etiquetaPrecio.charAt(0).toUpperCase()}${etiquetaPrecio.slice(1)}, ${etiquetas.precio}. Parte alta de lo que pagan los contratos de aquí, ${etiquetas.parteAlta}. Si fuera un piso excelente, ${etiquetas.techo}.`
	);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<div class="conjunto nivel-{clase}">
<div
	class="barra"
	style:height="{alto}px"
	bind:clientWidth={W}
	role="img"
	aria-label={descripcion}
	title="Toca para repetir"
	onclick={repetir}
>
	<div class="et anuncio" bind:offsetWidth={wAnuncio} style:left="{anuncioIzq}px">
		{etiquetaPrecio} <strong>{etiquetas.precio}</strong>
	</div>

	{#if referenciaFuera}
		<div class="et ref" bind:offsetWidth={wRef} style:left="{refIzq}px" style:visibility={refChoca ? 'hidden' : null}>contratos de aquí</div>
		<div class="tick" style:left="{bandaMedio}px"></div>
	{/if}

	<div class="pista"></div>
	<div class="banda" style:left="{bandaIzq}px" style:width="{bandaAncho}px">
		{#if referenciaDentro}contratos de aquí{/if}
	</div>
	{#if hayTramoParte}
		<div class="incertidumbre" style:left="{parteMin}px" style:width="{parteMax - parteMin}px"></div>
	{/if}
	<div class="techo" style:left="{parteMax}px" style:width="{Math.max(0, techoMax - parteMax)}px"></div>
	{#if esC}
		<div class="guia" style:left="{parteMax}px" style:width="{Math.max(0, precioX - parteMax)}px"></div>
	{/if}
	<div
		class="punto"
		class:movil={armado && !reducido}
		style:left="{armado ? precioX : 0}px"
	></div>

	<div class="et cero" bind:offsetWidth={wCero}>0{NB}€</div>

	{#if esA}
		<div class="tercios" style:left="{bandaIzq}px" style:width="{bandaAncho}px">
			{#each ['baja', 'media', 'alta'] as t, i (t)}
				<span class:activo={etiquetas.tercio === i}>{t}</span>
			{/each}
		</div>
	{/if}

	<!-- Marcas de la parte alta y de «si fuera un piso excelente» (R_max); con horquilla son corchetes que abarcan el tramo -->
	<div
		class="marca"
		class:tramo={hayTramoParte}
		style:left="{hayTramoParte ? parteMin : parteMax}px"
		style:width="{hayTramoParte ? parteMax - parteMin : 1}px"
		style:height="{filaParte - 54}px"
	></div>
	{#if !horquilla}
	<div class="et nota" bind:offsetWidth={wParte} style:top="{filaParte}px" style:left="{parteIzq}px">
		parte alta <strong>{etiquetas.parteAlta}</strong>
	</div>
	{/if}
	<div
		class="marca"
		class:tramo={hayTramoTecho}
		style:left="{hayTramoTecho ? techoMin : techoMax}px"
		style:width="{hayTramoTecho ? techoMax - techoMin : 1}px"
		style:height="{filaTecho - 54}px"
	></div>
	{#if !horquilla}
	<div class="et nota" bind:offsetWidth={wTecho} style:top="{filaTecho}px" style:left="{techoIzq}px">
		si fuera un piso excelente <strong>{etiquetas.techo}</strong>
	</div>
	{/if}

	{#if esC && etiquetas.delta && !horquilla}
		<div class="et delta" bind:offsetWidth={wDelta} style:left="{deltaIzq}px">{etiquetas.delta}</div>
	{/if}
</div>

{#if horquilla}
	<ul class="leyenda">
		<li><span class="muestra incertidumbre"></span>Parte alta de los contratos de aquí: <strong>{etiquetas.parteAlta}</strong></li>
		<li><span class="muestra techo"></span>Si fuera un piso excelente: <strong>{etiquetas.techo}</strong></li>
		{#if esC && etiquetas.delta}<li><span class="muestra acento"></span>Sobre la parte alta: <strong>{etiquetas.delta}</strong></li>{/if}
	</ul>
{/if}
</div>

<style>
	.conjunto {
		width: 100%;
	}
	.leyenda {
		list-style: none;
		margin: 12px 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
		font: 500 13px/1.35 var(--f-semi);
		color: var(--grafito);
	}
	.leyenda li {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.leyenda strong {
		color: var(--tinta);
		font-weight: 700;
	}
	.muestra {
		flex: none;
		width: 14px;
		height: 10px;
		border-radius: 2px;
	}
	.muestra.incertidumbre {
		background: var(--grafito);
	}
	.muestra.techo {
		background: var(--piedra);
	}
	.muestra.acento {
		background: var(--acento);
	}
	.barra {
		position: relative;
		width: 100%;
		cursor: pointer;
	}
	.barra > div {
		position: absolute;
	}
	.et {
		white-space: nowrap;
		font: 500 12px/1.3 var(--f-semi);
		color: var(--grafito);
	}
	.et strong {
		font-weight: 700;
	}
	.nota {
		top: 62px;
	}
	.nota strong {
		color: var(--tinta);
	}
	.anuncio {
		top: 0;
		font-size: 13px;
	}
	.anuncio strong {
		color: var(--acento);
	}
	.ref {
		top: 0;
		font-weight: 600;
		color: var(--tinta);
	}
	.tick {
		top: 17px;
		width: 1px;
		height: 9px;
		background: var(--tinta);
	}
	.pista {
		left: 0;
		right: 0;
		top: 26px;
		height: 28px;
		background: var(--pista);
	}
	.banda {
		top: 26px;
		height: 28px;
		background: var(--tinta);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		font: 600 12px/1 var(--f-semi);
		color: var(--papel);
	}
	.incertidumbre {
		top: 26px;
		height: 28px;
		background: var(--grafito);
	}
	.techo {
		top: 26px;
		height: 28px;
		background: var(--piedra);
	}
	.guia {
		top: 39px;
		height: 2px;
		background: var(--acento);
	}
	.punto {
		top: 26px;
		width: 28px;
		height: 28px;
		margin-left: -14px;
		border-radius: 50%;
		border: 3px solid var(--papel);
		background: var(--acento);
	}
	.punto.movil {
		transition: left 700ms cubic-bezier(0.2, 0.7, 0.2, 1);
	}
	.cero {
		left: 0;
		top: 62px;
	}
	.tercios {
		top: 62px;
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		text-align: center;
		font: 500 12px/1.3 var(--f-semi);
		color: var(--grafito);
	}
	.tercios .activo {
		color: var(--tinta);
		font-weight: 700;
	}
	.marca {
		top: 54px;
		border-left: 1px solid var(--piedra);
	}
	.marca.tramo {
		border-right: 1px solid var(--piedra);
		border-bottom: 1px solid var(--piedra);
	}
	.delta {
		top: 62px;
		font-weight: 700;
		color: var(--acento);
	}
</style>
