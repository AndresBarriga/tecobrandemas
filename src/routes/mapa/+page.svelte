<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import BuscadorMapa from '#lib/componentes/BuscadorMapa.svelte';
	import Cabecera from '#lib/componentes/Cabecera.svelte';
	import MapaMadrid from '#lib/componentes/MapaMadrid.svelte';
	import Pie from '#lib/componentes/Pie.svelte';
	import Segmentado from '#lib/componentes/Segmentado.svelte';
	import {
		MAPA_REFERENCIA as T, SUPERFICIES_MAPA, SUPERFICIE_MAPA_INICIAL, TONOS_MAPA, capaEvolucion, capaPresupuesto, capaReferencia,
		hojaDeZona, numeroDelCampo, superficieValida, zonasDelMapa, type CapaMapa, type SugerenciaVia, type SugerenciaZona
	} from '#lib/resultado';
	import { type Caja, type MadridCargado, cargarMadrid, unirCajas } from '#lib/cliente/mapa-madrid';
	import { metrosAPunto } from '#lib/cliente/mapa';
	import { dejarPrellenado } from '#lib/cliente/prellenado';
	import { ubicarme } from '#lib/cliente/ubicacion-actual';

	let estado = $state<'cargando' | 'listo' | 'fallo'>('cargando');
	let madrid = $state<MadridCargado | null>(null);
	let listo = $state(false);

	let capa = $state<CapaMapa>('referencia');
	let superficie = $state<number>(SUPERFICIE_MAPA_INICIAL);
	let presupuestoTexto = $state('');
	let metrosTexto = $state('');

	let seleccion = $state<string | null>(null);
	let resaltadas = $state<Set<string>>(new Set());
	let enfoque = $state<{ caja: Caja; vez: number } | null>(null);
	let vez = 0;
	let mensajeBusqueda = $state<string | null>(null);
	let ubicacion = $state<'off' | 'pidiendo' | 'denegada' | 'fuera'>('off');
	let hojaEl: HTMLElement | undefined = $state();

	function cargar() {
		estado = 'cargando';
		cargarMadrid()
			.then((m) => {
				madrid = m;
				estado = 'listo';
			})
			.catch(() => (estado = 'fallo'));
	}
	onMount(() => {
		listo = true;
		cargar();
	});

	const presupuesto = $derived(numeroDelCampo(presupuestoTexto));
	const metros = $derived(numeroDelCampo(metrosTexto));
	const superficieCapa = $derived(capa === 'presupuesto' ? (metros ?? 0) : superficie);
	const zonas = $derived(madrid ? zonasDelMapa(madrid.datos, superficieCapa) : []);
	const zonaPorCusec = $derived(new Map(zonas.map((z) => [z.cusec, z])));

	const deMiPresupuesto = $derived(
		capa === 'presupuesto' && presupuesto !== null && metros !== null && superficieValida(metros) ? capaPresupuesto(zonas, presupuesto) : null
	);
	const calculada = $derived(capa === 'evolucion' ? capaEvolucion(zonas) : capa === 'presupuesto' ? deMiPresupuesto : capaReferencia(zonas, superficie));
	const tonos = $derived(calculada?.tonos ?? new Map<string, number | null>());
	const resumen = $derived(deMiPresupuesto?.resumen ?? null);

	const intro = $derived(capa === 'presupuesto' ? T.introPresupuesto : capa === 'evolucion' ? T.introEvolucion : T.intro);
	const tituloLeyenda = $derived(capa === 'presupuesto' ? T.leyendaPresupuesto : capa === 'evolucion' ? T.leyendaEvolucion : T.leyenda);
	const errorMetros = $derived(capa === 'presupuesto' && metros !== null && !superficieValida(metros) ? T.presupuesto.metrosFuera : null);

	const hoja = $derived.by(() => {
		const z = seleccion ? zonaPorCusec.get(seleccion) : undefined;
		return z && madrid ? hojaDeZona(z, madrid.datos, capa, superficieCapa, presupuesto) : null;
	});

	async function elegirZona(cusec: string) {
		seleccion = cusec;
		await tick();
		hojaEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	}

	function llevarA(caja: Caja | null) {
		if (caja) enfoque = { caja, vez: ++vez };
	}

	function buscarZona(z: SugerenciaZona) {
		if (!madrid) return;
		seleccion = null;
		resaltadas = new Set();
		if (z.clase === 'barrio') {
			llevarA(madrid.barrios.get(z.codigo)?.caja ?? null);
			mensajeBusqueda = T.buscador.barrio(z.nombre);
		} else {
			const delDistrito = [...madrid.barrios.entries()].filter(([c]) => madrid!.datos.barrios[c]?.cod_distrito === z.codigo).map(([, b]) => b.caja);
			llevarA(unirCajas(delDistrito));
			mensajeBusqueda = T.buscador.barrio(z.nombre);
		}
		ubicacion = 'off';
	}

	function buscarVia(v: SugerenciaVia) {
		if (!madrid) return;
		seleccion = null;
		resaltadas = new Set();
		llevarA(madrid.barrios.get(v.barrio)?.caja ?? null);
		mensajeBusqueda = T.buscador.calleEn(v.nombre, madrid.datos.barrios[v.barrio]?.nombre ?? 'Madrid');
		ubicacion = 'off';
	}

	// «Mi ubicación»: se resuelve en el navegador y solo queda la zona; las coordenadas no se envían ni se guardan
	async function miUbicacion() {
		if (!madrid || ubicacion === 'pidiendo') return;
		ubicacion = 'pidiendo';
		mensajeBusqueda = null;
		const l = await ubicarme();
		if (l.estado !== 'lista') {
			ubicacion = l.estado === 'fuera' ? 'fuera' : 'denegada';
			return;
		}
		ubicacion = 'off';
		const cusecs = l.ubicacion.cusecs;
		resaltadas = new Set(cusecs);
		seleccion = cusecs.length === 1 ? cusecs[0]! : null;
		llevarA(unirCajas(cusecs.flatMap((c) => (madrid!.porCusec.get(c) ? [madrid!.porCusec.get(c)!.caja] : []))));
		if (seleccion) void elegirZona(seleccion);
	}

	function comprobarAqui() {
		if (!madrid || !seleccion) return;
		const c = madrid.porCusec.get(seleccion);
		const barrio = madrid.datos.secciones[seleccion]?.barrio;
		if (!c || !barrio) return;
		dejarPrellenado({ punto: metrosAPunto(c.centro[0], -c.centro[1]), barrio });
		void goto('/');
	}

	const cambiarCapa = () => {
		seleccion = null;
	};
