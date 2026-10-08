/**
 * Resultado de «Mi alquiler»: el mismo motor y la misma referencia, vista desde quien ya paga.
 * Seis posiciones (por debajo, parte baja, media o alta, algo por encima y se sale de lo habitual),
 * con el año de firma al lado y sin ajustar la renta. La comparación usa siempre el piso entero:
 * «Somos N» solo sirve para enseñar «tu parte» en pantalla y no se guarda.
 */
import type { Anuncio } from '../motor';
import type { AportacionPayload } from './aportacion';
import { euros, numero } from './formato';
import type { Firma } from './formulario';
import type { PantallaResultado } from './resultado';
import { INQUILINO } from './textos';
import { principalPorEncima, type Clase } from './vista';

export type PosicionInquilino = 'debajo' | 'baja' | 'media' | 'alta' | 'encimab' | 'encima';

export interface ExtraInquilino {
	firma: Firma;
	/** Lo que se pagaba al firmar, si se sabe */
	rentaFirma: number | null;
	/** Personas que comparten el contrato (2-12); solo para «tu parte» */
	somos: number | null;
}

export interface InfoInquilino {
	pos: PosicionInquilino;
	clase: Clase;
	/** El icono de «por debajo» es un chevron hacia abajo */
	icono: Clase | 'abajo';
	etiqueta: string;
	titular: string;
	/** Cifra grande (en % o «veces») cuando se sale de lo habitual */
	cifra: string | null;
	nota: string;
	frase: string;
	/** «Lo que pagas: 980 €/mes · 90 m² · contrato de 2016» */
	pagas: string;
	/** Solo algo por encima o se sale de lo habitual: € sobre la parte alta, al mes y al año */
	brecha: { mes: string; año: string } | null;
	contrato: { titulo: string; texto: string; detalle: string; cambio: string | null };
	/** «600 €» si se compartió contrato entre N; solo en pantalla */
	tuParte: string | null;
	/** Lo que se enviaría a «Aportar mi alquiler»; null si no hay barrio */
	aporte: AportacionPayload | null;
	/** Para el evento y la tarjeta: la posición sin más */
	firma: Firma;
}

const intervalo = (min: number, max: number): string => {
	const a = `+${numero(min)}`;
	return numero(min) === numero(max) ? `${a} €` : `de ${a} a +${numero(max)} €`;
};

/** Cambio de la renta desde que se firmó, sin decimales: «+9 %», «−5 %» */
export function cambioDesdeFirma(actual: number, alFirmar: number): string {
	const n = Math.round(((actual - alFirmar) / alFirmar) * 100);
	return n === 0 ? '0 %' : `${n > 0 ? '+' : '−'}${Math.abs(n)} %`;
}

export function posicionInquilino(p: PantallaResultado, precio: number): PosicionInquilino {
	const n = p.nivel;
	if (n.nivel === 'por_encima') return 'encima';
	if (n.nivel === 'explicable') return 'encimab';
	// «Por debajo»: bajo la parte baja de la referencia en todas las zonas posibles
	if (precio < p.barra.inf.min) return 'debajo';
	return n.posicion === 'baja' ? 'baja' : n.posicion === 'media' ? 'media' : 'alta';
}

/** Convierte un resultado calculado por el motor en el del inquilino */
export function aInquilino(p: PantallaResultado, a: Anuncio, extra: ExtraInquilino): PantallaResultado {
	const v = p.vista;
	const pos = posicionInquilino(p, a.precio);
	const { firma } = extra;
	const contratoTitulo = firma.reciente ? INQUILINO.contratoReciente : INQUILINO.contratoDe(firma.ano);

	let brecha: InfoInquilino['brecha'] = null;
	let cifra: string | null = null;
	let nota = '';
	if (pos === 'encimab' || pos === 'encima') {
		const mes = [Math.max(0, a.precio - p.barra.sup.max), Math.max(0, a.precio - p.barra.sup.min)];
		brecha = { mes: intervalo(mes[0]!, mes[1]!), año: intervalo(mes[0]! * 12, mes[1]! * 12) };
		const ratioMax = p.barra.horquilla ? a.precio / p.barra.sup.min : null;
		const principal = principalPorEncima(p.ratioMin, ratioMax, v.m2);
		if (pos === 'encima') {
			cifra = principal.tipo === 'cifra' ? principal.texto : principal.tipo === 'rango' ? `${principal.desde} a ${principal.hasta}` : null;
			nota = principal.nota;
		} else {
			const pct = principal.tipo === 'cifra' ? principal.texto : principal.tipo === 'rango' ? `entre ${principal.desde} y ${principal.hasta}` : '';
			nota = INQUILINO.notaEncimab(pct);
		}
	} else if (pos === 'debajo') {
		nota = INQUILINO.notaDebajo(v.m2, p.horquilla);
	} else {
		nota = INQUILINO.notaDentro(numero(p.barra.inf.max), euros(p.barra.sup.min), v.m2, p.horquilla);
	}

	const clase: Clase = pos === 'encima' ? 'c' : pos === 'encimab' ? 'b' : 'a';
	const etiqueta = INQUILINO.etiqueta[pos === 'debajo' ? 'debajo' : pos === 'encima' ? 'encima' : pos === 'encimab' ? 'encimab' : 'dentro'];
	const titular = pos === 'encima' ? '' : INQUILINO.titular[pos];

	const info: InfoInquilino = {
		pos,
		clase,
		icono: pos === 'debajo' ? 'abajo' : clase,
		etiqueta,
		titular,
		cifra,
		nota,
		frase: INQUILINO.frase[pos],
		pagas: INQUILINO.pagas(v.precio, v.m2, firma.reciente ? 'hace menos de un año' : `contrato de ${firma.ano}`),
		brecha,
		contrato: {
			titulo: contratoTitulo,
			texto: INQUILINO.contrato.texto,
			detalle: INQUILINO.contrato.detalle,
			cambio:
				extra.rentaFirma === null
					? null
					: extra.rentaFirma === a.precio
						? INQUILINO.contrato.sinCambio(euros(extra.rentaFirma))
						: INQUILINO.contrato.cambio(euros(extra.rentaFirma), cambioDesdeFirma(a.precio, extra.rentaFirma))
		},
		tuParte: extra.somos ? euros(Math.round(a.precio / extra.somos)) : null,
		aporte: p.barrioCodigo
			? {
					barrio: p.barrioCodigo,
					precio: Math.round(a.precio),
					m2: a.superficie,
					anioContrato: firma.ano,
					incluye: [],
					firmaMes: firma.mes ? `${firma.ano}-${String(firma.mes).padStart(2, '0')}` : null,
					rentaFirma: extra.rentaFirma === null ? null : Math.round(extra.rentaFirma)
				}
			: null,
		firma
	};

	// El inquilino no registra el anuncio (R7) ni ve «Tu zona»: aporta con su propio botón
	// Por debajo de la referencia no hay «tercio» al que señalar en la banda
	const vista = pos === 'debajo' ? { ...p.vista, barra: { ...p.vista.barra, tercio: null } } : p.vista;
	// «Tu zona» también en «Mi alquiler», solo como contexto (sin lista de zonas). Con horquilla, las zonas afectadas llevan contorno grueso
	const zona = p.zona ? { ...p.zona, clase: 'a' as const, inquilino: true } : null;
	return { ...p, vista, registro: null, zona, inquilino: info };
}
