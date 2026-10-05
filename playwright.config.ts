import { defineConfig } from '@playwright/test';

const PUERTO = 5173;

export default defineConfig({
	testDir: 'e2e',
	timeout: 60_000,
	fullyParallel: true,
	reporter: [['list']],
	webServer: {
		command: `npm run dev -- --port ${PUERTO}`,
		url: `http://localhost:${PUERTO}`,
		reuseExistingServer: true,
		timeout: 120_000
	},
	use: { baseURL: `http://localhost:${PUERTO}`, locale: 'es-ES' },
	projects: [
		{ name: 'movil-390', use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
		{ name: 'movil-360', use: { viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true } },
		{ name: 'escritorio-1280', use: { viewport: { width: 1280, height: 900 } } }
	]
});
