import { describe, expect, it } from 'vitest';
import { lonlat2tesela, zoomPara } from '../src/lib/cliente/mapa-base';

describe('mapa base', () => {
	it('elige el zoom por metros por píxel, dentro de los niveles del archivo (10–15)', () => {
		expect(zoomPara(400)).toBe(10);
		expect(zoomPara(110)).toBeGreaterThanOrEqual(10);
		expect(zoomPara(1)).toBe(15);
		expect(zoomPara(20)).toBeLessThan(zoomPara(5));
	});
	it('la Puerta del Sol cae en la tesela 15/16046/12355', () => {
		expect(lonlat2tesela(15, -3.7038, 40.4168)).toEqual([16046, 12355]);
	});
});
