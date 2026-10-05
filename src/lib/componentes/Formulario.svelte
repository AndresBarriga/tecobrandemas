<script lang="ts">
	import type { Snippet } from 'svelte';
	import Segmentado from './Segmentado.svelte';
	import { ERRORES, FORMULARIO, type ErroresFormulario } from '#lib/resultado';
	import type { EstadoFormulario, ModoUbicacion } from '#lib/cliente/estado';

	export type Problema =
		| { tipo: 'no_encontrada'; sugerencias: string[] }
		| { tipo: 'pedir_numero'; calle: string; nSecciones: number };

	let {
		f = $bindable(),
		errores,
		buscando = false,
		comprobado = false,
		problema = null,
		mapa,
		alEnviar,
		alSalirDe,
		alHabitacion,
		alElegirSugerencia,
		alCambiarModo
	}: {
		f: EstadoFormulario;
		errores: ErroresFormulario & { direccion?: string; mapa?: string };
		buscando?: boolean;
		/** Ya hay un resultado en pantalla: el botón pasa a «Comprobar otro piso» */
		comprobado?: boolean;
		problema?: Problema | null;
		/** Mapa del modo «En el mapa» (carga diferida) */
		mapa?: Snippet;
		alEnviar: () => void;
		alSalirDe: (campo: 'precio' | 'superficie') => void;
		alHabitacion: () => void;
		alElegirSugerencia: (texto: string) => void;
		alCambiarModo: (modo: ModoUbicacion) => void;
	} = $props();

	const NB = ' ';
	const modos = [
		{ valor: 'direccion' as const, etiqueta: FORMULARIO.modos.direccion },
		{ valor: 'calle' as const, etiqueta: FORMULARIO.modos.calle },
		{ valor: 'mapa' as const, etiqueta: FORMULARIO.modos.mapa }
	];
	const sino = (si: string, no: string) => [
		{ valor: true, etiqueta: si },
		{ valor: false, etiqueta: no }
	];
	const etiquetaDireccion = $derived(f.modo === 'calle' ? FORMULARIO.etiquetaDireccion.calle : FORMULARIO.etiquetaDireccion.direccion);
	const placeholder = $derived(f.modo === 'calle' ? FORMULARIO.placeholderDireccion.calle : FORMULARIO.placeholderDireccion.direccion);
	const ayuda = $derived(f.modo === 'calle' ? FORMULARIO.ayudaDireccion.calle : FORMULARIO.ayudaDireccion.direccion);
</script>

<form
	class="formulario"
	novalidate
	onsubmit={(e) => {
		e.preventDefault();
		if (!buscando) alEnviar();
	}}
