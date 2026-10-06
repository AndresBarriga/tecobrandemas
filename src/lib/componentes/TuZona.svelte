<script lang="ts">
	import { MAPA_REFERENCIA, TONOS_ZONA, TU_ZONA, type VistaTuZona } from '#lib/resultado';
	import {
		type Caja, type GeometriaZona, aPx, cajaDe, colocarNombres, proyeccion, trazado, trazadoLineas
	} from '#lib/cliente/zona-mapa';

	/**
	 * «Tu zona» (diseño 6a-6f). `estado`: «cargando» mientras llegan los polígonos y los datos, «fallo» si no
	 * se pudieron cargar (la sección se omite sin más). El mapa es un SVG proyectado al ancho real.
	 */
	let {
		estado, vista = null, geom = null
	}: { estado: 'cargando' | 'listo' | 'fallo'; vista?: VistaTuZona | null; geom?: GeometriaZona | null } = $props();

	let ancho = $state(350);
	let sel = $state(-1);

	const w = $derived(Math.min(ancho, 600));
	const escritorio = $derived(w > 450);
	const p = $derived(geom ? proyeccion(geom.centro, w) : null);
	const alto = $derived(Math.round(w * (310 / 350)));
	const cuerpo = $derived(escritorio ? 13 : 11.5);
	const marca = $derived(escritorio ? 26 : 22);

	const usuario = $derived(geom?.celdas.filter((c) => c.esUsuario) ?? []);
	const cajaUsuario = $derived<Caja | null>(p && usuario.length ? cajaDe(p, usuario.flatMap((c) => c.anillos)) : null);
	const xUsuario = $derived(cajaUsuario ? (cajaUsuario[0] + cajaUsuario[2]) / 2 : w / 2);
	const yUsuario = $derived(cajaUsuario ? cajaUsuario[3] + 1 : alto / 2);

	const filas = $derived(vista?.lista?.filas ?? []);
	const marcadores = $derived(
		p && geom
			? filas.flatMap((f) => {
					const c = geom.celdas.find((x) => x.cusec === f.cusec);
					return c ? [{ ...f, x: aPx(p, c.centro)[0], y: aPx(p, c.centro)[1] }] : [];
				})
			: []
	);

	const celdasD = $derived(p && geom ? geom.celdas.map((c) => ({ cusec: c.cusec, d: trazado(p, c.anillos), tono: c.tono })) : []);
	const barriosD = $derived(p && geom ? trazadoLineas(p, geom.lineasBarrio) : '');
	const seleccionD = $derived(
		p && geom && sel >= 0 && filas[sel] ? trazado(p, geom.celdas.find((c) => c.cusec === filas[sel]!.cusec)?.anillos ?? []) : ''
	);
	const usuarioD = $derived(p ? trazado(p, usuario.flatMap((c) => c.anillos)) : '');

	// Nombres de barrio: centro del barrio en pantalla, solo si caben
	let lienzo: CanvasRenderingContext2D | null = null;
	function medir(texto: string): number {
		lienzo ??= document.createElement('canvas').getContext('2d');
		if (!lienzo) return texto.length * cuerpo * 0.56;
		lienzo.font = `600 ${cuerpo}px "Sofia Sans", sans-serif`;
		return lienzo.measureText(texto).width;
	}
	const nombres = $derived.by(() => {
		if (!p || !geom || estado !== 'listo') return [];
		const grupos = new Map<string, { x: number; y: number; n: number }>();
		for (const c of geom.celdas) {
			if (!c.barrio) continue;
			const [x, y] = aPx(p, c.centro);
			if (x < 0 || y < 0 || x > w || y > alto) continue;
			const g = grupos.get(c.barrio) ?? { x: 0, y: 0, n: 0 };
			grupos.set(c.barrio, { x: g.x + x, y: g.y + y, n: g.n + 1 });
		}
		const candidatos = [...grupos.entries()]
			.sort((a, b) => b[1].n - a[1].n)
			.map(([codigo, g]) => ({ texto: geom.nombresBarrio.get(codigo) ?? '', x: g.x / g.n, y: g.y / g.n }))
			.filter((c) => c.texto);
		const obstaculos: Caja[] = [];
		if (cajaUsuario) {
			obstaculos.push([cajaUsuario[0] - 3, cajaUsuario[1] - 3, cajaUsuario[2] + 3, cajaUsuario[3] + 3]);
			obstaculos.push([xUsuario - 4, cajaUsuario[3], xUsuario + 4, alto]);
		}
		for (const m of marcadores) obstaculos.push([m.x - marca / 2 - 3, m.y - marca / 2 - 3, m.x + marca / 2 + 3, m.y + marca / 2 + 3]);
		return colocarNombres({ candidatos, obstaculos, w, h: alto, cuerpo, medir });
	});

	const elegir = (i: number) => (sel = sel === i ? -1 : i);
	const rotuloX = $derived(Math.min(Math.max(xUsuario - 36, 0), w - 72));
	const iconoTendencia = $derived(vista?.evolucion?.tendencia === 'baja' ? 'M3 6l5 5 3-3 6 6M17 9v5h-5' : 'M3 14l5-5 3 3 6-6M17 11V6h-5');
	const muescaDesplazamiento = $derived(
		vista?.muesca.alineada === 'derecha' ? 'calc(-100% + 10px)' : vista?.muesca.alineada === 'izquierda' ? '-10px' : '-50%'
	);
