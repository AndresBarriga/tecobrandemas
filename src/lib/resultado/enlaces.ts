/** Enlaces externos de configuración (config/enlaces.json): una sola constante por enlace, fácil de cambiar */
import config from '../../../config/enlaces.json';

/** «Estadística SERPAVI · Ayuntamiento de Madrid»: se abre siempre en pestaña nueva con rel="noopener" */
export const ESTADISTICA_SERPAVI_MADRID: { texto: string; url: string } = config.estadistica_serpavi_madrid;
