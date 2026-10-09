<script lang="ts">
	import { COMPARATIVA as T, colocarEtiqueta, descripcionReglas, type Comparativa } from '#lib/resultado';

	/**
	 * Las dos reglas del resultado con el MISMO eje, una debajo de la otra: contratos vigentes (banda negra, parte alta y
	 * «si fuera piso excelente») y anuncios recientes (la oferta estimada como marca vertical violeta y el precio como
	 * círculo amarillo, cada uno con su etiqueta). La banda de ±10 % no se dibuja: solo sirve para clasificar «en línea» y
	 * no es un intervalo de precios. El punto del precio va alineado en las dos. Solo pinta: todo llega calculado.
	 */
	let { comparativa }: { comparativa: Comparativa } = $props();

	const r = $derived(comparativa.reglas);
	const orden = $derived(comparativa.orden.filter((o) => o === 'contratos' || r.anuncios));

	let W = $state(340);
	let wParte = $state(0);
	let wTecho = $state(0);
	let wMedia = $state(0);
	let wPrecio = $state(0);
	const marcasAncho = $state<number[]>([]);

	const X = (f: number) => Math.min(Math.max(f, 0), 1) * W;
	/** Banda con un mínimo de 6 px, centrada en su tramo */
	const banda = (desde: number, hasta: number) => {
		const ancho = Math.max(6, X(hasta) - X(desde));
		const izq = Math.min(Math.max((X(desde) + X(hasta)) / 2 - ancho / 2, 0), W - ancho);
		return { izq, ancho };
	};
	const bc = $derived(banda(r.contratos.banda.desde, r.contratos.banda.hasta));
	const bi = $derived(r.contratos.incertidumbre ? banda(r.contratos.incertidumbre.desde, r.contratos.incertidumbre.hasta) : null);
	const xParte = $derived(X(r.contratos.parteAlta.x));
	const xTecho = $derived(X(r.contratos.techo.x));
	const xPunto = $derived(X(r.punto));

	// «parte alta» a la izquierda de su marca; «si fuera piso excelente» a la derecha de la suya, o en otra fila si se pisan
	const izqParte = $derived(colocarEtiqueta(xParte, wParte, W));
	const izqTecho = $derived(Math.min(Math.max(xTecho - 4, 0), Math.max(W - wTecho, 0)));
	const techoAbajo = $derived(izqTecho < izqParte + wParte + 10);
	// Cada etiqueta centrada en su marca y dentro del ancho: la del precio encima de la regla, la de la oferta debajo
	const centrada = (x: number, w: number) => Math.min(Math.max(x - w / 2, 0), Math.max(W - w, 0));
	const izqMedia = $derived(r.anuncios ? centrada(X(r.anuncios.media.x), wMedia) : 0);
	const izqPrecio = $derived(centrada(xPunto, wPrecio));
	const izqMarca = (i: number, x: number) => {
		const w = marcasAncho[i] ?? 0;
		if (i === 0) return 0;
		if (i === r.eje.marcas.length - 1) return W - w;
		return Math.min(Math.max(X(x) - w / 2, 0), W - w);
	};
</script>