</script>

{#if estado !== 'fallo'}
	<section class="zona" aria-label={TU_ZONA.titulo} aria-busy={estado === 'cargando'}>
		<div class="cabeza">
			<h2>{TU_ZONA.titulo}</h2>
			<p>{vista?.intro ?? TU_ZONA.intro}</p>
		</div>

		<div class="cuerpo" bind:clientWidth={ancho}>
			<div class="mapa" style:height="{alto + 34}px">
				{#if estado === 'listo' && p && vista}
					<svg viewBox="0 0 {w} {alto + 34}" width={w} height={alto + 34} role="img" aria-label={TU_ZONA.mapa}>
						<defs>
							<pattern id="tz-rayado" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
								<rect width="6" height="6" fill="#DAD5CA" />
								<line x1="0" y1="0" x2="0" y2="6" stroke="#857F74" stroke-width="1.5" />
							</pattern>
							<clipPath id="tz-recorte"><rect x="0" y="0" width={w} height={alto} rx="8" /></clipPath>
						</defs>
						<g clip-path="url(#tz-recorte)">
							<rect x="0" y="0" width={w} height={alto} fill="#ECEAE5" />
							{#each celdasD as c (c.cusec)}
								<path
									d={c.d}
									fill-rule="evenodd"
									fill={c.tono === 'fuera' ? '#ECEAE5' : c.tono === null ? 'url(#tz-rayado)' : TONOS_ZONA[c.tono]}
									stroke={c.tono === 'fuera' ? '#DDD9D1' : '#857F74'}
									stroke-width="1"
									stroke-linejoin="round"
								/>
							{/each}
							<path d={barriosD} fill="none" stroke="#A39D91" stroke-width="2" stroke-linejoin="round" />
							<circle cx={w / 2} cy={alto / 2} r={1500 * p.s} fill="none" stroke="#1C1B19" stroke-width="1.25" stroke-dasharray="4 4" />
							{#if seleccionD}<path d={seleccionD} fill="none" stroke="#1C1B19" stroke-width="3" stroke-dasharray="6 3" stroke-linejoin="round" />{/if}
							<path d={usuarioD} fill="none" stroke="#1C1B19" stroke-width="4" stroke-linejoin="round" />
						</g>
						<line x1={xUsuario} y1={yUsuario} x2={xUsuario} y2={alto + 8} stroke="#1C1B19" stroke-width="1.5" />
						<rect x={rotuloX} y={alto + 8} width="72" height="22" rx="4" fill="#1C1B19" />
						<text x={rotuloX + 36} y={alto + 23.5} text-anchor="middle" font-family="Sofia Sans, sans-serif" font-weight="700" font-size="13" fill="#F6F4EE">{usuario.length > 1 ? TU_ZONA.tusZonas : TU_ZONA.tuZona}</text>
						<text x={w} y={alto + 23.5} text-anchor="end" font-family="Sofia Sans Semi Condensed, sans-serif" font-weight="600" font-size="12" fill="#5A5750">{TU_ZONA.circulo}</text>
					</svg>
					{#each nombres as n (n.texto)}
						<span class="nombre" style:left="{n.x}px" style:top="{n.y}px" style:font-size="{n.cuerpo}px">{n.texto}</span>
					{/each}
					{#each marcadores as m, i (m.cusec)}
						<button
							type="button"
							class="marcador"
							style:left="{m.x - 22}px"
							style:top="{m.y - 22}px"
							aria-label="Zona {m.n}, {m.nombre}"
							aria-pressed={sel === i}
							onclick={() => elegir(i)}
						>
							<span class="bola" class:activa={sel === i} style:width="{marca}px" style:height="{marca}px" style:font-size="{escritorio ? 14 : 12}px">{m.n}</span>
						</button>
					{/each}
				{:else}
					<div class="esqueleto" style:height="{alto}px"></div>
					<p class="cargando" style:height="{alto}px"><span>{TU_ZONA.cargando}</span></p>
				{/if}
			</div>

			{#if estado === 'listo' && vista?.cruce}
				<p class="cruce" role="status">{vista.cruce}</p>
			{/if}

			{#if estado === 'listo' && vista}
				<div class="leyenda">
					<span class="leyenda-titulo">{TU_ZONA.leyenda}</span>
					<div class="escala">
						<div class="muesca-texto" style:left="{vista.muesca.x}%" style:transform="translateX({muescaDesplazamiento})">tu precio: {vista.precioM2}</div>
						<div class="muesca-flecha" style:left="{vista.muesca.x}%"></div>
						<div class="muesca-raya" style:left="{vista.muesca.x}%"></div>
						<div class="muestras">
							{#each vista.leyenda as l (l.etiqueta)}
								<div class="muestra">
									<span class="color" class:rayado={l.tono === null} style:background={l.tono === null ? undefined : TONOS_ZONA[l.tono]}></span>
									<span class="etiqueta">{l.etiqueta}</span>
								</div>
							{/each}
						</div>
					</div>
					<span class="nota">{TU_ZONA.notaLeyenda}</span>
				</div>
			{/if}

			<div class="lista">
				{#if estado === 'cargando'}
					<span class="fantasma titulo-f"></span>
					<span class="fantasma fila-f"></span>
					<span class="fantasma fila-f"></span>
					<span class="fantasma fila-f"></span>
				{:else if vista?.lista}
					<div class="encabezado">
						<h3>{vista.lista.titulo}</h3>
						<span class="subtitulo">{vista.lista.subtitulo}</span>
					</div>
					<div class="aviso">
						<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" style="flex: none; margin-top: 1px">
							<circle cx="10" cy="10" r="8.5" stroke="var(--tinta)" stroke-width="1.5" fill="none" />
							<path d="M10 9v5M10 6v.5" stroke="var(--tinta)" stroke-width="2" />
						</svg>
						<span>{vista.lista.aviso}</span>
					</div>
					<div class="filas">
						{#each vista.lista.filas as f, i (f.cusec)}
							<button type="button" class="fila" class:activa={sel === i} aria-pressed={sel === i} onclick={() => elegir(i)}>
								<span class="num" class:activa={sel === i}>{f.n}</span>
								<span class="texto">
									<span class="nombre-fila">{f.nombre}</span>
									<span class="ref">{f.referencia}</span>
									<span class="pos">{f.posicion}</span>
								</span>
								<span class="dist">{f.distancia}</span>
							</button>
						{/each}
					</div>
					<span class="nota">{vista.lista.pie}</span>
				{:else if vista?.vacia}
					<div class="vacia">
						<span class="vacia-titulo">{vista.vacia.titulo}</span>
						<span class="vacia-texto">{vista.vacia.texto}</span>
					</div>
				{:else if vista?.contexto}
					<p class="contexto">{vista.contexto}</p>
				{/if}
			</div>
		</div>

		{#if estado === 'listo'}
			<a class="enlace" href="/mapa">{MAPA_REFERENCIA.enlaceTuZona}</a>
		{/if}

		{#if estado === 'listo' && vista?.evolucion}
			<div class="evolucion">
				<svg width="22" height="22" viewBox="0 0 20 20" aria-hidden="true" style="flex: none"><path d={iconoTendencia} stroke="var(--tinta)" stroke-width="2" fill="none" /></svg>
				<span class="evolucion-texto">{#each vista.evolucion.partes as t (t.texto)}{#if t.fuerte}<strong>{t.texto}</strong>{:else}{t.texto}{/if}{/each}</span>
			</div>
		{/if}
	</section>
{/if}

<style>
	.cruce {
		font: 700 15px/1.3 var(--f-texto);
		margin: 4px 0 -4px;
	}
	.zona {
		width: 100%;
		max-width: 600px;
		padding: 28px var(--margen) 8px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		font-variant-numeric: tabular-nums;
	}
	.cabeza {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	h2 {
		font: 800 60px/0.88 var(--f-extra);
		text-transform: uppercase;
	}
	.cabeza p {
		font: 400 16px/1.5 var(--f-texto);
		max-width: 620px;
		text-wrap: pretty;
	}
	.cuerpo {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	.mapa {
		position: relative;
		width: 100%;
	}
	svg {
		display: block;
	}
	.nombre {
		position: absolute;
		transform: translate(-50%, -50%);
		white-space: nowrap;
		pointer-events: none;
		font: 600 11.5px/1 var(--f-texto);
		color: var(--tinta);
		text-shadow: 0 0 1px #f6f4ee, 0 0 2px #f6f4ee, 0 0 2px #f6f4ee, 0 0 3px #f6f4ee, 0 0 4px #f6f4ee, 0 0 5px #f6f4ee;
	}
	.marcador {
		position: absolute;
		width: 44px;
		height: 44px;
		padding: 0;
		border: 0;
		background: transparent;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}
	.bola {
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		border: 2px solid var(--tinta);
		background: var(--papel);
		color: var(--tinta);
		font: 800 12px/1 var(--f-texto);
		box-sizing: border-box;
	}
	.bola.activa {
		background: var(--tinta);
		color: var(--papel);
	}
	button:focus-visible {
		outline: 2px solid var(--tinta);
		outline-offset: 3px;
	}
	.esqueleto {
		border-radius: var(--radio);
		background: var(--pista);
	}
	.cargando {
		position: absolute;
		inset: 0 0 auto 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.cargando span {
		background: var(--papel);
		border-radius: var(--radio);
		padding: 10px 16px;
		font: 600 15px/1 var(--f-texto);
	}

	/* Leyenda */
	.leyenda {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.leyenda-titulo {
		font: 600 13px/1.3 var(--f-texto);
	}
	.escala {
		position: relative;
		padding-top: 24px;
	}
	.muesca-texto {
		position: absolute;
		top: 0;
		white-space: nowrap;
		font: 700 12.5px/1 var(--f-semi);
	}
	.muesca-flecha {
		position: absolute;
		top: 15px;
		width: 0;
		height: 0;
		margin-left: -5px;
		border-left: 5px solid transparent;
		border-right: 5px solid transparent;
		border-top: 7px solid var(--tinta);
	}
	.muesca-raya {
		position: absolute;
		top: 22px;
		width: 2px;
		height: 20px;
		margin-left: -1px;
		background: var(--tinta);
		z-index: 1;
	}
	.muestras {
		display: grid;
		grid-template-columns: repeat(5, 1fr) 1.15fr;
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
		box-sizing: border-box;
		border: 1px solid #857f74;
	}
	.color.rayado {
		background: repeating-linear-gradient(45deg, #dad5ca 0 3px, #857f74 3px 4.5px);
	}
	.etiqueta {
		font: 600 12px/1.2 var(--f-semi);
		white-space: nowrap;
	}
	.nota {
		font: 400 12.5px/1.45 var(--f-texto);
		color: var(--grafito);
	}

	/* Lista */
	.lista {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
	}
	.encabezado {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	h3 {
		font: 700 21px/1.2 var(--f-texto);
	}
	.subtitulo {
		font: 500 15px/1.4 var(--f-texto);
		color: var(--grafito);
	}
	.aviso {
		display: flex;
		gap: 10px;
		align-items: flex-start;
		background: var(--superficie);
		border-radius: var(--radio);
		padding: 12px 14px;
		font: 500 14px/1.45 var(--f-texto);
	}
	.filas {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.fila {
		min-height: 64px;
		width: 100%;
		text-align: left;
		background: var(--superficie);
		border: 0;
		outline: 0;
		border-radius: var(--radio);
		padding: 10px 14px;
		display: flex;
		align-items: center;
		gap: 12px;
		cursor: pointer;
		color: var(--tinta);
		font-family: inherit;
	}
	.fila.activa {
		background: var(--blanco);
		outline: 2px solid var(--tinta);
		outline-offset: -2px;
	}
	.fila:focus-visible {
		outline: 2px solid var(--tinta);
		outline-offset: 3px;
	}
	.num {
		flex: none;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 2px solid var(--tinta);
		background: var(--papel);
		display: flex;
		align-items: center;
		justify-content: center;
		font: 800 14px/1 var(--f-texto);
		box-sizing: border-box;
	}
	.num.activa {
		background: var(--tinta);
		color: var(--papel);
	}
	.texto {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}
	.nombre-fila {
		font: 700 16px/1.3 var(--f-texto);
	}
	.ref {
		font: 500 13px/1.3 var(--f-semi);
		color: var(--grafito);
	}
	.pos {
		font: 600 13px/1.3 var(--f-semi);
	}
	.dist {
		flex: none;
		font: 600 14px/1 var(--f-semi);
		color: var(--grafito);
	}
	.vacia {
		background: var(--superficie);
		border-radius: var(--radio);
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.vacia-titulo {
		font: 700 16px/1.3 var(--f-texto);
	}
	.vacia-texto {
		font: 400 15px/1.5 var(--f-texto);
		text-wrap: pretty;
	}
	.contexto {
		font: 400 15px/1.5 var(--f-texto);
		color: var(--grafito);
		text-wrap: pretty;
	}
	.fantasma {
		display: block;
		background: var(--superficie);
		border-radius: var(--radio);
	}
	.titulo-f {
		height: 22px;
		width: 80%;
		background: var(--pista);
		border-radius: 4px;
	}
	.fila-f {
		height: 64px;
	}

	/* Evolución */
	.evolucion {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}
	.evolucion-texto {
		font: 500 16px/1.4 var(--f-texto);
		flex: 1;
		min-width: 0;
	}
	.evolucion-texto strong {
		font: 800 16px/1.4 var(--f-semi);
	}

	@media (min-width: 960px) {
		.zona {
			padding: 0;
			gap: 28px;
		}
		h2 {
			font-size: 64px;
		}
		.cuerpo {
			gap: 28px;
		}
	}
</style>
