<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Cabecera from '#lib/componentes/Cabecera.svelte';
	import Formulario, { type Problema } from '#lib/componentes/Formulario.svelte';
	import HistorialSesion from '#lib/componentes/HistorialSesion.svelte';
	import Mapa from '#lib/componentes/Mapa.svelte';
	import Negociar from '#lib/componentes/Negociar.svelte';
	import Pie from '#lib/componentes/Pie.svelte';
	import Resultado from '#lib/componentes/Resultado.svelte';
	import SinConexion from '#lib/componentes/SinConexion.svelte';
	import SinDato from '#lib/componentes/SinDato.svelte';
	import {
		DESCRIPCION, NOMBRE, SUBTITULAR_INICIO, TITULAR_INICIO, FORMULARIO,
		construirTarjeta, contadorBarrio, contadorInicio, filaHistorial, normalizarNumero, pantallaSinDato,
		type Pantalla, type PantallaResultado, type Ubicacion
	} from '#lib/resultado';
	import { type ErroresCampos, comprobar, validarCampo } from '#lib/cliente/analisis';
	import { precargarDatos } from '#lib/cliente/datos';
	import { type EstadoFormulario, type ModoUbicacion, estadoInicial } from '#lib/cliente/estado';
	import { type Entrada, guardarHistorial, leerHistorial } from '#lib/cliente/historial';
	import { compartirTarjeta } from '#lib/cliente/compartir';
	import { contarCompletado, evento, leerOrigenDeLaUrl, recuentos, tarjetaOrigen } from '#lib/cliente/eventos';
	import { dibujarTarjeta } from '#lib/cliente/tarjeta-canvas';
	import { TARJETA } from '#lib/resultado';

	type Fase = 'inicio' | 'buscando' | 'resultado' | 'negociar' | 'sin_conexion';

	let f = $state<EstadoFormulario>(estadoInicial());
	let errores = $state<ErroresCampos>({});
	let fase = $state<Fase>('inicio');
	let pantalla = $state<Pantalla | null>(null);
	let ubicacion = $state<Ubicacion | null>(null);
	let problema = $state<Problema | null>(null);
	let pin = $state<Ubicacion | null | 'fuera'>(null);
	let historial = $state<Entrada[]>([]);
	let activa = $state<number | null>(null);
	let ficha: HTMLElement | undefined = $state();

	// Los contadores son reales o no se muestran. Llegarán del servidor (Hito 5); sin dato, ocultos.
	let totalPisos = $state<number | null>(null);
	let pisosBarrio = $state<number | null>(null);
	const contadorHome = $derived(contadorInicio(totalPisos));
	const contadorDelBarrio = $derived(contadorBarrio(pisosBarrio));

	const hayResultado = $derived(fase === 'resultado' || fase === 'negociar' || fase === 'sin_conexion');
	const resultado = $derived<PantallaResultado | null>(pantalla?.tipo === 'resultado' ? pantalla : null);

	// Marca que la página ya responde (las pruebas esperan a esto antes de escribir)
	let listo = $state(false);
	onMount(() => {
		listo = true;
		leerOrigenDeLaUrl();
		evento('llegada', { unaVez: true });
		void recuentos().then((r) => (totalPisos = r?.total ?? null));
		precargarDatos();
		historial = leerHistorial();
	});

	// ——— Tarjeta ———
	let canvasTarjeta: HTMLCanvasElement | undefined = $state();
	let compartiendo = $state(false);
	let mensajeTarjeta = $state<string | null>(null);

	$effect(() => {
		if (canvasTarjeta && resultado && resultado.vista.clase === 'c') {
			void dibujarTarjeta(canvasTarjeta, construirTarjeta(resultado));
		}
	});

	async function compartir() {
		if (!resultado || !canvasTarjeta) return;
		compartiendo = true;
		mensajeTarjeta = null;
		try {
			const r = await compartirTarjeta(construirTarjeta(resultado), canvasTarjeta);
			if (r.via !== 'cancelada') evento('comparte', { tarjeta: r.url?.split('/').pop() ?? null });
			mensajeTarjeta =
				r.via === 'descargada' ? (r.enlaceCopiado ? `${TARJETA.descargada} ${TARJETA.enlaceCopiado}` : TARJETA.descargada) : null;
		} catch {
			mensajeTarjeta = TARJETA.error;
		} finally {
			compartiendo = false;
		}
	}

	// ——— Flujo ———
	let turno = 0;

	function mostrar(p: Pantalla, u: Ubicacion | null, alHistorial = true) {
		pantalla = p;
		ubicacion = u;
		problema = null;
		errores = {};
		mensajeTarjeta = null;
		fase = 'resultado';
		if (alHistorial) {
			const nueva: Entrada = { id: crypto.randomUUID(), pantalla: p, formulario: { ...f } };
			historial = [nueva, ...historial].slice(0, 20);
			guardarHistorial(historial);
			activa = 0;
		} else {
			activa = null;
		}
		void irAlResultado();
		if (alHistorial && p.tipo === 'resultado') {
			evento('completa');
			const origen = tarjetaOrigen();
			if (origen) evento('desde_tarjeta', { tarjeta: origen, unaVez: true });
			if (contarCompletado() === 2) evento('segundo');
			pisosBarrio = null;
			void recuentos(p.barrioCodigo).then((r) => (pisosBarrio = r?.barrio ?? null));
		}
	}

	async function irAlResultado() {
		await tick();
		if (!matchMedia('(min-width: 1024px)').matches) scrollTo({ top: 0 });
		ficha?.focus({ preventScroll: true });
	}

	async function enviar() {
		const miTurno = ++turno;
		problema = null;
		fase = 'buscando';
		try {
			const r = await comprobar(f, pin);
			if (miTurno !== turno) return;
			if (r.tipo === 'errores') {
				errores = r.errores;
				fase = 'inicio';
			} else if (r.tipo === 'no_encontrada') {
				problema = { tipo: 'no_encontrada', sugerencias: r.sugerencias };
				errores = {};
				fase = 'inicio';
			} else if (r.tipo === 'pedir_numero') {
				problema = { tipo: 'pedir_numero', calle: r.calle, nSecciones: r.nSecciones };
				errores = {};
				fase = 'inicio';
			} else {
				mostrar(r.pantalla, r.ubicacion);
			}
		} catch {
			if (miTurno !== turno) return;
			// Sin red o sin servidor (o datos que no cargan): se conservan los datos escritos y se ofrece reintentar
			fase = 'sin_conexion';
		}
	}

	function otroPiso() {
		fase = 'inicio';
		activa = null;
		void tick().then(() => {
			if (!matchMedia('(min-width: 1024px)').matches) scrollTo({ top: 0 });
			document.getElementById(f.modo === 'mapa' ? 'precio' : 'direccion')?.focus();
		});
	}

	function salirDe(campo: 'precio' | 'superficie') {
		const e = validarCampo(f, campo);
		// Solo se avisa si ya hay algo escrito: un campo vacío no es un error hasta que se envía
		const vacio = (campo === 'precio' ? f.precio : f.superficie).trim() === '';
		errores = { ...errores, [campo]: vacio ? undefined : e };
		// «2200» y «2200€» se muestran como «2.200»
		const bonito = normalizarNumero(campo === 'precio' ? f.precio : f.superficie);
		if (bonito !== null) f[campo] = bonito;
	}

	function cambiarModo(m: ModoUbicacion) {
		f.modo = m;
		problema = null;
		errores = {};
	}

	function elegirSugerencia(nombre: string) {
		const numero = f.direccion.match(/(\d+\s*[a-zA-Z]?)\s*$/)?.[1];
		f.direccion = numero && f.modo === 'direccion' ? `${nombre}, ${numero.trim()}` : nombre;
		void enviar();
	}

	function habitacion() {
		turno++;
		evento('habitacion');
		// La pantalla de habitación no cuenta como comprobación del historial
		mostrar(pantallaSinDato('habitacion'), null, false);
	}

	function marcarPunto(u: Ubicacion | null) {
		pin = u ?? 'fuera';
		errores = { ...errores, mapa: undefined };
	}

	async function añadirNumero() {
		f.modo = 'direccion';
		fase = 'inicio';
		await tick();
		const campo = document.getElementById('direccion') as HTMLInputElement | null;
		campo?.focus();
		campo?.setSelectionRange(campo.value.length, campo.value.length);
	}

	function elegirHistorial(i: number) {
		const e = historial[i];
		if (!e) return;
		turno++;
		pantalla = e.pantalla;
		f = { ...estadoInicial(), ...(e.formulario as Partial<EstadoFormulario>) };
		fase = 'resultado';
		activa = i;
		mensajeTarjeta = null;
		void irAlResultado();
	}

	const filas = $derived(historial.map((e) => filaHistorial(e.pantalla)));
	const puedeAñadirNumero = $derived(ubicacion?.motivo === 'calle');
	const cabecera = $derived(fase === 'negociar' ? 'volver' : hayResultado ? 'otro' : 'madrid');
