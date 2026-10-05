/**
 * Mapa base: teselas vectoriales de OpenStreetMap (Protomaps) autoalojadas en un PMTiles de Madrid.
 * Se piden a /mapa/madrid.pmtiles con rangos de bytes: ninguna petición sale a terceros.
 * Se dibujan sobre el mismo lienzo del pin, en los metros de la proyección del pin
 * (la misma que usan los polígonos de las secciones), así que encajan sin reproyectar nada más.
 */
import { PMTiles } from 'pmtiles';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { metrosAPunto, puntoAMetros } from '#lib/ubicacion/pin';

export const ARCHIVO = '/mapa/madrid.pmtiles';
const Z_MIN = 10;
const Z_MAX = 15;
/** Metros por píxel de una tesela de 256 px en el ecuador del zoom 0, por el coseno de la latitud de Madrid */
const M_PX_Z0 = 156_543.03 * Math.cos((40.42 * Math.PI) / 180);
const EXTENT = 4096;

type Clase = 'autovia' | 'principal' | 'secundaria' | 'local' | 'sendero';
const CLASE_VIA: Record<string, Clase> = {
	highway: 'autovia',
	major_road: 'principal',
	medium_road: 'secundaria',
	minor_road: 'local',
	other: 'local',
	path: 'sendero'
};
const VERDE = new Set(['park', 'garden', 'pitch', 'playground', 'grass', 'forest', 'wood', 'cemetery', 'nature_reserve', 'golf_course', 'recreation_ground']);

interface Etiqueta {
	texto: string;
	x: number;
	y: number;
	/** Ángulo en el plano de metros (norte arriba) */
	ang: number;
	/** Largo del tramo en metros (calles); 0 en lugares */
	largo: number;
	tipo: 'calle' | 'lugar';
}

export interface TeselaPreparada {
	verde: Path2D;
	agua: Path2D;
	edificios: Path2D;
	vias: Record<Clase, Path2D>;
	etiquetas: Etiqueta[];
}

export const COLORES = {
	tierra: '#EDE9E0',
	verde: '#DDE3D0',
	agua: '#D3DEE5',
	edificio: '#E4DFD5',
	casing: '#CFC8BA',
	via: '#FFFFFF',
	texto: '#5A5750',
	halo: '#F6F4EE'
} as const;

/** Ancho de cada clase de vía en píxeles (casing añade 1,5 px a cada lado) */
export const ANCHO_VIA: Record<Clase, (mpp: number) => number> = {
	autovia: (m) => (m > 40 ? 2.2 : m > 8 ? 4 : 9),
	principal: (m) => (m > 40 ? 1.6 : m > 8 ? 3 : 7),
	secundaria: (m) => (m > 40 ? 0 : m > 8 ? 2 : 5),
	local: (m) => (m > 20 ? 0 : m > 8 ? 1.2 : 3.5),
	sendero: (m) => (m > 6 ? 0 : 1)
};

export const zoomPara = (mpp: number) => Math.min(Z_MAX, Math.max(Z_MIN, Math.round(Math.log2(M_PX_Z0 / mpp))));

const tesela2lonlat = (z: number, x: number, y: number, px: number, py: number): [number, number] => {
	const n = 2 ** z;
	const lon = ((x + px / EXTENT) / n) * 360 - 180;
	const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + py / EXTENT)) / n))) * 180) / Math.PI;
	return [lon, lat];
};

export const lonlat2tesela = (z: number, lon: number, lat: number): [number, number] => {
	const n = 2 ** z;
	const s = Math.sin((lat * Math.PI) / 180);
	return [Math.floor(((lon + 180) / 360) * n), Math.floor(((1 - Math.log((1 + s) / (1 - s)) / (2 * Math.PI)) / 2) * n)];
};