>
	<fieldset class="donde">
		<legend>{FORMULARIO.dondeEsta}</legend>
		<Segmentado opciones={modos} valor={f.modo} onchange={alCambiarModo} nombre="modo" etiqueta={FORMULARIO.dondeEsta} />
	</fieldset>

	{#if f.modo !== 'mapa'}
		<div class="campo-grupo">
			<label for="direccion">{etiquetaDireccion}</label>
			<div class="campo" class:error={!!errores.direccion} class:marcado={problema?.tipo === 'no_encontrada'}>
				<input
					id="direccion"
					type="text"
					bind:value={f.direccion}
					placeholder={placeholder}
					autocomplete="off"
					autocapitalize="sentences"
					spellcheck="false"
					aria-invalid={!!errores.direccion}
					aria-describedby={errores.direccion ? 'direccion-error' : 'direccion-ayuda'}
				/>
			</div>
			{#if errores.direccion}
				<p class="mensaje-error" id="direccion-error">{errores.direccion}</p>
			{:else if !problema}
				<p class="ayuda" id="direccion-ayuda">{ayuda}</p>
			{/if}
		</div>
	{:else if mapa}
		{@render mapa()}
		{#if errores.mapa}<p class="mensaje-error" role="alert">{errores.mapa}</p>{/if}
	{/if}

	{#if problema}
		<div class="problema" role="alert">
			<div class="problema-texto">
				<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" style="flex: none; margin-top: 1px">
					<circle cx="10" cy="10" r="8.5" stroke="var(--tinta)" stroke-width="1.5" fill="none" />
					<path d="M10 9v5M10 6v.5" stroke="var(--tinta)" stroke-width="2" />
				</svg>
				{#if problema.tipo === 'no_encontrada'}
					<p>{ERRORES.noEncontrada.titulo} {ERRORES.noEncontrada.texto}</p>
				{:else}
					{@const t = ERRORES.pedirNumero(problema.calle, problema.nSecciones)}
					<p>{t.titulo} {t.texto}</p>
				{/if}
			</div>
			{#if problema.tipo === 'no_encontrada' && problema.sugerencias.length}
				<div class="sugerencias" role="group" aria-labelledby="quedecir">
					<span class="sugerencia-etiqueta" id="quedecir">{ERRORES.noEncontrada.queriasDecir}</span>
					{#each problema.sugerencias as s (s)}
						<button type="button" class="sugerencia" onclick={() => alElegirSugerencia(s)}>{s}</button>
					{/each}
				</div>
			{/if}
			<span class="otra-forma">{ERRORES.noEncontrada.otraForma}</span>
			<div class="salidas">
				{#if f.modo !== 'calle' && problema.tipo === 'no_encontrada'}
					<button type="button" class="boton boton-contorno" onclick={() => alCambiarModo('calle')}>{ERRORES.noEncontrada.soloCalle}</button>
				{:else}
					<button type="button" class="boton boton-contorno" onclick={() => alCambiarModo('direccion')}>{FORMULARIO.modos.direccion}</button>
				{/if}
				<button type="button" class="boton boton-contorno" onclick={() => alCambiarModo('mapa')}>{ERRORES.noEncontrada.enMapa}</button>
			</div>
		</div>
	{/if}

	<div class="par">
		<div class="campo-grupo">
			<label for="precio">{FORMULARIO.precio}</label>
			<div class="campo numerico" class:error={!!errores.precio}>
				<input
					id="precio"
					type="text"
					inputmode="numeric"
					autocomplete="off"
					bind:value={f.precio}
					onblur={() => alSalirDe('precio')}
					aria-invalid={!!errores.precio}
					aria-describedby={errores.precio ? 'precio-error' : undefined}
				/>
				<span class="sufijo">€</span>
			</div>
		</div>
		<div class="campo-grupo">
			<label for="superficie">{FORMULARIO.superficie}</label>
			<div class="campo numerico" class:error={!!errores.superficie}>
				<input
					id="superficie"
					type="text"
					inputmode="numeric"
					autocomplete="off"
					bind:value={f.superficie}
					onblur={() => alSalirDe('superficie')}
					aria-invalid={!!errores.superficie}
					aria-describedby={errores.superficie ? 'superficie-error' : undefined}
				/>
				<span class="sufijo">m²</span>
			</div>
		</div>
	</div>
	{#if errores.precio}<p class="mensaje-error" id="precio-error">{errores.precio}</p>{/if}
	{#if errores.superficie}<p class="mensaje-error" id="superficie-error">{errores.superficie}</p>{/if}

	<div class="preguntas">
		<div class="pregunta">
			<span id="p-obra">{FORMULARIO.obraNueva}</span>
			<Segmentado opciones={sino('Sí', 'No')} bind:valor={f.obraNueva} nombre="obra" etiqueta={FORMULARIO.obraNueva} ancho="fijo" />
		</div>
		<div class="pregunta">
			<span>{FORMULARIO.largaDuracion}</span>
			<Segmentado opciones={sino('Sí', 'No')} bind:valor={f.largaDuracion} nombre="larga" etiqueta={FORMULARIO.largaDuracion} ancho="fijo" />
		</div>
		<div class="pregunta">
			<span>{FORMULARIO.tipo}</span>
			<Segmentado
				opciones={[
					{ valor: 'piso' as const, etiqueta: 'Piso' },
					{ valor: 'casa' as const, etiqueta: 'Casa' }
				]}
				bind:valor={f.tipo}
				nombre="tipo"
				etiqueta={FORMULARIO.tipo}
				ancho="fijo"
			/>
		</div>
	</div>

	<div class="enviar">
		<button type="submit" class="boton" disabled={buscando} aria-busy={buscando}>
			{#if buscando}
				<span class="spinner" aria-hidden="true"></span>{FORMULARIO.buscando}
			{:else}
				{comprobado ? FORMULARIO.comprobarOtro : FORMULARIO.comprobar}
			{/if}
		</button>
		<button type="button" class="enlace habitacion" onclick={alHabitacion}>{FORMULARIO.habitacion}</button>
	</div>
</form>

<style>
	.formulario {
		background: var(--blanco);
		border-radius: var(--radio);
		padding: 20px 16px;
		display: flex;
		flex-direction: column;
		gap: 22px;
	}
	fieldset {
		border: 0;
		padding: 0;
		margin: 0;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	legend {
		font: 700 15px/1.3 var(--f-texto);
		padding: 0;
		margin-bottom: 8px;
	}
	.donde :global(.seg) {
		min-height: 48px;
	}
	.donde :global(label) {
		min-height: 48px;
	}
	.campo-grupo {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}
	label {
		font: 600 14px/1.3 var(--f-texto);
	}
	.campo {
		display: flex;
		align-items: center;
		height: 52px;
		padding: 0 14px;
		border: 1.5px solid var(--tinta);
		border-radius: var(--radio);
		background: var(--blanco);
	}
	.campo:focus-within {
		outline: 2px solid var(--tinta);
		outline-offset: 3px;
	}
	.campo.error {
		border: 2px solid var(--ciruela);
	}
	.campo.marcado {
		border-width: 2px;
	}
	.campo input {
		flex: 1;
		min-width: 0;
		height: 100%;
		border: 0;
		outline: 0;
		background: transparent;
		padding: 0;
		font: 500 17px/1 var(--f-texto);
	}
	.campo input::placeholder {
		color: var(--grafito);
		opacity: 1;
	}
	.campo.numerico input {
		font: 700 22px/1 var(--f-semi);
	}
	.sufijo {
		font: 500 15px/1 var(--f-texto);
		color: var(--grafito);
	}
	.ayuda {
		font: 400 13px/1.4 var(--f-texto);
		color: var(--grafito);
	}
	.mensaje-error {
		font: 500 14px/1.4 var(--f-texto);
		color: var(--ciruela);
	}
	.par {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	.preguntas {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.pregunta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		font: 500 15px/1.3 var(--f-texto);
	}
	.enviar {
		display: flex;
		flex-direction: column;
		gap: 4px;
		align-items: center;
	}
	.habitacion {
		border: 0;
		background: none;
		padding: 0;
		font-weight: 500;
		text-decoration-color: var(--tinta);
	}
	.spinner {
		width: 18px;
		height: 18px;
		border: 2.5px solid var(--grafito);
		border-top-color: transparent;
		border-radius: 50%;
		animation: gira 0.8s linear infinite;
	}
	@keyframes gira {
		to {
			transform: rotate(360deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation-duration: 2.4s;
		}
	}
	/* Problema con la dirección */
	.problema {
		background: var(--superficie);
		border-radius: var(--radio);
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.problema-texto {
		display: flex;
		gap: 10px;
		align-items: flex-start;
		font: 400 15px/1.45 var(--f-texto);
	}
	.sugerencias {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.sugerencia {
		min-height: 48px;
		width: 100%;
		border: 0;
		background: var(--blanco);
		border-radius: var(--radio);
		padding: 8px 14px;
		text-align: left;
		font: 700 16px/1.3 var(--f-texto);
	}
	.sugerencia-etiqueta {
		font: 500 13px/1.3 var(--f-texto);
		color: var(--grafito);
	}
	.otra-forma {
		font: 600 14px/1.3 var(--f-texto);
	}
	.salidas {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
	.salidas :global(.boton) {
		padding: 10px 14px;
		line-height: 1.3;
	}
	@media (min-width: 1024px) {
		.formulario {
			padding: 20px;
			gap: 18px;
		}
		.campo {
			height: 48px;
		}
		.campo input {
			font-size: 16px;
		}
		.campo.numerico input {
			font-size: 20px;
		}
		.donde :global(.seg),
		.donde :global(label) {
			min-height: 44px;
		}
		.pregunta {
			gap: 12px;
		}
		.preguntas {
			gap: 10px;
		}
		.enviar :global(.boton) {
			min-height: 52px;
		}
	}
</style>
