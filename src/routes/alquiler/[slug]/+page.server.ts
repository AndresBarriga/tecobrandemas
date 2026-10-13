import { error } from '@sveltejs/kit';
import { construirBarrio } from '#lib/resultado';
import { barriosPublicados, datosBarrios } from '#lib/server/datos-barrios';

export const prerender = true;

export const entries = () => barriosPublicados().map((b) => ({ slug: b.slug }));

export function load({ params }) {
	// Un barrio sin dato suficiente (o que no es del piloto) no existe
	const pagina = construirBarrio(datosBarrios(), params.slug);
	if (!pagina) error(404, 'No existe');
	return { pagina };
}
