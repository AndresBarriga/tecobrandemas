/**
 * Compartir la tarjeta: se sube solo la tarjeta (sin precio ni dirección) y su vista previa para
 * obtener un enlace /t/:id, y se entrega la imagen con la hoja de compartir del sistema. Si el
 * navegador no puede compartir ficheros, se descarga la imagen. Nada se envía sin que la
 * persona pulse «Compartir el resultado».
 */
import { NOMBRE, TARJETA, type TarjetaDatos } from '#lib/resultado';
import { aBlob, dibujarOg } from './tarjeta-canvas';

export type ViaCompartir = 'compartida' | 'descargada' | 'cancelada';

export interface ResultadoCompartir {
	via: ViaCompartir;
	/** Enlace /t/:id si el servidor guardó la tarjeta */
	url: string | null;
	/** true si el enlace se copió al portapapeles */
	enlaceCopiado: boolean;
}

async function subir(datos: TarjetaDatos): Promise<string | null> {
	try {
		const og = document.createElement('canvas');
		await dibujarOg(og, datos);
		const cuerpo = new FormData();
		cuerpo.append('tarjeta', JSON.stringify(datos));
		cuerpo.append('og', await aBlob(og, 0.85), 'og.jpg');
		const r = await fetch('/api/tarjeta', { method: 'POST', body: cuerpo });
		if (!r.ok) return null;
		const { id } = (await r.json()) as { id: string };
		return `${location.origin}/t/${id}`;
	} catch {
		return null;
	}
}

export async function compartirTarjeta(datos: TarjetaDatos, canvas: HTMLCanvasElement): Promise<ResultadoCompartir> {
	const [url, jpg] = await Promise.all([subir(datos), aBlob(canvas, 0.92)]);
	const fichero = new File([jpg], 'a-su-precio.jpg', { type: 'image/jpeg' });

	if (navigator.canShare?.({ files: [fichero] })) {
		try {
			await navigator.share({ files: [fichero], title: NOMBRE, text: TARJETA.compartirTitulo, ...(url ? { url } : {}) });
			return { via: 'compartida', url, enlaceCopiado: false };
		} catch (e) {
			if ((e as DOMException).name === 'AbortError') return { via: 'cancelada', url, enlaceCopiado: false };
			// Cualquier otro fallo de la hoja de compartir: se cae a la descarga
		}
	}

	const enlace = document.createElement('a');
	enlace.href = URL.createObjectURL(jpg);
	enlace.download = fichero.name;
	enlace.click();
	setTimeout(() => URL.revokeObjectURL(enlace.href), 10_000);

	let enlaceCopiado = false;
	if (url) {
		try {
			await navigator.clipboard.writeText(url);
			enlaceCopiado = true;
		} catch {
			// sin permiso de portapapeles: el enlace queda solo en el servidor
		}
	}
	return { via: 'descargada', url, enlaceCopiado };
}