</script>

<svelte:head>
	<title>{T.titulo} · A su precio</title>
	<meta name="description" content={T.intro} />
</svelte:head>

<div class="pagina" data-listo={listo}>
	<Cabecera derecha="madrid" actual="mapa" />

	<main class="rejilla">
		<section class="cabeza">
			<h1>{T.titulo}</h1>
			<p>{intro}</p>
		</section>

		<section class="ajustes" aria-label="Qué mostrar">
			<Segmentado
				nombre="capa"
				etiqueta={T.capas.etiqueta}
				bind:valor={capa}
				onchange={cambiarCapa}
				opciones={[
					{ valor: 'referencia', etiqueta: T.capas.referencia },
					{ valor: 'presupuesto', etiqueta: T.capas.presupuesto },
					{ valor: 'evolucion', etiqueta: T.capas.evolucion }
				]}
			/>

			{#if capa === 'referencia'}
				<div class="superficie" role="group" aria-label={T.superficie.etiqueta}>
					<span class="etiqueta">{T.superficie.etiqueta}</span>
					<div class="chips">
						{#each SUPERFICIES_MAPA as m (m)}
							<button type="button" class="chip" class:activo={superficie === m} aria-pressed={superficie === m} onclick={() => (superficie = m)}>{m}&nbsp;{T.superficie.unidad}</button>
						{/each}
					</div>
				</div>
			{:else if capa === 'presupuesto'}
				<div class="presupuesto">
					<div class="campos">
						<div class="campo-grupo">
							<label for="presupuesto">{T.presupuesto.campoPresupuesto}</label>
							<input id="presupuesto" inputmode="numeric" autocomplete="off" bind:value={presupuestoTexto} placeholder="1.200" />
						</div>
						<div class="campo-grupo">
							<label for="metros">{T.presupuesto.campoMetros}</label>
							<input id="metros" inputmode="numeric" autocomplete="off" bind:value={metrosTexto} placeholder="60" aria-invalid={!!errorMetros} aria-describedby={errorMetros ? 'metros-error' : undefined} />
						</div>
					</div>
					{#if errorMetros}<p class="error" id="metros-error">{errorMetros}</p>{/if}
					<p class="aviso">{T.presupuesto.aviso}</p>
				</div>
			{/if}

			{#if capa === 'presupuesto'}
				<div class="resumen" role="status">
					{#if resumen && resumen.conDato > 0 && resumen.llega === 0}
						<strong>{T.presupuesto.ninguna.titulo}</strong>
						<span>{T.presupuesto.ninguna.texto}</span>
					{:else if resumen}
						<strong>{T.presupuesto.resumen(String(resumen.porcentaje))}</strong>
					{:else}
						<span>{T.presupuesto.pideDatos}</span>
					{/if}
				</div>
			{/if}
		</section>

		<section class="busqueda" aria-label="Buscar en el mapa">
			<BuscadorMapa alElegirZona={buscarZona} alElegirVia={buscarVia} mensaje={mensajeBusqueda} />

			<div class="ubicacion">
				<button type="button" class="boton-paja" onclick={miUbicacion} disabled={estado !== 'listo' || ubicacion === 'pidiendo'}>
					{ubicacion === 'pidiendo' ? T.ubicacion.buscando : T.ubicacion.boton}
				</button>
				<span class="nota">{T.ubicacion.nota}</span>
				{#if ubicacion === 'denegada'}<p class="aviso" role="status">{T.ubicacion.denegada}</p>{/if}
				{#if ubicacion === 'fuera'}<p class="aviso" role="status">{T.ubicacion.fuera}</p>{/if}
			</div>
		</section>

		<section class="mapa" aria-label={T.mapa} aria-busy={estado === 'cargando'}>
			{#if estado === 'listo' && madrid}
				<MapaMadrid {madrid} {tonos} {capa} {seleccion} {resaltadas} {enfoque} alElegir={elegirZona} />
			{:else if estado === 'fallo'}
				<div class="mensaje-mapa">
					<p>{T.fallo}</p>
					<button type="button" class="boton-paja" onclick={cargar}>{T.reintentar}</button>
				</div>
			{:else}
				<div class="mensaje-mapa esqueleto"><p>{T.cargando}</p></div>
			{/if}
		</section>

		<section class="hoja" aria-live="polite" aria-label="Zona elegida" bind:this={hojaEl}>
			{#if hoja}
				<div class="hoja-cabeza">
					<h2>{hoja.titulo}</h2>
					<button type="button" class="cerrar" aria-label={T.hoja.cerrar} onclick={() => (seleccion = null)}>×</button>
				</div>
				{#if hoja.referencia}<p class="referencia">{hoja.referencia}</p>{/if}
				{#if hoja.parteAlta}<p class="parte-alta">{hoja.parteAlta}</p>{/if}
				{#if hoja.presupuesto}<p class="posicion">{hoja.presupuesto}</p>{/if}
				{#if hoja.evolucion}<p class="posicion">{hoja.evolucion}</p>{/if}
				{#if hoja.sinDato}<p class="sin-dato">{hoja.sinDato}</p>{/if}
				{#if hoja.procedencia}<p class="nota">{hoja.procedencia}</p>{/if}
				<button type="button" class="boton-paja grande" onclick={comprobarAqui}>{T.hoja.comprobar}</button>
			{:else}
				<p class="nota">Toca una zona para ver su referencia.</p>
			{/if}
		</section>

		<section class="leyenda" aria-label={tituloLeyenda}>
			{#if calculada}
				<span class="leyenda-titulo">{tituloLeyenda}</span>
				<div class="muestras" style:--n={calculada.leyenda.length + 1}>
					{#each calculada.leyenda as l (l.etiqueta)}
						<div class="muestra">
							<span
								class="color"
								class:trama={capa === 'presupuesto' && l.tono === 0}
								style:background={capa === 'presupuesto' && l.tono === 0 ? undefined : l.tono === null ? undefined : TONOS_MAPA[capa][l.tono]}
							></span>
							<span class="etiqueta-l">{l.etiqueta}</span>
						</div>
					{/each}
					<div class="muestra">
						<span class="color rayado"></span>
						<span class="etiqueta-l">{T.sinDato}</span>
					</div>
				</div>
				<span class="nota">{calculada.nota} {T.notaSinDato}</span>
			{/if}
		</section>
	</main>

	<Pie />
</div>

<style>
	.pagina {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		font-variant-numeric: tabular-nums;
	}
	.pagina > :global(footer) {
		margin-top: auto;
	}
	.rejilla {
		width: 100%;
		max-width: 1240px;
		margin: 0 auto;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		grid-template-areas: 'cabeza' 'ajustes' 'mapa' 'hoja' 'leyenda' 'busqueda';
		gap: 16px;
		padding: 12px 0 8px;
	}
	.cabeza,
	.ajustes,
	.busqueda,
	.hoja,
	.leyenda {
		padding: 0 var(--margen);
	}
	.cabeza {
		grid-area: cabeza;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	h1 {
		font: 800 60px/0.88 var(--f-extra);
		text-transform: uppercase;
	}
	.cabeza p {
		font: 400 16px/1.5 var(--f-texto);
		max-width: 620px;
		text-wrap: pretty;
	}
	.ajustes,
	.busqueda {
		display: flex;
		flex-direction: column;
		gap: 14px;
		min-width: 0;
	}
	.ajustes {
		grid-area: ajustes;
	}
	.busqueda {
		grid-area: busqueda;
	}
	.mapa {
		grid-area: mapa;
		height: 56svh;
		min-height: 340px;
		min-width: 0;
	}
	.hoja {
		grid-area: hoja;
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 0;
	}
	.leyenda {
		grid-area: leyenda;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	/* Superficie */
	.etiqueta {
		display: block;
		font: 600 14px/1.3 var(--f-texto);
		margin-bottom: 6px;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.chip {
		min-height: 44px;
		min-width: 64px;
		padding: 0 14px;
		border: 1.5px solid var(--tinta);
		border-radius: var(--radio);
		background: transparent;
		color: var(--tinta);
		font: 700 15px/1 var(--f-texto);
	}
	.chip.activo {
		background: var(--paja);
		border-width: 2px;
	}

	/* Presupuesto */
	.presupuesto {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.campos {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
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
	input {
		height: 48px;
		padding: 0 14px;
		border: 1.5px solid var(--tinta);
		border-radius: var(--radio);
		background: var(--blanco);
		font: 500 16px/1 var(--f-texto);
		min-width: 0;
	}
	input:focus-visible {
		outline: 2px solid var(--tinta);
		outline-offset: 3px;
	}
	.error {
		font: 500 14px/1.4 var(--f-texto);
		color: var(--ciruela);
	}
	.aviso {
		background: var(--superficie);
		border-radius: var(--radio);
		padding: 10px 12px;
		font: 500 14px/1.45 var(--f-texto);
	}
	.resumen {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font: 500 15px/1.4 var(--f-texto);
	}
	.resumen strong {
		font: 700 16px/1.35 var(--f-texto);
	}

	/* Botones Paja con texto Tinta, 8 px de esquina, 44 px táctiles */
	.boton-paja {
		min-height: 44px;
		padding: 0 18px;
		border: 0;
		border-radius: var(--radio);
		background: var(--paja);
		color: var(--tinta);
		font: 800 16px/1.2 var(--f-texto);
	}
	.boton-paja:disabled {
		background: var(--pista);
		color: var(--grafito);
		cursor: not-allowed;
	}
	.boton-paja.grande {
		min-height: 52px;
		width: 100%;
		margin-top: 6px;
	}
	.ubicacion {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 6px;
	}
	.nota {
		font: 400 12.5px/1.45 var(--f-texto);
		color: var(--grafito);
		text-wrap: pretty;
	}

	/* Mapa y estados */
	.mensaje-mapa {
		height: 100%;
		min-height: 340px;
		border-radius: var(--radio);
		background: var(--pista);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 20px;
		text-align: center;
		font: 600 15px/1.4 var(--f-texto);
	}

	/* Hoja */
	.hoja-cabeza {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 8px;
	}
	h2 {
		font: 700 21px/1.2 var(--f-texto);
	}
	.cerrar {
		flex: none;
		width: 44px;
		height: 44px;
		margin: -8px -10px 0 0;
		border: 0;
		background: transparent;
		font: 400 28px/1 var(--f-texto);
	}
	.referencia {
		font: 700 17px/1.35 var(--f-texto);
	}
	.parte-alta,
	.posicion {
		font: 500 15px/1.4 var(--f-texto);
	}
	.sin-dato {
		background: var(--superficie);
		border-radius: var(--radio);
		padding: 12px 14px;
		font: 500 15px/1.45 var(--f-texto);
	}

	/* Leyenda */
	.leyenda-titulo {
		font: 600 13px/1.3 var(--f-texto);
	}
	.muestras {
		display: grid;
		grid-template-columns: repeat(var(--n), 1fr);
		gap: 4px;
	}
	.muestra {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.color {
		height: 16px;
		border-radius: 2px;
		border: 1px solid #857f74;
	}
	.color.rayado {
		background: repeating-linear-gradient(45deg, #dad5ca 0 3px, #857f74 3px 4.5px);
	}
	.color.trama {
		background: repeating-linear-gradient(-45deg, #f6f4ee 0 4px, #1c1b19 4px 5.2px);
	}
	.etiqueta-l {
		font: 600 12px/1.2 var(--f-semi);
		white-space: nowrap;
	}

	@media (min-width: 960px) {
		.rejilla {
			grid-template-columns: minmax(0, 1fr) 380px;
			grid-template-areas: 'cabeza cabeza' 'mapa ajustes' 'mapa busqueda' 'mapa hoja' 'leyenda leyenda';
			grid-template-rows: auto auto auto 1fr auto;
			gap: 20px 28px;
			padding: 0 40px;
			align-items: start;
		}
		.cabeza,
		.ajustes,
		.busqueda,
		.hoja,
		.leyenda {
			padding: 0;
		}
		.mapa {
			height: min(76vh, 760px);
			min-height: 520px;
		}
		h1 {
			font-size: 64px;
		}
	}
	@media (max-width: 959px) {
		h1 {
			font-size: 48px;
		}
		.mapa {
			height: 62svh;
		}
	}
</style>
