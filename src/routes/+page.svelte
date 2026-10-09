<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Cabecera from '#lib/componentes/Cabecera.svelte';
	import Formulario, { type Problema } from '#lib/componentes/Formulario.svelte';
	import HistorialSesion from '#lib/componentes/HistorialSesion.svelte';
	import Mapa from '#lib/componentes/Mapa.svelte';
	import Negociar from '#lib/componentes/Negociar.svelte';
	import Pie from '#lib/componentes/Pie.svelte';
	import ConfirmarPrecio from '#lib/componentes/ConfirmarPrecio.svelte';
	import Resultado from '#lib/componentes/Resultado.svelte';
	import MuestraResultado from '#lib/componentes/MuestraResultado.svelte';
	import ResultadoHabitacion from '#lib/componentes/ResultadoHabitacion.svelte';
	import ResultadoInquilino, { type EstadoAporte } from '#lib/componentes/ResultadoInquilino.svelte';
	import SinConexion from '#lib/componentes/SinConexion.svelte';
	import SinDato from '#lib/componentes/SinDato.svelte';
	import TuZona from '#lib/componentes/TuZona.svelte';
	import { type TuZonaCargada, cargarTuZona } from '#lib/cliente/zona';
	import {
		AFINAR, DESCRIPCION, LEMA, NOMBRE, SUBTITULAR_INICIO, TITULAR_INICIO, FORMULARIO, FORMULARIO_VIVO,
		construirTarjeta, construirTarjetaInquilino, textoCompartir, textosEnlace, textosInquilino, contadorBarrio, enlacesCompartir, idDeTarjeta, type Canal, filaHistorial, interpretarNumero, normalizarNumero, pantallaSinDato, pantallaSinDatoDeClave,
		parecePrecioErroneo,
		type Pantalla, type PantallaResultado, type SugerenciaZona, type Ubicacion
	} from '#lib/resultado';
	import { type ErroresCampos, comprobar, validarCampo } from '#lib/cliente/analisis';
	import { precargarDatos } from '#lib/cliente/datos';
	import type { Punto } from '#lib/cliente/mapa';
	import { tomarPrellenado } from '#lib/cliente/prellenado';
	import { type EstadoFormulario, type ModoUbicacion, estadoInicial, modoGuardado } from '#lib/cliente/estado';
	import { type Entrada, guardarHistorial, leerHistorial } from '#lib/cliente/historial';
	import { enviarAportacion, enviarHabitacion, pedirComparacion } from '#lib/cliente/aportacion';
	import { registrarAnalisis } from '#lib/cliente/registro';
	import {
		compartirNativo, copiarEnlace, descargarImagen, puedeCompartirNativo, subirTarjeta, urlDeTarjeta
	} from '#lib/cliente/compartir';
	import { aporta, completa, comparte, confirmaPrecio, empieza, errorGeocodificador, queHaras, sinDato } from '#lib/cliente/analitica';
	import { datosCompleta, modoDe, motivoDeSinDato, resultadoDeClase } from '#lib/cliente/analitica-datos';
	import { recuentos } from '#lib/cliente/contadores';
	import { leerOrigenDeLaUrl } from '#lib/cliente/origen';
	import { dibujarTarjeta } from '#lib/cliente/tarjeta-canvas';
	import { MAPA_REFERENCIA, TARJETA, urlAbsoluta } from '#lib/resultado';

	type Fase = 'inicio' | 'buscando' | 'confirmar' | 'resultado' | 'negociar' | 'sin_conexion';

	let f = $state<EstadoFormulario>(estadoInicial());
	let errores = $state<ErroresCampos>({});
	let fase = $state<Fase>('inicio');
	let pantalla = $state<Pantalla | null>(null);
	let pendiente = $state<{ pantalla: PantallaResultado; ubicacion: Ubicacion | null } | null>(null);
	let ubicacion = $state<Ubicacion | null>(null);
	let problema = $state<Problema | null>(null);
	let pin = $state<Ubicacion | null | 'fuera'>(null);
	let historial = $state<Entrada[]>([]);
	let activa = $state<number | null>(null);
	let ficha: HTMLElement | undefined = $state();
	// «Tu zona»: se calcula en el navegador cuando hay resultado, sin bloquear el resultado
	let tuZona = $state<{ estado: 'cargando' | 'listo' | 'fallo'; datos: TuZonaCargada | null }>({ estado: 'cargando', datos: null });
	let turnoZona = 0;
	/** Lo que dice la tarjeta, para quien no la ve (y para el pie de la tarjeta ampliada) */
	const descripcionTarjeta = $derived.by(() => {
		if (!tarjetaActual) return 'Vista previa de la tarjeta para compartir';
		const e = textosEnlace(tarjetaActual);
		return `Vista previa de la tarjeta para compartir. ${e.titulo}. ${e.descripcion}`;
	});

	$effect(() => {
		const parametros = resultado?.zona;
		const mio = ++turnoZona;
		tuZona = { estado: 'cargando', datos: null };
		if (!parametros) return;
		cargarTuZona(parametros)
			.then((datos) => {
				if (mio === turnoZona) tuZona = datos ? { estado: 'listo', datos } : { estado: 'fallo', datos: null };
			})
			.catch(() => {
				if (mio === turnoZona) tuZona = { estado: 'fallo', datos: null };
			});
	});

	// «Mi alquiler»: aportar el alquiler (botón explícito) y cuántos hay en el barrio
	let aporte = $state<EstadoAporte>('no');
	let aportadosBarrio = $state<number | null>(null);
	const esVivo = $derived(f.situacion === 'vivo');
	/** Pantalla sin dato abierta desde «Lo que no calculamos» (/?motivo=…): lleva «← Volver» */
	let desdeLimites = $state(false);
	const modoActual = $derived(modoDe(f));
	const modoPorDefecto = (_s: 'mirando' | 'vivo') => 'calle' as const;

	// Habitación: comparación con las aportadas en el barrio (el recuento y, desde 20, la mediana)
	const habitacionPantalla = $derived(pantalla?.tipo === 'habitacion' ? pantalla : null);
	let comparacionHab = $state<{ n: number; mediana: number | null } | 'error' | null>(null);
	let aporteHab = $state<EstadoAporte>('no');
	let turnoHab = 0;
	$effect(() => {
		const h = habitacionPantalla;
		const mio = ++turnoHab;
		comparacionHab = null;
		if (!h) return;
		void pedirComparacion(h.barrioCodigo, h.gastos).then((c) => {
			if (mio === turnoHab) comparacionHab = c ?? 'error';
		});
	});

	async function aportarHabitacion() {
		const datos = habitacionPantalla?.aporte;
		if (!datos || aporteHab === 'enviando' || aporteHab === 'hecho') return;
		aporteHab = 'enviando';
		const r = await enviarHabitacion(datos);
		if (r === 'guardada' || r === 'no_guardada') {
			aporta('habitacion');
			aporteHab = 'hecho';
			const c = await pedirComparacion(datos.barrio, datos.gastos);
			if (c) comparacionHab = c;
		} else aporteHab = r === 'limite' ? 'limite' : 'error';
	}

	async function aportar() {
		const datos = resultado?.inquilino?.aporte;
		if (!datos || aporte === 'enviando' || aporte === 'hecho') return;
		aporte = 'enviando';
		const r = await enviarAportacion(datos);
		if (r === 'guardada' || r === 'no_guardada') {
			// Si el servidor descarta un duplicado, la persona ve lo mismo: no se le informa de antiabuso
			aporta('alquiler');
			aporte = 'hecho';
			const c = await recuentos(resultado?.barrioCodigo);
			aportadosBarrio = c?.aportacionesBarrio ?? null;
		} else aporte = r === 'limite' ? 'limite' : 'error';
	}

	// Consentimiento del registro anónimo: desmarcado por defecto, por resultado
	let registro = $state<'no' | 'enviando' | 'sumado'>('no');

	async function registrar() {
		if (registro !== 'no' || pantalla?.tipo !== 'resultado' || !pantalla.registro) return;
		registro = 'enviando';
		await registrarAnalisis(pantalla.registro);
		// Si el servidor descarta o limita el registro, la persona ve lo mismo: no se le informa de antiabuso
		registro = 'sumado';
	}

	// El contador del barrio es real o no se muestra; sin dato, oculto.
	let pisosBarrio = $state<number | null>(null);
	const contadorDelBarrio = $derived(contadorBarrio(pisosBarrio));

	const hayResultado = $derived(fase === 'resultado' || fase === 'negociar' || fase === 'sin_conexion' || fase === 'confirmar');
	const resultado = $derived<PantallaResultado | null>(pantalla?.tipo === 'resultado' ? pantalla : null);
	/** Para los eventos de la tarjeta y de «¿Qué vas a hacer?»: el nivel del resultado que se ve */
	const nivelAnalitica = $derived(resultado ? resultadoDeClase(resultado.vista.clase) : null);

	// Resultado de muestra de la portada de escritorio: cuando está, el esquema gris sobra
	let muestraLista = $state(false);

	// Marca que la página ya responde (las pruebas esperan a esto antes de escribir)
	let listo = $state(false);
	onMount(() => {
		listo = true;
		nativo = puedeCompartirNativo();
		leerOrigenDeLaUrl();
		// /cuanto-pagas redirige aquí con el selector en «Mi alquiler»
		// /?modo=vivo y /?modo=mirando preseleccionan la modalidad (y su modo de ubicación por defecto)
		const modalidad = new URLSearchParams(location.search).get('modo');
		if (modalidad === 'vivo' || modalidad === 'mirando') {
			f.situacion = modalidad;
			f.modo = modoPorDefecto(modalidad);
		}
		// Enlaces de «Cómo calculamos»: /?motivo=obra_nueva abre esa pantalla «sin dato» (no cuenta como comprobación)
		// /mapa → «Comprueba un anuncio aquí»: el mapa de la portada, centrado en el barrio y con la zona marcada
		const prellenado = tomarPrellenado();
		if (prellenado) {
			// Quien llega desde el mapa busca piso: se abre «Un anuncio»
			f.situacion = 'mirando';
			f.modo = 'mapa';
			enfoqueMapa = { clase: 'barrio', codigo: prellenado.barrio, vez: ++vezMapa };
			puntoInicial = prellenado.punto;
		}
		const motivo = pantallaSinDatoDeClave(new URLSearchParams(location.search).get('motivo') ?? '');
		if (motivo) {
			mostrar(motivo, null, false);
			desdeLimites = true;
		}
		precargarDatos();
		historial = leerHistorial();
	});

	// ——— Tarjeta ———
	let canvasTarjeta: HTMLCanvasElement | undefined = $state();
	let compartiendo = $state(false);
	let mensajeTarjeta = $state<string | null>(null);

	// Tarjeta del inquilino: la persona elige uno de los tres textos de su posición
	let textoTarjeta = $state<0 | 1 | 2 | 3>(0);
	const textosInquilinoActuales = $derived(
		resultado?.inquilino
			? textosInquilino(
					resultado.inquilino.pos === 'baja' || resultado.inquilino.pos === 'media' || resultado.inquilino.pos === 'alta' ? 'dentro' : resultado.inquilino.pos,
					resultado.ratioCifra,
					resultado.barra.horquilla
				)
			: []
	);
	/** Los datos de la tarjeta que se dibuja y se comparte (todos los niveles); null si no hay resultado */
	const tarjetaActual = $derived(
		!resultado ? null : resultado.inquilino ? construirTarjetaInquilino(resultado, textoTarjeta) : construirTarjeta(resultado)
	);

	$effect(() => {
		if (canvasTarjeta && tarjetaActual) void dibujarTarjeta(canvasTarjeta, tarjetaActual);
	});

	// Cada resultado tiene su id de tarjeta desde el principio (así los enlaces ya existen), pero la
	// tarjeta solo se sube al servidor cuando la persona elige WhatsApp, X, copiar o la hoja del móvil.
	let idTarjeta = $state<string | null>(null);
	let nativo = $state(false);
	const enlaces = $derived(idTarjeta ? enlacesCompartir(urlDeTarjeta(idTarjeta), tarjetaActual ? textoCompartir(tarjetaActual) : undefined) : null);

	async function compartir() {
		if (!tarjetaActual || !canvasTarjeta || !idTarjeta) return;
		compartiendo = true;
		mensajeTarjeta = null;
		try {
			const via = await compartirNativo(tarjetaActual, canvasTarjeta, idTarjeta);
			if (via !== 'cancelada') comparte({ modo: modoActual, canal: 'nativo', tarjeta_id: idTarjeta, resultado: nivelAnalitica });
			mensajeTarjeta = via === 'descargada' ? TARJETA.descargada : null;
		} catch {
			mensajeTarjeta = TARJETA.error;
		} finally {
			compartiendo = false;
		}
	}

	async function compartirPor(canal: Canal) {
		if (!tarjetaActual || !idTarjeta) return;
		const id = idTarjeta;
		mensajeTarjeta = null;
		try {
			if (canal === 'descarga') {
				// Solo la imagen: no se guarda nada en el servidor
				comparte({ modo: modoActual, canal: 'descargar', tarjeta_id: null, resultado: nivelAnalitica });
				if (canvasTarjeta) await descargarImagen(canvasTarjeta);
				mensajeTarjeta = TARJETA.descargaHecha;
				return;
			}
			comparte({ modo: modoActual, canal, tarjeta_id: id, resultado: nivelAnalitica });
			const subida = subirTarjeta(tarjetaActual, id);
			if (canal === 'copiar') {
				// Se copia ya (hace falta el gesto de la persona) y se avisa cuando la tarjeta ya existe en el servidor
				const copiado = await copiarEnlace(id);
				mensajeTarjeta = TARJETA.generando;
				await subida;
				mensajeTarjeta = copiado ? TARJETA.enlaceCopiado : urlDeTarjeta(id);
				return;
			}
			// WhatsApp y X miran el enlace en cuanto se abren: si la tarjeta aún no está subida, la vista previa sale vacía
			// y WhatsApp se acuerda del fallo. Se abre el canal cuando la tarjeta ya existe.
			mensajeTarjeta = TARJETA.generando;
			if (!(await subida)) {
				mensajeTarjeta = TARJETA.error;
				return;
			}
			mensajeTarjeta = null;
			const destino = canal === 'whatsapp' ? enlaces?.whatsapp : enlaces?.x;
			if (destino) {
				// Con 'noopener' open() devuelve siempre null: se abre normal y se corta el vínculo a mano
				const ventana = window.open(destino, '_blank');
				if (ventana) ventana.opener = null;
				else location.href = destino; // ventana emergente bloqueada (p. ej. Safari tras una espera)
			}
		} catch {
			mensajeTarjeta = TARJETA.error;
		}
	}

	// ——— Flujo ———
	let turno = 0;

	function mostrar(p: Pantalla, u: Ubicacion | null, alHistorial = true) {
		pantalla = p;
		desdeLimites = false;
		idTarjeta = p.tipo === 'resultado' ? idDeTarjeta() : null;
		registro = 'no';
		textoTarjeta = 0;
		aporte = 'no';
		aporteHab = 'no';
		aportadosBarrio = null;
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
		if (alHistorial && p.tipo === 'habitacion') completa(datosCompleta(p, modoActual));
		if (alHistorial && p.tipo === 'sin_dato') {
			const motivo = motivoDeSinDato(p.motivo, interpretarNumero(f.superficie));
			if (motivo) sinDato(modoActual, motivo);
		}
		if (alHistorial && p.tipo === 'resultado') {
			completa(datosCompleta(p, modoActual));
			pisosBarrio = null;
			if (!p.inquilino) void recuentos(p.barrioCodigo).then((r) => (pisosBarrio = r?.barrio ?? null));
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
			const r = await comprobar(f, f.ubicacionActual ? pinGps : pin);
			if (miTurno !== turno) return;
			if (r.tipo === 'errores') {
				errores = r.errores;
				fase = 'inicio';
			} else if (r.tipo === 'no_encontrada') {
				errorGeocodificador('no_encontrada');
				problema = { tipo: 'no_encontrada', sugerencias: r.sugerencias };
				errores = {};
				fase = 'inicio';
			} else if (r.tipo === 'demasiadas') {
				errorGeocodificador('429');
				problema = { tipo: 'demasiadas' };
				errores = {};
				fase = 'inicio';
			} else if (r.tipo === 'pedir_numero') {
				errorGeocodificador('horquilla');
				problema = { tipo: 'pedir_numero', calle: r.calle, nSecciones: r.nSecciones };
				errores = {};
				fase = 'inicio';
			} else if (r.pantalla.tipo === 'resultado' && parecePrecioErroneo(r.pantalla.ratioMin)) {
				// Posible error al teclear: sin confirmar no hay resultado ni tarjeta
				pendiente = { pantalla: r.pantalla, ubicacion: r.ubicacion };
				errores = {};
				fase = 'confirmar';
				void irAlResultado();
			} else {
				mostrar(r.pantalla, r.ubicacion);
			}
		} catch {
			if (miTurno !== turno) return;
			errorGeocodificador('otro');
			// Sin red o sin servidor (o datos que no cargan): se conservan los datos escritos y se ofrece reintentar
			fase = 'sin_conexion';
		}
	}

	function confirmarPrecio() {
		if (!pendiente) return;
		const { pantalla: p, ubicacion: u } = pendiente;
		pendiente = null;
		confirmaPrecio(modoActual);
		mostrar(p, u);
	}

	function corregirPrecio() {
		pendiente = null;
		fase = 'inicio';
		void tick().then(() => {
			if (!matchMedia('(min-width: 1024px)').matches) scrollTo({ top: 0 });
			document.getElementById('precio')?.focus();
		});
	}

	function otroPiso() {
		fase = 'inicio';
		activa = null;
		void tick().then(() => {
			if (!matchMedia('(min-width: 1024px)').matches) scrollTo({ top: 0 });
			document.getElementById(f.modo === 'mapa' ? 'precio' : f.via ? 'numero' : 'direccion')?.focus();
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
		f.via = nombre;
		f.direccion = '';
		void enviar();
	}

	// Barrio o distrito elegido en el autocompletado: se pasa al modo mapa, centrado en él
	let enfoqueMapa = $state<{ clase: 'barrio' | 'distrito'; codigo: string; vez: number } | null>(null);
	let vezMapa = 0;
	let puntoInicial = $state<Punto | null>(null);
	// «Usar mi ubicación»: el punto (zonas) vive solo aquí, en memoria; nunca sale del navegador
	let pinGps = $state<Ubicacion | null>(null);
	function usarUbicacion(l: { ubicacion: Ubicacion; barrio: { nombre: string }; precisionM: number }) {
		pinGps = l.ubicacion;
		f.ubicacionActual = { barrio: l.barrio.nombre, precisionM: l.precisionM };
		problema = null;
		errores = {};
	}
	function quitarUbicacion() {
		pinGps = null;
		f.ubicacionActual = null;
	}
	async function irAlCampoDireccion() {
		quitarUbicacion();
		if (f.modo === 'mapa') f.modo = 'calle';
		await tick();
		(document.getElementById('direccion') ?? document.getElementById('numero'))?.focus();
	}
	function colocarEnElMapa(codigoBarrio: string) {
		quitarUbicacion();
		f.modo = 'mapa';
		enfoqueMapa = { clase: 'barrio', codigo: codigoBarrio, vez: ++vezMapa };
	}
	function elegirZona(z: SugerenciaZona) {
		f.modo = 'mapa';
		problema = null;
		errores = {};
		enfoqueMapa = { clase: z.clase, codigo: z.codigo, vez: ++vezMapa };
	}


	function marcarPunto(u: Ubicacion | null) {
		pin = u ?? 'fuera';
		errores = { ...errores, mapa: undefined };
	}

	/** Sustituye el resultado en pantalla (sin volver al formulario): lo mismo con el portal ya escrito */
	function reemplazar(p: Pantalla, u: Ubicacion | null) {
		pantalla = p;
		ubicacion = u;
		idTarjeta = p.tipo === 'resultado' ? idDeTarjeta() : null;
		textoTarjeta = 0;
		mensajeTarjeta = null;
		registro = 'no';
		aporte = 'no';
		if (activa !== null && historial[activa]) {
			historial[activa] = { ...historial[activa]!, pantalla: p, formulario: { ...f } };
			guardarHistorial(historial);
		}
	}

	/** «Añade el número para afinar»: calle + número, y se recalcula en la misma pantalla. Devuelve el error, si lo hay. */
	async function afinar(texto: string): Promise<string | null> {
		const via = ubicacion?.via;
		const numero = texto.trim();
		if (!via) return AFINAR.fallo;
		if (!/^\d{1,4}\s?[a-zA-Z]?$/.test(numero)) return AFINAR.invalido;
		const afinada = { ...f, via, direccion: '', numero, modo: 'calle' as const };
		try {
			const r = await comprobar(afinada, null);
			if (r.tipo === 'pantalla' && r.pantalla.tipo === 'resultado') {
				f = afinada;
				reemplazar(r.pantalla, r.ubicacion);
				return null;
			}
			if (r.tipo === 'no_encontrada' || r.tipo === 'pedir_numero') return AFINAR.noEncontrado(numero, via);
			if (r.tipo === 'demasiadas') return AFINAR.demasiadas;
			return AFINAR.fallo;
		} catch {
			return AFINAR.fallo;
		}
	}

	function elegirHistorial(i: number) {
		const e = historial[i];
		if (!e) return;
		turno++;
		pantalla = e.pantalla;
		idTarjeta = e.pantalla.tipo === 'resultado' ? idDeTarjeta() : null;
		registro = 'no';
		f = { ...estadoInicial(), ...(e.formulario as Partial<EstadoFormulario>), modo: modoGuardado((e.formulario as Partial<EstadoFormulario>).modo) };
		fase = 'resultado';
		activa = i;
		mensajeTarjeta = null;
		void irAlResultado();
	}

	const filas = $derived(historial.map((e) => filaHistorial(e.pantalla)));
	const puedeAfinar = $derived(ubicacion?.motivo === 'calle' && !!ubicacion.via);
	const cabecera = $derived(fase === 'negociar' ? 'volver' : hayResultado ? (resultado?.inquilino || habitacionPantalla ? 'editar' : 'otro') : 'madrid');
</script>

<svelte:head>
	<title>{NOMBRE} · {LEMA}</title>
	<meta name="description" content={DESCRIPCION} />
	<meta property="og:title" content={NOMBRE} />
	<meta property="og:description" content={DESCRIPCION} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={urlAbsoluta('/')} />
	<meta property="og:image" content={urlAbsoluta('/og-portada.png')} />
	<meta property="og:image:secure_url" content={urlAbsoluta('/og-portada.png')} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content={urlAbsoluta('/og-portada.png')} />
</svelte:head>

<div class="pagina" data-fase={fase} data-listo={listo}>
	<div class="cabecera-caja" class:con-resultado={hayResultado}>
		<Cabecera derecha={cabecera} actual="comprobar" modo={esVivo ? 'vivo' : 'mirando'} alOtroPiso={otroPiso} alVolver={() => (fase = 'resultado')} />
	</div>

	<main class="rejilla" class:hay-resultado={hayResultado}>
		<section class="hero" aria-label="Qué hace {NOMBRE}">
			<h1>
				{TITULAR_INICIO[0]}
				<span class="subrayado">{TITULAR_INICIO[1]}</span>
			</h1>
			<p class="subtitular">{SUBTITULAR_INICIO}</p>
			{#if !hayResultado}<a class="enlace enlace-mapa" href="/mapa">{MAPA_REFERENCIA.enlacePortada}</a>{/if}
			{#if !hayResultado}<MuestraResultado modo={esVivo ? 'vivo' : 'mirando'} alListo={() => (muestraLista = true)} />{/if}
			<div class="fantasma" class:oculto={muestraLista && !hayResultado} aria-hidden="true">
				<p>Aquí verás el precio frente a lo que pagan quienes ya viven en la zona.</p>
				<div class="fantasma-barra">
					<span class="f-anuncio">tu precio</span>
					<span class="f-pista"></span>
					<span class="f-ref">contratos de aquí</span>
					<span class="f-punto"></span>
					<span class="f-cero">0&nbsp;€</span>
				</div>
			</div>
		</section>

		<aside class="lado">
			<h2 class="titulo-lado">{esVivo ? FORMULARIO_VIVO.titulo : FORMULARIO.titulo}</h2>
			<Formulario
				bind:f
				{errores}
				{problema}
				buscando={fase === 'buscando'}
				comprobado={hayResultado}
				alEmpezar={() => empieza(modoActual)}
				alCambiarSituacion={(s) => {
					errores = {};
					problema = null;
					// Modo por defecto de cada situación (salvo que ya se esté usando el mapa)
					if (f.modo !== 'mapa') f.modo = modoPorDefecto(s);
				}}
				alEnviar={enviar}
				alSalirDe={salirDe}
				alElegirSugerencia={elegirSugerencia}
				alElegirZona={elegirZona}
				alUbicacion={usarUbicacion}
				alQuitarUbicacion={quitarUbicacion}
				alEscribirDireccion={irAlCampoDireccion}
				alMapaEnBarrio={colocarEnElMapa}
				alCambiarModo={cambiarModo}
			>
				{#snippet mapa()}<Mapa alMarcar={marcarPunto} enfocar={enfoqueMapa} {puntoInicial} />{/snippet}
			</Formulario>
			<div class="historial"><HistorialSesion {filas} {activa} alElegir={elegirHistorial} /></div>
		</aside>

		<div class="principal" bind:this={ficha} tabindex="-1">
			{#if fase === 'sin_conexion'}
				<SinConexion formulario={f} alReintentar={enviar} alEditar={otroPiso} />
			{:else if fase === 'confirmar' && pendiente}
				<ConfirmarPrecio precio={pendiente.pantalla.vista.precio} m2={pendiente.pantalla.vista.m2} alCorregir={corregirPrecio} alConfirmar={confirmarPrecio} />
			{:else if fase === 'negociar' && resultado}
				<Negociar pantalla={resultado} alVolver={() => (fase = 'resultado')} />
			{:else if pantalla?.tipo === 'resultado' && pantalla.inquilino}
				<ResultadoInquilino
					{pantalla}
					contador={aportadosBarrio !== null && aportadosBarrio >= 10 ? aportadosBarrio : null}
					{aporte}
					alAportar={aportar}
					alAfinar={puedeAfinar ? afinar : undefined}
					alMirando={() => {
						f.situacion = 'mirando';
						f.modo = modoPorDefecto('mirando');
						otroPiso();
					}}
					alQueHaras={(r) => queHaras(modoActual, r, nivelAnalitica)}
					textos={textosInquilinoActuales}
					textoElegido={textoTarjeta}
					alElegirTexto={(i) => (textoTarjeta = i as 0 | 1 | 2 | 3)}
					{compartiendo}
					{nativo}
					{enlaces}
					{mensajeTarjeta}
					alCompartir={compartir}
					alCompartirPor={compartirPor}
				>
					{#snippet tarjeta()}
						<canvas bind:this={canvasTarjeta} class="tarjeta-canvas" aria-label={descripcionTarjeta}></canvas>
					{/snippet}
				</ResultadoInquilino>
				{#if resultado?.zona}
					<TuZona estado={tuZona.estado} vista={tuZona.datos?.vista} geom={tuZona.datos?.geom} />
				{/if}
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
					alAfinar={puedeAfinar ? afinar : undefined}
					alCompartir={compartir}
					{nativo}
					{enlaces}
					alCompartirPor={compartirPor}
					{registro}
					alRegistrar={registrar}
					alQueHaras={(r) => queHaras(modoActual, r, nivelAnalitica)}
				>
					{#snippet tarjeta()}
						<canvas bind:this={canvasTarjeta} class="tarjeta-canvas" aria-label={descripcionTarjeta}></canvas>
					{/snippet}
				</Resultado>
				{#if resultado?.zona}
					<TuZona estado={tuZona.estado} vista={tuZona.datos?.vista} geom={tuZona.datos?.geom} />
				{/if}
			{:else if pantalla?.tipo === 'habitacion'}
				{#key pantalla}
				<ResultadoHabitacion
					{pantalla}
					comparacion={comparacionHab}
					aporte={aporteHab}
					alAportar={aportarHabitacion}
					alVivo={() => {
						// Los datos del formulario se conservan: solo cambia la modalidad
						f.situacion = 'vivo';
						otroPiso();
					}}
					alPiso={() => {
						f.tipo = 'piso';
						otroPiso();
					}}
				/>
				{/key}
			{:else if pantalla?.tipo === 'sin_dato'}
				<SinDato {pantalla} alOtro={otroPiso} volver={desdeLimites} modo={esVivo ? 'vivo' : 'mirando'} />
			{/if}
		</div>
	</main>

	<Pie habitacion={fase === 'resultado' && !!habitacionPantalla} />
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
	.enlace-mapa {
		align-self: flex-start;
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
		flex-direction: column;
		align-items: center;
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
		/* El enlace al mapa se alinea con la columna del titular y el subtítulo (centrada, de 600 px) */
		.hero > .enlace-mapa {
			width: fit-content;
			align-self: flex-start;
			margin-left: calc((100% - min(600px, 100%)) / 2);
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
		.fantasma.oculto {
			display: none;
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
			flex-direction: column;
			align-items: center;
		}
	}
	.cabecera-caja {
		display: block;
	}
</style>
