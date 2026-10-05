// Tras `vite build`: añade a _headers el X-Robots-Tag de todo el sitio si config/indexacion.json lo pide.
// Las páginas prerenderizadas las sirve Cloudflare como estáticas, así que su cabecera sale de aquí;
// las respuestas del Worker la reciben en src/hooks.server.ts, con el mismo valor.
import { appendFileSync, readFileSync } from 'node:fs';

const { noindex } = JSON.parse(readFileSync('config/indexacion.json', 'utf8'));
if (noindex) {
	appendFileSync('.svelte-kit/cloudflare/_headers', '\n/*\n  X-Robots-Tag: noindex, nofollow\n');
	console.log('_headers: X-Robots-Tag noindex en todo el sitio');
} else {
	console.log('_headers: indexación permitida');
}
