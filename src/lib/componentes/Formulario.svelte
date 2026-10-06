<script lang="ts">
	import CampoDireccion from './CampoDireccion.svelte';
	import type { Snippet } from 'svelte';
	import Segmentado from './Segmentado.svelte';
	import {
		COMPARTIDO, ERRORES, FORMULARIO, FORMULARIO_VIVO, MESES, RESUMEN_FORMULARIO, SITUACION, TIPO_VIVIENDA,
		interpretarSomos, type ErroresFormulario, type SugerenciaZona
	} from '#lib/resultado';
	import type { EstadoFormulario, ModoUbicacion, Situacion, TamanoPiso, TipoVivienda } from '#lib/cliente/estado';

	export type Problema =
		| { tipo: 'no_encontrada'; sugerencias: string[] }
		| { tipo: 'pedir_numero'; calle: string; nSecciones: number }
		| { tipo: 'demasiadas' };

	let {
		f = $bindable(),
		errores,
		buscando = false,
		comprobado = false,
		problema = null,
		mapa,
		alEmpezar,
		alEnviar,
		alSalirDe,
		alElegirSugerencia,
		alElegirZona,
		alCambiarModo,
		alCambiarSituacion
	}: {
		f: EstadoFormulario;
		errores: ErroresFormulario & { direccion?: string; mapa?: string; firma?: string; rentaFirma?: string; habitacion?: string };
		buscando?: boolean;
		/** Ya hay un resultado en pantalla: el botón pasa a «Comprobar otro piso» */
		comprobado?: boolean;
		problema?: Problema | null;
		/** Mapa del modo «En el mapa» (carga diferida) */
		mapa?: Snippet;
		/** Primera vez que se toca un campo en esta visita */
		alEmpezar?: () => void;
		alEnviar: () => void;
		alSalirDe: (campo: 'precio' | 'superficie') => void;
		alElegirSugerencia: (texto: string) => void;
		/** Se eligió un barrio o distrito en el autocompletado: se pasa al mapa centrado en él */
		alElegirZona: (zona: SugerenciaZona) => void;
		alCambiarModo: (modo: ModoUbicacion) => void;
		alCambiarSituacion?: (s: Situacion) => void;
	} = $props();

	const NB = ' ';
	const vivo = $derived(f.situacion === 'vivo');
	const habitacion = $derived(f.tipo === 'habitacion');
	const modos = [
		{ valor: 'direccion' as const, etiqueta: FORMULARIO.modos.direccion },
		{ valor: 'calle' as const, etiqueta: FORMULARIO.modos.calle },
		{ valor: 'mapa' as const, etiqueta: FORMULARIO.modos.mapa }
	];
	const situaciones = [
		{ valor: 'mirando' as const, etiqueta: SITUACION.mirando },
		{ valor: 'vivo' as const, etiqueta: SITUACION.vivo }
	];
	const tipos = [
		{ valor: 'piso' as const, etiqueta: TIPO_VIVIENDA.piso },
		{ valor: 'habitacion' as const, etiqueta: TIPO_VIVIENDA.habitacion },
		{ valor: 'casa' as const, etiqueta: TIPO_VIVIENDA.casa }
	];
	const sino = (si: string, no: string) => [
		{ valor: true, etiqueta: si },
		{ valor: false, etiqueta: no }
	];
	const numeroHabitaciones = ['1', '2', '3', '4', '5', '6+'].map((e, i) => ({ valor: String(i + 1), etiqueta: e }));
	const tamanos: { valor: TamanoPiso; etiqueta: string }[] = [
		{ valor: 'hasta60', etiqueta: `Hasta 60${NB}m²` },
		{ valor: '60-90', etiqueta: `60-90${NB}m²` },
		{ valor: '90-120', etiqueta: `90-120${NB}m²` },
		{ valor: 'mas120', etiqueta: `Más de 120${NB}m²` },
		{ valor: 'nose', etiqueta: 'No lo sé' }
	];

	const etiquetaDonde = $derived(!vivo ? FORMULARIO.dondeEsta : habitacion ? FORMULARIO_VIVO.dondeEstaHabitacion : FORMULARIO_VIVO.dondeEsta);
	const etiquetaPrecio = $derived(
		habitacion ? (vivo ? FORMULARIO_VIVO.precioHabitacion : 'Lo que piden por la habitación') : vivo ? FORMULARIO_VIVO.precio : FORMULARIO.precio
	);
	const textoBoton = $derived(
		habitacion
			? vivo ? 'Comparar mi habitación' : 'Comparar la habitación'
			: vivo ? (comprobado ? FORMULARIO_VIVO.comprobarOtro : FORMULARIO_VIVO.comprobar) : comprobado ? FORMULARIO.comprobarOtro : FORMULARIO.comprobar
	);

	// Piso compartido con un solo contrato (solo en pantalla)
	let compartidoAbierto = $state(false);
	const somos = $derived(interpretarSomos(f.somos));
	function cambiarSomos(delta: number) {
		const actual = somos ?? 1;
		f.somos = String(Math.min(12, Math.max(2, actual + delta)));
	}
	function alternarCompartido() {
		compartidoAbierto = !compartidoAbierto;
		if (!compartidoAbierto) f.somos = '';
		else if (!f.somos) f.somos = '2';
	}
	const tuParte = $derived.by(() => {
		const precio = Number(f.precio.replace(/\./g, '').replace(',', '.'));
		return somos && Number.isFinite(precio) && precio > 0 ? Math.round(precio / somos) : null;
	});
	const eurosEs = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

	// Resumen plegado: solo obra nueva y larga duración
	let resumenAbierto = $state(false);
	const resumen = $derived(
		`${f.largaDuracion ? RESUMEN_FORMULARIO.largaDuracion : RESUMEN_FORMULARIO.temporal} · ${f.obraNueva ? RESUMEN_FORMULARIO.obraNueva : RESUMEN_FORMULARIO.noObraNueva}`
	);

	const anioActual = new Date().getFullYear();
	const anios = Array.from({ length: anioActual - 1990 + 1 }, (_, i) => String(anioActual - i));

	function cambiarTipo(t: TipoVivienda) {
		if (t !== 'piso') {
			compartidoAbierto = false;
			f.somos = '';
		}
	}
