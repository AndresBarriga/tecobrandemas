<script lang="ts">
	import type { PasoEjemplo, TramoEscala } from '#lib/resultado';

	/**
	 * Barras de «Cómo calculamos»: todas con la misma escala (de 0 al máximo del ejemplo). Posiciones
	 * en % del ancho, así que no hace falta medir nada. Es la barra del resultado simplificada.
	 */
	let { paso, precio }: { paso: PasoEjemplo; precio: string } = $props();

	const pc = (x: number) => `${(x * 100).toFixed(2)}%`;
	const ancho = (t: TramoEscala) => pc(t.hasta - t.desde);
	const mitad = $derived((paso.banda.desde + paso.banda.hasta) / 2);
</script>

<div class="barra nivel-{paso.nivel ?? 'a'}" role="img" aria-label={paso.aria} style:height={paso.techo ? '104px' : '78px'}>
	{#if paso.punto}
		<div class="precio" style:left={pc(paso.punto.x)}>tu precio <strong>{precio}</strong></div>
	{/if}
	<div class="pista"></div>
	<div class="banda" style:left={pc(paso.banda.desde)} style:width={ancho(paso.banda)}></div>
	{#if paso.anterior}
		<div class="anterior" style:left={pc(paso.anterior.desde)} style:width={ancho(paso.anterior)}></div>
	{/if}
	{#if paso.techo}
		<div class="techo" style:left={pc(paso.techo.desde)} style:width={ancho(paso.techo)}></div>
		<div class="marca" style:left={pc(paso.techo.hasta)}></div>
		<div class="et techo-et" style:left={pc(paso.techo.hasta)}>techo para un piso excelente <strong>{paso.techo.valor}</strong></div>
	{/if}
	{#if paso.punto}
		<div class="guia" style:left={pc(paso.techo ? paso.techo.hasta : paso.banda.hasta)} style:width={pc(Math.max(0, paso.punto.x - (paso.techo ? paso.techo.hasta : paso.banda.hasta)))}></div>
		<div class="punto" style:left={pc(paso.punto.x)}></div>
		{#if paso.punto.delta}<div class="et delta" style:left={pc(paso.techo ? paso.techo.hasta : paso.banda.hasta)}>{paso.punto.delta}</div>{/if}
	{/if}
	<div class="et cero">0&nbsp;€</div>
	<div
		class="et ref"
		style:left={pc(paso.alinearDerecha ? paso.banda.hasta : mitad)}
		style:transform={paso.alinearDerecha ? 'translateX(-100%)' : 'translateX(-50%)'}
	>
		referencia <strong>{paso.referencia}</strong>
	</div>
</div>

<style>
	.barra {
		position: relative;
		width: 100%;
	}
	.barra > div {
		position: absolute;
	}
	.pista {
		left: 0;
		right: 0;
		top: 24px;
		height: 24px;
		background: #e0dace;
	}
	.banda {
		top: 24px;
		height: 24px;
		background: var(--tinta);
	}
	.anterior {
		top: 19px;
		height: 34px;
		box-sizing: border-box;
		border: 1.5px dashed var(--tinta);
		border-radius: 2px;
	}
	.techo {
		top: 24px;
		height: 24px;
		background: var(--piedra);
	}
	.marca {
		top: 48px;
		width: 1px;
		height: 32px;
		background: var(--piedra);
	}
	.guia {
		top: 35px;
		height: 2px;
		background: var(--acento);
	}
	.punto {
		top: 24px;
		width: 24px;
		height: 24px;
		margin-left: -12px;
		box-sizing: border-box;
		border-radius: 50%;
		border: 3px solid var(--superficie);
		background: var(--acento);
	}
	.et {
		white-space: nowrap;
		font: 500 12px/1.3 var(--f-semi);
		color: var(--grafito);
	}
	.et strong {
		font-weight: 700;
		color: var(--tinta);
	}
	.cero {
		top: 56px;
		left: 0;
	}
	.ref {
		top: 56px;
	}
	.techo-et {
		top: 82px;
		transform: translateX(-100%);
		padding-right: 4px;
	}
	.precio {
		top: 0;
		transform: translateX(-88%);
		white-space: nowrap;
		font: 500 13px/1.3 var(--f-semi);
		color: var(--grafito);
	}
	.precio strong {
		color: var(--acento);
		font-weight: 700;
	}
	.delta {
		top: 82px;
		padding-left: 6px;
		font-weight: 700;
		color: var(--acento);
	}
</style>
