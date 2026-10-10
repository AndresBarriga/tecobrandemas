<script lang="ts">
	import type { Snippet } from 'svelte';
	import AfinarNumero from './AfinarNumero.svelte';
	import Costura from './Costura.svelte';
	import Compartir, { type SelectorTarjeta } from './Compartir.svelte';
	import Icono from './Icono.svelte';
	import QueHaras from './QueHaras.svelte';
	import {
		ENLACE_OFICIAL, INQUILINO, TARJETA, TARJETA_INQUILINO, ALGO_NO_CUADRA, type RespuestaQueHaras, type Canal, type EnlacesCompartir, type PantallaResultado
	} from '#lib/resultado';

	export type EstadoAporte = 'no' | 'enviando' | 'hecho' | 'error' | 'limite';

	let {
		pantalla,
		contador = null,
		aporte = 'no',
		alAportar,
		alMirando,
		alQueHaras,
		alAfinar,
		tarjeta,
		compartiendo = false,
		nativo = false,
		enlaces = null,
		mensajeTarjeta = null,
		alCompartir,
		alCompartirPor,
		selector = null
	}: {
		pantalla: PantallaResultado;
		/** Alquileres aportados en el barrio: solo llega si es real y de 10 o más */
		contador?: number | null;
		aporte?: EstadoAporte;
		alAportar?: () => void;
		/** «Comprobar un piso que estás mirando» */
		alMirando: () => void;
		/** «¿Qué vas a hacer con este resultado?»: la categoría elegida */
		alQueHaras?: (r: RespuestaQueHaras) => void;
		/** Calle sin número: añadir el número recalcula el resultado en esta pantalla */
		alAfinar?: (numero: string) => Promise<string | null>;
		/** Miniatura de la tarjeta (canvas) que dibuja la página */
		tarjeta?: Snippet;
		compartiendo?: boolean;
		nativo?: boolean;
		enlaces?: EnlacesCompartir | null;
		mensajeTarjeta?: string | null;
		alCompartir?: () => void;
		alCompartirPor?: (canal: Canal) => void;
		/** Las tres tarjetas de «La costura», para elegir cuál se comparte */
		selector?: SelectorTarjeta | null;
	} = $props();

	const v = $derived(pantalla.vista);
	const i = $derived(pantalla.inquilino!);
	const barrio = $derived(pantalla.barrio ?? 'tu barrio');
</script>

