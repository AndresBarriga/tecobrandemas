/**
 * Compartir la tarjeta. El id de /t/:id lo genera el navegador al abrir el resultado, de modo que
 * los enlaces ya existen; la tarjeta solo se sube al servidor cuando la persona elige un canal
 * que necesita el enlace (WhatsApp, X, copiar o la hoja del móvil). «Descargar imagen» no sube nada.
 */
import { NOMBRE, urlAbsoluta, textoCompartir, type TarjetaDatos } from '#lib/resultado';
import { aBlob, dibujarOg } from './tarjeta-canvas';

const subidas = new Map<string, Promise<boolean>>();

/** Sube la tarjeta con su id una sola vez; subir otra vez (otro canal) reutiliza la misma subida */
export function subirTarjeta(datos: TarjetaDatos, id: string): Promise<boolean> {
	let p = subidas.get(id);
	if (!p) {
		p = (async () => {
			try {
				const og = document.createElement('canvas');
				await dibujarOg(og, datos);
				const cuerpo = new FormData();
				cuerpo.append('tarjeta', JSON.stringify(datos));
				cuerpo.append('id', id);
				cuerpo.append('og', await aBlob(og, 0.85), 'og.jpg');
				const r = await fetch('/api/tarjeta', { method: 'POST', body: cuerpo });
				await r.text().catch(() => '');
				return r.ok;
			} catch {
				return false;
			}
		})();
		subidas.set(id, p);
		// Si falla, un nuevo intento puede repetirla
		void p.then((ok) => ok || subidas.delete(id));
	}
	return p;
}

export const urlDeTarjeta = (id: string) => urlAbsoluta(`/t/${id}`, location.origin);

/** ¿Hay hoja de compartir con ficheros en un dispositivo táctil? Si no, se muestran los canales */
export function puedeCompartirNativo(): boolean {
	try {
		const fichero = new File([new Uint8Array(1)], 'a-su-precio.jpg', { type: 'image/jpeg' });
		return matchMedia('(pointer: coarse)').matches && !!navigator.canShare?.({ files: [fichero] });
	} catch {
		return false;
	}
}

export type ViaNativa = 'compartida' | 'descargada' | 'cancelada';

/** Hoja nativa con la imagen y el enlace; si falla (no cancelación), se descarga la imagen */
export async function compartirNativo(datos: TarjetaDatos, canvas: HTMLCanvasElement, id: string): Promise<ViaNativa> {
	const [subida, jpg] = await Promise.all([subirTarjeta(datos, id), aBlob(canvas, 0.92)]);
	const fichero = new File([jpg], 'a-su-precio.jpg', { type: 'image/jpeg' });
	try {
		await navigator.share({ files: [fichero], title: NOMBRE, text: textoCompartir(datos), ...(subida ? { url: urlDeTarjeta(id) } : {}) });
		return 'compartida';
	} catch (e) {
		if ((e as DOMException).name === 'AbortError') return 'cancelada';
	}
	descargarBlob(jpg, fichero.name);
	return 'descargada';
}

export function descargarBlob(blob: Blob, nombre: string): void {
	const enlace = document.createElement('a');
	enlace.href = URL.createObjectURL(blob);
	enlace.download = nombre;
	enlace.click();
	setTimeout(() => URL.revokeObjectURL(enlace.href), 10_000);
}

export async function descargarImagen(canvas: HTMLCanvasElement): Promise<void> {
	descargarBlob(await aBlob(canvas, 0.92), 'a-su-precio.jpg');
}

export async function copiarEnlace(id: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(urlDeTarjeta(id));
		return true;
	} catch {
		return false;
	}
}
