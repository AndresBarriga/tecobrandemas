<script lang="ts">
	import { AUTOCOMPLETAR, FORMULARIO, sugerir, type Parte, type SugerenciaVia, type SugerenciaZona, type Sugerencias } from '#lib/resultado';
	import { cargarSugeridor, type Sugeridor } from '#lib/cliente/vias';

	type Modo = 'direccion' | 'calle' | 'mapa';

	let {
		valor = $bindable(),
		modo,
		error,
		marcado = false,
		ocultarAyuda = false,
		alElegirVia,
		alElegirZona,
		alCambiarModo
	}: {
		valor: string;
		modo: Modo;
		error?: string;
		marcado?: boolean;
		/** Con un problema en pantalla, la ayuda se oculta */
		ocultarAyuda?: boolean;
		alElegirVia: (texto: string) => void;
		alElegirZona: (zona: SugerenciaZona) => void;
		alCambiarModo: (modo: Modo) => void;
	} = $props();

	const etiqueta = $derived(modo === 'calle' ? FORMULARIO.etiquetaDireccion.calle : FORMULARIO.etiquetaDireccion.direccion);
	const placeholder = $derived(modo === 'calle' ? FORMULARIO.placeholderDireccion.calle : FORMULARIO.placeholderDireccion.direccion);
	const ayuda = $derived(modo === 'calle' ? FORMULARIO.ayudaDireccion.calle : FORMULARIO.ayudaDireccion.direccion);

	let raiz: HTMLDivElement | undefined = $state();
	let sugeridor = $state<Sugeridor | null>(null);
	let abierto = $state(false);
	let activo = $state(-1);

	// Las sugerencias se calculan en el navegador con lo escrito; nada de esto se envía
	const sugerencias = $derived<Sugerencias | null>(
		sugeridor && valor.trim().length >= 2 ? sugerir(sugeridor.indice, sugeridor.zonas, valor) : null
	);
	type Opcion = SugerenciaVia | SugerenciaZona;
	const opciones = $derived<Opcion[]>(
		sugerencias?.tipo === 'vias'
			? sugerencias.vias
			: sugerencias?.tipo === 'zonas'
				? sugerencias.zonas
				: sugerencias?.tipo === 'mixto'
					? [...sugerencias.zonas, ...sugerencias.vias]
					: []
	);
	const visible = $derived(abierto && sugerencias !== null);

	const anuncio = $derived(
		!visible || !sugerencias
			? ''
			: sugerencias.tipo === 'vias' || sugerencias.tipo === 'mixto'
				? `${AUTOCOMPLETAR.anuncio.vias(opciones.length)}. ${AUTOCOMPLETAR.anuncio.uso}`
				: sugerencias.tipo === 'zonas'
					? `${AUTOCOMPLETAR.anuncio.zonas(sugerencias.zonas.length)}. ${AUTOCOMPLETAR.anuncio.uso}`
					: AUTOCOMPLETAR.anuncio.nada
	);

	function enfocar() {
		abierto = true;
		// El índice (≈75 kB comprimido) se pide al enfocar, no antes
		if (!sugeridor) void cargarSugeridor().then((s) => (sugeridor = s)).catch(() => {});
	}

	function alEscribir() {
		abierto = true;
		activo = -1;
	}

	/** Conserva el número del portal que ya se había escrito: «calle alcala 14» → «Calle Alcala, 14» */
	function elegirVia(nombre: string) {
		const numero = valor.match(/(\d+\s*[a-zA-Z]?)\s*$/)?.[1]?.trim();
		valor = modo === 'direccion' ? (numero ? `${nombre}, ${numero}` : `${nombre} `) : nombre;
		abierto = false;
		activo = -1;
		alElegirVia(valor);
	}

	function elegir(i: number) {
		const o = opciones[i];
		if (!o) return;
		if (o.clase === 'via') elegirVia(o.nombre);
		else {
			abierto = false;
			activo = -1;
			alElegirZona(o);
		}
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
		} else if (e.key === 'Enter' && activo >= 0) {
			// Elegir una sugerencia no envía el formulario
			e.preventDefault();
			elegir(activo);
		}
	}

	function alSalir(e: FocusEvent) {
		if (!raiz?.contains(e.relatedTarget as Node | null)) {
			abierto = false;
			activo = -1;
		}
	}

	const nombreZona = (z: SugerenciaZona) => `${z.alias ? `${z.alias} → ` : ''}${z.nombre}`;
