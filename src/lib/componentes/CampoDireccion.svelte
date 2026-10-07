<script lang="ts">
	import { tick } from 'svelte';
	import {
		AUTOCOMPLETAR, FORMULARIO, buscarPortal, interpretarPortal, separarNumeroFinal, sugerir,
		type GrupoPortales, type Parte, type PortalHallado, type SugerenciaVia, type SugerenciaZona, type Sugerencias
	} from '#lib/resultado';
	import { cargarPortales, cargarSugeridor, type Sugeridor } from '#lib/cliente/vias';

	let {
		valor = $bindable(),
		via = $bindable(),
		numero = $bindable(),
		error,
		errorNumero,
		marcado = false,
		ocultarAyuda = false,
		alElegirZona,
		alCambiarModo,
		alTeclear: alTecleo
	}: {
		/** Lo escrito en «Calle» mientras no haya una calle elegida */
		valor: string;
		/** La calle elegida de las sugerencias (nombre oficial) */
		via: string | null;
		/** Número del portal, opcional */
		numero: string;
		error?: string;
		errorNumero?: string;
		marcado?: boolean;
		/** Con un problema en pantalla, la ayuda se oculta */
		ocultarAyuda?: boolean;
		alElegirZona: (zona: SugerenciaZona) => void;
		alCambiarModo: (modo: 'calle' | 'mapa') => void;
		/** Se ha escrito en el campo (para quitar avisos de la ubicación anterior) */
		alTeclear?: () => void;
	} = $props();

	const T = FORMULARIO.calle;

	let raiz: HTMLDivElement | undefined = $state();
	let entrada: HTMLInputElement | undefined = $state();
	let lista: HTMLUListElement | undefined = $state();
	let sugeridor = $state<Sugeridor | null>(null);
	let portales = $state<Record<string, GrupoPortales[]> | null>(null);
	let abierto = $state(false);
	let activo = $state(-1);
	let alturaLista = $state(320);

	// Las sugerencias se calculan en el navegador con lo escrito; nada de esto se envía
	const sugerencias = $derived<Sugerencias | null>(
		!via && sugeridor && valor.trim().length >= 2 ? sugerir(sugeridor.indice, sugeridor.zonas, valor) : null
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
	const visible = $derived(!via && abierto && sugerencias !== null);

	// El número que ya se ha escrito: al final de la calle («Robledal 32») o en «Nº»
	const escrito = $derived(separarNumeroFinal(valor));
	const numeroPortal = $derived(interpretarPortal(escrito?.numero ?? numero));
	// El fichero de portales (≈135 kB) se pide al escribir el primer número, no antes
	$effect(() => {
		if (numeroPortal && !portales) void cargarPortales().then((p) => (portales = p)).catch(() => {});
	});
	const portalDe = (nombre: string): PortalHallado | null => {
		const grupos = portales?.[nombre];
		return numeroPortal && grupos ? buscarPortal(grupos, numeroPortal.numero) : null;
	};
	const nombreBarrio = (codigo: string) => sugeridor?.barrios[codigo] ?? '';

	/** Texto de una calle sugerida: con el número escrito, la dirección completa o lo más cercano */
	function detalleVia(o: SugerenciaVia) {
		const p = portalDe(o.nombre);
		const n = numeroPortal ? `${numeroPortal.numero}${numeroPortal.letra ? ` ${numeroPortal.letra}` : ''}` : '';
		if (p?.existe) return { nombre: `, ${n}`, nota: null, sub: AUTOCOMPLETAR.con.barrioCp(nombreBarrio(p.barrio), p.cp) };
		if (p) return { nombre: '', nota: AUTOCOMPLETAR.con.sinPortal(n, String(p.numero)), sub: AUTOCOMPLETAR.con.barrioCp(nombreBarrio(p.barrio), p.cp) };
		return { nombre: '', nota: null, sub: AUTOCOMPLETAR.con.barrioCp(nombreBarrio(o.barrio), o.cp) };
	}

	/** Línea de confirmación: la calle fijada con su barrio y código postal, y el portal si lo hay */
	const confirmacion = $derived.by(() => {
		if (!via) return null;
		const n = numero.trim();
		if (!n) return T.entera;
		const nombre = via;
		const p = numeroPortal ? portalDe(via) : null;
		if (!p) return `${nombre} ${n}`;
		return p.existe
			? T.portal(nombre, n, nombreBarrio(p.barrio), p.cp)
			: T.portalAprox(nombre, n, String(p.numero), nombreBarrio(p.barrio), p.cp);
	});

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
		// El índice (≈80 kB comprimido) se pide al enfocar, no antes
		if (!sugeridor) void cargarSugeridor().then((s) => (sugeridor = s)).catch(() => {});
	}

	function alEscribir() {
		alTecleo?.();
		abierto = true;
		activo = -1;
	}

	/** Fija la calle (chip con ×), conserva el número que se había escrito y pasa el foco a «Nº» */
	async function elegirVia(nombre: string) {
		const delTexto = separarNumeroFinal(valor)?.numero;
		if (delTexto) numero = delTexto;
		via = nombre;
		valor = '';
		abierto = false;
		activo = -1;
		await tick();
		document.getElementById('numero')?.focus();
	}

	async function quitarVia() {
		valor = via ?? '';
		via = null;
		abierto = false;
		await tick();
		entrada?.focus();
	}

	function elegir(i: number) {
		const o = opciones[i];
		if (!o) return;
		if (o.clase === 'via') void elegirVia(o.nombre);
		else {
			abierto = false;
			activo = -1;
			alElegirZona(o);
		}
	}

	/** «Robledal 32» escrito a mano: el número pasa a «Nº» (si está vacío) */
	function separarNumero() {
		const d = separarNumeroFinal(valor);
		if (d && !numero.trim()) {
			valor = d.calle;
			numero = d.numero;
		}
	}

	function alTeclearCalle(e: KeyboardEvent) {
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
			if (!via) separarNumero();
		}
	}

	const nombreZona = (z: SugerenciaZona) => `${z.alias ? `${z.alias} → ` : ''}${z.nombre}`;

	// ——— El desplegable no queda tapado por el teclado: scroll interno y a la vista ———
	// La altura disponible es la del área visible (visualViewport) bajo el campo; si es poca, la página sube.
	function ajustarLista() {
		if (!lista) return;
		const vv = window.visualViewport;
		const alto = vv?.height ?? window.innerHeight;
		const arriba = vv?.offsetTop ?? 0;
		let hueco = alto - (lista.getBoundingClientRect().top - arriba) - 12;
		if (hueco < 190) {
			const desplazar = lista.getBoundingClientRect().top - arriba - Math.min(120, alto * 0.3);
			window.scrollBy({ top: desplazar, behavior: 'instant' });
			hueco = alto - (lista.getBoundingClientRect().top - arriba) - 12;
		}
		alturaLista = Math.max(150, Math.min(360, hueco));
	}
	$effect(() => {
		if (!visible || !lista) return;
		void opciones.length;
		requestAnimationFrame(ajustarLista);
		const vv = window.visualViewport;
		vv?.addEventListener('resize', ajustarLista);
		vv?.addEventListener('scroll', ajustarLista);
		return () => {
			vv?.removeEventListener('resize', ajustarLista);
			vv?.removeEventListener('scroll', ajustarLista);
		};
	});
