import { API_ORIGEN } from '../services/api';

export const formatearPrecio = (valor) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(valor) || 0);

export const formatearFecha = (valor) => {
  if (!valor) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(valor));
};

export const formatearFechaHora = (valor) => {
  if (!valor) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(valor));
};

export const formatearDuracion = (minutos) => {
  const total = Number(minutos);
  if (!total) return null;
  if (total < 60) return `${total} min`;

  const horas = Math.floor(total / 60);
  const resto = total % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
};

/**
 * Las imágenes pueden venir de dos sitios: una URL externa pegada a mano
 * (https://...) o un archivo subido desde el panel, que el backend guarda
 * como una ruta relativa (/uploads/...). Esto normaliza ambos casos.
 */
export const resolverImagen = (url) => {
  if (!url) return '';
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:')) return url;
  return `${API_ORIGEN}${url.startsWith('/') ? '' : '/'}${url}`;
};
