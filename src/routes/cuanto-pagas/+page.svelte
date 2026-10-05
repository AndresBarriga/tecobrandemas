<script lang="ts">
	import { onMount } from 'svelte';
	import Icono from '#lib/componentes/Icono.svelte';
	import Logo from '#lib/componentes/Logo.svelte';
	import Pie from '#lib/componentes/Pie.svelte';
	import { APORTACION, type BarrioDeSeccion, normalizarNumero, validarAportacion } from '#lib/resultado';
	import { barriosDeLaCalle, enviarAportacion } from '#lib/cliente/aportacion';
	import { precargarDatos } from '#lib/cliente/datos';
	import { SinConexion } from '#lib/cliente/direccion';
	import { evento } from '#lib/cliente/eventos';

	const claves = ['garaje', 'trastero', 'comunidad', 'amueblado'] as const;

	let calle = $state('');
	let precio = $state('');
	let superficie = $state('');
	let anio = $state('');
	let incluye = $state<string[]>([]);
	let consentimiento = $state(false);
	let barrio = $state('');
	let barriosPosibles = $state<BarrioDeSeccion[]>([]);
	let errores = $state<Record<string, string | undefined>>({});
	let enviando = $state(false);
	let resultado = $state<'guardada' | 'no_guardada' | null>(null);
	let listo = $state(false);

	onMount(() => {
		listo = true;
		precargarDatos();
	});

	function alternar(clave: string) {
		incluye = incluye.includes(clave) ? incluye.filter((c) => c !== clave) : [...incluye, clave];
	}

	async function enviar() {
		// Sin consentimiento no se envía nada: el botón está desactivado y aquí se vuelve a comprobar
		if (!consentimiento || enviando) return;
		errores = {};
		enviando = true;
		try {
			if (!calle.trim()) {
				errores = { calle: APORTACION.placeholderCalle };
				return;
			}
			// La calle solo sirve para saber el barrio; con una calle en varios barrios, elige la persona
			if (!barriosPosibles.length || !barriosPosibles.some((b) => b.codigo === barrio)) {
				const r = await barriosDeLaCalle(calle);
				if (r.tipo === 'calle_larga') return void (errores = { calle: APORTACION.calleLarga });
				if (r.tipo === 'no_encontrada') return void (errores = { calle: APORTACION.calleNoEncontrada });
				barriosPosibles = r.barrios;
				if (r.barrios.length === 1) barrio = r.barrios[0]!.codigo;
				else if (!r.barrios.some((b) => b.codigo === barrio)) {
					barrio = '';
					return void (errores = { barrio: APORTACION.barrio });
				}
			}
			const v = validarAportacion(
				{ precio, superficie, anioContrato: anio, barrio, consentimiento, incluye },
				barriosPosibles,
				new Date().getFullYear()
			);
			if (!v.ok) return void (errores = { ...v.errores });
			const r = await enviarAportacion(v.payload);
			if (r === 'limite') errores = { envio: APORTACION.limite };
			else if (r === 'error') errores = { envio: APORTACION.errorEnvio };
			else {
				resultado = r;
				if (r === 'guardada') evento('aporta');
				scrollTo({ top: 0 });
			}
		} catch (e) {
			errores = { envio: e instanceof SinConexion ? APORTACION.errorEnvio : APORTACION.errorEnvio };
		} finally {
			enviando = false;
		}
	}

	const normalizar = (campo: 'precio' | 'superficie') => {
		const b = normalizarNumero(campo === 'precio' ? precio : superficie);
		if (b === null) return;
		if (campo === 'precio') precio = b;
		else superficie = b;
	};
</script>

