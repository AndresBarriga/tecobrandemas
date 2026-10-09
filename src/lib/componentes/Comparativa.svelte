<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icono from './Icono.svelte';
	import Reglas from './Reglas.svelte';
	import { COMPARATIVA as T, heroEnVeces, type Comparativa } from '#lib/resultado';

	/**
	 * El resultado con dos referencias: la frase resumen, las dos tarjetas del mismo peso (en el orden del modo), la
	 * explicación, las dos reglas con el mismo eje y el impacto en euros frente a los contratos. Cada cifra, una vez.
	 * `debajoTarjetas`: lo que va pegado a las tarjetas (la aclaración de varias zonas y «Añade el número»).
	 */
	let { comparativa: c, debajoTarjetas, conImpacto = true }: { comparativa: Comparativa; debajoTarjetas?: Snippet; conImpacto?: boolean } = $props();
</script>

<div class="comparativa">
	<p class="resumen">{c.resumen}</p>

	<div class="tarjetas">
		{#each c.orden as o (o)}
			{#if o === 'contratos'}
				<section class="tarjeta contratos nivel-{c.contratos.clase}" aria-label={T.contratos.titulo}>
					<p class="cab"><span class="titulo">{T.contratos.titulo}</span> · {T.contratos.sub}</p>
					<p class="etiqueta"><Icono clase={c.contratos.icono} />{c.contratos.etiqueta}</p>
					<p class="cifra" class:larga={c.contratos.cifra.length > 7 || heroEnVeces(c.contratos.cifra)}>{c.contratos.cifra}</p>
					<p class="nota">{c.contratos.nota}</p>
				</section>
			{:else if c.anuncios}
				<section class="tarjeta anuncios" aria-label={T.anuncios.titulo}>
					<p class="cab"><span class="titulo">{T.anuncios.titulo}</span> · {c.subAnuncios} · {c.anuncios.lugar}</p>
					<p class="cifra" class:larga={c.anuncios.cifra.length > 7}>{c.anuncios.cifra}</p>
					<p class="nota">{c.anuncios.nota}</p>
					<p class="etiqueta veredicto">{c.anuncios.veredicto}</p>
				</section>
			{/if}
		{/each}
	</div>

	{#if debajoTarjetas}{@render debajoTarjetas()}{/if}

	<p class="explicacion">{c.explicacion}</p>

	<Reglas comparativa={c} />

	{#if conImpacto && c.impacto}
		<div class="impacto">
			<h2>{T.impacto.titulo}</h2>
			<div class="importes">
				<div><span class="et">{T.impacto.alMes}</span><span class="importe">{c.impacto.mes}</span></div>
				<div><span class="et">{T.impacto.alAño}</span><span class="importe">{c.impacto.año}</span></div>
			</div>
			<p class="frase">{c.impacto.frase}</p>
			<div class="bloques-caja" aria-hidden="true">
				<div class="bloques">
					{#each { length: 12 } as _, i (i)}<span class="bloque"><span class="relleno tinta"></span></span>{/each}
					{#each c.impacto.meses.bloques as fill, i (i)}
						<span class="bloque" class:primero={i === 0}><span class="relleno" style:width="{fill * 100}%"></span></span>
					{/each}
				</div>
				<span class="pie">{T.impacto.bloques}</span>
			</div>
		</div>
	{/if}
</div>

<style>
	.comparativa {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	.resumen {
		font: 800 34px/1.05 var(--f-extra);
		text-wrap: balance;
	}
	.tarjetas {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	/* Por debajo de ~420 px, una columna */
	@media (max-width: 419px) {
		.tarjetas {
			grid-template-columns: 1fr;
		}
	}
	.tarjeta {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 6px;
		padding: 14px 14px 16px;
		border-radius: var(--radio);
		background: var(--blanco);
		border-top: 4px solid var(--tinta);
		min-width: 0;
	}
	.tarjeta.anuncios {
		--acento-anuncios: #6a4392;
		border-top-color: var(--acento-anuncios);
	}
	.cab {
		font: 500 12px/1.35 var(--f-semi);
		color: var(--grafito);
	}
	.cab .titulo {
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--tinta);
	}
	.etiqueta {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 28px;
		padding: 3px 10px 3px 6px;
		background: var(--tinte);
		color: var(--acento);
		border-radius: var(--radio);
		font: 700 13px/1.25 var(--f-texto);
	}
	.etiqueta.veredicto {
		padding-left: 10px;
		background: #ede3f2;
		color: #4b2e70;
	}
	/* Los dos porcentajes, del mismo tamaño */
	.cifra {
		font: 900 64px/0.9 var(--f-extra);
		letter-spacing: -0.01em;
		color: var(--tinta);
	}
	.cifra.larga {
		font-size: 44px;
		line-height: 1;
	}
	/* Identidad de cada referencia: tinta para los contratos, violeta para los anuncios; el color del nivel solo en su chip */
	.contratos .cifra {
		color: var(--tinta);
	}
	.anuncios .cifra {
		color: var(--acento-anuncios);
	}
	.nota {
		font: 500 14px/1.35 var(--f-texto);
		color: var(--grafito);
	}
	.explicacion {
		font: 500 15px/1.45 var(--f-texto);
		text-wrap: pretty;
	}
	.impacto {
		background: var(--superficie);
		border-radius: var(--radio);
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.impacto h2 {
		font: 700 16px/1.3 var(--f-texto);
	}
	.importes {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	.importes div {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.et {
		font: 500 13px/1.3 var(--f-texto);
		color: var(--grafito);
	}
	.importe {
		font: 700 24px/1.1 var(--f-semi);
	}
	.frase {
		font: 600 17px/1.3 var(--f-texto);
		text-wrap: pretty;
	}
	.bloques-caja {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.bloques {
		display: flex;
		gap: 3px;
	}
	.bloque {
		flex: 1;
		aspect-ratio: 1;
		position: relative;
		overflow: hidden;
		border-radius: 2px;
		background: var(--pista);
	}
	.bloque.primero {
		margin-left: 6px;
	}
	.relleno {
		position: absolute;
		inset: 0 auto 0 0;
		background: var(--acento);
	}
	.relleno.tinta {
		width: 100%;
		background: var(--tinta);
	}
	.pie {
		font: 500 12px/1.3 var(--f-semi);
		color: var(--grafito);
	}
</style>
