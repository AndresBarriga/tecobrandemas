<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import {
		EXTREMOS_TRAMO, HABITACION, TRAMO_TEXTO, calcularSuma, euros, interpretarNumero, numero, type DatosMadrid, type ResultadoSuma, type TramoPiso
	} from '#lib/resultado';
	import { cargarDatos } from '#lib/cliente/datos';

	let {
		precioMes, habitaciones, tramo, cusecs
	}: { precioMes: number; habitaciones: number; tramo: TramoPiso; cusecs: string[] } = $props();

	const S = HABITACION.suma;
	let datos = $state<DatosMadrid | null>(null);
	// Una fila por habitación del piso, con el precio de la tuya prellenado (editable)
	let precios = $state<string[]>(untrack(() => Array.from({ length: Math.max(1, habitaciones) }, () => numero(precioMes))));
	let metros = $state('');
	let resultado = $state<ResultadoSuma | null>(null);

	onMount(() => void cargarDatos().then((d) => (datos = d)).catch(() => {}));

	function calcular(e: SubmitEvent) {
		e.preventDefault();
		if (!datos) return;
		resultado = calcularSuma({
			precios: precios.map((p) => interpretarNumero(p) ?? NaN),
			tramo,
			metros: interpretarNumero(metros),
			cusecs,
			datos
		});
	}

	const error = $derived(
		resultado && !resultado.ok ? (resultado.error === 'precio' ? S.errorPrecio : resultado.error === 'metros' ? S.errorMetros : S.sinDato) : null
	);
	const extremosTexto = $derived(tramo !== 'nose' ? EXTREMOS_TRAMO[tramo] : null);
</script>

<section class="suma" aria-labelledby="suma-titulo">
	<h2 id="suma-titulo">{S.titulo}</h2>
	<p class="intro">{S.intro}</p>

	<form onsubmit={calcular} novalidate>
		<div class="filas">
			{#each precios as _, i (i)}
				<div class="campo-grupo">
					<label for="suma-hab-{i}">{S.habitacion(i + 1)}</label>
					<div class="campo">
						<input id="suma-hab-{i}" type="text" inputmode="numeric" autocomplete="off" bind:value={precios[i]} />
						<span class="sufijo">€ al mes</span>
					</div>
				</div>
			{/each}
		</div>

		{#if tramo === 'nose'}
			<div class="campo-grupo">
				<label for="suma-metros">{S.metros}</label>
				<div class="campo">
					<input id="suma-metros" type="text" inputmode="numeric" autocomplete="off" bind:value={metros} aria-describedby="suma-metros-ayuda" />
					<span class="sufijo">m²</span>
				</div>
				<p class="ayuda" id="suma-metros-ayuda">{S.metrosAyuda}</p>
			</div>
		{:else if extremosTexto}
			<p class="ayuda">{S.tramo(TRAMO_TEXTO[tramo], extremosTexto[0], extremosTexto[1])}</p>
		{/if}

		<button type="submit" class="boton boton-contorno" disabled={!datos}>{S.calcular}</button>
	</form>

	{#if error}<p class="error" role="alert">{error}</p>{/if}

	{#if resultado?.ok}
		<div class="resultado" role="status">
			<div class="cifra-suma">
				<span class="et">{S.suma}</span>
				<span class="cifra">{euros(resultado.suma)}</span>
				<span class="pie">al mes</span>
			</div>
			{#each resultado.lineas as l (l.metros)}
				<div class="linea">
					<p class="ref"><strong>{S.referencia(l.metros)}:</strong> {S.rango(numero(l.inf), euros(l.sup))}</p>
					<p class="dif">
						{#if l.diferencia > 0}{S.encima(euros(l.diferencia))}{:else if l.diferencia < 0}{S.debajo(euros(-l.diferencia))}{:else}{S.dentro}{/if}
					</p>
				</div>
			{/each}
			<div class="aclaraciones">
				<h3>{S.aclaracionesTitulo}</h3>
				<ul>
					{#each S.aclaraciones as a (a)}<li>{a}</li>{/each}
				</ul>
			</div>
		</div>
	{/if}
</section>

<style>
	.suma {
		background: var(--blanco);
		border-radius: var(--radio);
		padding: 24px 20px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		font: 400 16px/1.45 var(--f-texto);
	}
	h2 {
		font: 800 22px/1.2 var(--f-texto);
		text-wrap: balance;
	}
	.intro,
	.ayuda {
		color: var(--grafito);
		font-size: 14px;
	}
	form {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.filas {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.campo-grupo {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	label {
		font: 600 14px/1.3 var(--f-texto);
	}
	.campo {
		display: flex;
		align-items: center;
		height: 48px;
		padding: 0 14px;
		border: 1.5px solid var(--tinta);
		border-radius: var(--radio);
		background: var(--blanco);
	}
	.campo:focus-within {
		outline: 2px solid var(--tinta);
		outline-offset: 3px;
	}
	.campo input {
		flex: 1;
		min-width: 0;
		height: 100%;
		border: 0;
		outline: 0;
		background: transparent;
		font: 700 20px/1 var(--f-semi);
	}
	.sufijo {
		font: 500 15px/1 var(--f-texto);
		color: var(--grafito);
	}
	.error {
		color: var(--ciruela);
		font-weight: 500;
	}
	/* Sin colores de nivel: la comparación es neutra */
	.resultado {
		background: var(--superficie);
		border-radius: var(--radio);
		padding: 18px 16px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.cifra-suma {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.et {
		font: 500 15px/1.3 var(--f-texto);
	}
	.cifra {
		font: 900 clamp(48px, 14vw, 72px) / 0.95 var(--f-extra);
	}
	.pie {
		color: var(--grafito);
		font-size: 14px;
	}
	.linea {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.dif {
		font-weight: 600;
	}
	.aclaraciones h3 {
		font: 700 15px/1.3 var(--f-texto);
		margin-bottom: 6px;
	}
	.aclaraciones ul {
		margin: 0;
		padding-left: 18px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: 14px;
		color: var(--grafito);
	}
</style>
