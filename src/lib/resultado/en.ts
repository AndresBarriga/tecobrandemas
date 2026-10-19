/**
 * Páginas en inglés (/en): una prueba barata para quien llega desde fuera. La herramienta sigue en español; aquí se
 * explica cómo usarla y de dónde salen los datos. Basadas en las páginas en español ya publicadas, en inglés natural.
 * Mismas reglas de contenido que /preguntas: sin cifras de análisis de usuarios, sin pisos reales, sin opinar sobre
 * leyes ni partidos, y sin entrar en el decreto (se enlaza a la página en español y a la calculadora del Ministerio).
 * «Too high» solo en el título, el H1, las preguntas y las respuestas que lo repiten tal como se busca: nunca como veredicto.
 */
import { AUTOR } from './preguntas';
import type { Fuente, SeccionPregunta } from './preguntas';

export const FECHA_EN = '2026-10-13';

/** Todos los botones de /en llevan esta campaña */
export const ENLACE_HERRAMIENTA_EN = '/?utm_source=en';

export interface SeccionEn extends SeccionPregunta {
	/** Lista de términos con su explicación (campos de la herramienta) */
	definiciones?: { termino: string; texto: string }[];
}

/** Textos en inglés de la casilla «edificio de 2022 o después» y de su pantalla «sin dato». La herramienta es solo en español: no se pintan en ninguna página */
export const EDIFICIO_2022_EN = {
	casilla: 'Building built or fully renovated in 2022 or later',
	sinDato: 'The official system gives no range for buildings from 2022 or later.'
} as const;

export interface PaginaEn {
	/** Ruta de esta página y de la equivalente en español */
	ruta: string;
	rutaEs: string;
	/** <title> sin « · A su precio» */
	titulo: string;
	descripcion: string;
	h1: string;
	respuesta: string[];
	boton: string;
	secciones: SeccionEn[];
	faq: { q: string; a: string }[];
	fuentes: Fuente[];
	/** Rutas de las otras páginas en inglés */
	relacionadas: string[];
	/** Rutas de páginas en español que se enlazan (el decreto, la calculadora…) */
	enlacesEs?: { texto: string; href: string }[];
}

export const AUTOR_EN = AUTOR;
export const BOTON_EN = 'Check a rent (in Spanish, 1 minute)';
/** Bajo el botón de cada página en inglés */
export const CONSEJO_TRADUCCION_EN = 'Tip: Chrome, Safari and Edge can translate the tool into English automatically.';

