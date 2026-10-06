<script lang="ts" generics="T extends string | boolean">
	/** Control segmentado accesible (radiogroup). Zonas táctiles de 44 px como mínimo. */
	interface Opcion {
		valor: T;
		etiqueta: string;
	}
	let {
		opciones,
		valor = $bindable(),
		nombre,
		etiqueta,
		ancho = 'completo',
		onchange
	}: {
		opciones: Opcion[];
		valor: T;
		nombre: string;
		/** Texto accesible del grupo si no hay otra etiqueta visible */
		etiqueta: string;
		ancho?: 'completo' | 'fijo';
		onchange?: (v: T) => void;
	} = $props();
</script>

<div class="seg" class:fijo={ancho === 'fijo'} role="radiogroup" aria-label={etiqueta}>
	{#each opciones as o (String(o.valor))}
		<label class:activo={valor === o.valor}>
			<input type="radio" name={nombre} checked={valor === o.valor} onchange={() => {
					valor = o.valor;
					onchange?.(o.valor);
				}} />
			<span>{o.etiqueta}</span>
		</label>
	{/each}
</div>

<style>
	.seg {
		display: flex;
		border: 1.5px solid var(--tinta);
		border-radius: var(--radio);
		background: var(--blanco);
		overflow: hidden;
		min-height: 44px;
	}
	.seg.fijo {
		flex: none;
		width: 112px;
	}
	label {
		position: relative;
		flex: 1 1 0;
		min-width: 0;
		padding: 0 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		cursor: pointer;
		font: 600 14px/1.1 var(--f-texto);
		text-align: center;
	}
	label.activo {
		background: var(--tinta);
		color: var(--papel);
		font-weight: 800;
	}
	input {
		position: absolute;
		inset: 0;
		opacity: 0;
		margin: 0;
		cursor: pointer;
	}
	label:has(input:focus-visible) {
		outline: 2px solid var(--tinta);
		outline-offset: 3px;
	}
	.fijo label {
		font-size: 15px;
	}
</style>