</script>

<svelte:head>
	<title>{NOMBRE} · ¿Tiene sentido este precio?</title>
	<meta name="description" content={DESCRIPCION} />
	<meta property="og:title" content={NOMBRE} />
	<meta property="og:description" content={DESCRIPCION} />
	<meta property="og:type" content="website" />
</svelte:head>

<div class="pagina" data-fase={fase} data-listo={listo}>
	<div class="cabecera-caja" class:con-resultado={hayResultado}>
		<Cabecera derecha={cabecera} alOtroPiso={otroPiso} alVolver={() => (fase = 'resultado')} />
	</div>

	<div class="rejilla" class:hay-resultado={hayResultado}>
		<section class="hero" aria-label="Qué hace {NOMBRE}">
			<h1>
				{TITULAR_INICIO[0]}
				<span class="subrayado">{TITULAR_INICIO[1]}</span>
			</h1>
			<p class="subtitular">{SUBTITULAR_INICIO}</p>
			{#if contadorHome}
				<p class="contador">
					{#if contadorHome.numero}<span class="contador-num">{contadorHome.numero}</span>{/if}
					<span>{contadorHome.texto}</span>
				</p>
			{/if}
			<div class="fantasma" aria-hidden="true">
				<p>Aquí verás el anuncio frente a la referencia de su zona.</p>
				<div class="fantasma-barra">
					<span class="f-anuncio">tu anuncio</span>
					<span class="f-pista"></span>
					<span class="f-ref">referencia</span>
					<span class="f-punto"></span>
					<span class="f-cero">0&nbsp;€</span>
				</div>
			</div>
		</section>

		<aside class="lado">
			<h2 class="titulo-lado">{FORMULARIO.titulo}</h2>
			<Formulario
				bind:f
				{errores}
				{problema}
				buscando={fase === 'buscando'}
				comprobado={hayResultado}
				alEmpezar={() => evento('empieza', { unaVez: true })}
				alEnviar={enviar}
				alSalirDe={salirDe}
				alHabitacion={habitacion}
				alElegirSugerencia={elegirSugerencia}
				alCambiarModo={cambiarModo}
			>
				{#snippet mapa()}<Mapa alMarcar={marcarPunto} />{/snippet}
			</Formulario>
			<div class="historial"><HistorialSesion {filas} {activa} alElegir={elegirHistorial} /></div>
		</aside>

		<main class="principal" bind:this={ficha} tabindex="-1">
			{#if fase === 'sin_conexion'}
				<SinConexion formulario={f} alReintentar={enviar} alEditar={otroPiso} />
			{:else if fase === 'negociar' && resultado}
				<Negociar pantalla={resultado} alVolver={() => (fase = 'resultado')} />
			{:else if pantalla?.tipo === 'resultado'}
				<Resultado
					pantalla={pantalla}
					contador={contadorDelBarrio}
					{compartiendo}
					{mensajeTarjeta}
					alOtro={otroPiso}
					alNegociar={() => {
						fase = 'negociar';
						scrollTo({ top: 0 });
					}}
					alAñadirNumero={puedeAñadirNumero ? añadirNumero : undefined}
					alCompartir={compartir}
					alServido={(si) => evento(si ? 'servido_si' : 'servido_no')}
				>
					{#snippet tarjeta()}
						<canvas bind:this={canvasTarjeta} class="tarjeta-canvas" aria-label="Vista previa de la tarjeta para compartir"></canvas>
					{/snippet}
				</Resultado>
			{:else if pantalla?.tipo === 'sin_dato'}
				<SinDato {pantalla} alOtro={otroPiso} />
			{/if}
		</main>
	</div>

	<Pie />
</div>

<style>
	.pagina {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}
	.pagina > :global(footer) {
		margin-top: auto;
	}

	/* —— Móvil: una columna. Inicio = título + formulario; resultado = pantalla de resultado —— */
	.rejilla {
		display: flex;
		flex-direction: column;
		flex: 1;
	}
	.hero {
		padding: 28px var(--margen) 0;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.hero h1 {
		font: 800 60px/0.9 var(--f-extra);
		text-transform: uppercase;
	}
	.subrayado {
		text-decoration: underline;
		text-decoration-color: var(--paja);
		text-decoration-thickness: 0.16em;
		text-underline-offset: 0.02em;
		text-decoration-skip-ink: none;
	}
	.subtitular {
		font: 400 17px/1.5 var(--f-texto);
		text-wrap: pretty;
	}
	.contador {
		display: flex;
		align-items: center;
		gap: 12px;
		font: 500 15px/1.35 var(--f-texto);
	}
	.contador-num {
		font: 800 34px/1 var(--f-extra);
	}
	.fantasma {
		display: none;
	}
	.lado {
		padding: 24px 12px 0;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}
	.titulo-lado {
		display: none;
	}
	.historial {
		display: none;
	}
	.principal {
		display: none;
		outline: none;
	}
	.tarjeta-canvas {
		width: 100%;
		height: 100%;
		display: block;
	}

	/* Con resultado, en móvil solo se ve la pantalla de resultado */
	.rejilla.hay-resultado .hero,
	.rejilla.hay-resultado .lado {
		display: none;
	}
	.rejilla.hay-resultado .principal {
		display: flex;
		justify-content: center;
	}

	/* —— Escritorio: formulario fijo a la izquierda (440 px) y resultado o título a la derecha —— */
	@media (min-width: 1024px) {
		.rejilla {
			display: grid;
			grid-template-columns: 440px minmax(0, 1fr);
			grid-template-areas: 'lado centro';
			align-items: start;
			min-height: 640px;
		}
		.lado {
			grid-area: lado;
			position: sticky;
			top: 0;
			padding: 16px 32px 40px 40px;
		}
		.titulo-lado {
			display: block;
			font: 700 22px/1.2 var(--f-texto);
		}
		.historial {
			display: block;
		}
		.hero,
		.principal {
			grid-area: centro;
			border-left: 1px solid var(--pista);
			align-self: stretch;
			padding: 16px 48px 48px;
		}
		.hero {
			padding-top: 40px;
			width: 100%;
			align-items: center;
		}
		.hero > * {
			width: min(600px, 100%);
		}
		.hero h1 {
			font-size: 104px;
			line-height: 0.86;
			margin-top: 0;
		}
		.hero {
			gap: 28px;
		}
		.subrayado {
			text-decoration-thickness: 0.15em;
		}
		.subtitular {
			font-size: 19px;
			padding-right: 80px;
		}
		.contador {
			font-size: 16px;
		}
		.contador-num {
			font-size: 40px;
		}
		.fantasma {
			display: flex;
			flex-direction: column;
			gap: 22px;
			background: var(--superficie);
			border-radius: var(--radio);
			padding: 28px;
		}
		.fantasma p {
			font: 600 17px/1.4 var(--f-texto);
		}
		.fantasma-barra {
			position: relative;
			height: 84px;
		}
		.fantasma-barra span {
			position: absolute;
			font: 500 13px/1.3 var(--f-semi);
			color: var(--grafito);
		}
		.f-anuncio {
			top: 0;
			left: 78%;
			transform: translateX(-50%);
		}
		.f-pista {
			left: 0;
			right: 0;
			top: 24px;
			height: 28px;
			background: var(--pista);
		}
		.f-ref {
			left: 42%;
			width: 24%;
			top: 24px;
			height: 28px;
			border: 1.5px dashed var(--piedra);
			display: flex !important;
			align-items: center;
			justify-content: center;
			font-size: 12px !important;
			font-weight: 600 !important;
		}
		.f-punto {
			left: 78%;
			top: 24px;
			width: 28px;
			height: 28px;
			margin-left: -14px;
			border-radius: 50%;
			border: 1.5px dashed var(--piedra);
		}
		.f-cero {
			left: 0;
			top: 62px;
			font-size: 12px !important;
		}
		/* El formulario siempre está; con resultado, el título deja su sitio al resultado */
		.rejilla.hay-resultado .lado {
			display: flex;
		}
		.rejilla.hay-resultado .hero {
			display: none;
		}
		.principal {
			display: none;
		}
		.rejilla.hay-resultado .principal {
			display: flex;
		}
	}
	.cabecera-caja {
		display: block;
	}
</style>
