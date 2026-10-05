/**
 * Rango inicial de la metodología SERPAVI (§5.3), en €/m²·mes y en €/mes.
 * Fórmulas en docs/prd.md («Datos y cálculo»). S = superficie del usuario.
 */
import type { Rango, SeccionConDato } from './tipos';

/**
 * Peso del ajuste por superficie. Se limita a [0, 1]: con los datos de Madrid solo una
 * sección (Smed = 151 m²) da k > 1 (1,005), y la fórmula no está pensada para ese caso.
 */
export function coeficienteK(smed: number, p75: number): number {
	const argumento = (99 * (smed - 30) / 120) * ((p75 - 2.58) / 23.776) + 1;
	// Smed < 30 o P75 < 2,58 dejan el argumento por debajo de 1 (o negativo): sin ajuste
	if (argumento <= 1) return 0;
	return Math.min(1, Math.log(argumento) / Math.log(100));
}

/** V_inf y V_sup en €/m²·mes, sin IPC */
export function rangoInicialM2(superficie: number, s: SeccionConDato): Rango {
	const S = superficie;
	const k = coeficienteK(s.smed, s.p75);
	const dCubo = s.smed ** 3 - S ** 3;
	const dCuad = S ** 2 - s.smed ** 2;
	const dLin = s.smed - S;

	const inf = k * (0.0000111459 * dCubo + 0.0041 * dCuad + 0.5168 * dLin + s.p25) + (1 - k) * s.p25;
	const sup = k * (0.00001724 * dCubo + 0.0066 * dCuad + 0.8336 * dLin + s.p75) + (1 - k) * s.p75;
	return { inf, sup };
}

/** R_inf y R_sup en €/mes: V × S × f, con f el factor IPC del alquiler (1 = sin ajuste) */
export function rangoInicial(superficie: number, s: SeccionConDato, factorIpc = 1): Rango {
	const v = rangoInicialM2(superficie, s);
	return { inf: v.inf * superficie * factorIpc, sup: v.sup * superficie * factorIpc };
}
