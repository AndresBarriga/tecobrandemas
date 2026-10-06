<script lang="ts">
	import { onMount } from 'svelte';
	import { MAPA, type Ubicacion } from '#lib/resultado';
	import type { BaseMapa } from '#lib/cliente/mapa-base';
	import { type DatosMapa, type Punto, cargarMapa, metrosAPunto, puntoAMetros, ubicacionDelPunto } from '#lib/cliente/mapa';
	import { cargarDatos } from '#lib/cliente/datos';

	/** Recibe la ubicación del punto marcado, o null si cae fuera de Madrid */
	let { alMarcar, enfocar = null, puntoInicial = null }: {
		alMarcar: (u: Ubicacion | null) => void;
		enfocar?: Enfoque | null;
		/** Punto ya elegido en otra página (/mapa → «Comprueba un piso aquí»): se marca al cargar */
		puntoInicial?: Punto | null;
	} = $props();

	/** Barrio o distrito (elegido en el autocompletado) sobre el que se centra el mapa */
	interface Enfoque {
		clase: 'barrio' | 'distrito';
		codigo: string;
		/** Cambia en cada petición, para volver a centrar en la misma zona */
		vez: number;
	}

	let lienzo: HTMLCanvasElement;
	let datos: DatosMapa | null = null;
	let base: BaseMapa | null = null;
	let pintarBase: typeof import('#lib/cliente/mapa-base').pintarBase | null = null;
	let cargando = $state(true);
	let fallo = $state(false);
	let fuera = $state(false);
	let hayPunto = $state(false);
	let listo = $state(false);

	// Vista: centro en metros y metros por píxel
	let cx = 0;
	let cy = 0;
	let mpp = 100;
	let punto: [number, number] | null = null;
	let pendiente = 0;

	const ancho = () => lienzo.clientWidth;
	const alto = () => lienzo.clientHeight;
	const aPantalla = (x: number, y: number): [number, number] => [(x - cx) / mpp + ancho() / 2, (cy - y) / mpp + alto() / 2];
	const aMapa = (px: number, py: number): [number, number] => [cx + (px - ancho() / 2) * mpp, cy - (py - alto() / 2) * mpp];

	function ajustar() {
		if (!datos) return;
		const e = datos.extension;
		cx = (e.x0 + e.x1) / 2;
		cy = (e.y0 + e.y1) / 2;
		mpp = Math.max((e.x1 - e.x0) / ancho(), (e.y1 - e.y0) / alto()) * 1.05;
	}

	function pedirDibujo() {
		if (pendiente) return;
		pendiente = requestAnimationFrame(() => {
			pendiente = 0;
			dibujar();
		});
	}

	function dibujar() {
		if (!datos) return;
		const dpr = window.devicePixelRatio || 1;
		const w = ancho();
		const h = alto();
		if (lienzo.width !== Math.round(w * dpr) || lienzo.height !== Math.round(h * dpr)) {
			lienzo.width = Math.round(w * dpr);
			lienzo.height = Math.round(h * dpr);
		}
		const ctx = lienzo.getContext('2d')!;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		if (base && pintarBase) pintarBase(ctx, base, { cx, cy, mpp, w, h, dpr });
		else {
			ctx.fillStyle = '#EDE9E0';
			ctx.fillRect(0, 0, w, h);
		}
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		const [x0, y1] = aMapa(0, 0);
		const [x1, y0] = aMapa(w, h);
		ctx.beginPath();
		for (const p of datos.poligonos.values()) {
			const b = p.bbox;
			if (b[2] < x0 || b[0] > x1 || b[3] < y0 || b[1] > y1) continue;
			for (const anillo of p.anillos) {
				anillo.forEach(([x, y], i) => {
					const [px, py] = aPantalla(x, y);
					if (i === 0) ctx.moveTo(px, py);
					else ctx.lineTo(px, py);
				});
				ctx.closePath();
			}
		}
		// Con mapa base, las secciones solo se dibujan como contorno; sin él, también se rellenan
		if (!base) {
			ctx.fillStyle = '#F6F4EE';
			ctx.fill('evenodd');
		}
		ctx.lineWidth = mpp > 60 ? 0.5 : 1;
		ctx.strokeStyle = base ? 'rgba(106, 58, 140, 0.3)' : '#B9B3A6';
		ctx.stroke();

		if (punto) {
			const [px, py] = aPantalla(punto[0], punto[1]);
			ctx.beginPath();
			ctx.arc(px, py, 12, 0, Math.PI * 2);
			ctx.fillStyle = '#6A3A8C';
			ctx.fill();
			ctx.lineWidth = 3;
			ctx.strokeStyle = '#F6F4EE';
			ctx.stroke();
		}
	}

	/** Centra la vista en la caja que forman las secciones del barrio o distrito */
	async function centrarEn(e: Enfoque) {
		if (!datos) return;
		const d = await cargarDatos();
		let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
		for (const [cusec, p] of datos.poligonos) {
			const s = d.secciones[cusec];
			if (!s) continue;
			const dentro = e.clase === 'barrio' ? s.barrio === e.codigo : d.barrios[s.barrio]?.cod_distrito === e.codigo;
			if (!dentro) continue;
			x0 = Math.min(x0, p.bbox[0]);
			y0 = Math.min(y0, p.bbox[1]);
			x1 = Math.max(x1, p.bbox[2]);
			y1 = Math.max(y1, p.bbox[3]);
		}
		if (!Number.isFinite(x0)) return;
		cx = (x0 + x1) / 2;
		cy = (y0 + y1) / 2;
		mpp = Math.min(Math.max(Math.max((x1 - x0) / ancho(), (y1 - y0) / alto()) * 1.25, 1), 400);
		pedirDibujo();
	}

	$effect(() => {
		const e = enfocar;
		if (listo && e) void centrarEn(e);
	});

	let inicialColocado = false;
	$effect(() => {
		const p = puntoInicial;
		if (!listo || !p || inicialColocado || !datos) return;
		inicialColocado = true;
		const [x, y] = puntoAMetros(p);
		const u = ubicacionDelPunto(datos, p);
		punto = [x, y];
		fuera = u === null;
		hayPunto = u !== null;
		alMarcar(u);
		pedirDibujo();
	});

	function zoom(factor: number, px = ancho() / 2, py = alto() / 2) {
		const [mx, my] = aMapa(px, py);
		mpp = Math.min(Math.max(mpp / factor, 1), 400);
		cx = mx - (px - ancho() / 2) * mpp;
		cy = my + (py - alto() / 2) * mpp;
		pedirDibujo();
	}

	// Gestos: arrastrar, pellizcar y tocar
	const punteros = new Map<number, { x: number; y: number }>();
	let inicio: { x: number; y: number } | null = null;
	let distanciaPinza = 0;
	let movido = false;

	const relativo = (e: PointerEvent) => {
		const r = lienzo.getBoundingClientRect();
		return { x: e.clientX - r.left, y: e.clientY - r.top };
	};

	function abajo(e: PointerEvent) {
		lienzo.setPointerCapture(e.pointerId);
		punteros.set(e.pointerId, relativo(e));
		if (punteros.size === 1) {
			inicio = relativo(e);
			movido = false;
		}
		if (punteros.size === 2) {
			const [a, b] = [...punteros.values()];
			distanciaPinza = Math.hypot(a!.x - b!.x, a!.y - b!.y);
			movido = true;
		}
	}

	function mueve(e: PointerEvent) {
		const previo = punteros.get(e.pointerId);
		if (!previo) return;
		const ahora = relativo(e);
		punteros.set(e.pointerId, ahora);
		if (punteros.size === 1) {
			if (inicio && Math.hypot(ahora.x - inicio.x, ahora.y - inicio.y) > 6) movido = true;
			if (movido) {
				cx -= (ahora.x - previo.x) * mpp;
				cy += (ahora.y - previo.y) * mpp;
				pedirDibujo();
			}
		} else if (punteros.size === 2) {
			const [a, b] = [...punteros.values()];
			const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
			if (distanciaPinza) zoom(d / distanciaPinza, (a!.x + b!.x) / 2, (a!.y + b!.y) / 2);
			distanciaPinza = d;
		}
	}

	function arriba(e: PointerEvent) {
		const eraUno = punteros.size === 1;
		punteros.delete(e.pointerId);
		if (eraUno && !movido) marcar(relativo(e));
	}

	function marcar(p: { x: number; y: number }) {
		if (!datos) return;
		const [x, y] = aMapa(p.x, p.y);
		const u = ubicacionDelPunto(datos, metrosAPunto(x, y));
		punto = [x, y];
		fuera = u === null;
		hayPunto = u !== null;
		alMarcar(u);
		pedirDibujo();
	}

	onMount(() => {
		cargarMapa()
			.then((d) => {
				datos = d;
				cargando = false;
				ajustar();
				dibujar();
				listo = true;
				// El mapa base se carga aparte: si falla, el mapa de secciones sigue funcionando
				return import('#lib/cliente/mapa-base').then((m) => {
					base = m.crearBase(pedirDibujo);
					pintarBase = m.pintarBase;
					pedirDibujo();
				});
			})
			.catch(() => {
				cargando = false;
				fallo = true;
			});
		const observador = new ResizeObserver(() => pedirDibujo());
		observador.observe(lienzo);
		return () => {
			observador.disconnect();
			cancelAnimationFrame(pendiente);
		};
	});

