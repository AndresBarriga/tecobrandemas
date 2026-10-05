<script lang="ts">
	import Segmentado from './Segmentado.svelte';
	import { NEGOCIAR, type PantallaResultado, type Tratamiento, textoNegociar } from '#lib/resultado';

	let { pantalla, alVolver }: { pantalla: PantallaResultado; alVolver: () => void } = $props();

	let tratamiento = $state<Tratamiento>('usted');
	// El texto se genera con las cifras del resultado; la persona puede editarlo
	let editado = $state<string | null>(null);
	const generado = $derived(textoNegociar(pantalla, tratamiento));
	const texto = $derived(editado ?? generado);
	let copiado = $state(false);

	function cambiarTratamiento(v: Tratamiento) {
		tratamiento = v;
		editado = null;
	}

	async function copiar() {
		try {
			await navigator.clipboard.writeText(texto);
		} catch {
			// Sin permiso de portapapeles: se selecciona el texto para copiarlo a mano
			(document.getElementById('mensaje') as HTMLTextAreaElement | null)?.select();
			return;
		}
		copiado = true;
		setTimeout(() => (copiado = false), 2500);
	}
</script>

<section class="negociar">
	<h1>{NEGOCIAR.titulo}</h1>
	<p class="intro">{NEGOCIAR.intro}</p>

	<div class="grupo">
		<span class="etiqueta" id="tratamiento">{NEGOCIAR.tratamiento}</span>
		<Segmentado
			opciones={[
				{ valor: 'tu' as const, etiqueta: NEGOCIAR.tu },
				{ valor: 'usted' as const, etiqueta: NEGOCIAR.usted }
			]}
			valor={tratamiento}
			nombre="tratamiento"
			etiqueta={NEGOCIAR.tratamiento}
			onchange={cambiarTratamiento}
		/>
	</div>

	<div class="grupo">
		<label class="etiqueta" for="mensaje">{NEGOCIAR.etiquetaMensaje}</label>
		<textarea id="mensaje" rows="22" value={texto} oninput={(e) => (editado = e.currentTarget.value)}></textarea>
	</div>

	<button type="button" class="boton" onclick={copiar}>
		{#if copiado}
			<svg width="22" height="22" viewBox="0 0 20 20" aria-hidden="true">
				<circle cx="10" cy="10" r="9" fill="var(--tinta)" />
				<path d="M5.5 10.2l3 3 6-6.4" stroke="var(--paja)" stroke-width="2" fill="none" />
			</svg>
			{NEGOCIAR.copiado}
		{:else}
			{NEGOCIAR.copiar}
		{/if}
	</button>
	<p class="aviso" role="status">{copiado ? NEGOCIAR.copiado : ''}</p>
	<p class="nota">{NEGOCIAR.nota}</p>
	<button type="button" class="enlace volver" onclick={alVolver}>{NEGOCIAR.volver}</button>
</section>

<style>
	.negociar {
		padding: 24px var(--margen) 0;
		display: flex;
		flex-direction: column;
		gap: 16px;
		width: 100%;
		max-width: 600px;
	}
	h1 {
		font: 800 60px/0.88 var(--f-extra);
		text-transform: uppercase;
	}
	.intro {
		font: 400 17px/1.5 var(--f-texto);
		text-wrap: pretty;
	}
	.grupo {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.etiqueta {
		font: 600 14px/1.3 var(--f-texto);
	}
	textarea {
		width: 100%;
		border: 1.5px solid var(--tinta);
		border-radius: var(--radio);
		background: var(--blanco);
		padding: 16px;
		font: 400 16px/1.5 var(--f-texto);
		resize: vertical;
		field-sizing: content;
	}
	.aviso {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
	}
	.nota {
		font: 400 13px/1.45 var(--f-texto);
		color: var(--grafito);
	}
	.volver {
		align-self: center;
		border: 0;
		background: none;
		padding: 0;
		text-decoration-color: var(--paja);
		text-decoration-thickness: 2px;
	}
</style>
