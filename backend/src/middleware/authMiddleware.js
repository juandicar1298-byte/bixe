import jwt from 'jsonwebtoken';

// Verifica que la petición traiga un token JWT válido
export const verificarToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ mensaje: 'Acceso denegado. Token no proporcionado.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload; // { id, email, idRol }
    next();
  } catch (error) {
    return res.status(401).json({ mensaje: 'Token inválido o expirado.' });
  }
};

// Verifica que el usuario autenticado tenga uno de los roles permitidos
// Uso: verificarRol(1) => solo Administrador
//      verificarRol(1, 2) => Administrador o Empleado
export const verificarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ mensaje: 'No autenticado.' });
    }

    if (!rolesPermitidos.includes(req.usuario.idRol)) {
      return res.status(403).json({ mensaje: 'No tienes permisos para acceder a este recurso.' });
    }

    next();
  };
};