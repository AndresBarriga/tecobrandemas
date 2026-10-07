import { defineEnvVars } from '@sveltejs/kit/env';

/**
 * Variables públicas de la compilación. La analítica solo se activa en el job de despliegue
 * (PUBLIC_POSTHOG_ENABLED=true); la clave es un token público de proyecto (variable del repositorio).
 */
export const variables = defineEnvVars({
	PUBLIC_POSTHOG_ENABLED: {
		public: true,
		static: true,
		schema: (valor) => valor === 'true',
		description: 'true solo en producción: activa PostHog sin cookies'
	},
	PUBLIC_POSTHOG_KEY: {
		public: true,
		static: true,
		schema: (valor) => valor ?? '',
		description: 'Token público del proyecto de PostHog (UE)'
	}
});