<article class="resultado nivel-{i.clase}">
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
		<!-- El aviso de antigüedad, solo con un contrato de hace menos de un año -->
		{#if i.firma.reciente}
		<div class="contrato">
			<svg width="22" height="22" viewBox="0 0 20 20" aria-hidden="true" style="flex: none; margin-top: 1px">
				<circle cx="10" cy="10" r="8.5" stroke="var(--tinta)" stroke-width="1.5" fill="none" />
				<path d="M10 9v5M10 6v.5" stroke="var(--tinta)" stroke-width="2" />
			</svg>
			<div class="contrato-texto">
				<p><strong>{i.contrato.titulo}</strong>{i.contrato.texto}</p>
				<p class="detalle">{i.contrato.detalle}</p>
				{#if i.contrato.cambio}<p class="cambio">{i.contrato.cambio}</p>{/if}
			</div>
		</div>
		{:else if i.contrato.cambio}
			<!-- Contratos de más de un año: solo lo que pagaba al firmar, si lo ha escrito -->
			<p class="cambio-firma">{i.contrato.cambio}</p>
		{/if}

		{#if i.tuParte}
			<p class="tu-parte">Tu parte: <strong>{i.tuParte}</strong> al mes <span>(solo en tu pantalla)</span></p>
		{/if}

		{#if aporte === 'hecho'}
			<section class="aportado" aria-labelledby="aportado-titulo" role="status">
				<p class="etiqueta nivel-a"><Icono clase="a" />{INQUILINO.aportado.etiqueta}</p>
				{#if contador !== null}
					<p class="gracias-grande" id="aportado-titulo">{INQUILINO.aportado.gracias} <span class="numero">{contador}</span></p>
					<p class="subtitulo">{INQUILINO.aportado.muchos(barrio)}</p>
					<p class="detalle-aporte">{INQUILINO.aportado.detalleMuchos}</p>
				{:else}
					<p class="gracias-grande" id="aportado-titulo">{INQUILINO.aportado.gracias}</p>
					<p class="subtitulo">{INQUILINO.aportado.pocos(barrio)}</p>
					<p class="detalle-aporte">{INQUILINO.aportado.detallePocos}</p>
				{/if}
			</section>
		{:else if i.aporte && alAportar}
			<section class="aportar" aria-labelledby="aportar-titulo">
				<h2 id="aportar-titulo">{INQUILINO.aportar.titulo}</h2>
				<p>{INQUILINO.aportar.texto(barrio)}</p>
				<p><strong>Se guarda:</strong> {INQUILINO.aportar.seGuarda(!!i.aporte.firmaMes, i.aporte.rentaFirma != null)}</p>
				<p><strong>No se guarda:</strong> {INQUILINO.aportar.noSeGuarda} <a class="enlace-datos" href="/como-calculamos#tus-datos">{INQUILINO.aportar.tusDatos}</a></p>
				<button type="button" class="boton" onclick={alAportar} disabled={aporte === 'enviando'} aria-busy={aporte === 'enviando'}>
					{aporte === 'enviando' ? INQUILINO.aportar.enviando : INQUILINO.aportar.boton}
				</button>
				<p class="nota-aportar" role={aporte === 'error' || aporte === 'limite' ? 'alert' : undefined}>
					{aporte === 'error' ? INQUILINO.aportar.error : aporte === 'limite' ? INQUILINO.aportar.limite : INQUILINO.aportar.nota}
				</p>
			</section>
		{/if}

		{#if tarjeta && alCompartir && alCompartirPor}
			<Compartir
				{tarjeta}
				titulo={TARJETA_INQUILINO.titulo}
				detalle={TARJETA.detalle}
				boton={INQUILINO.compartir}
				principal={aporte === 'hecho'}
				{compartiendo}
				{nativo}
				{enlaces}
				mensaje={mensajeTarjeta}
				{alCompartir}
				{alCompartirPor}
				{selector}
			/>
		{/if}

		<div class="acciones">
			<h2>{INQUILINO.acciones.titulo}</h2>
			<a class="accion" href={ENLACE_OFICIAL} target="_blank" rel="noopener noreferrer">
				<span class="accion-titulo">{INQUILINO.acciones.oficial}</span>
				<span class="accion-detalle">serpavi.mivau.gob.es</span>
			</a>
			<button type="button" class="accion" onclick={alMirando}>
				<span class="accion-titulo">{INQUILINO.acciones.mirando}</span>
			</button>
		</div>

		<p class="no-cuadra"><a href="mailto:{ALGO_NO_CUADRA.correo}">{ALGO_NO_CUADRA.texto}</a></p>

		<!-- Cada resultado pregunta de nuevo: la respuesta anterior no se conserva -->
		{#key pantalla}<QueHaras modo="vivo" alElegir={(r) => alQueHaras?.(r)} />{/key}
	</div>
</article>

<style>
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
	.etiqueta {
		display: inline-flex;
		align-self: flex-start;
		align-items: center;
		gap: 8px;
		min-height: 32px;
		padding: 4px 12px 4px 8px;
		background: var(--tinte);
		color: var(--acento);
		border-radius: var(--radio);
		font: 700 14px/1.25 var(--f-texto);
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
	.contrato {
		display: flex;
		gap: 12px;
		align-items: flex-start;
		background: var(--superficie);
		border-radius: var(--radio);
		padding: 18px 16px;
		font: 500 16px/1.45 var(--f-texto);
	}
	.contrato-texto {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.detalle {
		color: var(--grafito);
		font-weight: 400;
	}
	.cambio-firma {
		font: 500 16px/1.45 var(--f-texto);
	}
	.cambio {
		font-weight: 500;
	}
	.tu-parte {
		font: 500 16px/1.3 var(--f-texto);
	}
	.tu-parte span {
		color: var(--grafito);
		font-size: 13px;
	}
	.aportar,
	.aportado {
		background: var(--blanco);
		border-radius: var(--radio);
		padding: 24px 20px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		font: 400 16px/1.45 var(--f-texto);
	}
	.aportar h2 {
		font: 800 24px/1.2 var(--f-texto);
		text-wrap: balance;
	}
	.enlace-datos {
		font-weight: 700;
		white-space: nowrap;
		text-underline-offset: 3px;
	}
	.nota-aportar {
		font: 400 14px/1.4 var(--f-texto);
		color: var(--grafito);
	}
	.gracias-grande {
		font: 700 24px/1.1 var(--f-texto);
		display: flex;
		align-items: baseline;
		gap: 12px;
	}
	.numero {
		font: 800 40px/1 var(--f-extra);
	}
	.subtitulo {
		font: 700 22px/1.2 var(--f-texto);
		text-wrap: balance;
	}
	.detalle-aporte {
		color: var(--grafito);
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