function preparar(buf: ArrayBuffer, z: number, tx: number, ty: number): TeselaPreparada {
	const vt = new VectorTile(new PbfReader(new Uint8Array(buf)));
	const proyecta = (px: number, py: number) => {
		const [lon, lat] = tesela2lonlat(z, tx, ty, px, py);
		return puntoAMetros({ lon, lat });
	};
	const t: TeselaPreparada = {
		verde: new Path2D(),
		agua: new Path2D(),
		edificios: new Path2D(),
		vias: { autovia: new Path2D(), principal: new Path2D(), secundaria: new Path2D(), local: new Path2D(), sendero: new Path2D() },
		etiquetas: []
	};

	const anillos = (g: { x: number; y: number }[][], p: Path2D, cerrar: boolean) => {
		for (const r of g) {
			r.forEach((q, i) => {
				const [x, y] = proyecta(q.x, q.y);
				if (i === 0) p.moveTo(x, y);
				else p.lineTo(x, y);
			});
			if (cerrar) p.closePath();
		}
	};

	const capa = (nombre: string, f: (p: Record<string, unknown>, tipo: number, g: { x: number; y: number }[][]) => void) => {
		const c = vt.layers[nombre];
		if (!c) return;
		for (let i = 0; i < c.length; i++) {
			const e = c.feature(i);
			f(e.properties as Record<string, unknown>, e.type, e.loadGeometry());
		}
	};

	capa('landuse', (p, tipo, g) => tipo === 3 && VERDE.has(String(p.kind)) && anillos(g, t.verde, true));
	capa('natural', (p, tipo, g) => tipo === 3 && VERDE.has(String(p.kind)) && anillos(g, t.verde, true));
	capa('water', (p, tipo, g) => tipo === 3 && p.kind === 'water' && anillos(g, t.agua, true));
	if (z >= 15) capa('buildings', (p, tipo, g) => tipo === 3 && !String(p.kind).startsWith('building_part') && anillos(g, t.edificios, true));

	capa('roads', (p, tipo, g) => {
		const clase = CLASE_VIA[String(p.kind)];
		if (!clase || tipo !== 2 || p['is_tunnel'] === true) return;
		anillos(g, t.vias[clase], false);
		const nombre = typeof p.name === 'string' ? p.name : '';
		if (!nombre || clase === 'sendero' || z < 14) return;
		// El nombre va sobre el tramo más largo de la línea
		for (const linea of g) {
			let mejor = 0;
			let largo = 0;
			for (let i = 1; i < linea.length; i++) {
				const d = Math.hypot(linea[i]!.x - linea[i - 1]!.x, linea[i]!.y - linea[i - 1]!.y);
				if (d > largo) [largo, mejor] = [d, i];
			}
			if (!mejor) continue;
			const [x0, y0] = proyecta(linea[mejor - 1]!.x, linea[mejor - 1]!.y);
			const [x1, y1] = proyecta(linea[mejor]!.x, linea[mejor]!.y);
			t.etiquetas.push({ texto: nombre, x: (x0 + x1) / 2, y: (y0 + y1) / 2, ang: Math.atan2(y1 - y0, x1 - x0), largo: Math.hypot(x1 - x0, y1 - y0), tipo: 'calle' });
		}
	});

	capa('places', (p, tipo, g) => {
		const nombre = typeof p.name === 'string' ? p.name : '';
		if (!nombre || tipo !== 1 || !g[0]?.[0]) return;
		const [x, y] = proyecta(g[0][0].x, g[0][0].y);
		t.etiquetas.push({ texto: nombre, x, y, ang: 0, largo: 0, tipo: 'lugar' });
	});
	return t;
}

export interface BaseMapa {
	/** Teselas listas (o su antepasado ya cargado) para el zoom y la caja visibles; pide las que faltan */
	teselas(z: number, caja: { lon0: number; lat0: number; lon1: number; lat1: number }): TeselaPreparada[];
}

/** Crea el lector. `alCargar` se llama cada vez que llega una tesela nueva, para volver a dibujar */
export function crearBase(alCargar: () => void, url = ARCHIVO): BaseMapa {
	const archivo = new PMTiles(url);
	const listas = new Map<string, TeselaPreparada | null>();
	const pedidas = new Set<string>();

	function pedir(z: number, x: number, y: number) {
		const k = `${z}/${x}/${y}`;
		if (listas.has(k) || pedidas.has(k)) return;
		pedidas.add(k);
		archivo
			.getZxy(z, x, y)
			.then((r) => listas.set(k, r ? preparar(r.data, z, x, y) : null))
			.catch(() => listas.set(k, null))
			.finally(() => {
				pedidas.delete(k);
				alCargar();
			});
	}

	return {
		teselas(z, c) {
			const [xa, yb] = lonlat2tesela(z, c.lon0, c.lat0);
			const [xb, ya] = lonlat2tesela(z, c.lon1, c.lat1);
			const salida = new Set<TeselaPreparada>();
			for (let x = xa; x <= xb; x++) {
				for (let y = ya; y <= yb; y++) {
					pedir(z, x, y);
					// Mientras llega la tesela se enseña la del nivel de arriba, si ya estaba
					for (let d = 0; d <= 3 && z - d >= Z_MIN; d++) {
						const t = listas.get(`${z - d}/${x >> d}/${y >> d}`);
						if (t) {
							salida.add(t);
							break;
						}
					}
				}
			}
			return [...salida];
		}
	};
}

