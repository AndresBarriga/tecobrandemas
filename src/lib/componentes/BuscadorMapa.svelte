<script lang="ts">
	import { AUTOCOMPLETAR, MAPA_REFERENCIA as T, sugerir, type Parte, type SugerenciaVia, type SugerenciaZona, type Sugerencias } from '#lib/resultado';
	import { cargarSugeridor, type Sugeridor } from '#lib/cliente/vias';

	/**
	 * Buscador de barrio o calle del mapa. Todo en el navegador: lo que se escribe no se envía. Una calle
	 * lleva al barrio donde tiene más zonas; un barrio, con sus nombres populares («Malasaña»), a él.
	 */
	let { alElegirZona, alElegirVia, alVaciar, mensaje = null }: {
		alElegirZona: (z: SugerenciaZona) => void;
		alElegirVia: (v: SugerenciaVia) => void;
		/** El campo se ha vaciado: ya no hay búsqueda a la que acompañar */
		alVaciar: () => void;
		/** Lo último que se eligió, bajo el campo */
		mensaje?: string | null;
	} = $props();

	let valor = $state('');
	let raiz: HTMLDivElement | undefined = $state();
	let sugeridor = $state<Sugeridor | null>(null);
	let abierto = $state(false);
	let activo = $state(-1);

	const sugerencias = $derived<Sugerencias | null>(
		sugeridor && valor.trim().length >= 2 ? sugerir(sugeridor.indice, sugeridor.zonas, valor) : null
	);
	type Opcion = SugerenciaVia | SugerenciaZona;
	const opciones = $derived<Opcion[]>(
		sugerencias?.tipo === 'vias' ? sugerencias.vias
			: sugerencias?.tipo === 'zonas' ? sugerencias.zonas
				: sugerencias?.tipo === 'mixto' ? [...sugerencias.zonas, ...sugerencias.vias]
					: []
	);
	const visible = $derived(abierto && sugerencias !== null);

	function enfocar() {
		abierto = true;
		if (!sugeridor) void cargarSugeridor().then((s) => (sugeridor = s)).catch(() => {});
	}

	function elegir(i: number) {
		const o = opciones[i];
		if (!o) return;
		abierto = false;
		activo = -1;
		valor = o.clase === 'via' ? o.nombre : o.alias ?? o.nombre;
		if (o.clase === 'via') alElegirVia(o);
		else alElegirZona(o);
	}

	function alTeclear(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (visible) {
				abierto = false;
				e.preventDefault();
			}
			return;
		}
		if (!visible || !opciones.length) return;
		if (e.key === 'ArrowDown') {
			activo = (activo + 1) % opciones.length;
			e.preventDefault();
		} else if (e.key === 'ArrowUp') {
			activo = activo <= 0 ? opciones.length - 1 : activo - 1;
			e.preventDefault();
		} else if (e.key === 'Enter') {
			e.preventDefault();
			elegir(activo >= 0 ? activo : 0);
		}
	}

	function alSalir(e: FocusEvent) {
		if (!raiz?.contains(e.relatedTarget as Node | null)) {
			abierto = false;
			activo = -1;
		}
	}

	const nombreZona = (z: SugerenciaZona) => `${z.alias ? `${z.alias} → ` : ''}${z.nombre}`;
	const anuncio = $derived(
		!visible || !sugerencias ? '' : sugerencias.tipo === 'nada' ? T.buscador.sinResultados : AUTOCOMPLETAR.anuncio.vias(opciones.length)
	);
</script>

{#snippet marcas(partes: Parte[])}
	{#each partes as p, i (i)}{#if p.coincide}<mark>{p.texto}</mark>{:else}{p.texto}{/if}{/each}
{/snippet}

<div class="grupo" bind:this={raiz} onfocusout={alSalir}>
	<label for="buscador-mapa">{T.buscador.etiqueta}</label>
	<div class="campo">
		<input
			id="buscador-mapa"
			type="text"
			role="combobox"
			bind:value={valor}
			placeholder={T.buscador.placeholder}
			autocomplete="off"
			autocapitalize="sentences"
			spellcheck="false"
			aria-autocomplete="list"
			aria-expanded={visible && opciones.length > 0}
			aria-controls="buscador-mapa-lista"
			aria-activedescendant={visible && activo >= 0 ? `buscador-mapa-op-${activo}` : undefined}
			onfocus={enfocar}
			oninput={() => {
				abierto = true;
				activo = -1;
				if (valor.trim() === '') alVaciar();
			}}
			onkeydown={alTeclear}
		/>
	</div>

	{#if visible && sugerencias}
		{#if sugerencias.tipo === 'nada'}
			<div class="vacio" role="status">
				<p class="vacio-titulo">{T.buscador.sinResultados}</p>
				<p class="vacio-texto">{T.buscador.sinResultadosTexto}</p>
			</div>
		{:else}
			<ul class="lista" id="buscador-mapa-lista" role="listbox" aria-label={T.buscador.lista}>
				{#each opciones as o, i (o.clase === 'via' ? `v${o.nombre}` : `${o.clase}${o.codigo}`)}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<li
						id="buscador-mapa-op-{i}"
						role="option"
						aria-selected={i === activo}
						class:activa={i === activo}
						onmousedown={(e) => e.preventDefault()}
						onclick={() => elegir(i)}
					>
						{#if o.clase === 'via'}
							<span class="nombre">{@render marcas(o.partes)}</span>
							{#if sugeridor?.barrios[o.barrio]}<span class="barrio">{sugeridor.barrios[o.barrio]}</span>{/if}
						{:else}
							<span class="nombre">{#if o.alias}{@render marcas(o.partes)} → {o.nombre}{:else}{@render marcas(o.partes)}{/if}</span>
							<span class="barrio">{AUTOCOMPLETAR.zona[o.clase]} · {o.distrito}</span>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
	<p class="solo-lectores" role="status" aria-live="polite">{anuncio}</p>
	{#if mensaje}<p class="mensaje">{mensaje}</p>{/if}
</div>

<style>
	.grupo {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
		position: relative;
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
	input {
		flex: 1;
		min-width: 0;
		height: 100%;
		border: 0;
		outline: 0;
		background: transparent;
		padding: 0;
		font: 500 16px/1 var(--f-texto);
	}
	input::placeholder {
		color: var(--grafito);
		opacity: 1;
	}
	.lista {
		list-style: none;
		margin: 0;
		padding: 0;
		border: 1.5px solid var(--tinta);
		border-radius: var(--radio);
		background: var(--blanco);
		overflow: hidden;
	}
	.lista li {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-height: 44px;
		padding: 8px 14px;
		cursor: pointer;
		border-bottom: 1px solid var(--pista);
	}
	.lista li:last-child {
		border-bottom: 0;
	}
	.lista li.activa {
		outline: 2px solid var(--tinta);
		outline-offset: -2px;
	}
	.nombre {
		font: 700 16px/1.3 var(--f-texto);
	}
	.barrio {
		font: 400 14px/1.3 var(--f-texto);
		color: var(--grafito);
	}
	mark {
		background: none;
		color: inherit;
		box-shadow: inset 0 -0.38em var(--paja);
	}
	.vacio {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 14px;
		border: 1.5px solid var(--tinta);
		border-radius: var(--radio);
		background: var(--blanco);
	}
	.vacio-titulo {
		font: 700 16px/1.3 var(--f-texto);
	}
	.vacio-texto {
		font: 400 14px/1.4 var(--f-texto);
		color: var(--grafito);
	}
	.mensaje {
		font: 500 14px/1.4 var(--f-texto);
		color: var(--grafito);
	}
</style>
