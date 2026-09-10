import { useState, useEffect, useCallback } from 'react';
import { CLAVE_TOKEN, CLAVE_USUARIO } from '../services/api';

/** Lee la sesión guardada. Devuelve null si no hay o si está corrupta. */
const leerSesionGuardada = () => {
  try {
    const token = localStorage.getItem(CLAVE_TOKEN);
    const usuario = localStorage.getItem(CLAVE_USUARIO);
    return token && usuario ? JSON.parse(usuario) : null;
  } catch {
    return null;
  }
};

export const useAuth = () => {
  // Inicialización perezosa: la sesión se conoce ya en el primer render, así
  // que no hace falta un efecto ni un estado de "cargando" que parpadee.
  const [usuario, setUsuario] = useState(leerSesionGuardada);

  const cargarUsuario = useCallback(() => setUsuario(leerSesionGuardada()), []);

  useEffect(() => {
    // Si se inicia o cierra sesión en otra pestaña, esta se entera.
    window.addEventListener('storage', cargarUsuario);
    return () => window.removeEventListener('storage', cargarUsuario);
  }, [cargarUsuario]);

  // Refresca los datos de la sesión guardada (p. ej. tras editar el perfil),
  // para que el Header y los paneles muestren la información nueva al instante.
  const actualizarUsuarioLocal = (datos) => {
    setUsuario((previo) => {
      const actualizado = { ...previo, ...datos };
      localStorage.setItem(CLAVE_USUARIO, JSON.stringify(actualizado));
      return actualizado;
    });
  };

  const cerrarSesion = () => {
    localStorage.removeItem(CLAVE_TOKEN);
    localStorage.removeItem(CLAVE_USUARIO);
    setUsuario(null);
  };

  return { usuario, cargarUsuario, actualizarUsuarioLocal, cerrarSesion };
};
