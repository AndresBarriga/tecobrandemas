/**
 * Tarjeta de la que viene la persona (/?t=ID). Se lee de la URL al cargar y vive solo en memoria: no se guarda
 * nada en el navegador. Sirve al registro anónimo (con consentimiento) y a la analítica.
 */
let origen: string | null = null;

export function leerOrigenDeLaUrl(): void {
	const t = new URL(location.href).searchParams.get('t');
	origen = t && /^[0-9a-z]{10}$/.test(t) ? t : null;
}

export const tarjetaOrigen = (): string | null => origen;
