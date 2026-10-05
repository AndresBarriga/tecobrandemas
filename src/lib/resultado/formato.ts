/** Formato de cifras en español: «1.650 €», «+47 %», «11,96 €/m²» */

function agrupar(entero: string): string {
	return entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function numero(n: number, decimales = 0): string {
	const [entero, dec] = Math.abs(n).toFixed(decimales).split('.');
	const signo = n < 0 && Number(`${entero}.${dec ?? 0}`) !== 0 ? '−' : '';
	return signo + agrupar(entero!) + (dec ? `,${dec}` : '');
}

export const euros = (n: number): string => `${numero(n)}\u00A0€`;
export const eurosM2 = (n: number): string => `${numero(n, 2)}\u00A0€/m²`;

/** 0,47 → «47 %»; con signo explícito «+47 %». Un decimal por debajo del 10 % */
export function porcentaje(fraccion: number, conSigno = false): string {
	const p = fraccion * 100;
	const texto = numero(Math.abs(p), Math.abs(p) >= 9.5 ? 0 : 1);
	const signo = p < 0 && texto !== '0' && texto !== '0,0' ? '−' : conSigno && p > 0 ? '+' : '';
	return `${signo}${texto}\u00A0%`;
}

/** «2026-08» → «agosto de 2026» */
export function mesAnio(aaaamm: string): string {
	const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
	const [a, m] = aaaamm.split('-');
	return `${meses[Number(m) - 1] ?? aaaamm} de ${a}`;
}

/** 1.250 m → «1,3 km»; 640 m → «640 m» (redondeado a 10 m) */
export function distancia(metros: number): string {
	return metros >= 1000 ? `${numero(metros / 1000, 1)}\u00A0km` : `${Math.round(metros / 10) * 10}\u00A0m`;
}
