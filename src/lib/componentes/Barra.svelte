<script lang="ts">
	import { onMount } from 'svelte';
	import type { Barra, Vista } from '#lib/resultado';

	let { barra, vista }: { barra: Barra; vista: Vista } = $props();

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
	// Alineada a la derecha de su marca; si no cabe, a la izquierda; si tampoco, centrada
	const anclarDerecha = (x: number, w: number) => (x - w >= 0 ? x - w : x + w <= W ? x : centrar(x, w));

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

	const referenciaDentro = $derived(bandaAncho >= 66 && !esA);
	const referenciaFuera = $derived(bandaAncho < 66 && !esA);
	const filaParte = $derived(esA ? 84 : 62);
	const filaTecho = $derived(esA ? 106 : 84);
	const alto = $derived(esA ? 124 : 102);

	const anuncioIzq = $derived(centrar(precioX, wAnuncio));
	const parteIzq = $derived(anclarDerecha(parteMax, wParte));
	const techoIzq = $derived(anclarDerecha(techoMax, wTecho));
	const deltaIzq = $derived(
		Math.min(Math.max((parteMax + precioX) / 2 - wDelta / 2, parteIzq + wParte + 8, techoMax + 6), W - wDelta)
	);

	const descripcion = $derived(
		`Tu anuncio, ${etiquetas.precio}. Parte alta de la referencia, ${etiquetas.parteAlta}. Techo para un piso excelente, ${etiquetas.techo}.`
	);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<div
	class="barra nivel-{clase}"
	style:height="{alto}px"
	bind:clientWidth={W}
	role="img"
	aria-label={descripcion}
	title="Toca para repetir"
	onclick={repetir}
>
	<div class="et anuncio" bind:offsetWidth={wAnuncio} style:left="{anuncioIzq}px">
		tu anuncio <strong>{etiquetas.precio}</strong>
	</div>

	{#if referenciaFuera}
		<div class="et ref" bind:offsetWidth={wRef} style:left="{centrar(bandaMedio, wRef)}px">referencia</div>
		<div class="tick" style:left="{bandaMedio}px"></div>
	{/if}

	<div class="pista"></div>
	<div class="banda" style:left="{bandaIzq}px" style:width="{bandaAncho}px">
		{#if referenciaDentro}referencia{/if}
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

	<div class="et cero">0{NB}€</div>

	{#if esA}
		<div class="tercios" style:left="{bandaIzq}px" style:width="{bandaAncho}px">
			{#each ['baja', 'media', 'alta'] as t, i (t)}
				<span class:activo={etiquetas.tercio === i}>{t}</span>
			{/each}
		</div>
	{/if}

	<!-- Marcas de la parte alta y del techo; con horquilla son corchetes que abarcan el tramo -->
	<div
		class="marca"
		class:tramo={hayTramoParte}
		style:left="{hayTramoParte ? parteMin : parteMax}px"
		style:width="{hayTramoParte ? parteMax - parteMin : 1}px"
		style:height="{filaParte - 54}px"
	></div>
	<div class="et nota" bind:offsetWidth={wParte} style:top="{filaParte}px" style:left="{parteIzq}px">
		parte alta <strong>{etiquetas.parteAlta}</strong>
	</div>
	<div
		class="marca"
		class:tramo={hayTramoTecho}
		style:left="{hayTramoTecho ? techoMin : techoMax}px"
		style:width="{hayTramoTecho ? techoMax - techoMin : 1}px"
		style:height="{filaTecho - 54}px"
	></div>
	<div class="et nota" bind:offsetWidth={wTecho} style:top="{filaTecho}px" style:left="{techoIzq}px">
		techo para un piso excelente <strong>{etiquetas.techo}</strong>
	</div>

	{#if esC && etiquetas.delta}
		<div class="et delta" bind:offsetWidth={wDelta} style:left="{deltaIzq}px">{etiquetas.delta}</div>
	{/if}
</div>

<style>
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
