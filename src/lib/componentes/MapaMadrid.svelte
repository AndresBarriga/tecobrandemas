<script lang="ts">
	import { MAPA_REFERENCIA as T, TONOS_MAPA, type CapaMapa } from '#lib/resultado';
	import { type Caja, type CeldaMadrid, type MadridCargado } from '#lib/cliente/mapa-madrid';
	import { colocarNombres } from '#lib/cliente/zona-mapa';

	/**
	 * Mapa de Madrid por zonas (SVG con la vista en metros). El color llega ya calculado: este componente
	 * solo pinta, mueve la vista y avisa de la zona tocada. Visual de «Tu zona»: escala de Paja, rayado gris
	 * para «sin dato», líneas gruesas entre barrios y nombres de barrio en Tinta con halo claro.
	 */
	let {
		madrid, tonos, capa, seleccion = null, resaltadas = new Set<string>(), enfoque = null, alElegir
	}: {
		madrid: MadridCargado;
		tonos: Map<string, number | null>;
		capa: CapaMapa;
		seleccion?: string | null;
		resaltadas?: Set<string>;
		/** Caja (en metros, y invertida) a la que llevar la vista; `vez` cambia en cada petición */
		enfoque?: { caja: Caja; vez: number } | null;
		alElegir: (cusec: string) => void;
	} = $props();

	let w = $state(360);
	let h = $state(480);
	// Vista: esquina superior izquierda en metros y metros por píxel
	let vx = $state(0);
	let vy = $state(0);
	let mpp = $state(100);
	let ajustado = false;

	const ext = $derived(madrid.extension);
	const mppAjuste = $derived(Math.max((ext[2] - ext[0]) / w, (ext[3] - ext[1]) / h) * 1.04);
	const MPP_MIN = 3;

	function ajustar(caja: Caja = ext, margen = 1.04) {
		const nuevo = Math.min(Math.max(Math.max((caja[2] - caja[0]) / w, (caja[3] - caja[1]) / h) * margen, MPP_MIN), mppAjuste);
		mpp = nuevo;
		vx = (caja[0] + caja[2]) / 2 - (w * nuevo) / 2;
		vy = (caja[1] + caja[3]) / 2 - (h * nuevo) / 2;
	}

	$effect(() => {
		if (!ajustado && w > 0 && h > 0) {
			ajustado = true;
			ajustar();
		}
	});
	let vezVista = 0;
	$effect(() => {
		const e = enfoque;
		if (e && e.vez !== vezVista) {
			vezVista = e.vez;
			ajustar(e.caja, 1.5);
		}
	});

	function zoom(factor: number, px = w / 2, py = h / 2) {
		const nuevo = Math.min(Math.max(mpp / factor, MPP_MIN), mppAjuste);
		const mx = vx + px * mpp;
		const my = vy + py * mpp;
		vx = mx - px * nuevo;
		vy = my - py * nuevo;
		mpp = nuevo;
	}

	// Gestos: arrastrar, pellizcar y tocar. Tocar = soltar sin haber movido el dedo.
	const punteros = new Map<number, { x: number; y: number }>();
	let salida: { x: number; y: number; cusec: string | undefined } | null = null;
	let movido = false;
	let distanciaPinza = 0;
	let envoltorio: HTMLDivElement | undefined = $state();

	const relativo = (e: PointerEvent) => {
		const r = envoltorio!.getBoundingClientRect();
		return { x: e.clientX - r.left, y: e.clientY - r.top };
	};
	const cusecDe = (e: Event) => (e.target as SVGElement | null)?.dataset?.cusec;

	function abajo(e: PointerEvent) {
		if ((e.target as HTMLElement).closest?.('.zoom')) return;
		const p = relativo(e);
		punteros.set(e.pointerId, p);
		if (punteros.size === 1) {
			salida = { ...p, cusec: cusecDe(e) };
			movido = false;
		} else {
			movido = true;
			const [a, b] = [...punteros.values()];
			distanciaPinza = Math.hypot(a!.x - b!.x, a!.y - b!.y);
		}
	}
	function mueve(e: PointerEvent) {
		const previo = punteros.get(e.pointerId);
		if (!previo) return;
		const p = relativo(e);
		if (punteros.size === 2) {
			punteros.set(e.pointerId, p);
			const [a, b] = [...punteros.values()];
			const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
			if (distanciaPinza > 0) zoom(d / distanciaPinza, (a!.x + b!.x) / 2, (a!.y + b!.y) / 2);
			distanciaPinza = d;
			return;
		}
		if (!movido && salida && Math.hypot(p.x - salida.x, p.y - salida.y) > 6) {
			movido = true;
			(e.currentTarget as Element).setPointerCapture?.(e.pointerId);
		}
		if (movido) {
			vx -= (p.x - previo.x) * mpp;
			vy -= (p.y - previo.y) * mpp;
		}
		punteros.set(e.pointerId, p);
	}
	function arriba(e: PointerEvent) {
		if (!punteros.has(e.pointerId)) return;
		punteros.delete(e.pointerId);
		if (!movido && salida?.cusec && cusecDe(e) === salida.cusec) alElegir(salida.cusec);
		if (punteros.size === 0) salida = null;
	}
	function tecla(e: KeyboardEvent) {
		const paso = 80 * mpp;
		if (e.key === 'ArrowLeft') vx -= paso;
		else if (e.key === 'ArrowRight') vx += paso;
		else if (e.key === 'ArrowUp') vy -= paso;
		else if (e.key === 'ArrowDown') vy += paso;
		else if (e.key === '+' || e.key === '=') zoom(1.6);
		else if (e.key === '-') zoom(1 / 1.6);
		else return;
		e.preventDefault();
	}

	// Colores
	const paleta = $derived(TONOS_MAPA[capa]);
	const relleno = (t: number | null | undefined) =>
		t === null || t === undefined ? 'url(#mp-rayado)' : capa === 'presupuesto' && t === 0 ? 'url(#mp-debajo)' : paleta[t]!;
	const grosor = $derived(mpp > 60 ? 0.35 : mpp > 25 ? 0.6 : 1);

	// Nombres de barrio en Tinta con halo claro (11 px), solo los que caben dentro de su barrio
	let lienzo: CanvasRenderingContext2D | null = null;
	function medir(texto: string): number {
		lienzo ??= document.createElement('canvas').getContext('2d');
		if (!lienzo) return texto.length * 11 * 0.56;
		lienzo.font = `600 11px "Sofia Sans", sans-serif`;
		return lienzo.measureText(texto).width;
	}
	const nombres = $derived.by(() => {
		const candidatos = [...madrid.barrios.values()]
			.map((b) => ({ texto: b.nombre, x: (b.centro[0] - vx) / mpp, y: (b.centro[1] - vy) / mpp, n: b.n, ancho: (b.caja[2] - b.caja[0]) / mpp }))
			.filter((b) => b.texto && b.x > 0 && b.y > 0 && b.x < w && b.y < h && b.ancho > medir(b.texto) + 10)
			.sort((a, b) => b.n - a.n);
		return colocarNombres({ candidatos, obstaculos: [], w, h, cuerpo: 11, medir, desplazar: false });
	});

	const trazadoSel = $derived(seleccion ? (madrid.porCusec.get(seleccion)?.d ?? '') : '');
	const trazadoRes = $derived([...resaltadas].map((c) => madrid.porCusec.get(c)?.d ?? '').join(''));