<svelte:head>
	<title>{APORTACION.titulo} · A su precio</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="pagina" data-listo={listo}>
	<header>
		<a class="marca" href="/" aria-label="A su precio, inicio"><Logo /></a>
		<a class="cerrar" href="/">{APORTACION.cerrar}</a>
	</header>

	{#if resultado}
		<main class="enviado">
			<p class="etiqueta nivel-a"><Icono clase="a" />{APORTACION.enviado.etiqueta}</p>
			<h1>{APORTACION.enviado.titular}</h1>
			<p class="frase">{resultado === 'guardada' ? APORTACION.enviado.frase : APORTACION.enviado.noGuardada}</p>
			{#if resultado === 'guardada'}<p class="gris">{APORTACION.enviado.nota}</p>{/if}
			<a class="boton" href="/">{APORTACION.enviado.boton}</a>
		</main>
	{:else}
		<main>
			<div class="intro">
				<h1>{APORTACION.titulo}</h1>
				<p class="frase">{APORTACION.intro}</p>
				<p class="gris">{APORTACION.anonimo}</p>
			</div>

			<form
				novalidate
				onsubmit={(e) => {
					e.preventDefault();
					void enviar();
				}}
			>
				<div class="grupo">
					<label for="calle">{APORTACION.calle}</label>
					<div class="campo" class:error={!!errores.calle}>
						<input id="calle" type="text" bind:value={calle} placeholder={APORTACION.placeholderCalle} autocomplete="off" aria-invalid={!!errores.calle} />
					</div>
					{#if errores.calle}<p class="mensaje-error">{errores.calle}</p>{:else}<p class="ayuda">{APORTACION.ayudaCalle}</p>{/if}
				</div>

				{#if barriosPosibles.length > 1}
					<fieldset class="grupo">
						<legend>{APORTACION.barrio}</legend>
						<div class="chips">
							{#each barriosPosibles as b (b.codigo)}
								<label class="chip" class:marcado={barrio === b.codigo}>
									<input type="radio" name="barrio" value={b.codigo} bind:group={barrio} />{b.nombre}
								</label>
							{/each}
						</div>
						{#if errores.barrio}<p class="mensaje-error">{errores.barrio}</p>{/if}
					</fieldset>
				{/if}

				<div class="par">
					<div class="grupo">
						<label for="renta">{APORTACION.renta}</label>
						<div class="campo numerico" class:error={!!errores.precio}>
							<input id="renta" type="text" inputmode="numeric" autocomplete="off" bind:value={precio} onblur={() => normalizar('precio')} />
							<span class="sufijo">€</span>
						</div>
					</div>
					<div class="grupo">
						<label for="m2">{APORTACION.superficie}</label>
						<div class="campo numerico" class:error={!!errores.superficie}>
							<input id="m2" type="text" inputmode="numeric" autocomplete="off" bind:value={superficie} onblur={() => normalizar('superficie')} />
							<span class="sufijo">m²</span>
						</div>
					</div>
				</div>
				{#if errores.precio}<p class="mensaje-error">{errores.precio}</p>{/if}
				{#if errores.superficie}<p class="mensaje-error">{errores.superficie}</p>{/if}

				<div class="grupo">
					<label for="anio">{APORTACION.anio}</label>
					<div class="campo" class:error={!!errores.anioContrato}>
						<input id="anio" type="text" inputmode="numeric" autocomplete="off" bind:value={anio} />
					</div>
					{#if errores.anioContrato}<p class="mensaje-error">{errores.anioContrato}</p>{/if}
				</div>

				<fieldset class="grupo">
					<legend>{APORTACION.incluye}</legend>
					<div class="chips">
						{#each claves as c (c)}
							<label class="chip" class:marcado={incluye.includes(c)}>
								<input type="checkbox" checked={incluye.includes(c)} onchange={() => alternar(c)} />{APORTACION.opcionesIncluye[c]}
							</label>
						{/each}
					</div>
				</fieldset>

				<label class="consentimiento">
					<input type="checkbox" bind:checked={consentimiento} />
					<span class="casilla" aria-hidden="true">
						{#if consentimiento}
							<svg width="16" height="16" viewBox="0 0 20 20"><path d="M4.5 10.5l3.5 3.5 7.5-8" stroke="var(--paja)" stroke-width="2.5" fill="none" /></svg>
						{/if}
					</span>
					<span class="texto-consentimiento">{APORTACION.consentimiento}</span>
				</label>

				<div class="info">
					<div><strong>Qué se guarda:</strong> {APORTACION.seGuarda}</div>
					<div><strong>Qué no se guarda:</strong> {APORTACION.noSeGuarda}</div>
					<div class="gris">{APORTACION.sinMarcar}</div>
				</div>

				{#if errores.envio}<p class="mensaje-error" role="alert">{errores.envio}</p>{/if}
				<button type="submit" class="boton" aria-disabled={!consentimiento || enviando} disabled={!consentimiento}>
					{!consentimiento ? APORTACION.botonDesactivado : enviando ? APORTACION.enviando : APORTACION.enviar}
				</button>
			</form>
		</main>
	{/if}

	<Pie />
</div>

<style>
	.pagina {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}
	.pagina > :global(footer) {
		margin-top: auto;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 44px;
		padding: 8px var(--margen);
	}
	.marca {
		display: inline-flex;
		min-height: 44px;
		align-items: center;
		text-decoration: none;
	}
	.cerrar {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		font: 600 15px/1 var(--f-texto);
		text-decoration: underline;
		text-decoration-color: var(--paja);
		text-decoration-thickness: 2px;
		text-underline-offset: 4px;
	}
	main {
		width: 100%;
		max-width: 600px;
		margin: 0 auto;
		padding-bottom: 8px;
	}
	.intro,
	.enviado {
		padding: 20px var(--margen) 0;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.enviado {
		padding-top: 32px;
		gap: 18px;
	}
	h1 {
		font: 800 60px/0.88 var(--f-extra);
		text-transform: uppercase;
	}
	.frase {
		font: 600 19px/1.35 var(--f-texto);
		text-wrap: pretty;
	}
	.gris {
		font: 400 15px/1.5 var(--f-texto);
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
	form {
		margin: 20px 12px 0;
		background: var(--blanco);
		border-radius: var(--radio);
		padding: 20px 16px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	fieldset {
		border: 0;
		margin: 0;
		padding: 0;
		min-width: 0;
	}
	.grupo {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}
	label,
	legend {
		font: 600 14px/1.3 var(--f-texto);
		padding: 0;
	}
	legend {
		margin-bottom: 8px;
	}
	.campo {
		display: flex;
		align-items: center;
		height: 52px;
		padding: 0 14px;
		border: 1.5px solid var(--tinta);
		border-radius: var(--radio);
	}
	.campo.error {
		border: 2px solid var(--ciruela);
	}
	.campo:focus-within {
		outline: 2px solid var(--tinta);
		outline-offset: 3px;
	}
	.campo input {
		flex: 1;
		min-width: 0;
		height: 100%;
		border: 0;
		outline: 0;
		background: transparent;
		padding: 0;
		font: 500 17px/1 var(--f-texto);
	}
	.campo.numerico input {
		font: 700 22px/1 var(--f-semi);
	}
	.sufijo {
		font: 500 15px/1 var(--f-texto);
		color: var(--grafito);
	}
	.ayuda {
		font: 400 13px/1.4 var(--f-texto);
		color: var(--grafito);
	}
	.mensaje-error {
		font: 500 14px/1.4 var(--f-texto);
		color: var(--ciruela);
	}
	.par {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.chip {
		position: relative;
		min-height: 44px;
		padding: 0 14px;
		display: flex;
		align-items: center;
		border: 1.5px solid var(--tinta);
		border-radius: var(--radio);
		cursor: pointer;
		font: 600 14px/1.2 var(--f-texto);
	}
	.chip.marcado {
		background: var(--tinta);
		color: var(--papel);
	}
	.chip input,
	.consentimiento input {
		position: absolute;
		opacity: 0;
		inset: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		cursor: pointer;
	}
	.chip:has(input:focus-visible),
	.consentimiento:has(input:focus-visible) {
		outline: 2px solid var(--tinta);
		outline-offset: 3px;
	}
	.consentimiento {
		position: relative;
		display: flex;
		gap: 12px;
		align-items: flex-start;
		min-height: 44px;
		cursor: pointer;
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
	.info {
		background: var(--superficie);
		border-radius: var(--radio);
		padding: 14px 16px;
		display: grid;
		gap: 10px;
		font: 400 14px/1.45 var(--f-texto);
	}
	.info strong {
		font-weight: 700;
	}
	.info .gris {
		font-size: 14px;
	}
</style>
