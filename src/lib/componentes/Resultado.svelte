<script lang="ts">
	import AfinarNumero from './AfinarNumero.svelte';
	import Costura from './Costura.svelte';
	import Compartir, { type SelectorTarjeta } from './Compartir.svelte';
	import QueHaras from './QueHaras.svelte';
	import {
		BOTON_COMPARTIR, ENLACE_OFICIAL, REGISTRO, TARJETA, ALGO_NO_CUADRA, type RespuestaQueHaras,
		type Canal, type Contador, type EnlacesCompartir, type PantallaResultado
	} from '#lib/resultado';

	let {
		pantalla,
		contador = null,
		tarjeta,
		compartiendo = false,
		mensajeTarjeta = null,
		alOtro,
		alNegociar,
		alAfinar,
		alCompartir,
		nativo = false,
		enlaces = null,
		alCompartirPor,
		alQueHaras,
		registro = 'no',
		alRegistrar,
		selector = null
	}: {
		pantalla: PantallaResultado;
		/** Estado del consentimiento del registro anónimo: desmarcado por defecto */
		registro?: 'no' | 'enviando' | 'sumado';
		alRegistrar?: () => void;
		/** Contador del barrio: solo llega si es real y de 10 o más */
		contador?: Contador | null;
		/** Miniatura de la tarjeta (canvas) que dibuja la página */
		tarjeta?: import('svelte').Snippet;
		compartiendo?: boolean;
		mensajeTarjeta?: string | null;
		alOtro: () => void;
		alNegociar: () => void;
		/** Solo cuando la ubicación es una calle sin número */
		alAfinar?: (numero: string) => Promise<string | null>;
		alCompartir: () => void;
		/** Móvil con hoja de compartir: un solo botón. Si no, los canales (escritorio) */
		nativo?: boolean;
		enlaces?: EnlacesCompartir | null;
		alCompartirPor?: (canal: Canal) => void;
		/** «¿Qué vas a hacer con este resultado?»: la categoría elegida */
		alQueHaras?: (r: RespuestaQueHaras) => void;
		/** Las tres tarjetas de «La costura», para elegir cuál se comparte */
		selector?: SelectorTarjeta | null;
	} = $props();

	const v = $derived(pantalla.vista);
</script>

