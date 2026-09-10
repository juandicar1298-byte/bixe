import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// rolesPermitidos: ids de rol que pueden entrar. Ej: [1] solo administrador.
// Si no se pasa, basta con estar autenticado.
//
// Esto es solo una comodidad para la interfaz: la autorización de verdad la
// hace FastAPI en cada petición, comparando el rol del JWT con los permisos.
export const RutaProtegida = ({ children, rolesPermitidos }) => {
  const { usuario } = useAuth();

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol?.id)) {
    return <Navigate to="/" replace />;
  }

  return children;
};
