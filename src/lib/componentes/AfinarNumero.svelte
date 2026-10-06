<script lang="ts">
	import { AFINAR } from '#lib/resultado';

	/** Devuelve un mensaje de error, o null si el resultado se ha recalculado */
	let { alAfinar }: { alAfinar: (numero: string) => Promise<string | null> } = $props();

	let numero = $state('');
	let enviando = $state(false);
	let error = $state<string | null>(null);

	async function enviar(e: SubmitEvent) {
		e.preventDefault();
		if (enviando) return;
		enviando = true;
		error = await alAfinar(numero);
		enviando = false;
		if (!error) numero = '';
	}
</script>

<form class="afinar" onsubmit={enviar} novalidate>
	<label for="afinar-numero">{AFINAR.etiqueta}</label>
	<div class="fila">
		<input
			id="afinar-numero"
			type="text"
			inputmode="numeric"
			autocomplete="off"
			placeholder={AFINAR.placeholder}
			bind:value={numero}
			aria-invalid={!!error}
			aria-describedby={error ? 'afinar-error' : undefined}
		/>
		<button type="submit" class="boton boton-contorno" disabled={enviando || !numero.trim()} aria-busy={enviando}>{enviando ? AFINAR.afinando : AFINAR.boton}</button>
	</div>
	{#if error}<p class="error" id="afinar-error" role="alert">{error}</p>{/if}
</form>

<style>
	.afinar {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	label {
		font: 700 15px/1.3 var(--f-texto);
	}
	.fila {
		display: flex;
		gap: 8px;
	}
	input {
		flex: 1;
		min-width: 0;
		height: 48px;
		padding: 0 14px;
		border: 1.5px solid var(--tinta);
		border-radius: var(--radio);
		background: var(--blanco);
		font: 500 17px/1 var(--f-texto);
	}
	input:focus-visible {
		outline: 2px solid var(--tinta);
		outline-offset: 3px;
	}
	.fila :global(.boton) {
		width: auto;
		min-height: 48px;
		padding: 0 18px;
	}
	.error {
		font: 500 14px/1.4 var(--f-texto);
		color: var(--ciruela);
	}
</style>
