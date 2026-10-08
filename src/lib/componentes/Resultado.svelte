<script lang="ts">
	import AfinarNumero from './AfinarNumero.svelte';
	import Barra from './Barra.svelte';
	import Equivalencia from './Equivalencia.svelte';
	import Icono from './Icono.svelte';
	import QueHaras from './QueHaras.svelte';
	import TarjetaAmpliable from './TarjetaAmpliable.svelte';
	import {
		AVISO_APROXIMADA_TITULO, BOTON_COMPARTIR, ENLACE_OFICIAL, ETIQUETA_POR_DEBAJO, REGISTRO, TARJETA, heroEnVeces, ALGO_NO_CUADRA, type RespuestaQueHaras,
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
		alRegistrar
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
	} = $props();

	const v = $derived(pantalla.vista);
	const principal = $derived(v.principal);
</script>

<article class="resultado nivel-{v.clase}">
	<div class="arriba">
		<div class="lugar">
			<h1>{v.lugar}</h1>
			<p>{v.contexto}</p>
		</div>

		<p class="etiqueta"><Icono clase={v.etiqueta === ETIQUETA_POR_DEBAJO ? 'abajo' : v.clase} />{v.etiqueta}</p>

		{#if principal.tipo === 'cifra'}
			<div class="principal">
				<p class="cifra" class:veces={heroEnVeces(principal.texto)} aria-label="{principal.texto} {principal.nota}">{principal.texto}</p>
				<p class="nota">{principal.nota}</p>
			</div>
		{:else if principal.tipo === 'rango'}
			<div class="principal">
				<p class="rango" aria-label="entre {principal.desde} y {principal.hasta} {principal.nota}">
					<span class="palabra">entre</span><span class="num">{principal.desde}</span><span class="palabra">y</span><span
						class="num">{principal.hasta}</span
					>
				</p>
				<p class="nota">{principal.nota}</p>
			</div>
		{:else}
			<div class="principal">
				<p class="titular" class:en-frase={principal.enFrase}>{principal.texto}</p>
				{#if principal.nota}<p class="nota">{principal.nota}</p>{/if}
			</div>
		{/if}

		{#if v.frase}<p class="frase">{v.frase}</p>{/if}
		{#if v.matiz}<p class="matiz">{v.matiz}</p>{/if}
		<p class="contratos">{v.avisoContratos}</p>

		{#if v.aviso}
			<div class="aviso">
				<div class="aviso-texto">
					<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" style="flex: none; margin-top: 1px">
						<circle cx="10" cy="10" r="8.5" stroke="var(--tinta)" stroke-width="1.5" fill="none" />
						<path d="M10 9v5M10 6v.5" stroke="var(--tinta)" stroke-width="2" />
					</svg>
					<p><strong>{AVISO_APROXIMADA_TITULO}</strong> {v.aviso}</p>
				</div>
				{#if alAfinar}<AfinarNumero {alAfinar} />{/if}
			</div>
		{/if}
	</div>

	<div class="barra-caja"><Barra barra={pantalla.barra} vista={v} /></div>

	<div class="abajo">
		<Equivalencia vista={v} />

		{#if contador}
			<div class="contador">
				<span class="contador-num">{contador.numero}</span>
				<span>{contador.texto}</span>
			</div>
		{/if}

		<p class="fuente">{v.fuente} <a href="/como-calculamos">Cómo calculamos</a></p>

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

		{#if tarjeta}<TarjetaAmpliable {tarjeta} titulo={TARJETA.titulo} detalle={TARJETA.detalle} />{/if}
		{#if nativo}
			<button type="button" class="boton" onclick={alCompartir} disabled={compartiendo}>
				{compartiendo ? TARJETA.generando : BOTON_COMPARTIR}
			</button>
		{:else if enlaces}
			<div class="canales" role="group" aria-label={BOTON_COMPARTIR}>
				<a class="boton canal" href={enlaces.whatsapp} target="_blank" rel="noopener noreferrer" onclick={(e) => { e.preventDefault(); alCompartirPor?.('whatsapp'); }}
					>{TARJETA.canales.whatsapp}</a
				>
				<a class="boton canal" href={enlaces.x} target="_blank" rel="noopener noreferrer" onclick={(e) => { e.preventDefault(); alCompartirPor?.('x'); }}
					>{TARJETA.canales.x}</a
				>
				<button type="button" class="boton boton-contorno canal" onclick={() => alCompartirPor?.('copiar')}>{TARJETA.canales.copiar}</button>
				<button type="button" class="boton boton-contorno canal" onclick={() => alCompartirPor?.('descarga')}>{TARJETA.canales.descarga}</button>
			</div>
			<p class="mensaje aviso">{TARJETA.canalesAviso}</p>
		{/if}
		<p class="mensaje" role="status">{mensajeTarjeta ?? ''}</p>

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
	/* «5,0 veces» es más ancha que «+240 %»: cabe entera en cualquier ancho (≈3,8 em) */
	.cifra.veces {
		font-size: min(144px, 25cqw);
	}
	.rango {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 4px 10px;
		color: var(--acento);
	}
	.rango .palabra {
		font: 600 20px/1 var(--f-texto);
	}
	.rango .num {
		font: 900 84px/0.85 var(--f-extra);
		font-size: min(84px, 24cqw);
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
	/* El titular es una frase («Un 4 % por encima de lo habitual aquí.»), no un rótulo */
	.titular.en-frase {
		font: 800 34px/1.05 var(--f-extra);
		text-transform: none;
		text-wrap: balance;
	}
	.matiz {
		font: 500 17px/1.4 var(--f-texto);
		text-wrap: pretty;
	}
	.contratos {
		font: 500 15px/1.4 var(--f-texto);
		border-left: 3px solid var(--acento);
		padding-left: 10px;
		text-wrap: pretty;
	}
	.aviso {
		background: var(--superficie);
		border-radius: var(--radio);
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.aviso-texto {
		display: flex;
		gap: 10px;
		align-items: flex-start;
		font: 400 15px/1.45 var(--f-texto);
	}
	.aviso-texto strong {
		font-weight: 700;
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
	.contador {
		display: flex;
		align-items: center;
		gap: 12px;
		font: 500 15px/1.35 var(--f-texto);
	}
	.contador-num {
		font: 800 34px/1 var(--f-extra);
	}
	.fuente {
		font: 400 13px/1.45 var(--f-texto);
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
	.canales {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	.canal {
		min-height: 48px;
		font-size: 16px;
	}
	.mensaje.aviso {
		margin-top: -4px;
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
