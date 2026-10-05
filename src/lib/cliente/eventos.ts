/**
 * Embudo (R9) sin cookies ni terceros: un id aleatorio de visita en sessionStorage y, si la
 * persona llega desde una tarjeta (/?t=ID), el id de esa tarjeta. Los eventos no llevan precio
 * ni ubicación y se envían sin esperar respuesta: si falla, no pasa nada.
 */
type Tipo =
	| 'llegada' | 'empieza' | 'completa' | 'servido_si' | 'servido_no' | 'comparte' | 'desde_tarjeta' | 'segundo' | 'aporta' | 'habitacion';

const memoria = new Map<string, string>();
const leer = (k: string) => {
	try {
		return sessionStorage.getItem(k) ?? memoria.get(k) ?? null;
	} catch {
		return memoria.get(k) ?? null;
	}
};
const escribir = (k: string, v: string) => {
	memoria.set(k, v);
	try {
		sessionStorage.setItem(k, v);
	} catch {
		// sin almacenamiento: vale la copia en memoria
	}
};

export function visita(): string {
	let v = leer('asp:visita');
	if (!v) {
		v = crypto.randomUUID();
		escribir('asp:visita', v);
	}
	return v;
}

/** Id de la tarjeta de la que viene la persona, si viene de una */
export function tarjetaOrigen(): string | null {
	return leer('asp:tarjeta');
}

/** Guarda el id de tarjeta de /?t=ID y lo quita de la barra de direcciones */
export function leerOrigenDeLaUrl(): void {
	const t = new URL(location.href).searchParams.get('t');
	if (t && /^[0-9a-z]{10}$/.test(t)) escribir('asp:tarjeta', t);
}

/** Envía un evento; con `unaVez` no se repite en la misma visita */
export function evento(tipo: Tipo, opciones: { unaVez?: boolean; tarjeta?: string | null } = {}): void {
	if (opciones.unaVez) {
		const marca = `asp:ev:${tipo}`;
		if (leer(marca)) return;
		escribir(marca, '1');
	}
	void fetch('/api/evento', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ tipo, visita: visita(), tarjeta: opciones.tarjeta ?? null }),
		keepalive: true
	}).catch(() => {});
}

/** Análisis completados en esta visita (para el «segundo análisis», que solo se mide dentro de la visita) */
export function contarCompletado(): number {
	const n = Number(leer('asp:completados') ?? 0) + 1;
	escribir('asp:completados', String(n));
	return n;
}

export async function recuentos(barrio?: string | null): Promise<{ total: number | null; barrio: number | null; aportacionesBarrio: number | null } | null> {
	try {
		const r = await fetch(`/api/contadores${barrio ? `?barrio=${encodeURIComponent(barrio)}` : ''}`);
		return r.ok ? await r.json() : null;
	} catch {
		return null;
	}
}