</script>

<div class="mapa">
	<p class="instruccion">{MAPA.instruccion}</p>
	<div class="marco">
		<canvas
			bind:this={lienzo}
			aria-label="Mapa de Madrid por secciones censales. Toca para marcar el punto donde está el piso."
			onpointerdown={abajo}
			onpointermove={mueve}
			onpointerup={arriba}
			onpointercancel={(e) => punteros.delete(e.pointerId)}
			onwheel={(e) => {
				e.preventDefault();
				const r = lienzo.getBoundingClientRect();
				zoom(e.deltaY < 0 ? 1.3 : 1 / 1.3, e.clientX - r.left, e.clientY - r.top);
			}}
		></canvas>
		<div class="zoom">
			<button type="button" aria-label="Acercar" onclick={() => zoom(1.8)}>+</button>
			<button type="button" aria-label="Alejar" onclick={() => zoom(1 / 1.8)}>−</button>
		</div>
		<span class="atribucion">{MAPA.atribucion}</span>
		{#if cargando}<p class="estado">Cargando el mapa…</p>{/if}
		{#if fallo}<p class="estado">No hemos podido cargar el mapa. Prueba con la dirección.</p>{/if}
	</div>
	<p class="resultado" role="status">
		{#if fuera}{MAPA.fuera}{:else if hayPunto}Punto marcado.{:else}{MAPA.sinPunto}{/if}
	</p>
</div>

<style>
	.mapa {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.instruccion {
		font: 400 13px/1.4 var(--f-texto);
		color: var(--grafito);
	}
	.marco {
		position: relative;
		height: 320px;
		border: 1.5px solid var(--tinta);
		border-radius: var(--radio);
		overflow: hidden;
	}
	canvas {
		width: 100%;
		height: 100%;
		display: block;
		touch-action: none;
		cursor: crosshair;
	}
	.zoom {
		position: absolute;
		top: 8px;
		right: 8px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.zoom button {
		width: 44px;
		height: 44px;
		border: 1.5px solid var(--tinta);
		border-radius: var(--radio);
		background: var(--blanco);
		font: 700 22px/1 var(--f-texto);
	}
	.atribucion {
		position: absolute;
		left: 0;
		bottom: 0;
		padding: 2px 6px;
		background: rgba(246, 244, 238, 0.85);
		font: 400 11px/1.3 var(--f-texto);
		color: var(--grafito);
		pointer-events: none;
	}
	.estado {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
		text-align: center;
		font: 500 14px/1.4 var(--f-texto);
		background: var(--papel);
	}
	.resultado {
		font: 600 14px/1.3 var(--f-texto);
	}
</style>
