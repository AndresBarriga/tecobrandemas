import { error } from '@sveltejs/kit';
import { PAGINAS_EN, paginaEnPorRuta } from '#lib/resultado';

export const prerender = true;

export const entries = () => PAGINAS_EN.filter((p) => p.ruta !== '/en').map((p) => ({ slug: p.ruta.replace('/en/', '') }));

export function load({ params }) {
	const pagina = paginaEnPorRuta(`/en/${params.slug}`);
	if (!pagina || pagina.ruta === '/en') error(404, 'Not found');
	return { pagina };
}
