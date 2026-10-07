import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST, fallback } from '../src/routes/r7k/[...ruta]/+server';

/** El proxy de la analítica (/r7k): rutas cerradas, nada de cookies, la IP y el user agent del cliente, sin escribir nada */
describe('proxy de la analítica', () => {
	let llamadas: { url: string; init: RequestInit }[];
	beforeEach(() => {
		vi.stubEnv('DEV', false); // en desarrollo no se reenvía nada
		llamadas = [];
		vi.stubGlobal('fetch', async (url: URL, init: RequestInit) => {
			llamadas.push({ url: String(url), init });
			return new Response('{"status":1}', { status: 200, headers: { 'content-type': 'application/json', 'set-cookie': 'ph=1' } });
		});
	});
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
	});

	const peticion = (ruta: string, cuerpo: string | null = 'x'.repeat(50), cabeceras: Record<string, string> = {}, query = '') =>
		POST({
			request: new Request(`http://x/r7k/${ruta}${query}`, { method: 'POST', body: cuerpo, headers: { 'content-type': 'text/plain', ...cabeceras } }),
			params: { ruta },
			url: new URL(`http://x/r7k/${ruta}${query}`),
			getClientAddress: () => '203.0.113.7'
		} as never) as Promise<Response>;

	it('reenvía la captura a PostHog (UE) con la IP y el user agent del cliente, sin cookies ni autorización', async () => {
		const r = await peticion('e/', 'x'.repeat(50), { cookie: 'a=b', authorization: 'Bearer z', 'user-agent': 'Mozilla/5.0 (iPhone) Instagram' });
		expect(r.status).toBe(200);
		expect(r.headers.get('set-cookie')).toBeNull();
		expect(llamadas).toHaveLength(1);
		expect(llamadas[0]!.url).toBe('https://eu.i.posthog.com/e/');
		const h = new Headers(llamadas[0]!.init.headers);
		expect(h.get('x-forwarded-for')).toBe('203.0.113.7');
		expect(h.get('user-agent')).toBe('Mozilla/5.0 (iPhone) Instagram');
		expect(h.get('cookie')).toBeNull();
		expect(h.get('authorization')).toBeNull();
	});

	it('solo reenvía los parámetros conocidos', async () => {
		await peticion('e/', 'x'.repeat(50), {}, '?compression=gzip-js&ver=1.438.1&_=1&secreto=1&direccion=Calle');
		const u = new URL(llamadas[0]!.url);
		expect([...u.searchParams.keys()].sort()).toEqual(['_', 'compression', 'ver']);
	});

	it('rutas cerradas: todo lo que no es captura da 404 y no llega a PostHog', async () => {
		for (const ruta of ['flags/', 'array/phc_x/config', 'static/recorder.js', 's/', 'decide/', 'e/../flags/', '', 'otra/']) {
			await expect(peticion(ruta), ruta).rejects.toMatchObject({ status: 404 });
		}
		expect(llamadas).toHaveLength(0);
		for (const ruta of ['e', 'e/', '/e/', 'i/v0/e/', 'batch/']) expect((await peticion(ruta)).status, ruta).toBe(200);
		expect(() => fallback()).toThrowError(expect.objectContaining({ status: 404 }) as never);
	});

	it('cuerpos vacíos o demasiado grandes: se rechazan', async () => {
		await expect(peticion('e/', '')).rejects.toMatchObject({ status: 413 });
		await expect(peticion('e/', 'x'.repeat(200_001))).rejects.toMatchObject({ status: 413 });
		expect(llamadas).toHaveLength(0);
	});

	it('si PostHog no responde, la herramienta no se entera (204)', async () => {
		vi.stubGlobal('fetch', async () => {
			throw new Error('caído');
		});
		expect((await peticion('e/')).status).toBe(204);
	});

	it('en desarrollo no reenvía nada', async () => {
		vi.stubEnv('DEV', true);
		expect((await peticion('e/')).status).toBe(204);
		expect(llamadas).toHaveLength(0);
	});
});