</script>

{#snippet marcas(partes: Parte[])}
	{#each partes as p, i (i)}{#if p.coincide}<mark>{p.texto}</mark>{:else}{p.texto}{/if}{/each}
{/snippet}

<div class="campo-grupo" bind:this={raiz} onfocusout={alSalir}>
	<label for="direccion">{etiqueta}</label>
	<div class="campo" class:error={!!error} class:marcado>
		<input
			id="direccion"
			type="text"
			role="combobox"
			bind:value={valor}
			{placeholder}
			autocomplete="off"
			autocapitalize="sentences"
			spellcheck="false"
			aria-autocomplete="list"
			aria-expanded={visible && opciones.length > 0}
			aria-controls="direccion-lista"
			aria-activedescendant={visible && activo >= 0 ? `direccion-op-${activo}` : undefined}
			aria-invalid={!!error}
			aria-describedby={error ? 'direccion-error' : 'direccion-ayuda'}
			onfocus={enfocar}
			oninput={alEscribir}
			onkeydown={alTeclear}
		/>
	</div>

	{#if visible && sugerencias}
		{#if sugerencias.tipo === 'nada'}
			<div class="vacio">
				<p class="vacio-titulo">{AUTOCOMPLETAR.vacio.titulo}</p>
				<p class="vacio-texto">{AUTOCOMPLETAR.vacio.texto}</p>
				<div class="salidas">
					{#if modo !== 'calle'}
						<button type="button" class="boton boton-contorno" onclick={() => alCambiarModo('calle')}>{FORMULARIO.modos.calle}</button>
					{/if}
					<button type="button" class="boton boton-contorno" onclick={() => alCambiarModo('mapa')}>{FORMULARIO.modos.mapa}</button>
				</div>
			</div>
		{:else}
			<ul class="lista" id="direccion-lista" role="listbox" aria-label={AUTOCOMPLETAR.lista}>
				{#each opciones as o, i (o.clase === 'via' ? o.nombre : `${o.clase}${o.codigo}`)}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<li
						id="direccion-op-{i}"
						role="option"
						aria-selected={i === activo}
						aria-label={o.clase === 'via' ? undefined : `${nombreZona(o)} (${AUTOCOMPLETAR.zona[o.clase]} · ${o.distrito}): ${AUTOCOMPLETAR.zona.pista}`}
						class:activa={i === activo}
						onmousedown={(e) => e.preventDefault()}
						onclick={() => elegir(i)}
					>
						{#if o.clase === 'via'}
							<span class="nombre">{@render marcas(o.partes)}</span>
							{#if sugeridor?.barrios[o.barrio]}<span class="barrio">{sugeridor.barrios[o.barrio]}</span>{/if}
						{:else}
							<span class="nombre">{#if o.alias}{@render marcas(o.partes)} → {o.nombre}{:else}{@render marcas(o.partes)}{/if}</span>
							<span class="barrio">({AUTOCOMPLETAR.zona[o.clase]} · {o.distrito}): {AUTOCOMPLETAR.zona.pista}</span>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
	<p class="solo-lectores" role="status" aria-live="polite">{anuncio}</p>

	{#if error}
		<p class="mensaje-error" id="direccion-error">{error}</p>
	{:else if !ocultarAyuda}
		<p class="ayuda" id="direccion-ayuda">{ayuda}</p>
	{/if}
</div>

<style>
	.campo-grupo {
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
	.ayuda {
		font: 400 13px/1.4 var(--f-texto);
		color: var(--grafito);
	}
	.mensaje-error {
		font: 500 14px/1.4 var(--f-texto);
		color: var(--ciruela);
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
	/* Lo coincidente, con el subrayado de Paja */
	mark {
		background: none;
		color: inherit;
		box-shadow: inset 0 -0.38em var(--paja);
	}
	.vacio {
		display: flex;
		flex-direction: column;
		gap: 8px;
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
	.salidas {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	@media (min-width: 480px) {
		.salidas {
			flex-direction: row;
		}
	}
	.solo-lectores {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