<article class="resultado nivel-{v.clase}">
	<div class="arriba">
		<Costura costura={pantalla.costura}>
			{#snippet bajoContexto()}
				<!-- Con varias zonas posibles: la cifra es la media (o un rango); esto lo explica. «Añade el número» solo con calle sin número -->
				{#if v.aclaracion}
					<div class="aclaracion">
						<p>{v.aclaracion}</p>
						{#if alAfinar}<AfinarNumero {alAfinar} />{/if}
					</div>
				{/if}
			{/snippet}
		</Costura>
	</div>

	<div class="abajo">
		{#if contador}
			<div class="contador">
				<span class="contador-num">{contador.numero}</span>
				<span>{contador.texto}</span>
			</div>
		{/if}

		<div class="acciones">
			<h2>Siguientes pasos</h2>
			{#each pantalla.quePuedesHacer as a (a.id)}
				{#if a.id === 'oficial'}
					<a class="accion" href={ENLACE_OFICIAL} target="_blank" rel="noopener noreferrer">
						<span class="accion-titulo">{a.titulo}</span>
						{#if a.detalle}<span class="accion-detalle">{a.detalle}</span>{/if}
					</a>
				{:else}
					<button type="button" class="accion" onclick={a.id === 'negociar' ? alNegociar : alOtro}>
						<span class="accion-titulo">{a.titulo}</span>
						{#if a.detalle}<span class="accion-detalle">{a.detalle}</span>{/if}
					</button>
				{/if}
			{/each}
		</div>

		{#if tarjeta}
			<Compartir {tarjeta} titulo={TARJETA.titulo} detalle={TARJETA.detalle} boton={BOTON_COMPARTIR} principal {compartiendo} {nativo} {enlaces} mensaje={mensajeTarjeta} {alCompartir} alCompartirPor={(c) => alCompartirPor?.(c)} {selector} />
		{/if}

		{#if pantalla.registro && alRegistrar}
			<div class="consentimiento-fila">
				<label class="consentimiento">
					<input type="checkbox" checked={registro !== 'no'} disabled={registro !== 'no'} onchange={alRegistrar} />
					<span class="casilla" aria-hidden="true">
						{#if registro !== 'no'}
							<svg width="16" height="16" viewBox="0 0 20 20"><path d="M4.5 10.5l3.5 3.5 7.5-8" stroke="var(--paja)" stroke-width="2.5" fill="none" /></svg>
						{/if}
					</span>
					<span class="texto-consentimiento">{REGISTRO.casilla}</span>
				</label>
				<a class="enlace-datos" href="/como-calculamos#tus-datos">{REGISTRO.enlace}</a>
			</div>
			<p class="mensaje" role="status">{registro === 'sumado' ? REGISTRO.sumado : ''}</p>
		{/if}

		<p class="no-cuadra"><a href="mailto:{ALGO_NO_CUADRA.correo}">{ALGO_NO_CUADRA.texto}</a></p>

		<!-- Cada resultado pregunta de nuevo: la respuesta anterior no se conserva -->
		{#key pantalla}<QueHaras modo="mirando" alElegir={(r) => alQueHaras?.(r)} />{/key}
	</div>
</article>

<style>
	.consentimiento {
		position: relative;
		display: flex;
		gap: 12px;
		align-items: flex-start;
		min-height: 44px;
		cursor: pointer;
	}
	.consentimiento input {
		position: absolute;
		opacity: 0;
		inset: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		cursor: inherit;
	}
	.consentimiento:has(input:focus-visible) {
		outline: 2px solid var(--tinta);
		outline-offset: 3px;
	}
	.casilla {
		flex: none;
		width: 26px;
		height: 26px;
		margin-top: 1px;
		border: 2px solid var(--tinta);
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--blanco);
	}
	.consentimiento:has(input:checked) .casilla {
		background: var(--tinta);
	}
	.texto-consentimiento {
		font: 600 15px/1.4 var(--f-texto);
	}
	.consentimiento-fila {
		display: flex;
		align-items: center;
		gap: 16px;
	}
	.consentimiento-fila .consentimiento {
		flex: 1;
	}
	.enlace-datos {
		flex: none;
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		font: 700 14px/1 var(--f-texto);
		text-underline-offset: 3px;
	}
	.resultado {
		background: var(--papel);
		width: 100%;
		max-width: 600px;
	}
	.arriba {
		padding: 24px var(--margen) 0;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	.aclaracion {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.aclaracion p {
		font: 400 14px/1.45 var(--f-texto);
		color: var(--grafito);
		text-wrap: pretty;
	}
	.abajo {
		padding: 28px var(--margen) 0;
		display: flex;
		flex-direction: column;
		gap: 20px;
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
	.acciones {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.acciones h2 {
		font: 700 17px/1.3 var(--f-texto);
	}
	.accion {
		min-height: 52px;
		width: 100%;
		border: 0;
		background: var(--superficie);
		border-radius: var(--radio);
		padding: 10px 16px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: flex-start;
		text-align: left;
		text-decoration: none;
	}
	.accion-titulo {
		font: 600 16px/1.3 var(--f-texto);
	}
	.accion-detalle {
		font: 400 13px/1.3 var(--f-texto);
		color: var(--grafito);
	}
	.mensaje {
		font: 500 13px/1.4 var(--f-texto);
		color: var(--grafito);
		margin-top: -12px;
		min-height: 1px;
	}
	.no-cuadra {
		font: 500 14px/1.4 var(--f-texto);
	}
	.no-cuadra a {
		color: var(--tinta);
		text-decoration-color: var(--paja);
		text-decoration-thickness: 2px;
		text-underline-offset: 4px;
	}
	@media (min-width: 1024px) {
		.arriba {
			padding-top: 40px;
		}
	}
</style>
