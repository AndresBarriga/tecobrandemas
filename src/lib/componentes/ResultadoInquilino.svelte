<script lang="ts">
	import Barra from './Barra.svelte';
	import type { Snippet } from 'svelte';
	import AfinarNumero from './AfinarNumero.svelte';
	import Compartir from './Compartir.svelte';
	import Icono from './Icono.svelte';
	import QueHaras from './QueHaras.svelte';
	import { unaLinea } from '#lib/cliente/ajustar';
	import {
		ENLACE_OFICIAL, INQUILINO, OFERTA, TARJETA_INQUILINO, heroEnVeces, ALGO_NO_CUADRA, type RespuestaQueHaras, type Canal, type EnlacesCompartir, type PantallaResultado
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
		textos = [],
		textoElegido = 0,
		alElegirTexto,
		compartiendo = false,
		nativo = false,
		enlaces = null,
		mensajeTarjeta = null,
		alCompartir,
		alCompartirPor
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
		/** Los tres textos de la tarjeta, de los que la persona elige uno */
		textos?: string[];
		textoElegido?: number;
		alElegirTexto?: (i: number) => void;
		compartiendo?: boolean;
		nativo?: boolean;
		enlaces?: EnlacesCompartir | null;
		mensajeTarjeta?: string | null;
		alCompartir?: () => void;
		alCompartirPor?: (canal: Canal) => void;
	} = $props();

	const v = $derived(pantalla.vista);
	const i = $derived(pantalla.inquilino!);
	const barrio = $derived(pantalla.barrio ?? 'tu barrio');
</script>

<article class="resultado nivel-{i.clase}">
	<div class="arriba">
		<div class="lugar">
			<h1>{v.lugar}</h1>
			<p>{i.pagas}</p>
		</div>

		<p class="etiqueta"><Icono clase={i.icono} />{i.etiqueta}</p>

		<div class="principal">
			{#if i.cifra}
				<p class="cifra" class:veces={heroEnVeces(i.cifra)} use:unaLinea={i.cifra} aria-label="{i.cifra} {i.nota}">{i.cifra}</p>
			{:else}
				<p class="titular">{i.titular}</p>
			{/if}
			<p class="nota">{i.nota}</p>
		</div>

		<p class="frase">{i.frase}</p>

		{#if pantalla.oferta}
			<!-- «Lo que se pide»: línea secundaria sin veredicto; el titular de arriba sigue siendo contra contratos -->
			<div class="oferta">
				<p class="oferta-linea">{pantalla.oferta.linea}</p>
				<p class="oferta-pie">{pantalla.oferta.pie}</p>
			</div>
		{/if}

		{#if v.aviso}
			<div class="aviso">
				<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" style="flex: none; margin-top: 1px">
					<circle cx="10" cy="10" r="8.5" stroke="var(--tinta)" stroke-width="1.5" fill="none" />
					<path d="M10 9v5M10 6v.5" stroke="var(--tinta)" stroke-width="2" />
				</svg>
				<div class="aviso-cuerpo">
					<p>{v.aviso}</p>
					{#if alAfinar}<AfinarNumero {alAfinar} />{/if}
				</div>
			</div>
		{/if}
	</div>

	<div class="barra-caja"><Barra barra={pantalla.barra} vista={v} etiquetaPrecio="lo que pagas" /></div>

	<div class="abajo">
		{#if i.brecha}
			<div class="caja">
				<div class="importes">
					<div><span class="et">{INQUILINO.alMes}</span><span class="importe">{i.brecha.mes}</span></div>
					<div><span class="et">{INQUILINO.alAno}</span><span class="importe">{i.brecha.año}</span></div>
				</div>
			</div>
		{/if}

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

		{#if pantalla.oferta}
			<p class="fuente">{OFERTA.contratos} {v.fuente}</p>
			<p class="fuente">{pantalla.oferta.fuente} <a href="/como-calculamos">Cómo calculamos</a></p>
		{:else}
			<p class="fuente">{v.fuente} <a href="/como-calculamos">Cómo calculamos</a></p>
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
				detalle={TARJETA_INQUILINO.detalle}
				boton={INQUILINO.compartir}
				principal={aporte === 'hecho'}
				{compartiendo}
				{nativo}
				{enlaces}
				mensaje={mensajeTarjeta}
				{textos}
				elegido={textoElegido}
				etiquetaTextos={TARJETA_INQUILINO.elige}
				{alElegirTexto}
				{alCompartir}
				{alCompartirPor}
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
	.lugar h1 {
		font: 700 17px/1.3 var(--f-texto);
	}
	.lugar p {
		font: 400 15px/1.4 var(--f-texto);
		color: var(--grafito);
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
	.principal {
		display: flex;
		flex-direction: column;
		gap: 6px;
		container-type: inline-size;
	}
	.cifra {
		font: 900 clamp(100px, 37vw, 144px) / 0.82 var(--f-extra);
		color: var(--acento);
		letter-spacing: -0.01em;
	}
	.cifra.veces {
		font-size: min(144px, 25cqw);
	}
	.titular {
		font: 800 60px/0.88 var(--f-extra);
		text-transform: uppercase;
		color: var(--acento);
	}
	.nota {
		font: 500 15px/1.4 var(--f-texto);
		color: var(--grafito);
	}
	.frase {
		font: 600 21px/1.3 var(--f-texto);
		text-wrap: pretty;
	}
	.oferta {
		display: flex;
		flex-direction: column;
		gap: 4px;
		border-left: 3px solid var(--tinta);
		padding-left: 10px;
	}
	.oferta-linea {
		font: 500 15px/1.4 var(--f-texto);
		text-wrap: pretty;
	}
	.oferta-pie {
		font: 400 13px/1.4 var(--f-texto);
		color: var(--grafito);
	}
	.aviso {
		background: var(--superficie);
		border-radius: var(--radio);
		padding: 16px;
		display: flex;
		gap: 10px;
		align-items: flex-start;
		font: 400 15px/1.45 var(--f-texto);
	}
	.aviso-cuerpo {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.barra-caja {
		padding: 32px var(--margen) 0;
	}
	.abajo {
		padding: 28px var(--margen) 0;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	.caja {
		background: var(--superficie);
		border-radius: var(--radio);
		padding: 18px 16px;
	}
	.importes {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	.importes div {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.et {
		font: 500 14px/1.3 var(--f-texto);
		color: var(--grafito);
	}
	.importe {
		font: 700 26px/1.1 var(--f-semi);
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
	.cambio {
		font-weight: 500;
	}
	.fuente {
		font: 400 13px/1.45 var(--f-texto);
		color: var(--grafito);
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
	.gracias {
		font: 500 15px/1.3 var(--f-texto);
		color: var(--grafito);
	}
	@media (min-width: 1024px) {
		.arriba {
			padding-top: 40px;
		}
	}
</style>