const SERPAVI: Fuente = { texto: 'Spain’s Ministry of Housing and Urban Agenda: SERPAVI, the state rent reference system', url: 'https://serpavi.mivau.gob.es' };
const LEY: Fuente = { texto: 'BOE (in Spanish): Ley 12/2023, de 24 de mayo, por el derecho a la vivienda', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2023-12203' };
const CALCULADORA: Fuente = { texto: 'Ministry of Housing (in Spanish): official rent-update calculator', url: 'https://www.mivau.gob.es/vivienda/calculadora-precio-alquiler' };

const R_INICIO = '/en';
const R_INDICE = '/en/what-is-the-rent-reference-index-in-spain';
const R_ALTO = '/en/how-to-check-if-a-rent-is-too-high-in-madrid';

export const PAGINAS_EN: PaginaEn[] = [
	{
		ruta: R_INICIO,
		rutaEs: '/',
		titulo: 'Is my Madrid rent too high? Free check',
		descripcion: 'Compare your Madrid rent, or a listing, with what tenants already pay in your area. Data from Spain’s Ministry of Housing (SERPAVI). Free, in Spanish.',
		h1: 'Is your rent in Madrid in line with what tenants already pay?',
		respuesta: [
			'A su precio compares a rent in Madrid, whether it is your own or a listing, with what people who already rent in the same area pay.',
			'The data comes from Spain’s Ministry of Housing rent reference index (SERPAVI), which is built from rental contracts declared to the tax authority.'
		],
		boton: BOTON_EN,
		secciones: [
			{
				h2: 'How to use it',
				parrafos: ['The tool is in Spanish, but it takes about a minute. Here is what to type in each field.'],
				definiciones: [
					{ termino: 'Address', texto: 'A street and number in the city of Madrid. We use it to find the flat’s census area, the smallest unit of the reference. The address is sent to our server to locate the flat and is not stored.' },
					{ termino: '“Un anuncio” or “Mi alquiler”', texto: 'Choose “Un anuncio” (a listing) if you are looking at a flat to rent. Choose “Mi alquiler” (my rent) if you already live there and want to check your current rent. For your own rent you can also add when you signed the contract.' },
					{ termino: '“Precio al mes”', texto: 'The monthly rent in euros.' },
					{ termino: '“Metros construidos”', texto: 'The flat’s built area in square metres.' }
				]
			},
			{
				h2: 'What do the four results mean?',
				parrafos: ['The tool answers with one of four words. Each one compares your price with what tenants who already live in the area pay, and a bar shows where your price falls.'],
				tabla: {
					titulo: 'The four results',
					cabecera: ['Result', 'What it means'],
					filas: [
						['POR DEBAJO', 'Below: under the lower end of what tenants already pay in the area.'],
						['DENTRO', 'Inside: between the lower and the upper end of what tenants already pay.'],
						['ALGO POR ENCIMA', 'A bit above: over the upper end, but not beyond what an excellent flat in the area could justify.'],
						['POR ENCIMA', 'Above: over even that range. The tool shows by how much, as a percentage.']
					]
				},
				despues: ['The upper end is the value below which most contracts in the area fall. It is not a maximum: some contracts are above it.']
			},
			{
				h2: 'What does it not tell you?',
				parrafos: [
					'It is an independent estimate, not a valuation, and it does not say whether a rent complies with the law. The official value is at serpavi.mivau.gob.es.',
					'The reference covers signed contracts, not asking prices. Recent listing prices are shown separately and never mixed with the contracts.'
				]
			}
		],
		faq: [
			{ q: 'Is it free?', a: 'Yes. It is free and you do not need to register.' },
			{ q: 'Does it work outside Madrid?', a: 'No. It covers the city of Madrid only.' },
			{ q: 'Is the result the official figure?', a: 'No. It is an independent estimate. The official value is at SERPAVI (serpavi.mivau.gob.es).' }
		],
		fuentes: [SERPAVI],
		relacionadas: [R_INDICE, R_ALTO]
	},
	{
		ruta: R_INDICE,
		rutaEs: '/preguntas/que-es-el-indice-de-referencia-del-alquiler',
		titulo: 'Spain’s rent reference index, explained',
		descripcion: 'Spain’s rent reference index (SERPAVI) gives a rent range by area from contracts declared to the tax authority. What it is and how to check yours.',
		h1: 'What is the rent reference index in Spain (SERPAVI)?',
		respuesta: [
			'It is the Spanish Ministry of Housing’s system (SERPAVI) that gives a rent range for each area and type of home, built from rental contracts declared to the tax authority.',
			'Spanish law uses it as a limit in some cases, and anyone can consult it to see what tenants already pay in their area.'
		],
		boton: BOTON_EN,
		secciones: [
			{
				h2: 'Where does the data come from?',
				parrafos: [
					'From the rental contracts that private landlords declare in their income tax return. These are signed contracts of different dates, not listings or asking prices.',
					'An area only gets a value when there are enough contracts. On A su precio, an area with too few contracts shows as “sin dato”, which means no data.',
					'Portals show what is asked now for homes that are available. The index reflects what people who already have a contract pay. They measure different things and can give different figures.'
				]
			},
			{
				h2: 'What does the index give you?',
				parrafos: [
					'A rent range for each census section, the smallest area unit, and type of home, with a lower end and an upper end. The range is then adjusted for the features of the home, such as size, age or whether the building has a lift.',
					'For the same place, the range changes with the size and the type of home. Two flats on the same street can therefore have different references.',
					'The upper end is not a maximum. It is the value below which most contracts fall, and some contracts are above it.'
				],
				tabla: {
					titulo: 'Example (hypothetical): a 70 m² home in an imaginary area',
					cabecera: ['Figure', 'Value per month'],
					filas: [
						['Lower end of what tenants already pay there', '€700'],
						['Upper end', '€900']
					]
				}
			},
			{
				h2: 'What is it used for by law?',
				parrafos: [
					'Spain’s 2023 housing law (Ley 12/2023) provides for the index as a limit on the starting rent in areas declared “stressed residential markets” (zonas tensionadas) when the landlord is a large owner. The rule sits in article 17.7 of the Urban Leases Act.',
					'A 2026 royal decree-law also refers to it for annual rent updates. It is still awaiting validation by parliament and may change, so we do not go into it here: see our page in Spanish and the Ministry’s official calculator, linked below.',
					'Outside the cases the law sets, the index is an informative reference and not a fixed price.'
				]
			},
			{
				h2: 'How do you check it?',
				parrafos: [
					'The official lookup is at serpavi.mivau.gob.es: you enter the address and the features of the home. That is the official value.',
					'For a quick estimate in Madrid, A su precio takes a minute. It is independent: if it differs from the official value, the official value governs.'
				]
			}
		],
		faq: [
			{ q: 'Is the index a maximum price?', a: 'Not in general. It is the upper end of what tenants already pay in the area, and some contracts are above it. It only has legal effect in the cases the law sets.' },
			{ q: 'How is it kept up to date?', a: 'A su precio does not update the contracts: it uses the 2024 data as the Ministry publishes it, and rents have risen since. The official value depends on the version the Ministry publishes.' },
			{ q: 'Does it cover all of Spain?', a: 'The system is national, and regions can have their own. A su precio only calculates for the city of Madrid.' }
		],
		fuentes: [SERPAVI, LEY, CALCULADORA],
		relacionadas: [R_ALTO, R_INICIO],
		enlacesEs: [
			{ texto: 'The 2026 royal decree-law and rent updates (in Spanish)', href: '/preguntas/supera-mi-alquiler-el-indice-de-referencia' },
			{ texto: 'Official rent-update calculator, Ministry of Housing (in Spanish)', href: CALCULADORA.url }
		]
	},
	{
		ruta: R_ALTO,
		rutaEs: '/preguntas/como-saber-si-un-alquiler-es-caro-en-madrid',
		titulo: 'Is a Madrid rent too high? How to check',
		descripcion: 'Compare a rent with what tenants in the same area already pay, adjusted for size. Check yours free in a minute (tool in Spanish).',
		h1: 'How can you tell if a rent in Madrid is too high?',
		respuesta: [
			'Compare it with what tenants who already rent in the same area pay: the contracts declared to the tax authority that Spain’s Ministry of Housing publishes as the SERPAVI reference index.',
			'That reference is adjusted for the size of the home; the contracts date from 2024 and rents have risen since.'
		],
		boton: BOTON_EN,
		secciones: [
			{
				h2: 'What do you need to compare?',
				parrafos: [
					'Three details are enough: the area, the size in square metres and the type of home. The area matters because rents change a lot from one street to the next. The size matters because small flats usually cost more per square metre.',
					'The type of home counts too: a flat, a house and a room are not compared with each other. With the exact address, the flat is placed in its census section, the smallest unit of the reference.',
					'If you doubt any of these details, check the listing or your contract: the size and the type of home are written there.'
				]
			},
			{
				h2: 'Why are other listings not enough?',
				parrafos: [
					'Listings show what is asked now, not what ends up being signed. They can come down, be negotiated or stay online for months. Each portal also has its own sample of flats.',
					'A similar flat on another street can be advertised at a different price without saying anything about yours.',
					'Contracts in force measure something else: what people who already live there pay. Both figures are useful, but they answer different questions and are not mixed.'
				]
			},
			{
				h2: 'How do you check it in one minute?',
				parrafos: ['Type the address, the monthly price and the size, and choose whether it is your rent or a listing. The tool answers with one word and a bar showing where the price falls.'],
				tabla: {
					titulo: 'Example (hypothetical): a 70 m² flat in an imaginary area where the lower end of what tenants already pay is €700 and the upper end €900. For an excellent flat, the margin would reach €1,050',
					cabecera: ['Price per month', 'Result'],
					filas: [
						['€650', 'POR DEBAJO (below)'],
						['€800', 'DENTRO (inside)'],
						['€950', 'ALGO POR ENCIMA (a bit above)'],
						['€1,150', 'POR ENCIMA (above)']
					]
				}
			},
			{
				h2: 'What can you do with the result?',
				parrafos: [
					'If you are looking for a flat, use it to decide whether to negotiate or keep searching. You can ask the landlord to explain the difference, for example what the price includes. If you already rent, it shows where you stand against your area.',
					'“Inside” means your price is between the lower and the upper end of what tenants there pay. “Above” is a reason to ask why: there may be one, such as an excellent flat or a recent renovation.',
					'The result is an independent estimate. The official value is the one at SERPAVI (serpavi.mivau.gob.es), which you can look up with the details of the home.'
				]
			}
		],
		faq: [
			{ q: 'Does this tell me if I pay too much?', a: 'No. It tells you where your price falls against what tenants who already rent in your area pay, not whether the price is adequate.' },
			{ q: 'Does it work for any neighbourhood in Madrid?', a: 'It works for the city of Madrid, where there is enough data. If an area has very few contracts, we say so instead of giving a figure.' },
			{ q: 'Do I need to register?', a: 'No. It is free. The address is sent to our server to locate the flat and is not stored.' },
			{ q: 'What data does it use?', a: 'The 2024 contracts from the Ministry of Housing, as published by SERPAVI. Rents have risen since.' }
		],
		fuentes: [SERPAVI, LEY],
		relacionadas: [R_INDICE, R_INICIO]
	}
];

export const paginaEnPorRuta = (ruta: string): PaginaEn | undefined => PAGINAS_EN.find((p) => p.ruta === ruta);

/** Pares de páginas equivalentes (hreflang) */
export const PARES_IDIOMA: { es: string; en: string }[] = PAGINAS_EN.map((p) => ({ es: p.rutaEs, en: p.ruta }));

/** Las rutas equivalentes de una página, si las tiene: para <link rel="alternate" hreflang> y el enlace «English» del pie */
export function alternativas(ruta: string): { es: string; en: string } | null {
	const limpia = ruta.length > 1 ? ruta.replace(/\/$/, '') : ruta;
	return PARES_IDIOMA.find((p) => p.es === limpia || p.en === limpia) ?? null;
}

/** «2026-10-13» → «13 October 2026» */
export function fechaEn(iso: string): string {
	const meses = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	const [a, m, d] = iso.split('-');
	return `${Number(d)} ${meses[Number(m) - 1]} ${a}`;
}

/** Todo el texto visible de una página en inglés, para contar palabras y revisar el vocabulario */
export function textoDePaginaEn(p: PaginaEn, conFuentes = false): string[] {
	const t: string[] = [p.h1, ...p.respuesta, p.boton, CONSEJO_TRADUCCION_EN];
	for (const s of p.secciones) {
		t.push(s.h2, ...s.parrafos);
		if (s.definiciones) for (const d of s.definiciones) t.push(d.termino, d.texto);
		if (s.tabla) t.push(s.tabla.titulo, ...s.tabla.cabecera, ...s.tabla.filas.flat());
		if (s.despues) t.push(...s.despues);
	}
	t.push('Frequently asked questions');
	for (const f of p.faq) t.push(f.q, f.a);
	if (p.enlacesEs) t.push(...p.enlacesEs.map((e) => e.texto));
	if (conFuentes) t.push(...p.fuentes.map((f) => f.texto));
	return t;
}
