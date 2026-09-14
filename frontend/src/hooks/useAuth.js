import { useContext } from 'react';
import { SesionContexto } from '../context/sesionContexto';

/**
 * Acceso a la sesión compartida: el usuario y las acciones para iniciarla,
 * cerrarla o refrescar sus datos. El estado vive en <SesionProvider>, así que
 * todos los componentes que llaman a este hook ven siempre el mismo usuario.
 */
export const useAuth = () => {
  const contexto = useContext(SesionContexto);
  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de <SesionProvider>.');
  }
  return contexto;
};