export interface VistaMapa {
	/** Centro en metros y metros por píxel */
	cx: number;
	cy: number;
	mpp: number;
	w: number;
	h: number;
	dpr: number;
}

/** Pinta el mapa base (fondo, parques, agua, edificios, calles y nombres) en el lienzo */
export function pintarBase(ctx: CanvasRenderingContext2D, base: BaseMapa, v: VistaMapa) {
	const { cx, cy, mpp, w, h, dpr } = v;
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.fillStyle = COLORES.tierra;
	ctx.fillRect(0, 0, w, h);

	const sw = metrosAPunto(cx - (w / 2) * mpp, cy - (h / 2) * mpp);
	const ne = metrosAPunto(cx + (w / 2) * mpp, cy + (h / 2) * mpp);
	const teselas = base.teselas(zoomPara(mpp), { lon0: sw.lon, lat0: sw.lat, lon1: ne.lon, lat1: ne.lat });

	// Los trazos se hacen en metros y se escalan: el ancho de línea se da en metros (píxeles × mpp)
	ctx.setTransform(dpr / mpp, 0, 0, -dpr / mpp, (dpr * w) / 2 - (dpr * cx) / mpp, (dpr * h) / 2 + (dpr * cy) / mpp);
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	for (const t of teselas) {
		ctx.fillStyle = COLORES.verde;
		ctx.fill(t.verde);
		ctx.fillStyle = COLORES.agua;
		ctx.fill(t.agua);
		ctx.fillStyle = COLORES.edificio;
		ctx.fill(t.edificios);
	}
	const orden: Clase[] = ['sendero', 'local', 'secundaria', 'principal', 'autovia'];
	for (const clase of orden) {
		const px = ANCHO_VIA[clase](mpp);
		if (!px) continue;
		ctx.strokeStyle = COLORES.casing;
		ctx.lineWidth = (px + 1.5) * mpp;
		for (const t of teselas) ctx.stroke(t.vias[clase]);
		ctx.strokeStyle = COLORES.via;
		ctx.lineWidth = px * mpp;
		for (const t of teselas) ctx.stroke(t.vias[clase]);
	}

	// Nombres, en píxeles. Sin solapes: se descarta el que choca con otro ya puesto
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.lineJoin = 'round';
	const puestas: [number, number, number, number][] = [];
	const libre = (x: number, y: number, r: number) => {
		if (puestas.some(([a, b, c, d]) => Math.abs(a - x) < c + r && Math.abs(b - y) < d + r)) return false;
		puestas.push([x, y, r, r]);
		return true;
	};
	for (const t of teselas) {
		for (const e of t.etiquetas) {
			const px = (e.x - cx) / mpp + w / 2;
			const py = (cy - e.y) / mpp + h / 2;
			if (px < -20 || py < -20 || px > w + 20 || py > h + 20) continue;
			if (e.tipo === 'lugar') {
				if (mpp < 6) continue;
				ctx.font = '700 11px "Sofia Sans Semi Condensed", sans-serif';
				const texto = e.texto.toUpperCase();
				if (!libre(px, py, ctx.measureText(texto).width / 2 + 6)) continue;
				ctx.lineWidth = 3;
				ctx.strokeStyle = COLORES.halo;
				ctx.strokeText(texto, px, py);
				ctx.fillStyle = COLORES.texto;
				ctx.fillText(texto, px, py);
				continue;
			}
			if (mpp > 7) continue;
			ctx.font = '500 11px "Sofia Sans", sans-serif';
			const ancho = ctx.measureText(e.texto).width;
			if (e.largo / mpp < ancho + 12) continue;
			let ang = -e.ang;
			if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI;
			if (!libre(px, py, ancho / 2 + 4)) continue;
			ctx.save();
			ctx.translate(px, py);
			ctx.rotate(ang);
			ctx.lineWidth = 3;
			ctx.strokeStyle = COLORES.halo;
			ctx.strokeText(e.texto, 0, 0);
			ctx.fillStyle = COLORES.texto;
			ctx.fillText(e.texto, 0, 0);
			ctx.restore();
		}
	}
}
