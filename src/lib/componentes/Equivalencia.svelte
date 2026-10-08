<script lang="ts">
	import { EQUIVALENCIA, type Vista } from '#lib/resultado';

	let { vista }: { vista: Vista } = $props();
	const meses = $derived(vista.meses);
</script>

{#if vista.brecha && meses}
	<div class="caja">
		<div class="cabeza">
			<h2 class="titulo">{EQUIVALENCIA.titulo}</h2>
			{#if vista.pidenFrase}<p class="piden">{vista.pidenFrase}</p>{/if}
			{#if vista.encuadre}<p class="subtitulo">{vista.encuadre}</p>{/if}
		</div>
		<div class="importes">
			<div>
				<span class="etiqueta">{EQUIVALENCIA.alMes}</span>
				<span class="cifra">{vista.brecha.mes}</span>
			</div>
			<div>
				<span class="etiqueta">{EQUIVALENCIA.alAño}</span>
				<span class="cifra">{vista.brecha.año}</span>
			</div>
		</div>
		<p class="frase">Equivale a <span class="acento">{meses.frase}</span> de este alquiler al año.</p>
		<div class="bloques-caja">
			<div class="bloques" aria-hidden="true">
				{#each { length: 12 } as _, i (i)}
					<span class="bloque"><span class="relleno tinta"></span></span>
				{/each}
				{#each meses.bloques as fill, i (i)}
					<span class="bloque" class:primero={i === 0}>
						<span class="relleno" style:width="{fill * 100}%"></span>
					</span>
				{/each}
			</div>
			<div class="pie">
				<span>{EQUIVALENCIA.bloques}</span>
				<span class="extra">{meses.extra}</span>
			</div>
		</div>
	</div>
{/if}

<style>
	.caja {
		background: var(--superficie);
		border-radius: var(--radio);
		padding: 18px 16px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.cabeza {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.titulo {
		font: 700 17px/1.3 var(--f-texto);
	}
	.piden {
		font: 600 17px/1.35 var(--f-texto);
		text-wrap: pretty;
	}
	.subtitulo {
		font: 400 13px/1.4 var(--f-texto);
		color: var(--grafito);
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
	.etiqueta {
		font: 500 14px/1.3 var(--f-texto);
		color: var(--grafito);
	}
	.cifra {
		font: 700 26px/1.1 var(--f-semi);
	}
	.frase {
		font: 600 19px/1.3 var(--f-texto);
		text-wrap: pretty;
	}
	.acento {
		color: var(--acento);
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
		display: flex;
		justify-content: space-between;
		font: 500 12px/1.3 var(--f-semi);
		color: var(--grafito);
	}
	.extra {
		color: var(--acento);
		font-weight: 700;
	}
</style>
