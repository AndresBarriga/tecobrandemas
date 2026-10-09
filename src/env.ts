import { defineEnvVars } from '@sveltejs/kit/env';

/**
 * Variables públicas de la compilación. La analítica solo se activa en el job de despliegue
 * (PUBLIC_POSTHOG_ENABLED=true); la clave es un token público de proyecto (variable del repositorio).
 * «Lo que se pide» (anuncios recientes) está ACTIVO por defecto: solo el valor exacto «false» lo apaga (interruptor de emergencia
 * con redeploy). PUBLIC_OFERTA_MAPA_ENABLED hace lo mismo con el selector de /mapa y depende de la principal (docs/operacion.md).
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
		schema: (valor) => valor !== 'false',
		description: 'activo salvo que valga exactamente false: «Lo que se pide» (anuncios recientes del Ayuntamiento) junto a los contratos'
	},
	PUBLIC_OFERTA_MAPA_ENABLED: {
		public: true,
		static: true,
		schema: (valor) => valor !== 'false',
		description: 'activo salvo que valga exactamente false: selector Contratos | Anuncios en /mapa; solo tiene efecto con PUBLIC_OFERTA_ENABLED activa'
	},
	PUBLIC_POSTHOG_KEY: {
		public: true,
		static: true,
		schema: (valor) => valor ?? '',
		description: 'Token público del proyecto de PostHog (UE)'
	}
});
