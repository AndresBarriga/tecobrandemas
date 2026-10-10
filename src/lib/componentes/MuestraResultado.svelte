<script lang="ts">
	import { onMount } from 'svelte';
	import Costura from './Costura.svelte';
	import { MUESTRA, construirMuestra, type Muestra, type ModoMuestra } from '#lib/resultado';
	import { cargarDatos } from '#lib/cliente/datos';

	/**
	 * «Así se ve un resultado» (marcado EJEMPLO): la costura reducida con un caso real calculado por el motor.
	 *  - escritorio (`movil` = false): en la portada, junto al titular; se calcula al cargar;
	 *  - móvil (`movil` = true): bajo el formulario, minimalista; los datos solo se piden cuando la persona llega a él.
	 * `alListo` avisa a la página de que la muestra está lista (entonces el esquema gris sobra).
	 */
	let { modo, alListo, movil = false }: { modo: ModoMuestra; alListo?: () => void; movil?: boolean } = $props();

	let datos = $state<Awaited<ReturnType<typeof cargarDatos>> | null>(null);
	let caja: HTMLElement | undefined = $state();

	function cargar() {
		void cargarDatos()
			.then((d) => {
				datos = d;
				if (construirMuestra(d, modo)) alListo?.();
			})
			.catch(() => {});
	}

	onMount(() => {
		const escritorio = matchMedia('(min-width: 1024px)').matches;
		if (!movil) {
			if (escritorio) cargar();
			return;
		}
		if (escritorio || !caja) return;
		// Móvil: nada hasta que el ejemplo está a punto de verse
		const obs = new IntersectionObserver(
			(entradas) => {
				if (entradas.some((e) => e.isIntersecting)) {
					obs.disconnect();
					cargar();
				}
			},
			{ rootMargin: '200px' }
		);
		obs.observe(caja);
		return () => obs.disconnect();
	});

	const muestra = $derived<Muestra | null>(datos ? construirMuestra(datos, modo) : null);
</script>

<div class="caja" class:movil bind:this={caja}>
	{#if muestra}
		<section class="muestra" aria-labelledby="muestra-titulo-{movil ? 'm' : 'e'}">
			<div class="cabeza">
				<h2 id="muestra-titulo-{movil ? 'm' : 'e'}">{MUESTRA.titulo}</h2>
				<span class="sello">{MUESTRA.ejemplo}</span>
			</div>
			<!-- El mismo bloque que el resultado, con valores reales del motor, sin titular, aclaraciones ni plegables -->
			<Costura costura={muestra.costura} demo />
			<p class="pie">{MUESTRA.nota}</p>
		</section>
	{/if}
</div>

<style>
	/* Cada versión solo en su tamaño: la de escritorio desde 1024 px, la de móvil por debajo */
	.caja {
		display: none;
	}
	.caja.movil {
		display: block;
		min-height: 1px;
	}
	@media (min-width: 1024px) {
		.caja {
			display: block;
		}
		.caja.movil {
			display: none;
		}
	}
	.muestra {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.cabeza {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	h2 {
		font: 700 13px/1.3 var(--f-semi);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.sello {
		border: 1.5px dashed var(--ciruela);
		color: var(--ciruela);
		border-radius: 4px;
		padding: 2px 7px;
		font: 700 11px/1 var(--f-semi);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.pie {
		font: 400 12.5px/1.5 var(--f-texto);
		color: var(--grafito);
	}
</style>
