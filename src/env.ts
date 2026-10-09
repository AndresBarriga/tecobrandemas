import { defineEnvVars } from '@sveltejs/kit/env';

/**
 * Variables públicas de la compilación. La analítica solo se activa en el job de despliegue
 * (PUBLIC_POSTHOG_ENABLED=true); la clave es un token público de proyecto (variable del repositorio).
 * «Lo que se pide» (anuncios recientes) está apagado por defecto: PUBLIC_OFERTA_ENABLED=true lo enciende; en /mapa, además,
 * PUBLIC_OFERTA_MAPA_ENABLED=true (solo tiene efecto con la principal encendida; docs/operacion.md).
 */
export const variables = defineEnvVars({
	PUBLIC_POSTHOG_ENABLED: {
		public: true,
		static: true,
		schema: (valor) => valor === 'true',
		description: 'true solo en producción: activa PostHog sin cookies'
	},
	PUBLIC_OFERTA_ENABLED: {
		public: true,
		static: true,
		schema: (valor) => valor === 'true',
		description: 'true enciende «Lo que se pide» (anuncios recientes del Ayuntamiento) junto a los contratos; apagado por defecto'
	},
	PUBLIC_OFERTA_MAPA_ENABLED: {
		public: true,
		static: true,
		schema: (valor) => valor === 'true',
		description: 'true enciende el selector Contratos | Anuncios en /mapa; solo tiene efecto con PUBLIC_OFERTA_ENABLED encendida; apagado por defecto'
	},
	PUBLIC_POSTHOG_KEY: {
		public: true,
		static: true,
		schema: (valor) => valor ?? '',
		description: 'Token público del proyecto de PostHog (UE)'
	}
});
