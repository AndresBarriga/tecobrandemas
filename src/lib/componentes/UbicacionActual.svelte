<script lang="ts">
	import { UBICACION_ACTUAL as T } from '#lib/resultado';
	import { type LecturaGps, ubicarme } from '#lib/cliente/ubicacion-actual';

	type Lista = Extract<LecturaGps, { estado: 'lista' }>;

	let {
		protagonista = false,
		activa = null,
		alActivar,
		alQuitar,
		alEscribir,
		alMapa,
		reinicio = 0
	}: {
		/** «Ya vivo aquí»: el chip es lo primero que se ofrece; en «mirando», una opción discreta */
		protagonista?: boolean;
		/** La lectura que se está usando: barrio y precisión */
		activa?: { barrio: string; precisionM: number } | null;
		alActivar: (l: Lista) => void;
		alQuitar: () => void;
		/** Denegado, sin tiempo o fuera de Madrid: se pasa al campo de la dirección */
		alEscribir: () => void;
		/** Precisión baja: colocar el punto a mano, con el mapa centrado en el barrio */
		alMapa: (codigoBarrio: string) => void;
		/** Cambia cuando se escribe una dirección: los avisos de la lectura anterior sobran */
		reinicio?: number;
	} = $props();

	let estado = $state<'off' | 'pidiendo' | 'baja' | 'denegado' | 'tiempo' | 'fuera' | 'sin_gps'>('off');
	let baja = $state<Lista | null>(null);

	// Al escribir una dirección desaparece el aviso («fuera de Madrid», permiso denegado…)
	let visto = $state(0);
	$effect(() => {
		if (reinicio === visto) return;
		visto = reinicio;
		if (estado === 'denegado' || estado === 'tiempo' || estado === 'fuera' || estado === 'sin_gps') estado = 'off';
	});

	async function pedir() {
		estado = 'pidiendo';
		const l = await ubicarme();
		if (l.estado !== 'lista') {
			estado = l.estado;
			alEscribir();
			return;
		}
		if (l.baja) {
			baja = l;
			estado = 'baja';
			return;
		}
		estado = 'off';
		alActivar(l);
	}

	function usarIgualmente() {
		if (!baja) return;
		const l = baja;
		baja = null;
		estado = 'off';
		alActivar(l);
	}

	function escribir() {
		baja = null;
		estado = 'off';
		alEscribir();
	}

	function colocarEnMapa() {
		const codigo = baja?.barrio.codigo;
		baja = null;
		estado = 'off';
		if (codigo) alMapa(codigo);
	}

	const mensaje = $derived(
		estado === 'denegado' ? T.denegado : estado === 'tiempo' ? T.tiempo : estado === 'sin_gps' ? T.sinGps : estado === 'fuera' ? T.fuera : ''
	);
</script>

<div class="ubicacion" class:protagonista>
	{#if activa}
		<div class="chip activa">
			<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" fill="none" /><circle cx="11" cy="11" r="2.5" fill="currentColor" /></svg>
			<span>{T.activa(activa.barrio, activa.precisionM)}</span>
			<button type="button" class="quitar" onclick={alQuitar} aria-label={T.quitar}>
				<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="2" /></svg>
			</button>
		</div>
	{:else if estado === 'pidiendo'}
		<div class="chip pidiendo" role="status">
			<span class="giro" aria-hidden="true"></span>
			<span>{T.pidiendo}</span>
		</div>
	{:else}
		<button type="button" class="chip" onclick={pedir}>
			<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
				<circle cx="11" cy="11" r="6" stroke="currentColor" stroke-width="2" fill="none" /><circle cx="11" cy="11" r="2" fill="currentColor" />
				<path d="M11 1v4M11 17v4M1 11h4M17 11h4" stroke="currentColor" stroke-width="2" />
			</svg>
			<span>{protagonista ? T.vivo : T.mirando}</span>
		</button>
	{/if}

	{#if protagonista && !activa}
		<p class="privacidad">
			<svg width="14" height="16" viewBox="0 0 14 16" aria-hidden="true"><rect x="1.5" y="7" width="11" height="8" rx="1.5" fill="currentColor" /><path d="M4 7V5a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.8" fill="none" /></svg>
			{T.privacidad}
		</p>
	{/if}

	{#if mensaje}<p class="aviso" role="alert">{mensaje}</p>{/if}

	{#if estado === 'baja' && baja}
		<div class="aviso" role="alert">
			<p>{T.baja(baja.precisionM)}</p>
			<div class="salidas">
				<button type="button" class="boton boton-contorno" onclick={escribir}>{T.bajaEscribir}</button>
				<button type="button" class="boton boton-contorno" onclick={colocarEnMapa}>{T.bajaMapa}</button>
				<button type="button" class="boton boton-contorno" onclick={usarIgualmente}>{T.bajaIgualmente}</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.ubicacion {
		display: flex;
		flex-direction: column;
		gap: 10px;
		align-items: flex-start;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		min-height: 48px;
		padding: 0 18px;
		border: 0;
		border-radius: var(--radio);
		background: var(--superficie);
		color: var(--tinta);
		font: 600 16px/1.2 var(--f-texto);
	}
	.protagonista .chip {
		width: 100%;
		min-height: 56px;
		border: 2px solid var(--tinta);
		font-weight: 700;
		font-size: 17px;
	}
	.chip.pidiendo {
		border: 2px dashed var(--tinta);
		background: transparent;
	}
	.chip.activa {
		width: 100%;
		min-height: 56px;
		padding-right: 4px;
		background: var(--tinta);
		color: var(--blanco);
		font-weight: 700;
	}
	.chip.activa span {
		flex: 1;
		text-align: left;
	}
	.quitar {
		width: 44px;
		height: 44px;
		border: 0;
		background: none;
		color: inherit;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}
	.privacidad {
		display: flex;
		gap: 10px;
		align-items: flex-start;
		font: 400 14px/1.4 var(--f-texto);
		color: var(--grafito);
	}
	.privacidad svg {
		flex: none;
		margin-top: 2px;
	}
	.aviso {
		background: var(--superficie);
		border-radius: var(--radio);
		padding: 14px;
		font: 400 15px/1.45 var(--f-texto);
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.salidas {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.salidas :global(.boton) {
		padding: 10px 14px;
		line-height: 1.3;
	}
	.giro {
		width: 18px;
		height: 18px;
		border: 2.5px solid var(--tinta);
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
		.giro {
			animation-duration: 2.4s;
		}
	}
</style>
