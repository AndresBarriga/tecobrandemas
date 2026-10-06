<script lang="ts">
	import type { Clase } from '#lib/resultado';

	/** Icono de nivel: círculo relleno con check (a), onda (b) chevron hacia arriba (c) o hacia abajo (por debajo de la referencia). El nivel nunca va solo con color. */
	let { clase, tamano = 18 }: { clase: Clase | 'abajo'; tamano?: number } = $props();
	const trazo = { a: 'M5.5 10.2l3 3 6-6.4', b: 'M5 11.5c1.6-2.4 3.4-2.4 5 0s3.4 2.4 5 0', c: 'M6 12l4-4.5 4 4.5', abajo: 'M6 8l4 4.5 4-4.5' } as const;
</script>

<svg width={tamano} height={tamano} viewBox="0 0 20 20" aria-hidden="true" style="flex: none">
	<circle cx="10" cy="10" r="9" fill="var(--acento)" />
	<path d={trazo[clase]} stroke="var(--tinte)" stroke-width="2" fill="none" />
</svg>
