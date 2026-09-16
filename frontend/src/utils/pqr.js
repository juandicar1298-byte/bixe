/**
 * Cómo se nombra y se pinta cada estado de una PQR.
 *
 * Vive fuera de los componentes porque lo comparten tres: la página pública,
 * la bandeja del personal y la lista del cliente. Además, un archivo que
 * exporta componentes y constantes a la vez rompe el refresco rápido de Vite.
 */

export const ETIQUETA_ESTADO = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  respondida: 'Respondida',
  cerrada: 'Cerrada',
};

export const INSIGNIA_PQR = {
  pendiente: 'insignia-alerta',
  en_proceso: 'insignia-marca',
  respondida: 'insignia-exito',
  cerrada: 'insignia-neutra',
};

export const TIPOS_PQR = [
  { value: 'peticion', label: 'Petición' },
  { value: 'queja', label: 'Queja' },
  { value: 'reclamo', label: 'Reclamo' },
  { value: 'sugerencia', label: 'Sugerencia' },
];
