<script lang="ts">
	import type { Snippet } from 'svelte';
	import { COSTURA as T, descripcionCostura, type Costura, type Mitad } from '#lib/resultado';

	/**
	 * «La costura» (docs/design/new design handoff): el bloque del resultado partido en dos. Contratos en negro y oferta
	 * en claro, con la misma escala; los carriles quedan junto a la costura (el de arriba al final de su mitad, el de
	 * abajo al principio) y la pastilla amarilla con el precio se apoya en ella. Solo pinta: todo llega calculado.
	 *  - `demo`: el ejemplo de la portada (sin titular, aclaraciones, notas ni plegables);
	 *  - `bajoContexto`: lo que va bajo el contexto (el aviso de ubicación aproximada y «Añade el número»).
	 */
	let { costura: c, demo = false, bajoContexto }: { costura: Costura; demo?: boolean; bajoContexto?: Snippet } = $props();

	let W = $state(350);
	const ancho = $derived(W >= 560);
	/** Alto del carril y del punto */
	const H = $derived(ancho ? 28 : 24);
	// Ancho útil del carril: el del bloque menos el relleno de cada mitad (28 px en ancho, 20 en estrecho)
	const L = $derived(W - 2 * (ancho ? 28 : 20));
	const X = (f: number) => Math.min(Math.max(f, 0), 1) * L;
	const xPunto = $derived(X(c.punto));

	// Medidas reales de las etiquetas (se miden, no se estiman)
	let wBajo = $state(0);
	let wAlto = $state(0);
	let wMax = $state(0);
	let wOferta = $state(0);
	let wPastilla = $state(0);
	const dentroDe = (izq: number, w: number) => Math.min(Math.max(izq, 0), Math.max(L - w, 0));

	const k = $derived(c.contratos);
	const bandaIzq = $derived(X(k.banda.desde));
	const bandaAncho = $derived(Math.max(4, X(k.banda.hasta) - X(k.banda.desde)));
	const hiX = $derived(X(k.banda.hasta));
	const hmX = $derived(k.incertidumbre ? X(k.incertidumbre.hasta) : hiX);
	const teX = $derived(X(k.excelente.hasta));
	const rotuloDentro = $derived(bandaAncho >= (ancho ? 90 : 76));
	const valoresCentrados = $derived(bandaAncho >= (ancho ? 110 : 84));
	const izqBajo = $derived(dentroDe(valoresCentrados ? bandaIzq - wBajo / 2 : bandaIzq - wBajo, wBajo));
	const izqAlto = $derived(dentroDe(valoresCentrados ? (hiX + hmX) / 2 - wAlto / 2 : hmX, wAlto));
	const izqMax = $derived(dentroDe(teX - wMax, wMax));
	const ofX = $derived(c.oferta ? X(c.oferta.x) : 0);
	const izqOferta = $derived(dentroDe(ofX > L / 2 ? ofX + 2 - wOferta : ofX - 2, wOferta));
	const izqPastilla = $derived(dentroDe(xPunto - wPastilla / 2, wPastilla));

	const arriba = $derived(c.mitades[0]!);
	const abajo = $derived(c.mitades[1] ?? null);
</script>