</script>

<div class="marco" bind:this={envoltorio} bind:clientWidth={w} bind:clientHeight={h}>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
	<div
		class="lienzo"
		role="application"
		tabindex="0"
		aria-label={T.mapa}
		aria-describedby="mapa-ayuda"
		onkeydown={tecla}
		onpointerdown={abajo}
		onpointermove={mueve}
		onpointerup={arriba}
		onpointercancel={(e) => punteros.delete(e.pointerId)}
		onwheel={(e) => {
			e.preventDefault();
			const r = envoltorio!.getBoundingClientRect();
			zoom(e.deltaY < 0 ? 1.3 : 1 / 1.3, e.clientX - r.left, e.clientY - r.top);
		}}
	>
		<svg viewBox="{vx} {vy} {w * mpp} {h * mpp}" width={w} height={h} aria-hidden="true">
			<defs>
				<pattern id="mp-rayado" width={6 * mpp} height={6 * mpp} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
					<rect width={6 * mpp} height={6 * mpp} fill="#DAD5CA" />
					<line x1="0" y1="0" x2="0" y2={6 * mpp} stroke="#857F74" stroke-width={1.5 * mpp} />
				</pattern>
				<pattern id="mp-debajo" width={7 * mpp} height={7 * mpp} patternUnits="userSpaceOnUse">
					<rect width={7 * mpp} height={7 * mpp} fill="#F6F4EE" />
					<circle cx={3.5 * mpp} cy={3.5 * mpp} r={1.5 * mpp} fill="#1C1B19" />
				</pattern>
			</defs>
			<rect x={vx} y={vy} width={w * mpp} height={h * mpp} fill="#ECEAE5" />
			{#each madrid.celdas as c (c.cusec)}
				<path d={c.d} data-cusec={c.cusec} fill-rule="evenodd" fill={relleno(tonos.get(c.cusec))} stroke="#857F74" stroke-width={grosor} stroke-linejoin="round" vector-effect="non-scaling-stroke" />
			{/each}
			<path d={madrid.lineasBarrio} fill="none" stroke="#A39D91" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke" pointer-events="none" />
			{#if trazadoRes}<path d={trazadoRes} fill="none" stroke="#1C1B19" stroke-width="3.5" stroke-linejoin="round" vector-effect="non-scaling-stroke" pointer-events="none" />{/if}
			{#if trazadoSel}<path d={trazadoSel} fill="none" stroke="#1C1B19" stroke-width="3" stroke-dasharray="6 3" stroke-linejoin="round" vector-effect="non-scaling-stroke" pointer-events="none" />{/if}
		</svg>
		{#each nombres as n (n.texto)}
			<span class="nombre" style:left="{n.x}px" style:top="{n.y}px">{n.texto}</span>
		{/each}
	</div>
	<div class="zoom">
		<button type="button" aria-label="Acercar" onclick={() => zoom(1.8)}>+</button>
		<button type="button" aria-label="Alejar" onclick={() => zoom(1 / 1.8)}>−</button>
	</div>
	<p id="mapa-ayuda" class="solo-lectores">Mueve el mapa con las flechas y acércalo con más y menos. Para ver una zona, tócala o busca un barrio.</p>
</div>

<style>
	.marco {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: 320px;
		overflow: hidden;
		background: #ecebe5;
		border-radius: var(--radio);
	}
	.lienzo {
		position: absolute;
		inset: 0;
		touch-action: none;
		cursor: grab;
		user-select: none;
		-webkit-user-select: none;
	}
	.lienzo:active {
		cursor: grabbing;
	}
	.lienzo:focus-visible {
		outline: 2px solid var(--tinta);
		outline-offset: -2px;
	}
	svg {
		display: block;
	}
	path[data-cusec] {
		cursor: pointer;
	}
	.nombre {
		position: absolute;
		transform: translate(-50%, -50%);
		white-space: nowrap;
		pointer-events: none;
		font: 600 11px/1 var(--f-texto);
		color: var(--tinta);
		text-shadow: 0 0 1px #f6f4ee, 0 0 2px #f6f4ee, 0 0 2px #f6f4ee, 0 0 3px #f6f4ee, 0 0 4px #f6f4ee, 0 0 5px #f6f4ee;
	}
	.zoom {
		position: absolute;
		right: 10px;
		bottom: 10px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.zoom button {
		width: 44px;
		height: 44px;
		border: 0;
		border-radius: var(--radio);
		background: var(--paja);
		color: var(--tinta);
		font: 700 22px/1 var(--f-texto);
		cursor: pointer;
	}
	.zoom button:focus-visible {
		outline: 2px solid var(--tinta);
		outline-offset: 2px;
	}
</style>
