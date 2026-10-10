<script lang="ts">
	import type { CarrilEjemplo } from '#lib/resultado';

	/**
	 * Un carril como los de «La costura», en pequeño, para «Cómo calculamos»: contratos (sobre negro) u oferta (sobre
	 * claro), con los mismos colores. Las posiciones van en % de la escala, así que no hay que medir nada.
	 */
	let { carril: c, alto = 20 }: { carril: CarrilEjemplo; alto?: number } = $props();
	const pc = (f: number) => `${Math.min(Math.max(f, 0), 1) * 100}%`;
	const ancho = (t: { desde: number; hasta: number }) => `${Math.max(0, Math.min(t.hasta, 1) - Math.max(t.desde, 0)) * 100}%`;
</script>

<div class="carril {c.fuente}" style:--h="{alto}px" class:con-margen={!!c.margen}>
	<div class="pista">
		{#if c.anterior}<span class="anterior" style:left={pc(c.anterior.desde)} style:width={ancho(c.anterior)}></span>{/if}
		{#if c.banda}<span class="banda" style:left={pc(c.banda.desde)} style:width={ancho(c.banda)}></span>{/if}
		{#if c.excelente}<span class="excelente" style:left={pc(c.excelente.desde)} style:width={ancho(c.excelente)}></span>{/if}
		{#if c.marca !== null}<span class="marca" style:left={pc(c.marca)}></span>{/if}
		{#if c.punto !== null}<span class="punto" style:left={pc(c.punto)}></span>{/if}
	</div>
	{#if c.margen}<span class="margen" style:left={pc(c.margen.desde)} style:width={ancho(c.margen)}></span>{/if}
</div>

<style>
	.carril {
		--negro: #0b0a0a;
		--claro: #ede9e0;
		position: relative;
		padding: 7px 0;
	}
	.carril.con-margen {
		padding-bottom: 14px;
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
	}
	.excelente {
		background: #857f74;
	}
	/* La referencia sin ajustar: solo el contorno, un poco más alto que el carril */
	.pista > .anterior {
		top: -5px;
		height: calc(100% + 10px);
		box-sizing: border-box;
		border: 1.5px dashed #d6d1c6;
		border-radius: 3px;
	}
	.pista > .marca {
		top: -6px;
		height: calc(100% + 12px);
		width: 3px;
		margin-left: -1.5px;
		background: var(--ciruela);
		z-index: 1;
	}
	.pista > .punto {
		width: var(--h);
		margin-left: calc(var(--h) / -2);
		border-radius: 50%;
		background: var(--paja);
		box-sizing: border-box;
		border: 3px solid var(--negro);
		z-index: 2;
	}
	.oferta .pista > .punto {
		border-color: var(--claro);
	}
	.margen {
		position: absolute;
		bottom: 5px;
		height: 2px;
		background: var(--ciruela);
		opacity: 0.55;
		border-radius: 1px;
	}
</style>