{#snippet cabecera(m: Mitad)}
	<div class="cab">
		<p class="pregunta">{m.pregunta}</p>
		{#if !demo}<p class="aclaracion">{m.aclaracion}</p>{/if}
		{#if !demo && m.nota}<p class="nota-firma">{m.nota}</p>{/if}
		{#if m.veredicto}
			{@const v = m.veredicto}
			<div class="veredicto" class:larga={v.palabra.length > 10}>
				<p class="palabra">{v.palabra}</p>
				{#if v.cifra}
					<div class="cifra-caja">
						<p class="cifra">{v.cifra}</p>
						<p class="texto">{v.texto}</p>
					</div>
				{:else}
					<p class="texto solo">{v.texto}</p>
				{/if}
			</div>
			{#if !demo && m.estimacion}<p class="estimacion">{m.estimacion}</p>{/if}
		{:else}
			<p class="sin-dato">{T.oferta.sinDato}</p>
			{#if !demo}<p class="sin-dato-texto">{T.oferta.sinDatoTexto}</p>{/if}
		{/if}
	</div>
{/snippet}

<!-- Un carril: `posicion` dice si va arriba (pegado al final de su mitad) o abajo (pegado al principio) -->
{#snippet carril(m: Mitad, posicion: 'arriba' | 'abajo')}
	{#if m.fuente === 'contratos'}
		<div class="carril contratos" class:abajo={posicion === 'abajo'} style:--h="{H}px">
			<div class="pista">
				<span class="banda" style:left="{bandaIzq}px" style:width="{bandaAncho}px">{#if rotuloDentro}{T.contratos.banda}{/if}</span>
				{#if k.incertidumbre}<span class="incertidumbre" style:left="{hiX}px" style:width="{Math.max(0, hmX - hiX)}px"></span>{/if}
				<span class="excelente" style:left="{hmX}px" style:width="{Math.max(0, teX - hmX)}px"></span>
				<span class="linea" class:hacia-abajo={posicion === 'arriba'} style:left="{xPunto}px"></span>
				<span class="punto" style:left="{xPunto}px"></span>
			</div>
			<div class="fila">
				<span class="valor" bind:offsetWidth={wBajo} style:left="{izqBajo}px">{k.etiquetas.bajo}</span>
				<span class="valor" bind:offsetWidth={wAlto} style:left="{izqAlto}px">{k.etiquetas.alto}</span>
			</div>
			<div class="fila">
				<span class="maximo" bind:offsetWidth={wMax} style:left="{izqMax}px">{T.contratos.maximo}<strong>{k.etiquetas.maximo}</strong></span>
			</div>
		</div>
	{:else if c.oferta}
		<div class="carril oferta" class:abajo={posicion === 'abajo'} style:--h="{H}px">
			<div class="pista">
				<span class="marca" style:left="{ofX}px"></span>
				<span class="linea clara" class:hacia-abajo={posicion === 'arriba'} style:left="{xPunto}px"></span>
				<span class="punto" style:left="{xPunto}px"></span>
			</div>
			<!-- El margen «en línea» (más o menos el umbral): una línea fina bajo el carril, no una banda de precios -->
			<span class="margen" style:left="{X(c.oferta.margen.desde)}px" style:width="{Math.max(2, X(c.oferta.margen.hasta) - X(c.oferta.margen.desde))}px"></span>
			<div class="fila">
				<span class="valor oferta-et" bind:offsetWidth={wOferta} style:left="{izqOferta}px">{c.oferta.etiqueta}</span>
			</div>
		</div>
	{/if}
{/snippet}

<div class="costura" bind:clientWidth={W} class:ancho class:demo>
	<div class="contexto">
		<div>
			{#if demo}<p class="lugar">{c.lugar}</p>{:else}<h1 class="lugar">{c.lugar}</h1>{/if}
			<p class="ctx">{c.contexto[0]}<strong>{c.contexto[1]}</strong></p>
		</div>
		{#if bajoContexto}{@render bajoContexto()}{/if}
		{#if !demo}
			<p class="titular">
				{#each c.titular as f, i (i)}<span class:ciruela={f.fuente === 'oferta'}>{f.texto}</span>{i < c.titular.length - 1 ? ' ' : ''}{/each}
			</p>
		{/if}
	</div>

	<div class="panel" role="img" aria-label={descripcionCostura(c)}>
		<section class="mitad {arriba.fuente} superior">
			{@render cabecera(arriba)}
			{@render carril(arriba, 'arriba')}
		</section>
		{#if abajo}
			<section class="mitad {abajo.fuente} inferior">
				<div class="pastilla-caja">
					<span class="pastilla" bind:offsetWidth={wPastilla} style:left="{izqPastilla}px">{c.pastilla}</span>
				</div>
				{@render carril(abajo, 'abajo')}
				{@render cabecera(abajo)}
			</section>
		{:else}
			<div class="pastilla-caja sola"><span class="pastilla" bind:offsetWidth={wPastilla} style:left="{izqPastilla}px">{c.pastilla}</span></div>
		{/if}
	</div>

	{#if !demo}
		<div class="plegables">
			{#each c.plegables as p (p.clave)}
				<details>
					<summary>{p.titulo}</summary>
					{#each p.parrafos as t (t)}<p class="parrafo">{t}</p>{/each}
				</details>
			{/each}
		</div>
		<p class="fuentes">{c.fuentes} · <a href="/como-calculamos">Cómo calculamos</a></p>
	{/if}
</div>

<style>
	.costura {
		--negro: #0b0a0a;
		--claro: #ede9e0;
		--ciruela: #6a3a8c;
		display: flex;
		flex-direction: column;
		gap: 18px;
		font-variant-numeric: tabular-nums;
	}
	.contexto {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.lugar {
		font: 700 17px/1.3 var(--f-texto);
	}
	.ctx {
		font: 500 14px/1.4 var(--f-texto);
		color: var(--grafito);
	}
	.ctx strong {
		color: var(--tinta);
	}
	.titular {
		font: 800 42px/0.9 var(--f-extra);
		text-wrap: balance;
	}
	.titular .ciruela {
		color: var(--ciruela);
	}
	.ancho .lugar {
		font-size: 20px;
	}
	.ancho .ctx {
		font-size: 17px;
		color: var(--tinta);
	}
	.ancho .titular {
		font-size: 62px;
	}

	/* —— Las dos mitades —— */
	.panel {
		border-radius: var(--radio);
		overflow: hidden;
	}
	.mitad {
		position: relative;
		padding: 22px 20px 0;
	}
	.mitad.inferior {
		padding: 0 20px 22px;
	}
	.ancho .mitad {
		padding: 24px 28px 0;
	}
	.ancho .mitad.inferior {
		padding: 0 28px 24px;
	}
	.mitad.contratos {
		background: var(--negro);
		color: #f6f4ee;
	}
	.mitad.oferta {
		background: var(--claro);
		color: var(--tinta);
	}
	.cab {
		display: flex;
		flex-direction: column;
	}
	.inferior .cab {
		margin-top: 6px;
	}
	.pregunta {
		font: 600 16px/1.3 var(--f-texto);
	}
	.ancho .pregunta {
		font-size: 18px;
	}
	.aclaracion {
		font: 400 13px/1.4 var(--f-texto);
		margin-top: 3px;
		color: var(--grafito);
	}
	.contratos .aclaracion,
	.contratos .texto {
		color: #d6d1c6;
	}
	.ancho .aclaracion {
		font-size: 14px;
	}
	.nota-firma {
		align-self: flex-start;
		margin-top: 8px;
		padding: 5px 10px;
		border-radius: 6px;
		font: 600 13px/1.4 var(--f-texto);
		background: #2a2926;
		color: #f6f4ee;
	}
	/* Palabra del veredicto y su %: en ancho, la cifra a la derecha; en estrecho, debajo */
	.veredicto {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 10px;
	}
	.ancho .veredicto {
		flex-direction: row;
		justify-content: space-between;
		align-items: flex-end;
		gap: 24px;
		margin-top: 12px;
	}
	.ancho .veredicto.larga {
		flex-direction: column;
		align-items: flex-start;
	}
	.palabra {
		font: 800 56px/0.86 var(--f-extra);
		white-space: nowrap;
	}
	.veredicto.larga .palabra {
		font-size: 42px;
	}
	.ancho .palabra {
		font-size: 80px;
	}
	.ancho .veredicto.larga .palabra {
		font-size: 64px;
	}
	.oferta .palabra {
		color: var(--ciruela);
	}
	.cifra-caja {
		display: flex;
		gap: 10px;
		align-items: baseline;
	}
	.ancho .veredicto:not(.larga) .cifra-caja {
		flex-direction: column;
		align-items: flex-end;
		gap: 2px;
		text-align: right;
	}
	.cifra {
		flex: none;
		font: 900 36px/1 var(--f-extra);
	}
	.ancho .cifra {
		font-size: 60px;
	}
	.texto {
		font: 400 13.5px/1.35 var(--f-texto);
		color: var(--grafito);
	}
	.ancho .texto {
		font-size: 14px;
	}
	.estimacion {
		margin-top: 12px;
		font: 400 12.5px/1.5 var(--f-texto);
		color: var(--grafito);
	}
	.ancho .estimacion {
		font-size: 13px;
	}
	.sin-dato {
		align-self: flex-start;
		margin-top: 10px;
		padding: 6px 12px;
		border: 1.5px solid var(--grafito);
		border-radius: 8px;
		font: 600 14px/1.3 var(--f-texto);
		color: var(--grafito);
	}
	.sin-dato-texto {
		margin-top: 10px;
		font: 400 14px/1.45 var(--f-texto);
		color: var(--grafito);
	}

	/* —— Carriles —— */
	.carril {
		position: relative;
		margin-top: 18px;
		padding-bottom: 14px;
	}
	.ancho .carril {
		margin-top: 24px;
	}
	.carril.abajo {
		margin-top: 0;
	}
	/* La mitad de arriba deja hueco bajo su última fila: la pastilla se apoya en la costura y no la pisa */
	.superior .carril {
		padding-bottom: 28px;
	}
	.ancho .superior .carril {
		padding-bottom: 34px;
	}
	.pista {
		position: relative;
		height: var(--h);
		border-radius: 4px;
	}
	.contratos .pista {
		background: #5a5750;
	}
	.oferta .pista {
		background: #e4dfd5;
		box-shadow: inset 0 0 0 1px #d6d1c6;
	}
	.pista > span {
		position: absolute;
		top: 0;
		height: 100%;
	}
	.banda {
		background: #f6f4ee;
		color: var(--tinta);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		white-space: nowrap;
		font: 700 12.5px/1 var(--f-semi);
	}
	.ancho .banda {
		font-size: 14px;
	}
	.pista > .incertidumbre {
		background: #d6d1c6;
	}
	.pista > .excelente {
		background: #857f74;
	}
	/* La oferta estimada: marca vertical ciruela que sobresale del carril */
	.pista > .marca {
		top: -7px;
		height: calc(100% + 14px);
		width: 3px;
		margin-left: -1.5px;
		background: var(--ciruela);
		z-index: 1;
	}
	/* El precio: círculo del alto del carril con borde del color de su mitad; la línea lo une con el otro punto */
	.pista > .punto {
		top: 0;
		width: var(--h);
		height: var(--h);
		margin-left: calc(var(--h) / -2);
		border-radius: 50%;
		background: #ebc85a;
		box-sizing: border-box;
		border: 3px solid var(--negro);
		z-index: 2;
	}
	.oferta .pista > .punto {
		border-color: var(--claro);
	}
	.pista > .linea {
		width: 3px;
		margin-left: -1.5px;
		background: #ebc85a;
		top: calc(var(--h) / -2 - 40px);
		height: calc(var(--h) / 2 + 40px);
	}
	.pista > .linea.clara {
		background: #d8b44a;
	}
	.pista > .linea.hacia-abajo {
		top: calc(var(--h) / 2);
		height: calc(var(--h) / 2 + 200px);
	}
	.margen {
		position: absolute;
		top: calc(var(--h) + 4px);
		height: 3px;
		border-radius: 2px;
		background: var(--ciruela);
		opacity: 0.55;
	}
	.fila {
		position: relative;
		height: 22px;
		margin-top: 6px;
	}
	.fila + .fila {
		margin-top: 2px;
	}
	.valor,
	.maximo {
		position: absolute;
		top: 0;
		padding: 0 4px;
		border-radius: 3px;
		white-space: nowrap;
		font: 700 13.5px/1.3 var(--f-semi);
		z-index: 1;
	}
	.ancho .valor {
		font-size: 15px;
	}
	.contratos .valor,
	.contratos .maximo {
		background: var(--negro);
		color: #f6f4ee;
	}
	.maximo {
		font-weight: 500;
		font-size: 13px;
		color: #d6d1c6 !important;
	}
	.maximo strong {
		color: #f6f4ee;
		font-weight: 700;
	}
	.ancho .maximo {
		font-size: 15px;
	}
	.oferta-et {
		background: var(--claro);
		color: var(--ciruela);
	}
	/* La línea del precio baja desde el punto de arriba hasta la costura: la mitad de arriba la recorta en su borde */
	.mitad.superior {
		overflow: hidden;
	}

	/* —— Pastilla en la costura —— */
	.pastilla-caja {
		position: relative;
		height: 40px;
	}
	.pastilla {
		position: absolute;
		top: -18px;
		z-index: 3;
		white-space: nowrap;
		padding: 7px 14px;
		border-radius: 999px;
		background: #ebc85a;
		color: var(--tinta);
		font: 700 15px/1.3 var(--f-semi);
	}
	.ancho .pastilla {
		top: -21px;
		padding: 9px 18px;
		font-size: 17px;
	}
	.pastilla-caja.sola {
		background: var(--negro);
	}

	/* —— Plegables: cerrados por defecto; en ancho, en fila, y el abierto ocupa la fila entera —— */
	.plegables {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.ancho .plegables {
		flex-direction: row;
		flex-wrap: wrap;
		gap: 12px;
	}
	.ancho .plegables details {
		flex: 1 1 0;
		min-width: 0;
	}
	.ancho .plegables details[open] {
		flex-basis: 100%;
	}
	details {
		background: var(--claro);
		border-radius: 8px;
		padding: 0 16px;
	}
	summary {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		min-height: 48px;
		font: 600 15px/1.3 var(--f-texto);
		cursor: pointer;
		list-style: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary::after {
		content: '+';
		font: 600 20px/1 var(--f-texto);
	}
	details[open] summary::after {
		content: '−';
	}
	summary:focus-visible {
		outline: 2px solid var(--tinta);
		outline-offset: 2px;
		border-radius: 8px;
	}
	details > :not(summary) {
		padding-bottom: 14px;
	}
	.parrafo {
		font: 400 14px/1.5 var(--f-texto);
		color: var(--grafito);
	}
	.parrafo + .parrafo {
		margin-top: 8px;
	}
	.fuentes {
		font: 400 12.5px/1.45 var(--f-texto);
		color: var(--grafito);
	}
</style>
