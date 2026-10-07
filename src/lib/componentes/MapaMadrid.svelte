<script lang="ts">
	import { MAPA_REFERENCIA as T, SIN_DATO_PRESUPUESTO, TONOS_MAPA, type CapaMapa } from '#lib/resultado';
	import { type Caja, type MadridCargado } from '#lib/cliente/mapa-madrid';
	import { colocarNombres } from '#lib/cliente/zona-mapa';

	/**
	 * Mapa de Madrid por zonas (SVG con la vista en metros). El color llega ya calculado: este componente
	 * solo pinta, mueve la vista y avisa de la zona tocada. Visual de «Tu zona»: escala de Paja, rayado gris
	 * para «sin dato», líneas gruesas entre barrios y nombres en Tinta con halo claro. «Mi presupuesto» usa
	 * rellenos planos (gris cálido, verde medio, verde oscuro) y solo rayea «sin dato» con zoom ≥ 12.
	 * A zoom bajo se nombran los distritos y, al acercar, los barrios. (Se probó con canvas: con la CPU
	 * limitada a una sexta parte, cambiar la superficie tardaba 1,2 s frente a 0,19 s en SVG.)
	 */
	let {
		madrid, tonos, capa, seleccion = null, resaltadas = new Set<string>(), enfoque = null, margenInferior = 0, margenSuperior = 0, alElegir
	}: {
		madrid: MadridCargado;
		tonos: Map<string, number | null>;
		capa: CapaMapa;
		seleccion?: string | null;
		resaltadas?: Set<string>;
		/** Caja (en metros, y invertida) a la que llevar la vista; `vez` cambia en cada petición */
		enfoque?: { caja: Caja; vez: number } | null;
		/** Píxeles del mapa tapados por la hoja (abajo) y por el conmutador (arriba): la vista se centra en lo libre */
		margenInferior?: number;
		margenSuperior?: number;
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
	const MPP_MIN = 2;

	/** Lleva la vista a una caja, centrada en la parte del mapa que no tapan la hoja ni el conmutador */
	function ajustar(caja: Caja, margen = 1.04) {
		const libre = Math.max(80, h - margenInferior - margenSuperior);
		const nuevo = Math.min(Math.max(Math.max((caja[2] - caja[0]) / w, (caja[3] - caja[1]) / libre) * margen, MPP_MIN), mppAjuste);
		mpp = nuevo;
		vx = (caja[0] + caja[2]) / 2 - (w * nuevo) / 2;
		vy = (caja[1] + caja[3]) / 2 - (margenSuperior + libre / 2) * nuevo;
	}

	$effect(() => {
		if (!ajustado && w > 0 && h > 0) {
			ajustado = true;
			ajustar(madrid.extensionUrbana);
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

	// ——— Colores ———
	const paleta = $derived(TONOS_MAPA[capa]);
	const presupuesto = $derived(capa === 'presupuesto');
	// Zoom 12 de teselas de 256 px a la latitud de Madrid: 119.278 m/px ÷ 2^12
	const hayRayado = $derived(!presupuesto || mpp <= 29.1);
	const sinDato = $derived(!presupuesto ? 'url(#mp-rayado)' : hayRayado ? 'url(#mp-rayado-tenue)' : SIN_DATO_PRESUPUESTO.relleno);
	const relleno = (t: number | null | undefined) => (t === null || t === undefined ? sinDato : paleta[t]!);
	const grosor = $derived(mpp > 60 ? 0.35 : mpp > 25 ? 0.6 : 1);
	const trazadoSel = $derived(seleccion ? (madrid.porCusec.get(seleccion)?.d ?? '') : '');
	const trazadoRes = $derived([...resaltadas].map((c) => madrid.porCusec.get(c)?.d ?? '').join(''));

	// ——— Toque: la zona bajo el dedo o, si no hay, la más cercana a menos de 14 px ———
	const TOLERANCIA = 14;
	let prueba: CanvasRenderingContext2D | null = null;
	function zonaEn(px: number, py: number): string | undefined {
		prueba ??= document.createElement('canvas').getContext('2d');
		if (!prueba) return undefined;
		const x = vx + px * mpp;
		const y = vy + py * mpp;
		const tol = TOLERANCIA * mpp;
		let dentro: { cusec: string; area: number } | undefined;
		let cerca: { cusec: string; d: number } | undefined;
		prueba.lineWidth = 2 * tol;
		for (const c of madrid.celdas) {
			const [x0, y0, x1, y1] = c.caja;
			if (x < x0 - tol || x > x1 + tol || y < y0 - tol || y > y1 + tol) continue;
			const t = new Path2D(c.d);
			if (prueba.isPointInPath(t, x, y, 'evenodd')) {
				const area = (x1 - x0) * (y1 - y0);
				if (!dentro || area < dentro.area) dentro = { cusec: c.cusec, area };
			} else if (prueba.isPointInStroke(t, x, y)) {
				const d = Math.hypot(c.centro[0] - x, c.centro[1] - y);
				if (!cerca || d < cerca.d) cerca = { cusec: c.cusec, d };
			}
		}
		return dentro?.cusec ?? cerca?.cusec;
	}

	// Gestos: arrastrar, pellizcar y tocar. Tocar = soltar sin haber movido el dedo.
	const punteros = new Map<number, { x: number; y: number }>();
	let salida: { x: number; y: number } | null = null;
	let movido = false;
	let distanciaPinza = 0;
	let envoltorio: HTMLDivElement | undefined = $state();

	const relativo = (e: PointerEvent) => {
		const r = envoltorio!.getBoundingClientRect();
		return { x: e.clientX - r.left, y: e.clientY - r.top };
	};

	function abajo(e: PointerEvent) {
		const p = relativo(e);
		punteros.set(e.pointerId, p);
		(e.currentTarget as Element).setPointerCapture?.(e.pointerId);
		if (punteros.size === 1) {
			salida = { ...p };
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
		if (!movido && salida && Math.hypot(p.x - salida.x, p.y - salida.y) > 8) movido = true;
		if (movido) {
			vx -= (p.x - previo.x) * mpp;
			vy -= (p.y - previo.y) * mpp;
		}
		punteros.set(e.pointerId, p);
	}
	function arriba(e: PointerEvent) {
		if (!punteros.has(e.pointerId)) return;
		const p = relativo(e);
		punteros.delete(e.pointerId);
		if (!movido && salida) {
			const cusec = zonaEn(p.x, p.y);
			if (cusec) alElegir(cusec);
		}
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

	// ——— Nombres: distritos a zoom bajo, barrios al acercar; Tinta con halo claro, 11-12 px ———
	let lienzo: CanvasRenderingContext2D | null = null;
	function medir(texto: string, cuerpo: number): number {
		lienzo ??= document.createElement('canvas').getContext('2d');
		if (!lienzo) return texto.length * cuerpo * 0.56;
		lienzo.font = `700 ${cuerpo}px "Sofia Sans", sans-serif`;
		return lienzo.measureText(texto).width;
	}
	const UMBRAL_DISTRITOS = 36; // metros por píxel a partir del cual se nombran distritos
	const nombres = $derived.by(() => {
		const distritos = mpp > UMBRAL_DISTRITOS;
		const cuerpo = distritos ? 12 : 11;
		const origen = distritos ? madrid.distritos : madrid.barrios;
		const candidatos = [...origen.values()]
			.map((b) => ({ texto: b.nombre, x: (b.centro[0] - vx) / mpp, y: (b.centro[1] - vy) / mpp, n: b.n, ancho: (b.caja[2] - b.caja[0]) / mpp }))
			// Un distrito se nombra aunque su nombre sea algo más ancho que él; un barrio, solo si cabe
			.filter((b) => b.texto && b.x > 0 && b.y > 0 && b.x < w && b.y < h && b.ancho > (distritos ? medir(b.texto, cuerpo) * 0.6 : medir(b.texto, cuerpo) + 10))
			.sort((a, b) => b.n - a.n);
		return colocarNombres({ candidatos, obstaculos: [], w, h, cuerpo, medir: (t) => medir(t, cuerpo), desplazar: false });
	});
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
				<pattern id="mp-rayado-tenue" width={8 * mpp} height={8 * mpp} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
					<rect width={8 * mpp} height={8 * mpp} fill={SIN_DATO_PRESUPUESTO.relleno} />
					<line x1="0" y1="0" x2="0" y2={8 * mpp} stroke={SIN_DATO_PRESUPUESTO.rayado} stroke-width={mpp} />
				</pattern>
			</defs>
			<rect x={vx} y={vy} width={w * mpp} height={h * mpp} fill="#ECEAE5" />
			{#each madrid.celdas as c (c.cusec)}
				<path d={c.d} fill-rule="evenodd" fill={relleno(tonos.get(c.cusec))} stroke={presupuesto ? '#BDB7A8' : '#857F74'} stroke-width={grosor} stroke-linejoin="round" vector-effect="non-scaling-stroke" />
			{/each}
			<path d={madrid.lineasBarrio} fill="none" stroke={presupuesto ? '#857F74' : '#A39D91'} stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
			{#if presupuesto}<path d={madrid.contorno} fill="none" stroke="#5F5A50" stroke-width="1.5" stroke-linejoin="round" vector-effect="non-scaling-stroke" />{/if}
			{#if trazadoRes}<path d={trazadoRes} fill="none" stroke="#1C1B19" stroke-width="3.5" stroke-linejoin="round" vector-effect="non-scaling-stroke" />{/if}
			{#if trazadoSel}
				<path d={trazadoSel} fill="none" stroke="#F6F4EE" stroke-width="8" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
				<path d={trazadoSel} fill="none" stroke="#1C1B19" stroke-width="4.5" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
			{/if}
		</svg>
		{#each nombres as n (n.texto)}
			<span class="nombre" style:left="{n.x}px" style:top="{n.y}px" style:font-size="{n.cuerpo}px">{n.texto}</span>
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
		pointer-events: none;
	}
	.nombre {
		position: absolute;
		transform: translate(-50%, -50%);
		white-space: nowrap;
		pointer-events: none;
		font-family: var(--f-texto);
		font-weight: 700;
		line-height: 1;
		color: var(--tinta);
		/* Halo claro alrededor de las letras: el trazo va detrás del relleno */
		-webkit-text-stroke: 3.5px #f6f4ee;
		paint-order: stroke fill;
	}
	.zoom {
		position: absolute;
		right: 10px;
		bottom: calc(var(--hoja-alto, 0px) + 10px);
		display: flex;
		flex-direction: column;
		gap: 6px;
		z-index: 2;
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
	@media (max-width: 959px) {
		.marco {
			border-radius: 0;
			min-height: 0;
		}
	}
</style>
