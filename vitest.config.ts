import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['tests/**/*.test.ts'],
		coverage: {
			include: ['src/lib/motor/**'],
			// Regla del plan: 100% de ramas en el motor
			thresholds: { branches: 100, functions: 100, lines: 100, statements: 100 }
		}
	}
});
