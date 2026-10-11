<script lang="ts">
	import { ajustarARango, numero, numeroDelCampo, type RangoControl } from '#lib/resultado';

	/**
	 * Una barra con su número editable, sincronizados. La barra mueve el valor al instante (el mapa se recolorea a medida
	 * que se arrastra); el número admite escribir con libertad: mientras se escribe, el valor es el número ajustado al rango
	 * (así el mapa sigue en tiempo real) y el campo no se reescribe hasta salir de él o pulsar Intro. Con separador de miles
	 * (1.200) salvo mientras el campo tiene el foco, que se escribe sin él.
	 */
	let {
		id,
		etiqueta,
		etiquetaCorta,
		valor = $bindable(),
		rango,
		unidad,
		formato,
		compacto = false,
		alArrastrar
	}: {
		id: string;
		etiqueta: string;
		/** La etiqueta en una sola palabra, para la versión compacta */
		etiquetaCorta?: string;
		valor: number;
		rango: RangoControl;
		/** «€» o «m²», junto al número */
		unidad: string;
		/** El valor para lectores de pantalla: «1.200 € al mes» */
		formato: (n: number) => string;
		/** Móvil: una sola línea, con la etiqueta corta, para dejar el mapa a la vista */
		compacto?: boolean;
		/** Al empezar a mover la barra */
		alArrastrar?: () => void;
	} = $props();

	let texto = $state('');
	let enfocado = $state(false);
	// Con el foco, lo que se escribe (sin separador); sin él, el valor con separador de miles
	const mostrado = $derived(enfocado ? texto : numero(valor));

	function alEnfocar(e: FocusEvent & { currentTarget: HTMLInputElement }) {
		texto = String(valor);
		enfocado = true;
		// Se quita el separador y se selecciona todo ya, sin esperar al repintado: lo que se escriba reemplaza el número
		e.currentTarget.value = texto;
		e.currentTarget.select();
	}

	function alEscribir(e: Event & { currentTarget: HTMLInputElement }) {
		texto = e.currentTarget.value;
		const n = numeroDelCampo(texto);
		if (n !== null) valor = ajustarARango(n, rango);
	}
	function alSalir() {
		// Un campo vacío o sin número válido vuelve al valor que tenía la barra
		enfocado = false;
		texto = '';
	}
	function alPulsar(e: KeyboardEvent) {
		if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
	}
</script>

<div class="control" class:compacto>
	<label class="etiqueta" for={id}>{compacto && etiquetaCorta ? etiquetaCorta : etiqueta}</label>
	<input
		class="barra"
		type="range"
		min={rango.min}
		max={rango.max}
		step={rango.paso}
		value={valor}
		aria-labelledby="{id}-et"
		aria-valuetext={formato(valor)}
		oninput={(e) => (valor = Number(e.currentTarget.value))}
		onpointerdown={() => alArrastrar?.()}
	/>
	<span class="oculto" id="{id}-et">{etiqueta}</span>
	<span class="numero">
		<input
			{id}
			type="text"
			inputmode="numeric"
			pattern="[0-9]*"
			enterkeyhint="done"
			autocomplete="off"
			value={mostrado}
			onfocus={alEnfocar}
			oninput={alEscribir}
			onblur={alSalir}
			onkeydown={alPulsar}
		/>
		<span class="unidad" aria-hidden="true">{unidad}</span>
	</span>
</div>

<style>
	.control {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		grid-template-areas: 'etiqueta numero' 'barra barra';
		align-items: center;
		gap: 4px 12px;
		min-width: 0;
	}
	.etiqueta {
		grid-area: etiqueta;
		font: 600 14px/1.3 var(--f-texto);
	}
	.numero {
		grid-area: numero;
		position: relative;
		display: flex;
		align-items: center;
	}
	.numero input {
		width: 104px;
		height: 44px;
		padding: 0 34px 0 12px;
		border: 1.5px solid var(--tinta);
		border-radius: var(--radio);
		background: var(--blanco);
		font: 700 16px/1 var(--f-texto);
		text-align: right;
		min-width: 0;
	}
	.numero input:focus-visible {
		outline: 2px solid var(--tinta);
		outline-offset: 3px;
	}
	.unidad {
		position: absolute;
		right: 10px;
		font: 600 14px/1 var(--f-texto);
		color: var(--grafito);
		pointer-events: none;
	}
	.barra {
		grid-area: barra;
		width: 100%;
		height: 32px;
		margin: 0;
		accent-color: var(--tinta);
		touch-action: none;
		cursor: pointer;
	}
	.barra:focus-visible {
		outline: 2px solid var(--tinta);
		outline-offset: 2px;
	}
	.oculto {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	/* Móvil, sobre el mapa: etiqueta, barra y número en una sola línea de 40 px */
	.compacto {
		grid-template-columns: 78px minmax(0, 1fr) auto;
		grid-template-areas: 'etiqueta barra numero';
		gap: 8px;
	}
	.compacto .etiqueta {
		font: 700 13px/1.15 var(--f-texto);
	}
	.compacto .numero input {
		width: 84px;
		height: 40px;
		padding: 0 26px 0 8px;
		font-size: 15px;
	}
	.compacto .unidad {
		right: 8px;
		font-size: 13px;
	}
</style>
