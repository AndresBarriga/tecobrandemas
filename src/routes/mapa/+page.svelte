<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import BuscadorMapa from '#lib/componentes/BuscadorMapa.svelte';
	import Cabecera from '#lib/componentes/Cabecera.svelte';
	import ControlDeslizante from '#lib/componentes/ControlDeslizante.svelte';
	import HojaArrastrable from '#lib/componentes/HojaArrastrable.svelte';
	import MapaMadrid from '#lib/componentes/MapaMadrid.svelte';
	import Pie from '#lib/componentes/Pie.svelte';
	import Segmentado from '#lib/componentes/Segmentado.svelte';
	import {
		MAPA_REFERENCIA as T, RANGO_METROS, RANGO_PRESUPUESTO, SUPERFICIES_MAPA, SUPERFICIE_MAPA_INICIAL, ajustarARango, capaEvolucion, capaPresupuesto, capaReferencia,
		capaReferenciaAnuncios, distanciaCorta, euros, extremoPresupuesto, hojaDeZona, mesAnio, numero, paletaDe, posicionPresupuestoAnuncios, superficieValida, zonasCercanas, zonasDelMapa,
		type CapaMapa, type FuenteMapa, type SugerenciaVia, type SugerenciaZona
	} from '#lib/resultado';
	import { MAPA_CON_ANUNCIOS } from '#lib/cliente/datos';
	import { type Caja, type MadridCargado, cargarMadrid, unirCajas } from '#lib/cliente/mapa-madrid';
	import { metrosAPunto } from '#lib/cliente/mapa';
	import { mapaCapa } from '#lib/cliente/analitica';
	import { dejarPrellenado } from '#lib/cliente/prellenado';
	import { ubicarme } from '#lib/cliente/ubicacion-actual';
	import { zonasDeVia } from '#lib/cliente/vias';

	// Móvil, «Mi presupuesto»: bajo el conmutador (64 px) van los controles fijos y, debajo, los tres colores
	const ALTO_CONTROLES = 100;
	const ARRIBA_CONTROLES = 64 + ALTO_CONTROLES;
	const ARRIBA_PRESUPUESTO = ARRIBA_CONTROLES + 44;
	const CAPAS: CapaMapa[] = ['presupuesto', 'referencia', 'evolucion'];
	const TA = T.anuncios;

	let estado = $state<'cargando' | 'listo' | 'fallo'>('cargando');
	let madrid = $state<MadridCargado | null>(null);
	let listo = $state(false);

	// «Mi presupuesto» («¿Dónde me llega?») es la vista por defecto: carga ya pintada con los valores iniciales de las barras
	let capa = $state<CapaMapa>(MAPA_CON_ANUNCIOS ? 'presupuesto' : 'referencia');
	// Fuente de «Referencia» (solo con las dos flags): empieza con los contratos
	let fuenteReferencia = $state<FuenteMapa>('contratos');
	let superficie = $state<number>(SUPERFICIE_MAPA_INICIAL);
	let presupuesto = $state<number>(RANGO_PRESUPUESTO.inicial);
	let metros = $state<number>(RANGO_METROS.inicial);

	let seleccion = $state<string | null>(null);
	let resaltadas = $state<Set<string>>(new Set());
	let enfoque = $state<{ caja: Caja; vez: number } | null>(null);
	let vez = 0;
	let mensajeBusqueda = $state<string | null>(null);
	let ubicacion = $state<'off' | 'pidiendo' | 'denegada' | 'fuera'>('off');
	/** Desde dónde se cuentan las zonas más cercanas donde llega el presupuesto: tu ubicación o lo buscado */
	let origen = $state<{ centro: [number, number]; donde: string } | null>(null);
	let hojaEl: HTMLElement | undefined = $state();

	// Móvil: la página es el mapa y una hoja inferior; mide lo que queda visible por encima del teclado
	let movil = $state(false);
	let altoVisual = $state(0);
	let topVisual = $state(0);
	let altoRejilla = $state(0);
	// En «Mi presupuesto» la hoja empieza cerrada: el mapa es lo que se mira
	let hojaEstado = $state<'cerrada' | 'media' | 'completa'>(MAPA_CON_ANUNCIOS ? 'cerrada' : 'media');
	let altoHoja = $state(0);

	// Estado compartible: ?capa=&m2=&barrio=. Nunca el presupuesto, la ubicación ni la zona tocada.
	let barrioUrl = $state<string | null>(null);
	let rellenar = $state<{ texto: string; vez: number } | null>(null);
	let vezRelleno = 0;

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
		const q = new URLSearchParams(location.search);
		const c = q.get('capa') as CapaMapa | null;
		// Sin la flag del mapa no hay «Mi presupuesto»; un enlace antiguo con esa capa abre «Referencia»
		if (c && CAPAS.includes(c)) capa = c === 'presupuesto' && !MAPA_CON_ANUNCIOS ? 'referencia' : c;
		hojaEstado = capa === 'presupuesto' ? 'cerrada' : 'media';
		const f = q.get('fuente');
		if (MAPA_CON_ANUNCIOS && capa === 'referencia' && (f === 'contratos' || f === 'anuncios')) fuenteReferencia = f;
		const m2 = Number(q.get('m2'));
		if (superficieValida(m2)) {
			if (capa === 'presupuesto') metros = ajustarARango(m2, RANGO_METROS);
			else if ((SUPERFICIES_MAPA as readonly number[]).includes(m2)) superficie = m2;
		}
		const b = q.get('barrio');
		if (b && /^\d{3}$/.test(b)) barrioUrl = b;

		const mq = window.matchMedia('(max-width: 959px)');
		const vv = window.visualViewport;
		const medir = () => {
			movil = mq.matches;
			altoVisual = vv?.height ?? window.innerHeight;
			topVisual = vv?.offsetTop ?? 0;
		};
		medir();
		mq.addEventListener('change', medir);
		vv?.addEventListener('resize', medir);
		vv?.addEventListener('scroll', medir);

		listo = true;
		cargar();
		return () => {
			mq.removeEventListener('change', medir);
			vv?.removeEventListener('resize', medir);
			vv?.removeEventListener('scroll', medir);
		};
	});

	// Al cargar el mapa, un ?barrio= lleva la vista a ese barrio
	let barrioAplicado = false;
	$effect(() => {
		if (!madrid || !barrioUrl || barrioAplicado) return;
		barrioAplicado = true;
		const b = madrid.barrios.get(barrioUrl);
		if (!b) {
			barrioUrl = null;
			return;
		}
		llevarA(b.caja);
		origen = { centro: b.centro, donde: T.presupuesto.cercanas.a(b.nombre) };
		rellenar = { texto: b.nombre, vez: ++vezRelleno };
	});
	// Analítica: la capa inicial (ya leída de la URL, porque `listo` se pone al final de onMount) y cada cambio de capa
	let capaEnviada: string | null = null;
	$effect(() => {
		// Con las dos flags, y solo en las capas con selector, el evento lleva también la fuente (un enum)
		const f = MAPA_CON_ANUNCIOS && capa !== 'evolucion' ? (capa === 'presupuesto' ? 'anuncios' : fuenteReferencia) : undefined;
		const clave = `${capa}/${f ?? ''}`;
		if (!listo || clave === capaEnviada) return;
		capaEnviada = clave;
		mapaCapa(capa, f);
	});
	$effect(() => {
		if (!listo) return;
		const q = new URLSearchParams();
		q.set('capa', capa);
		if (capa === 'referencia') q.set('m2', String(superficie));
		else if (capa === 'presupuesto') q.set('m2', String(metros));
		if (MAPA_CON_ANUNCIOS && capa === 'referencia') q.set('fuente', fuenteReferencia);
		if (barrioUrl) q.set('barrio', barrioUrl);
		const url = `${location.pathname}?${q}`;
		if (url !== location.pathname + location.search) {
			try {
				void goto(url, { replace: true, shallow: true });
			} catch {
				// el enrutador aún no está listo: la URL se actualiza en el siguiente cambio
			}
		}
	});

	// Si el fichero de anuncios no carga, no hay «Mi presupuesto»: el mapa sigue con «Referencia» y los contratos
	const sinOferta = $derived(estado === 'listo' && !madrid?.datos.oferta);
	const conPresupuesto = $derived(MAPA_CON_ANUNCIOS && !sinOferta);
	$effect(() => {
		if (sinOferta && capa === 'presupuesto') capa = 'referencia';
	});
	const conSelector = $derived(MAPA_CON_ANUNCIOS && capa === 'referencia' && !sinOferta);
	const fuente = $derived<FuenteMapa>(capa === 'presupuesto' ? 'anuncios' : conSelector ? fuenteReferencia : 'contratos');
	const anuncios = $derived(fuente === 'anuncios');
	const mesOferta = $derived(madrid?.datos.oferta ? mesAnio(madrid.datos.oferta.mes) : '');
	const tonosCapa = $derived(paletaDe(capa, fuente));

	// «Mi presupuesto» solo usa la oferta, que no depende de los metros: las zonas no se recalculan al mover las barras
	const zonas = $derived(madrid ? zonasDelMapa(madrid.datos, capa === 'referencia' ? superficie : 0) : []);
	const zonaPorCusec = $derived(new Map(zonas.map((z) => [z.cusec, z])));

	const deMiPresupuesto = $derived(capa === 'presupuesto' ? capaPresupuesto(zonas, presupuesto, metros) : null);
	const calculada = $derived(
		capa === 'evolucion' ? capaEvolucion(zonas)
		: capa === 'presupuesto' ? deMiPresupuesto
		: anuncios ? capaReferenciaAnuncios(zonas)
		: capaReferencia(zonas, superficie)
	);
	const tonos = $derived(calculada?.tonos ?? new Map<string, number | null>());
	const resumen = $derived(deMiPresupuesto?.resumen ?? null);
	const centros = $derived(new Map((madrid?.celdas ?? []).map((c) => [c.cusec, c.centro] as const)));
	const cercanas = $derived(
		madrid && origen && capa === 'presupuesto' && resumen && resumen.llega > 0
			? zonasCercanas(zonas, origen.centro, centros, (z) => posicionPresupuestoAnuncios(presupuesto, metros, z)).map((c) => ({
				...c,
				nombre: T.presupuesto.cercanas.zona(madrid!.datos.barrios[madrid!.datos.secciones[c.cusec]?.barrio ?? '']?.nombre ?? 'Madrid')
			}))
			: []
	);

	const titulo = $derived(capa === 'presupuesto' ? T.tituloPresupuesto : T.titulo);
	const intro = $derived(capa === 'presupuesto' ? TA.introPresupuesto : capa === 'evolucion' ? T.introEvolucion : anuncios ? TA.intro : T.intro);
	const tituloLeyenda = $derived(
		capa === 'presupuesto' ? TA.leyendaPresupuesto(mesOferta)
		: capa === 'evolucion' ? T.leyendaEvolucion
		: anuncios ? TA.leyenda(mesOferta)
		: T.leyenda
	);
	const textosPresupuesto = TA.presupuesto;
	const rotulo = $derived(anuncios && mesOferta ? TA.rotulo(mesOferta) : null);
	/** La frase de resumen de «Mi presupuesto»: en móvil va en la cabecera de la hoja, siempre a la vista */
	const fraseResumen = $derived(
		!resumen ? null
		: resumen.conDato > 0 && resumen.llega === 0 ? textosPresupuesto.ninguna.titulo
		: textosPresupuesto.resumen(String(resumen.porcentaje), numero(resumen.llega), numero(resumen.conDato))
	);

	const extremo = $derived(resumen ? extremoPresupuesto(resumen) : null);

	const hoja = $derived.by(() => {
		const z = seleccion ? zonaPorCusec.get(seleccion) : undefined;
		return z && madrid ? hojaDeZona(z, madrid.datos, capa, capa === 'presupuesto' ? metros : superficie, presupuesto, fuente) : null;
	});

	async function elegirZona(cusec: string) {
		seleccion = cusec;
		if (movil) {
			if (hojaEstado === 'cerrada') hojaEstado = 'media';
			return;
		}
		await tick();
		hojaEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	}

	function llevarA(caja: Caja | null) {
		if (caja) enfoque = { caja, vez: ++vez };
	}

	const centroDe = (cusecs: string[]): [number, number] | null => {
		const cs = cusecs.flatMap((c) => (madrid?.porCusec.get(c) ? [madrid.porCusec.get(c)!.centro] : []));
		return cs.length ? [cs.reduce((a, c) => a + c[0], 0) / cs.length, cs.reduce((a, c) => a + c[1], 0) / cs.length] : null;
	};

	function buscarZona(z: SugerenciaZona) {
		if (!madrid) return;
		seleccion = null;
		resaltadas = new Set();
		if (z.clase === 'barrio') {
			const b = madrid.barrios.get(z.codigo);
			llevarA(b?.caja ?? null);
			origen = b ? { centro: b.centro, donde: T.presupuesto.cercanas.a(z.nombre) } : null;
			barrioUrl = z.codigo;
		} else {
			const delDistrito = [...madrid.barrios.entries()].filter(([c]) => madrid!.datos.barrios[c]?.cod_distrito === z.codigo).map(([, b]) => b);
			const caja = unirCajas(delDistrito.map((b) => b.caja));
			llevarA(caja);
			origen = caja ? { centro: [(caja[0] + caja[2]) / 2, (caja[1] + caja[3]) / 2], donde: T.presupuesto.cercanas.a(z.nombre) } : null;
			barrioUrl = null;
		}
		mensajeBusqueda = T.buscador.barrio(z.nombre);
		ubicacion = 'off';
	}

	// Una calle que cruza varias zonas las resalta todas; sin ese dato, lleva al barrio donde tiene más
	async function buscarVia(v: SugerenciaVia) {
		if (!madrid) return;
		seleccion = null;
		resaltadas = new Set();
		ubicacion = 'off';
		const barrio = madrid.barrios.get(v.barrio);
		barrioUrl = v.barrio;
		const nombreBarrio = madrid.datos.barrios[v.barrio]?.nombre ?? 'Madrid';
		llevarA(barrio?.caja ?? null);
		mensajeBusqueda = T.buscador.calleEn(v.nombre, nombreBarrio);
		origen = barrio ? { centro: barrio.centro, donde: T.presupuesto.cercanas.a(v.nombre) } : null;
		let cusecs: string[] = [];
		try {
			cusecs = (await zonasDeVia(v.nombre)).filter((c) => madrid!.porCusec.has(c));
		} catch {
			return;
		}
		if (!cusecs.length || mensajeBusqueda !== T.buscador.calleEn(v.nombre, nombreBarrio)) return; // otra búsqueda se ha cruzado
		resaltadas = new Set(cusecs);
		llevarA(unirCajas(cusecs.map((c) => madrid!.porCusec.get(c)!.caja)));
		origen = { centro: centroDe(cusecs) ?? origen?.centro ?? [0, 0], donde: T.presupuesto.cercanas.a(v.nombre) };
		if (cusecs.length > 1) mensajeBusqueda = T.buscador.calleVarias(v.nombre, numero(cusecs.length));
	}

	function vaciarBusqueda() {
		mensajeBusqueda = null;
		resaltadas = new Set();
		origen = null;
		barrioUrl = null;
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
		const centro = centroDe(cusecs);
		origen = centro ? { centro, donde: T.presupuesto.cercanas.aTuUbicacion } : null;
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

	const cambiarCapa = (nueva: CapaMapa) => {
		seleccion = null;
		mensajeBusqueda = null;
		hojaEstado = nueva === 'presupuesto' ? 'cerrada' : 'media';
	};
	const elegirFuente = (v: FuenteMapa) => (fuenteReferencia = v);
	/** Al mover una barra en móvil la hoja se cierra: el mapa tiene que verse mientras se arrastra */
	const alArrastrar = () => {
		if (movil) hojaEstado = 'cerrada';
	};

	/** Al elegir una zona de la lista, se abre su ficha y la vista va a ella */
	function irAZona(cusec: string) {
		const c = madrid?.porCusec.get(cusec);
		if (c) llevarA(c.caja);
		void elegirZona(cusec);
	}
</script>

<svelte:head>
	<title>{T.titulo} · A su precio</title>
	<meta name="description" content={T.intro} />
</svelte:head>

{#snippet muestras()}
	{#if calculada}
		<div class="muestras" style:--n={calculada.leyenda.length + 1}>
			{#each calculada.leyenda as l (l.etiqueta)}
				<div class="muestra">
					<span class="color" style:background={l.tono === null ? undefined : tonosCapa[l.tono]}></span>
					<span class="etiqueta-l">{l.etiqueta}</span>
				</div>
			{/each}
			<div class="muestra">
				<span class="color rayado" class:plano={capa === 'presupuesto'}></span>
				<span class="etiqueta-l">{T.sinDato}</span>
			</div>
		</div>
		{#if anuncios}
			<div class="muestra-punteado">
				<span class="color punteado"></span>
				<span class="etiqueta-l">{TA.punteado}</span>
			</div>
		{/if}
	{/if}
{/snippet}

<!-- Presupuesto y metros: barra y número sincronizados. En móvil, compactos y fijos sobre el mapa -->
{#snippet controles(compacto: boolean)}
	<div class="controles-presupuesto" class:compactos={compacto}>
		<ControlDeslizante
			id="presupuesto"
			etiqueta={T.presupuesto.campoPresupuesto}
			etiquetaCorta={T.presupuesto.campoPresupuestoCorto}
			bind:valor={presupuesto}
			rango={RANGO_PRESUPUESTO}
			unidad="€"
			formato={(n) => T.presupuesto.valorPresupuesto(euros(n))}
			{compacto}
			{alArrastrar}
		/>
		<ControlDeslizante
			id="metros"
			etiqueta={T.presupuesto.campoMetros}
			etiquetaCorta={T.presupuesto.campoMetrosCorto}
			bind:valor={metros}
			rango={RANGO_METROS}
			unidad="m²"
			formato={(n) => T.presupuesto.valorMetros(numero(n))}
			{compacto}
			{alArrastrar}
		/>
	</div>
{/snippet}

<!-- Móvil, «Mi presupuesto»: los tres colores siempre a la vista, bajo los controles -->
{#snippet chipsPresupuesto()}
	<ul class="chips-leyenda solo-movil" aria-label={TA.leyendaPresupuesto(mesOferta)}>
		{#each [textosPresupuesto.debajo, textosPresupuesto.dentro, textosPresupuesto.margen] as nombre, i (nombre)}
			<li><span class="punto" style:background={tonosCapa[i]}></span>{nombre}</li>
		{/each}
	</ul>
{/snippet}

{#snippet notas()}
	{#if calculada}
		<span class="nota">{calculada.nota} {anuncios ? TA.notaSinDato : T.notaSinDato}</span>
		{#if capa === 'evolucion'}<span class="nota">{T.avisoEvolucion}</span>{/if}
	{/if}
{/snippet}

<div class="pagina" data-listo={listo} style:--vv-alto={movil && altoVisual ? `${altoVisual}px` : undefined} style:--vv-top="{movil ? topVisual : 0}px">
	<Cabecera derecha="madrid" actual="mapa" />

	<main class="rejilla" class:con-fuente={conSelector} bind:clientHeight={altoRejilla} style:--hoja-alto={movil ? `${altoHoja}px` : '0px'} style:--alto-controles="{ALTO_CONTROLES}px">
		<section class="cabeza">
			<h1>{titulo}</h1>
			<p>{intro}</p>
		</section>

		<div class="conmutador">
			<Segmentado
				nombre="capa"
				etiqueta={T.capas.etiqueta}
				bind:valor={capa}
				onchange={cambiarCapa}
				opciones={[
					...(conPresupuesto ? [{ valor: 'presupuesto' as const, etiqueta: T.capas.presupuesto }] : []),
					{ valor: 'referencia' as const, etiqueta: T.capas.referencia },
					{ valor: 'evolucion' as const, etiqueta: T.capas.evolucion }
				]}
			/>
			{#if conSelector}
				<Segmentado
					nombre="fuente"
					etiqueta={TA.fuente.etiqueta}
					valor={fuente}
					onchange={elegirFuente}
					opciones={[
						{ valor: 'contratos', etiqueta: TA.fuente.contratos },
						{ valor: 'anuncios', etiqueta: TA.fuente.anuncios }
					]}
				/>
			{/if}
		</div>

		{#if capa === 'presupuesto'}
			{#if movil}<div class="controles-fijos">{@render controles(true)}</div>{/if}
			{@render chipsPresupuesto()}
		{/if}

		<section class="mapa" aria-label={T.mapa} aria-busy={estado === 'cargando'}>
			{#if estado === 'listo' && madrid}
				<MapaMadrid {madrid} {tonos} {capa} {fuente} punteadas={calculada?.punteadas} {seleccion} {resaltadas} {enfoque} margenInferior={movil ? altoHoja : 0} margenSuperior={movil ? (capa === 'presupuesto' ? ARRIBA_PRESUPUESTO : 64) + (conSelector ? 50 : 0) : 0} alElegir={elegirZona} />
				{#if rotulo}<p class="rotulo" role="note">{rotulo}</p>{/if}
			{:else if estado === 'fallo'}
				<div class="mensaje-mapa">
					<p>{T.fallo}</p>
					<button type="button" class="boton-paja" onclick={cargar}>{T.reintentar}</button>
				</div>
			{:else}
				<div class="mensaje-mapa esqueleto"><p>{T.cargando}</p></div>
			{/if}
		</section>

		<div class="panel" class:con-ficha={!!hoja}>
			<HojaArrastrable bind:estado={hojaEstado} bind:altoVisible={altoHoja} alto={altoRejilla} reservaSuperior={capa === 'presupuesto' ? ARRIBA_CONTROLES : conSelector ? 114 : 64}>
				{#snippet cabecera()}
					<div class="cab-leyenda" aria-label={tituloLeyenda}>
						<span class="leyenda-titulo">{calculada ? tituloLeyenda : capa === 'presupuesto' ? textosPresupuesto.pideDatos : ''}</span>
						{@render muestras()}
						{#if movil && fraseResumen}<strong class="resumen-cab" role="status">{fraseResumen}</strong>{/if}
					</div>
				{/snippet}

				<div class="controles">
					<section class="ajustes" aria-label="Qué mostrar">
						{#if capa === 'referencia' && !anuncios}
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
								{#if !movil}{@render controles(false)}{/if}
								<p class="aviso destacado">{textosPresupuesto.aviso}</p>
							</div>
						{/if}

						{#if capa === 'presupuesto'}
							<div class="resumen" role="status">
								{#if resumen && resumen.conDato > 0 && resumen.llega === 0}
									<strong class="solo-escritorio">{textosPresupuesto.ninguna.titulo}</strong>
									<span>{textosPresupuesto.ninguna.texto}</span>
								{:else if resumen}
									<strong class="solo-escritorio">{fraseResumen}</strong>
									{#if extremo}<span>{T.presupuesto.extremo[extremo]}</span>{/if}
									<span class="nota">{T.presupuesto.notaPoblacion}</span>
								{:else}
									<span>{textosPresupuesto.pideDatos}</span>
								{/if}
							</div>
							{#if cercanas.length && origen}
								<div class="cercanas">
									<h2 class="cercanas-titulo">{textosPresupuesto.cercanas(origen.donde)}</h2>
									<ul>
										{#each cercanas as c (c.cusec)}
											<li>
												<button type="button" onclick={() => irAZona(c.cusec)} aria-current={seleccion === c.cusec}>
													<span>{c.nombre}</span>
													<span class="distancia">{distanciaCorta(c.metros)}</span>
												</button>
											</li>
										{/each}
									</ul>
								</div>
							{/if}
						{/if}
					</section>

					<section class="busqueda" aria-label="Buscar en el mapa">
						<BuscadorMapa alElegirZona={buscarZona} alElegirVia={buscarVia} alVaciar={vaciarBusqueda} mensaje={mensajeBusqueda} {rellenar} />

						<div class="ubicacion">
							<button type="button" class="boton-paja" onclick={miUbicacion} disabled={estado !== 'listo' || ubicacion === 'pidiendo'}>
								{ubicacion === 'pidiendo' ? T.ubicacion.buscando : T.ubicacion.boton}
							</button>
							<span class="nota">{T.ubicacion.nota}</span>
							{#if ubicacion === 'denegada'}<p class="aviso" role="status">{T.ubicacion.denegada}</p>{/if}
							{#if ubicacion === 'fuera'}<p class="aviso" role="status">{T.ubicacion.fuera}</p>{/if}
						</div>
					</section>

					<div class="notas solo-movil">{@render notas()}</div>
				</div>

				<section class="ficha" aria-live="polite" aria-label="Zona elegida" bind:this={hojaEl}>
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
						<p class="nota solo-escritorio">{anuncios ? TA.hoja.vacia : T.hoja.vacia}</p>
					{/if}
				</section>

				<div class="solo-movil pie-hoja"><Pie /></div>
			</HojaArrastrable>
		</div>

		<section class="leyenda" aria-label={tituloLeyenda}>
			{#if calculada}
				<span class="leyenda-titulo">{tituloLeyenda}</span>
				{@render muestras()}
				{@render notas()}
			{/if}
		</section>
	</main>

	<div class="pie-pagina"><Pie /></div>
</div>

<style>
	.pagina {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		font-variant-numeric: tabular-nums;
	}
	.pagina > :global(footer),
	.pie-pagina {
		margin-top: auto;
	}
	.rejilla {
		width: 100%;
		max-width: 1240px;
		margin: 0 auto;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		min-width: 0;
	}
	.cabeza {
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
	.mapa {
		grid-area: mapa;
		min-width: 0;
	}
	.panel {
		grid-area: panel;
		min-width: 0;
	}
	.conmutador {
		grid-area: conmutador;
	}
	.leyenda {
		grid-area: leyenda;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.controles,
	.ficha {
		display: flex;
		flex-direction: column;
		gap: 16px;
		min-width: 0;
	}
	.ajustes,
	.busqueda {
		display: flex;
		flex-direction: column;
		gap: 14px;
		min-width: 0;
	}
	.notas {
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
	/* Cinco chips en una sola fila, a partes iguales (en 360 px cada uno mide unos 58 px) */
	.chips {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 6px;
	}
	.chip {
		min-height: 44px;
		min-width: 0;
		padding: 0 2px;
		white-space: nowrap;
		border: 1.5px solid var(--tinta);
		border-radius: var(--radio);
		background: transparent;
		color: var(--tinta);
		font: 700 14px/1 var(--f-texto);
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
	.aviso {
		background: var(--superficie);
		border-radius: var(--radio);
		padding: 10px 12px;
		font: 500 14px/1.45 var(--f-texto);
	}
	/* «Son anuncios recientes, no contratos firmados»: tiene que leerse, no quedar como nota al pie */
	.aviso.destacado {
		border-left: 3px solid var(--tinta);
		font: 600 15px/1.45 var(--f-texto);
		color: var(--tinta);
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

	/* Zonas más cercanas donde llega */
	.cercanas {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.cercanas-titulo {
		font: 700 15px/1.3 var(--f-texto);
	}
	.cercanas ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.cercanas button {
		width: 100%;
		min-height: 44px;
		padding: 0 14px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		border: 1.5px solid var(--tinta);
		border-radius: var(--radio);
		background: transparent;
		color: var(--tinta);
		font: 600 15px/1.2 var(--f-texto);
		text-align: left;
	}
	.cercanas button[aria-current='true'] {
		background: var(--paja);
	}
	.distancia {
		flex: none;
		font-weight: 500;
		color: var(--grafito);
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

	/* Ficha de la zona */
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
		grid-template-columns: repeat(var(--n), minmax(0, 1fr));
		gap: 4px;
	}
	.muestra {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}
	.color {
		height: 16px;
		border-radius: 2px;
		border: 1px solid #857f74;
	}
	.color.rayado {
		background: repeating-linear-gradient(45deg, #dad5ca 0 3px, #857f74 3px 4.5px);
	}
	/* Fuente «Anuncios»: muestra del punteado (valor del distrito), en su propia línea */
	.muestra-punteado {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.muestra-punteado .color {
		width: 36px;
		flex: none;
	}
	.color.punteado {
		background: radial-gradient(circle, #5b3a7d 0.9px, transparent 1.2px) 0 0 / 5px 5px, #c9b1db;
	}
	.color.rayado.plano {
		background: #efece4;
	}
	/* Presupuesto y metros: en escritorio, en el panel; en móvil, fijos y compactos sobre el mapa, bajo el conmutador */
	.controles-presupuesto {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.controles-fijos {
		position: absolute;
		z-index: 3;
		top: 64px;
		left: var(--margen);
		right: var(--margen);
		padding: 7px 10px;
		border-radius: var(--radio);
		background: #f6f4ee;
		box-shadow: 0 1px 4px rgb(28 27 25 / 0.25);
	}
	.controles-fijos .controles-presupuesto {
		gap: 6px;
	}
	/* La frase de resumen, siempre a la vista en la cabecera de la hoja */
	.resumen-cab {
		font: 700 14px/1.3 var(--f-texto);
	}
	.chips-leyenda {
		position: absolute;
		z-index: 3;
		top: calc(64px + var(--alto-controles, 100px) + 6px);
		left: var(--margen);
		right: var(--margen);
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 6px;
		pointer-events: none;
	}
	.chips-leyenda li {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-width: 0;
		padding: 6px 4px;
		border-radius: var(--radio);
		background: #f6f4ee;
		box-shadow: 0 1px 4px rgb(28 27 25 / 0.25);
		font: 700 13px/1.1 var(--f-texto);
		white-space: nowrap;
	}
	.punto {
		flex: none;
		width: 14px;
		height: 14px;
		border-radius: 3px;
		border: 1px solid #5f5a50;
	}
	.etiqueta-l {
		font: 600 12px/1.2 var(--f-semi);
		white-space: nowrap;
	}
	.cab-leyenda {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	/* ——— Móvil primero: el mapa es la página y todo lo demás va en la hoja inferior ——— */
	.solo-escritorio {
		display: none;
	}
	.pie-pagina,
	.leyenda,
	.cabeza p {
		display: none;
	}
	.cabeza h1 {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	.pagina {
		position: fixed;
		left: 0;
		right: 0;
		top: var(--vv-top, 0px);
		height: var(--vv-alto, 100dvh);
		min-height: 0;
		overflow: hidden;
	}
	.rejilla {
		flex: 1;
		min-height: 0;
		position: relative;
		max-width: none;
		display: block;
	}
	.mapa {
		position: absolute;
		inset: 0;
	}
	.conmutador {
		display: flex;
		flex-direction: column;
		gap: 6px;
		position: absolute;
		z-index: 3;
		top: 10px;
		left: var(--margen);
		right: var(--margen);
		filter: drop-shadow(0 2px 6px rgb(28 27 25 / 0.25));
	}
	/* Rótulo de la fuente «Anuncios» sobre el mapa: abajo a la izquierda, sobre la hoja y sin tapar los botones de zoom */
	.rotulo {
		position: absolute;
		z-index: 2;
		left: 10px;
		right: 64px;
		bottom: calc(var(--hoja-alto, 0px) + 10px);
		max-width: 440px;
		margin: 0;
		padding: 6px 10px;
		border-radius: var(--radio);
		background: #f6f4ee;
		border: 1.5px solid var(--tinta);
		font: 600 12.5px/1.35 var(--f-texto);
		pointer-events: none;
	}
	.pie-hoja {
		margin: 0 calc(-1 * var(--margen));
	}
	.pie-hoja :global(footer) {
		margin-top: 8px;
	}
	.panel.con-ficha :global(.controles) {
		display: none;
	}
	.ficha:empty {
		display: none;
	}
	/* En la hoja, «Comprueba un anuncio aquí» sube antes de la procedencia: se ve sin desplazarse */
	.ficha .boton-paja {
		order: 1;
	}
	.ficha .nota {
		order: 2;
	}

	@media (min-width: 960px) {
		.solo-escritorio {
			display: block;
		}
		.solo-movil {
			display: none !important;
		}
		.pie-pagina {
			display: block;
		}
		.leyenda {
			display: flex;
		}
		.cabeza p {
			display: block;
		}
		.cabeza h1 {
			position: static;
			width: auto;
			height: auto;
			overflow: visible;
			clip-path: none;
			white-space: normal;
			font-size: 64px;
		}
		.pagina {
			position: static;
			height: auto;
			min-height: 100vh;
			overflow: visible;
		}
		.rejilla {
			flex: none;
			display: grid;
			grid-template-columns: minmax(0, 1fr) 380px;
			grid-template-areas: 'cabeza cabeza' 'mapa conmutador' 'mapa panel' 'leyenda leyenda';
			grid-template-rows: auto auto 1fr auto;
			gap: 20px 28px;
			padding: 12px 40px 8px;
			align-items: start;
		}
		.cabeza {
			grid-area: cabeza;
		}
		.mapa {
			position: relative;
			inset: auto;
			height: min(76vh, 760px);
			min-height: 520px;
		}
		.conmutador {
			position: static;
			filter: none;
		}
		.panel :global(.controles),
		.panel.con-ficha :global(.controles) {
			display: flex;
		}
		.ficha .boton-paja,
		.ficha .nota {
			order: 0;
		}
	}
</style>
