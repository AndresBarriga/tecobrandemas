import { error } from '@sveltejs/kit';
import { PREGUNTAS, preguntaPorSlug } from '#lib/resultado';

export const prerender = true;

export const entries = () => PREGUNTAS.map((p) => ({ slug: p.slug }));

export function load({ params }) {
	const pregunta = preguntaPorSlug(params.slug);
	if (!pregunta) error(404, 'No existe');
	return { pregunta };
}