<div class="reglas" bind:clientWidth={W} role="img" aria-label={descripcionReglas(comparativa)}>
	{#each orden as o (o)}
		{#if o === 'contratos'}
			<div class="regla">
				<p class="titulo">{T.reglas.contratos}</p>
				<div class="pista">
					<span class="banda contratos" style:left="{bc.izq}px" style:width="{bc.ancho}px"></span>
					{#if bi}<span class="banda incertidumbre" style:left="{bi.izq}px" style:width="{bi.ancho}px"></span>{/if}
					<span class="excelente" style:left="{xParte}px" style:width="{Math.max(0, xTecho - xParte)}px"></span>
					<span class="punto" style:left="{xPunto}px"></span>
				</div>
				<div class="etiquetas" class:dos-filas={techoAbajo}>
					<span class="et" bind:offsetWidth={wParte} style:left="{izqParte}px">{T.reglas.parteAlta} <strong>{r.contratos.parteAlta.texto}</strong></span>
					<span class="et" class:abajo={techoAbajo} bind:offsetWidth={wTecho} style:left="{izqTecho}px">{T.reglas.techo} <strong>{r.contratos.techo.texto}</strong></span>
				</div>
			</div>
		{:else if r.anuncios && comparativa.anuncios}
			<div class="regla">
				<p class="titulo">{T.reglas.anuncios(comparativa.anuncios.lugar)}</p>
				<div class="etiquetas">
					<span class="et precio" bind:offsetWidth={wPrecio} style:left="{izqPrecio}px"><strong>{r.anuncios.precio}</strong></span>
				</div>
				<div class="pista">
					<span class="media" style:left="{X(r.anuncios.media.x)}px"></span>
					<span class="punto" style:left="{xPunto}px"></span>
				</div>
				<div class="etiquetas">
					<span class="et oferta" bind:offsetWidth={wMedia} style:left="{izqMedia}px"><strong>{r.anuncios.media.texto}</strong></span>
				</div>
				<p class="estimacion">{r.anuncios.estimacion}</p>
				<p class="fuente-oferta">{r.anuncios.fuente}</p>
			</div>
		{/if}
	{/each}
	<div class="eje">
		<span class="linea"></span>
		{#each r.eje.marcas as m, i (i)}
			<span class="tick" style:left="{X(m.x)}px"></span>
			<span class="valor" bind:offsetWidth={marcasAncho[i]} style:left="{izqMarca(i, m.x)}px">{m.texto}</span>
		{/each}
	</div>
</div>

<style>
	.reglas {
		display: flex;
		flex-direction: column;
		gap: 14px;
		width: 100%;
	}
	.regla {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.titulo {
		font: 700 13px/1.3 var(--f-semi);
		color: var(--tinta);
	}
	.pista {
		position: relative;
		height: 22px;
		background: var(--pista);
		border-radius: 2px;
	}
	.pista > span {
		position: absolute;
		top: 0;
		height: 100%;
	}
	.banda.contratos {
		background: var(--tinta);
	}
	.banda.incertidumbre {
		background: var(--grafito);
	}
	/* «Si fuera un piso excelente»: contorno sin el lado izquierdo, como en la tarjeta */
	.excelente {
		border: 2px solid var(--tinta);
		border-left: 0;
		box-sizing: border-box;
	}
	/* Anuncios: la oferta estimada, una marca vertical violeta que sobresale de la pista */
	.pista > .media {
		top: -5px;
		height: calc(100% + 10px);
		width: 4px;
		margin-left: -2px;
		border-radius: 2px;
		background: #6a4392;
	}
	/* El precio: círculo amarillo de verdad (ancho y alto fijos; la regla general de la pista no lo estira) */
	.pista > .punto {
		top: 2px;
		width: 18px;
		height: 18px;
		margin-left: -9px;
		border-radius: 50%;
		background: var(--paja);
		border: 2.5px solid var(--tinta);
		box-sizing: border-box;
		flex: none;
	}
	.et.oferta strong {
		color: #4b2e70;
	}
	.estimacion {
		font: 500 13px/1.4 var(--f-texto);
		margin-top: 2px;
	}
	.fuente-oferta {
		font: 400 12px/1.4 var(--f-texto);
		color: var(--grafito);
	}
	.etiquetas {
		position: relative;
		height: 18px;
	}
	.etiquetas.dos-filas {
		height: 36px;
	}
	.et {
		position: absolute;
		top: 0;
		white-space: nowrap;
		font: 500 12px/1.4 var(--f-semi);
		color: var(--grafito);
	}
	.et.abajo {
		top: 18px;
	}
	.et strong {
		color: var(--tinta);
		font-weight: 700;
	}
	.eje {
		position: relative;
		height: 26px;
		margin-top: -4px;
	}
	.eje .linea {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		border-top: 1px solid var(--piedra);
	}
	.eje .tick {
		position: absolute;
		top: 0;
		width: 1px;
		height: 6px;
		background: var(--piedra);
	}
	.eje .valor {
		position: absolute;
		top: 8px;
		white-space: nowrap;
		font: 500 11.5px/1.3 var(--f-semi);
		color: var(--grafito);
	}
</style>
