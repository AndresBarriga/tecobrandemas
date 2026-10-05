<script lang="ts">
	import { SESION, type FilaHistorial } from '#lib/resultado';

	let {
		filas,
		activa,
		alElegir
	}: { filas: FilaHistorial[]; activa: number | null; alElegir: (i: number) => void } = $props();

	const color = { a: 'var(--salvia)', b: 'var(--acero)', c: 'var(--ciruela)' } as const;
</script>

{#if filas.length}
	<section class="historial" aria-labelledby="historial-titulo">
		<h2 id="historial-titulo">{SESION.titulo}</h2>
		<ul>
			{#each filas as fila, i (i)}
				<li>
					<button
						type="button"
						class="fila"
						class:activa={activa === i}
						aria-current={activa === i ? 'true' : undefined}
						onclick={() => alElegir(i)}
					>
						<span class="punto" style:background={fila.clase ? color[fila.clase] : 'var(--piedra)'}></span>
						<span class="datos">
							<span class="titulo">{fila.titulo}</span>
							<span class="detalle">{fila.detalle}</span>
						</span>
						<span class="resultado" style:color={fila.clase ? color[fila.clase] : 'var(--grafito)'}>{fila.etiqueta}</span>
					</button>
				</li>
			{/each}
		</ul>
		<p class="nota">{SESION.nota}</p>
	</section>
{/if}

<style>
	.historial {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	h2 {
		font: 700 15px/1.3 var(--f-texto);
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.fila {
		width: 100%;
		min-height: 56px;
		border: 0;
		background: var(--superficie);
		border-radius: var(--radio);
		padding: 8px 14px;
		display: flex;
		align-items: center;
		gap: 12px;
		text-align: left;
	}
	.fila.activa {
		outline: 2px solid var(--tinta);
		outline-offset: -2px;
	}
	.punto {
		flex: none;
		width: 12px;
		height: 12px;
		border-radius: 50%;
	}
	.datos {
		flex: 1;
		display: flex;
		flex-direction: column;
	}
	.titulo {
		font: 700 15px/1.3 var(--f-texto);
	}
	.detalle {
		font: 500 13px/1.3 var(--f-semi);
		color: var(--grafito);
	}
	.resultado {
		font: 700 15px/1 var(--f-semi);
	}
	.nota {
		font: 400 12.5px/1.4 var(--f-texto);
		color: var(--grafito);
	}
</style>