</script>

<form
	class="formulario"
	novalidate
	oninput={() => alEmpezar?.()}
	onsubmit={(e) => {
		e.preventDefault();
		if (!buscando) alEnviar();
	}}
>
	<Segmentado
		opciones={situaciones}
		bind:valor={f.situacion}
		onchange={(s) => alCambiarSituacion?.(s)}
		nombre="situacion"
		etiqueta={SITUACION.etiqueta}
	/>

	<fieldset class="donde">
		<legend>{etiquetaDonde}</legend>
		<Segmentado opciones={modos} valor={f.modo} onchange={alCambiarModo} nombre="modo" etiqueta={etiquetaDonde} />
	</fieldset>

	{#if f.modo !== 'mapa'}
		<CampoDireccion
			bind:valor={f.direccion}
			modo={f.modo}
			error={errores.direccion}
			marcado={problema?.tipo === 'no_encontrada'}
			ocultarAyuda={!!problema}
			alElegirVia={() => {}}
			{alElegirZona}
			{alCambiarModo}
		/>
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
				{:else if problema.tipo === 'demasiadas'}
					<p>{ERRORES.demasiadas.titulo} {ERRORES.demasiadas.texto}</p>
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
				{#if f.modo !== 'calle' && (problema.tipo === 'no_encontrada' || problema.tipo === 'demasiadas')}
					<button type="button" class="boton boton-contorno" onclick={() => alCambiarModo('calle')}>{ERRORES.noEncontrada.soloCalle}</button>
				{:else}
					<button type="button" class="boton boton-contorno" onclick={() => alCambiarModo('direccion')}>{FORMULARIO.modos.direccion}</button>
				{/if}
				<button type="button" class="boton boton-contorno" onclick={() => alCambiarModo('mapa')}>{ERRORES.noEncontrada.enMapa}</button>
			</div>
		</div>
	{/if}

	<fieldset class="tipo-vivienda">
		<legend>{TIPO_VIVIENDA.etiqueta}</legend>
		<Segmentado opciones={tipos} bind:valor={f.tipo} onchange={cambiarTipo} nombre="tipo" etiqueta={TIPO_VIVIENDA.etiqueta} />
	</fieldset>

	{#if habitacion}
		<div class="campo-grupo">
			<label for="precio">{etiquetaPrecio}</label>
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
				<span class="sufijo">€ al mes</span>
			</div>
		</div>
		{#if errores.precio}<p class="mensaje-error" id="precio-error">{errores.precio}</p>{/if}

		<fieldset class="grupo">
			<legend>Habitaciones del piso</legend>
			<Segmentado
				opciones={numeroHabitaciones}
				valor={String(f.habitaciones)}
				onchange={(v) => (f.habitaciones = Number(v))}
				nombre="habitaciones"
				etiqueta="Habitaciones del piso"
			/>
		</fieldset>

		<fieldset class="grupo">
			<legend>Tamaño aproximado del piso</legend>
			<div class="chips" role="radiogroup" aria-label="Tamaño aproximado del piso">
				{#each tamanos as t (t.valor)}
					<label class="chip" class:activo={f.tamano === t.valor}>
						<input type="radio" name="tamano" value={t.valor} checked={f.tamano === t.valor} onchange={() => (f.tamano = t.valor)} />
						<span>{t.etiqueta}</span>
					</label>
				{/each}
			</div>
			{#if errores.habitacion}<p class="mensaje-error" role="alert">{errores.habitacion}</p>{/if}
		</fieldset>

		<div class="pregunta">
			<span>¿Incluye gastos?</span>
			<Segmentado opciones={sino('Sí', 'No')} bind:valor={f.gastos} nombre="gastos" etiqueta="¿Incluye gastos?" ancho="fijo" />
		</div>
	{:else}
		<div class="par">
			<div class="campo-grupo">
				<label for="precio">{etiquetaPrecio}</label>
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

		{#if f.tipo === 'piso'}
			<div class="compartido">
				<button type="button" class="enlace desplegable" aria-expanded={compartidoAbierto} aria-controls="compartido-panel" onclick={alternarCompartido}>
					{COMPARTIDO.enlace}
					<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" class:arriba={compartidoAbierto}><path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.8" fill="none" /></svg>
				</button>
				{#if compartidoAbierto}
					<div class="panel-compartido" id="compartido-panel">
						<p>{COMPARTIDO.ayuda}</p>
						<div class="somos">
							<span id="somos-etiqueta">{COMPARTIDO.somos} <span class="opcional">{COMPARTIDO.opcional}</span></span>
							<div class="paso" role="group" aria-labelledby="somos-etiqueta">
								<button type="button" aria-label="Una persona menos" onclick={() => cambiarSomos(-1)} disabled={(somos ?? 2) <= 2}>−</button>
								<output aria-live="polite">{somos ?? 2}</output>
								<button type="button" aria-label="Una persona más" onclick={() => cambiarSomos(1)} disabled={(somos ?? 2) >= 12}>+</button>
							</div>
						</div>
						{#if tuParte}
							<p class="tu-parte">{COMPARTIDO.tuParte} <strong>{eurosEs(tuParte)}{NB}€</strong> {COMPARTIDO.alMes}</p>
						{/if}
						<p class="nota-compartido">{COMPARTIDO.aviso}</p>
					</div>
				{/if}
			</div>
		{/if}
	{/if}

	{#if vivo}
		<fieldset class="grupo">
			<legend>{FORMULARIO_VIVO.firma}</legend>
			<label class="reciente" class:activo={f.firmaReciente}>
				<input type="checkbox" bind:checked={f.firmaReciente} />
				<span class="casilla" aria-hidden="true">
					{#if f.firmaReciente}<svg width="14" height="14" viewBox="0 0 20 20"><path d="M4.5 10.5l3.5 3.5 7.5-8" stroke="var(--paja)" stroke-width="2.5" fill="none" /></svg>{/if}
				</span>
				{FORMULARIO_VIVO.reciente}
			</label>
			{#if !f.firmaReciente}
				<div class="par">
					<div class="campo-grupo">
						<label for="firma-mes">{FORMULARIO_VIVO.mes}</label>
						<select id="firma-mes" bind:value={f.firmaMes} aria-invalid={!!errores.firma}>
							<option value="">—</option>
							{#each MESES as m, i (m)}<option value={String(i + 1)}>{m}</option>{/each}
						</select>
					</div>
					<div class="campo-grupo">
						<label for="firma-ano">{FORMULARIO_VIVO.ano}</label>
						<select id="firma-ano" bind:value={f.firmaAno} aria-invalid={!!errores.firma}>
							<option value="">—</option>
							{#each anios as a (a)}<option value={a}>{a}</option>{/each}
						</select>
					</div>
				</div>
			{/if}
			{#if errores.firma}<p class="mensaje-error" role="alert">{errores.firma}</p>{/if}
		</fieldset>

		<div class="campo-grupo">
			<label for="renta-firma">{FORMULARIO_VIVO.rentaFirma} <span class="opcional">{FORMULARIO_VIVO.opcional}</span></label>
			<div class="campo numerico" class:error={!!errores.rentaFirma}>
				<input
					id="renta-firma"
					type="text"
					inputmode="numeric"
					autocomplete="off"
					placeholder={FORMULARIO_VIVO.rentaFirmaPlaceholder}
					bind:value={f.rentaFirma}
					aria-invalid={!!errores.rentaFirma}
					aria-describedby="renta-firma-ayuda"
				/>
				<span class="sufijo">€</span>
			</div>
			{#if errores.rentaFirma}<p class="mensaje-error" role="alert">{errores.rentaFirma}</p>{/if}
			<p class="ayuda" id="renta-firma-ayuda">{FORMULARIO_VIVO.rentaFirmaAyuda}</p>
		</div>
	{/if}

	<div class="resumen" class:abierto={resumenAbierto}>
		<div class="resumen-linea">
			<span>{resumen}</span>
			<button type="button" class="enlace" aria-expanded={resumenAbierto} aria-controls="resumen-panel" onclick={() => (resumenAbierto = !resumenAbierto)}>
				{resumenAbierto ? RESUMEN_FORMULARIO.listo : RESUMEN_FORMULARIO.cambiar}
			</button>
		</div>
		{#if resumenAbierto}
			<div class="preguntas" id="resumen-panel">
				<div class="pregunta">
					<span id="p-obra">{FORMULARIO.obraNueva}</span>
					<Segmentado opciones={sino('Sí', 'No')} bind:valor={f.obraNueva} nombre="obra" etiqueta={FORMULARIO.obraNueva} ancho="fijo" />
				</div>
				<div class="pregunta">
					<span>{FORMULARIO.largaDuracion}</span>
					<Segmentado opciones={sino('Sí', 'No')} bind:valor={f.largaDuracion} nombre="larga" etiqueta={FORMULARIO.largaDuracion} ancho="fijo" />
				</div>
			</div>
		{/if}
	</div>

	<div class="enviar">
		<button type="submit" class="boton" disabled={buscando} aria-busy={buscando}>
			{#if buscando}
				<span class="spinner" aria-hidden="true"></span>{FORMULARIO.buscando}
			{:else}
				{textoBoton}
			{/if}
		</button>
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
	.grupo {
		gap: 8px;
	}
	.grupo legend {
		font: 600 14px/1.3 var(--f-texto);
		margin-bottom: 8px;
	}
	.tipo-vivienda legend {
		font: 600 14px/1.3 var(--f-texto);
		margin-bottom: 8px;
	}
	.opcional {
		font-weight: 400;
		color: var(--grafito);
	}
	.ayuda {
		font: 400 13px/1.4 var(--f-texto);
		color: var(--grafito);
	}
	select {
		height: 52px;
		padding: 0 12px;
		border: 1.5px solid var(--tinta);
		border-radius: var(--radio);
		background: var(--blanco);
		font: 500 17px/1 var(--f-texto);
		min-width: 0;
		width: 100%;
	}
	select:focus-visible {
		outline: 2px solid var(--tinta);
		outline-offset: 3px;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.chip {
		position: relative;
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0 14px;
		border: 1.5px solid var(--tinta);
		border-radius: var(--radio);
		background: var(--blanco);
		font: 600 15px/1.1 var(--f-texto);
		cursor: pointer;
	}
	.chip.activo {
		background: var(--tinta);
		color: var(--blanco);
	}
	.chip input,
	.reciente input {
		position: absolute;
		opacity: 0;
		inset: 0;
		cursor: pointer;
	}
	.chip:focus-within,
	.reciente:focus-within {
		outline: 2px solid var(--tinta);
		outline-offset: 3px;
	}
	.reciente {
		position: relative;
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		gap: 10px;
		min-height: 48px;
		padding: 0 14px;
		border: 1.5px solid var(--tinta);
		border-radius: var(--radio);
		font: 600 15px/1.2 var(--f-texto);
		cursor: pointer;
	}
	.reciente.activo {
		background: var(--tinta);
		color: var(--blanco);
	}
	.casilla {
		width: 22px;
		height: 22px;
		border: 2px solid currentColor;
		border-radius: 4px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: none;
	}
	.compartido {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.desplegable {
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		border: 0;
		background: none;
		padding: 0;
		font: 500 15px/1.3 var(--f-texto);
		text-decoration-color: var(--tinta);
	}
	.desplegable svg.arriba {
		transform: rotate(180deg);
	}
	.panel-compartido {
		background: var(--superficie);
		border-radius: var(--radio);
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		font: 400 15px/1.4 var(--f-texto);
	}
	.somos {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		font: 600 15px/1.2 var(--f-texto);
	}
	.paso {
		display: flex;
		align-items: center;
		border: 1.5px solid var(--tinta);
		border-radius: var(--radio);
		background: var(--blanco);
	}
	.paso button {
		width: 48px;
		height: 48px;
		border: 0;
		background: none;
		font: 700 20px/1 var(--f-texto);
	}
	.paso button:disabled {
		color: var(--piedra);
	}
	.paso output {
		min-width: 44px;
		text-align: center;
		font: 700 20px/1 var(--f-semi);
	}
	.tu-parte {
		font: 500 17px/1.3 var(--f-texto);
	}
	.tu-parte strong {
		font: 800 22px/1 var(--f-semi);
	}
	.nota-compartido {
		font: 400 13px/1.4 var(--f-texto);
		color: var(--grafito);
	}
	.resumen {
		background: var(--superficie);
		border-radius: var(--radio);
		padding: 14px 16px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.resumen-linea {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		font: 500 16px/1.3 var(--f-texto);
	}
	.resumen-linea .enlace {
		border: 0;
		background: none;
		padding: 0;
		font-weight: 700;
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
