import { useState, useEffect, useCallback, useMemo } from 'react';
import { CLAVE_TOKEN, CLAVE_USUARIO } from '../services/api';
import { SesionContexto } from './sesionContexto';

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

/**
 * Una sola sesión para toda la aplicación.
 *
 * Antes cada componente que usaba useAuth tenía su propia copia del usuario,
 * leída de localStorage al montarse. Los que se vuelven a montar al cambiar de
 * página (la cabecera) se enteraban del login, pero los que se montan una vez
 * y se quedan (el carrito) seguían viendo al usuario de antes: tras iniciar
 * sesión, el carrito seguía pidiendo iniciar sesión. Con el estado aquí, en un
 * único sitio, todos cambian a la vez.
 */
export const SesionProvider = ({ children }) => {
  // Inicialización perezosa: la sesión se conoce ya en el primer render, así
  // que no hace falta un efecto ni un estado de "cargando" que parpadee.
  const [usuario, setUsuario] = useState(leerSesionGuardada);

  useEffect(() => {
    // El evento storage solo llega desde OTRAS pestañas: si en una se inicia o
    // se cierra sesión, las demás se ponen al día. En la propia pestaña ya lo
    // hacen guardarSesion y cerrarSesion.
    const alCambiarEnOtraPestana = (evento) => {
      // key es null cuando la otra pestaña hizo localStorage.clear().
      if (evento.key === null || evento.key === CLAVE_TOKEN || evento.key === CLAVE_USUARIO) {
        setUsuario(leerSesionGuardada());
      }
    };

    window.addEventListener('storage', alCambiarEnOtraPestana);
    return () => window.removeEventListener('storage', alCambiarEnOtraPestana);
  }, []);

  const guardarSesion = useCallback((token, datosUsuario) => {
    localStorage.setItem(CLAVE_TOKEN, token);
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(datosUsuario));
    setUsuario(datosUsuario);
  }, []);

  const cerrarSesion = useCallback(() => {
    localStorage.removeItem(CLAVE_TOKEN);
    localStorage.removeItem(CLAVE_USUARIO);
    setUsuario(null);
  }, []);

  // Refresca los datos de la sesión guardada (p. ej. tras editar el perfil),
  // para que la cabecera y los paneles muestren la información nueva al instante.
  const actualizarUsuarioLocal = useCallback((datos) => {
    setUsuario((previo) => {
      const actualizado = { ...previo, ...datos };
      localStorage.setItem(CLAVE_USUARIO, JSON.stringify(actualizado));
      return actualizado;
    });
  }, []);

  const valor = useMemo(
    () => ({ usuario, guardarSesion, cerrarSesion, actualizarUsuarioLocal }),
    [usuario, guardarSesion, cerrarSesion, actualizarUsuarioLocal]
  );

  return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>;
};