</script>

{#snippet marcas(partes: Parte[])}
	{#each partes as p, i (i)}{#if p.coincide}<mark>{p.texto}</mark>{:else}{p.texto}{/if}{/each}
{/snippet}

<div class="campo-grupo" bind:this={raiz} onfocusout={alSalir}>
	<div class="fila">
		<div class="columna">
			<label for="direccion">{T.etiqueta}</label>
			{#if via}
				<div class="campo fijada" class:marcado>
					<span class="chip-calle" id="direccion" role="group" aria-label={T.fijada(via)}>
						<span class="chip-texto">{via}</span>
						<button type="button" class="quitar" aria-label={T.quitar(via)} onclick={quitarVia}>
							<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="2" /></svg>
						</button>
					</span>
				</div>
			{:else}
				<div class="campo" class:error={!!error} class:marcado>
					<input
						id="direccion"
						bind:this={entrada}
						type="text"
						role="combobox"
						bind:value={valor}
						placeholder={T.placeholder}
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
						onkeydown={alTeclearCalle}
					/>
				</div>
			{/if}
		</div>
		<div class="columna numero">
			<label for="numero">{T.numero}<span class="solo-lectores"> {T.numeroEtiqueta}</span></label>
			<div class="campo" class:error={!!errorNumero}>
				<input
					id="numero"
					type="text"
					inputmode="numeric"
					autocomplete="off"
					maxlength="9"
					bind:value={numero}
					placeholder={T.numeroPlaceholder}
					aria-invalid={!!errorNumero}
					aria-describedby={errorNumero ? 'numero-error' : undefined}
				/>
			</div>
		</div>
	</div>

	{#if visible && sugerencias}
		{#if sugerencias.tipo === 'nada'}
			<div class="vacio">
				<p class="vacio-titulo">{AUTOCOMPLETAR.vacio.titulo}</p>
				<p class="vacio-texto">{AUTOCOMPLETAR.vacio.texto}</p>
				<div class="salidas">
					<button type="button" class="boton boton-contorno" onclick={() => alCambiarModo('mapa')}>{FORMULARIO.modos.mapa}</button>
				</div>
			</div>
		{:else}
			<ul class="lista" id="direccion-lista" role="listbox" aria-label={AUTOCOMPLETAR.lista} bind:this={lista} style:max-height="{alturaLista}px">
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
							{@const d = detalleVia(o)}
							<span class="nombre">{@render marcas(o.partes)}{d.nombre}</span>
							{#if d.nota}<span class="barrio">{d.nota}</span>{/if}
							{#if d.sub}<span class="barrio">{d.sub}</span>{/if}
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

	{#if confirmacion}<p class="confirmacion" role="status">{confirmacion}</p>{/if}

	{#if errorNumero}
		<p class="mensaje-error" id="numero-error">{errorNumero}</p>
	{/if}
	{#if error}
		<p class="mensaje-error" id="direccion-error">{error}</p>
	{:else if !ocultarAyuda && !confirmacion}
		<p class="ayuda" id="direccion-ayuda">{T.ayuda}</p>
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
	.fila {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 92px;
		gap: 10px;
		align-items: start;
	}
	.columna {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
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
	.fijada {
		padding: 0 6px;
		background: var(--superficie);
	}
	.chip-calle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 4px;
		width: 100%;
		min-width: 0;
		font: 700 16px/1.2 var(--f-texto);
	}
	.chip-texto {
		min-width: 0;
		padding-left: 8px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.quitar {
		flex: none;
		width: 44px;
		height: 44px;
		border: 0;
		background: none;
		color: inherit;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}
	.confirmacion {
		font: 600 14px/1.4 var(--f-texto);
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
		overflow-y: auto;
		overscroll-behavior: contain;
		-webkit-overflow-scrolling: touch;
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
