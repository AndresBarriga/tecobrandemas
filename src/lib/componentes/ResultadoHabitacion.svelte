<script lang="ts">
	import Icono from './Icono.svelte';
	import { HABITACION, MINIMO_COMPARACION, euros, type PantallaHabitacion } from '#lib/resultado';
	import type { EstadoAporte } from './ResultadoInquilino.svelte';

	let {
		pantalla,
		comparacion,
		aporte = 'no',
		alAportar,
		alPiso
	}: {
		pantalla: PantallaHabitacion;
		/** null mientras carga; `error` si falla la consulta */
		comparacion: { n: number; mediana: number | null } | 'error' | null;
		aporte?: EstadoAporte;
		alAportar?: () => void;
		/** «¿Compartís piso con un solo contrato?»: vuelve al formulario con el tipo en «Piso» */
		alPiso: () => void;
	} = $props();

	const hay = $derived(comparacion !== null && comparacion !== 'error' && comparacion.mediana !== null);
	const n = $derived(comparacion !== null && comparacion !== 'error' ? comparacion.n : 0);
</script>

<article class="resultado">
	<div class="arriba">
		<div class="lugar">
			<h1>{pantalla.lugar}</h1>
			<p>{pantalla.contexto}</p>
		</div>

		<p class="insignia">{HABITACION.insignia}</p>
		<p class="intro">{HABITACION.intro}</p>
	</div>

	<div class="abajo">
		<section class="comparacion" aria-live="polite">
			{#if comparacion === null}
				<p class="cargando">{HABITACION.cargando}</p>
			{:else if comparacion === 'error'}
				<p class="cargando">{HABITACION.sinConexion}</p>
			{:else if hay}
				<div class="dos">
					<div>
						<span class="et">{HABITACION.tuHabitacion}</span>
						<span class="cifra">{pantalla.precio}</span>
						<span class="pie-cifra">{HABITACION.alMes(pantalla.gastos)}</span>
					</div>
					<div>
						<span class="et">{HABITACION.otras(pantalla.barrio)}</span>
						<span class="cifra">{euros(comparacion.mediana!)}</span>
						<span class="pie-cifra">{HABITACION.mediana(n)}</span>
					</div>
				</div>
			{:else}
				<span class="et">{HABITACION.tuHabitacion}</span>
				<span class="cifra">{pantalla.precio}</span>
				<p class="pocas">{(pantalla.vivo ? HABITACION.pocas : HABITACION.pocasMirando)(pantalla.barrio, n)}</p>
				<div class="bloques" aria-hidden="true">
					{#each Array.from({ length: MINIMO_COMPARACION }, (_, i) => i) as i (i)}<span class="bloque" class:lleno={i < n}></span>{/each}
				</div>
				<p class="et">{n} de {MINIMO_COMPARACION} aportaciones en {pantalla.barrio}</p>
			{/if}
		</section>
		{#if hay}<p class="nota">{HABITACION.mismoGastos(pantalla.gastos)}</p>{/if}

		{#if pantalla.vivo}
			{#if aporte === 'hecho'}
				<section class="aportado" role="status">
					<p class="etiqueta"><Icono clase="a" />{HABITACION.aportada.etiqueta}</p>
					<p class="gracias">{n >= MINIMO_COMPARACION ? HABITACION.aportada.hay(n, pantalla.barrio) : HABITACION.aportada.faltan(MINIMO_COMPARACION - n)}</p>
					<p class="nota">{HABITACION.aportada.detalle}</p>
				</section>
			{:else if pantalla.aporte && alAportar}
				<section class="aportar" aria-labelledby="aportar-hab">
					<h2 id="aportar-hab">{HABITACION.aportar.titulo}</h2>
					<p><strong>Se guarda:</strong> {HABITACION.aportar.seGuarda}</p>
					<p><strong>No se guarda:</strong> {HABITACION.aportar.noSeGuarda} <a class="enlace-datos" href="/como-calculamos#tus-datos">Tus datos</a></p>
					<button type="button" class="boton" onclick={alAportar} disabled={aporte === 'enviando'} aria-busy={aporte === 'enviando'}>
						{HABITACION.aportar.boton}
					</button>
					<p class="nota" role={aporte === 'error' || aporte === 'limite' ? 'alert' : undefined}>
						{aporte === 'error' ? 'No hemos podido enviar tu habitación. Inténtalo de nuevo.' : aporte === 'limite' ? 'Hoy ya se han enviado muchas aportaciones desde esta conexión. Vuelve a intentarlo mañana.' : HABITACION.aportar.nota}
					</p>
				</section>
			{/if}
		{/if}

		<div class="acciones">
			<h2>{HABITACION.acciones.titulo}</h2>
			<button type="button" class="accion" onclick={alPiso}>
				<span class="accion-titulo">{HABITACION.acciones.compartis}</span>
				<span class="accion-detalle">{HABITACION.acciones.compartisDetalle}</span>
			</button>
			<a class="accion" href="/como-calculamos#lim"><span class="accion-titulo">{HABITACION.acciones.porQue}</span></a>
		</div>
	</div>
</article>

<style>
	.resultado {
		background: var(--papel);
		width: 100%;
		max-width: 600px;
		--acento: var(--salvia);
		--tinte: var(--salvia-tinte);
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
	.insignia {
		align-self: flex-start;
		border: 1.5px solid var(--tinta);
		border-radius: var(--radio);
		padding: 10px 16px;
		font: 700 15px/1.3 var(--f-texto);
	}
	.intro {
		font: 400 17px/1.55 var(--f-texto);
	}
	.abajo {
		padding: 24px var(--margen) 0;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	.comparacion,
	.aportar,
	.aportado {
		background: var(--blanco);
		border-radius: var(--radio);
		padding: 24px 20px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		font: 400 16px/1.45 var(--f-texto);
	}
	.dos {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}
	.dos > div {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.et {
		font: 500 15px/1.3 var(--f-texto);
	}
	.cifra {
		font: 900 clamp(56px, 16vw, 84px) / 0.9 var(--f-extra);
	}
	.pie-cifra {
		font: 400 15px/1.3 var(--f-texto);
		color: var(--grafito);
	}
	.pocas {
		font: 600 21px/1.35 var(--f-texto);
		text-wrap: pretty;
	}
	.bloques {
		display: flex;
		gap: 4px;
	}
	.bloque {
		flex: 1;
		height: 22px;
		border-radius: 2px;
		background: var(--pista);
	}
	.bloque.lleno {
		background: var(--tinta);
	}
	.cargando {
		color: var(--grafito);
	}
	.nota {
		font: 400 14px/1.45 var(--f-texto);
		color: var(--grafito);
	}
	.aportar h2 {
		font: 800 24px/1.2 var(--f-texto);
		text-wrap: balance;
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
	.enlace-datos {
		font-weight: 700;
		white-space: nowrap;
		text-underline-offset: 3px;
	}
	.gracias {
		font: 700 24px/1.2 var(--f-texto);
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
	@media (min-width: 1024px) {
		.arriba {
			padding-top: 40px;
		}
	}
</style>
