import bcrypt from 'bcrypt';
import {
  obtenerTodosLosUsuarios,
  obtenerUsuarioPorId,
  crearUsuarioConRol,
  actualizarUsuario,
  cambiarEstadoUsuario,
  eliminarUsuario,
  actualizarPerfil,
  obtenerPasswordUsuario,
  actualizarPassword,
  obtenerRoles,
} from '../models/usuarioModel.js';
import { validarDatosNuevoUsuario } from '../utils/validaciones.js';

const ROLES_VALIDOS = [1, 2, 3];

// ---------- Gestión de usuarios (solo Administrador) ----------

export const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await obtenerTodosLosUsuarios();
    res.json(usuarios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener usuarios', error: error.message });
  }
};

export const listarRoles = async (req, res) => {
  try {
    const roles = await obtenerRoles();
    res.json(roles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener los roles', error: error.message });
  }
};

export const obtenerUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await obtenerUsuarioPorId(id);

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    res.json(usuario);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener el usuario', error: error.message });
  }
};

// El administrador puede dar de alta usuarios con cualquier rol (empleado, admin o cliente).
export const registrarUsuarioAdmin = async (req, res) => {
  try {
    const {
      nombre, apellido, tipoDocumento, numeroDocumento,
      direccion, telefono, email, password, idRol,
    } = req.body;

    const error = await validarDatosNuevoUsuario(req.body);
    if (error) {
      return res.status(error.status).json({ mensaje: error.mensaje });
    }

    if (!ROLES_VALIDOS.includes(Number(idRol))) {
      return res.status(400).json({ mensaje: 'Debes seleccionar un rol válido.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const idUsuario = await crearUsuarioConRol({
      nombre, apellido, tipoDocumento, numeroDocumento,
      direccion, telefono, email, passwordHash, idRol: Number(idRol),
    });

    res.status(201).json({ mensaje: 'Usuario creado ✅', idUsuario });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al crear el usuario', error: error.message });
  }
};

export const editarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, direccion, telefono, idRol } = req.body;

    if (!nombre || !apellido || !direccion || !telefono || !idRol) {
      return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
    }

    if (!ROLES_VALIDOS.includes(Number(idRol))) {
      return res.status(400).json({ mensaje: 'Debes seleccionar un rol válido.' });
    }

    const usuarioExiste = await obtenerUsuarioPorId(id);
    if (!usuarioExiste) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    // Evita que un admin se quite a sí mismo el rol y pierda el acceso al panel.
    if (Number(id) === req.usuario.id && Number(idRol) !== usuarioExiste.id_rol) {
      return res.status(400).json({ mensaje: 'No puedes cambiar tu propio rol.' });
    }

    await actualizarUsuario(id, { nombre, apellido, direccion, telefono, idRol: Number(idRol) });
    res.json({ mensaje: 'Usuario actualizado ✅' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al actualizar el usuario', error: error.message });
  }
};

export const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['activo', 'inactivo'].includes(estado)) {
      return res.status(400).json({ mensaje: 'Estado inválido. Debe ser "activo" o "inactivo".' });
    }

    const usuarioExiste = await obtenerUsuarioPorId(id);
    if (!usuarioExiste) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    if (Number(id) === req.usuario.id) {
      return res.status(400).json({ mensaje: 'No puedes desactivar tu propia cuenta.' });
    }

    await cambiarEstadoUsuario(id, estado);
    res.json({ mensaje: `Usuario marcado como ${estado} ✅` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al cambiar el estado', error: error.message });
  }
};

export const borrarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const usuarioExiste = await obtenerUsuarioPorId(id);
    if (!usuarioExiste) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    if (Number(id) === req.usuario.id) {
      return res.status(400).json({ mensaje: 'No puedes eliminar tu propia cuenta.' });
    }

    await eliminarUsuario(id);
    res.json({ mensaje: 'Usuario eliminado ✅' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al eliminar el usuario', error: error.message });
  }
};

// ---------- Perfil propio (cualquier usuario autenticado) ----------

export const miPerfil = async (req, res) => {
  try {
    const usuario = await obtenerUsuarioPorId(req.usuario.id);

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    res.json(usuario);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener tu perfil', error: error.message });
  }
};

export const editarMiPerfil = async (req, res) => {
  try {
    const { nombre, apellido, direccion, telefono } = req.body;

    if (!nombre || !apellido || !direccion || !telefono) {
      return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
    }

    await actualizarPerfil(req.usuario.id, { nombre, apellido, direccion, telefono });

    // Se devuelve el perfil actualizado para refrescar la sesión del navegador.
    const usuario = await obtenerUsuarioPorId(req.usuario.id);
    res.json({ mensaje: 'Perfil actualizado ✅', usuario });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al actualizar tu perfil', error: error.message });
  }
};

export const cambiarMiPassword = async (req, res) => {
  try {
    const { passwordActual, passwordNueva } = req.body;

    if (!passwordActual || !passwordNueva) {
      return res.status(400).json({ mensaje: 'Debes indicar la contraseña actual y la nueva.' });
    }

    if (passwordNueva.length < 6 || passwordNueva.length > 20) {
      return res.status(400).json({ mensaje: 'La contraseña debe tener entre 6 y 20 caracteres.' });
    }

    const hashGuardado = await obtenerPasswordUsuario(req.usuario.id);
    if (!hashGuardado) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    const esCorrecta = await bcrypt.compare(passwordActual, hashGuardado);
    if (!esCorrecta) {
      return res.status(401).json({ mensaje: 'La contraseña actual no es correcta.' });
    }

    await actualizarPassword(req.usuario.id, await bcrypt.hash(passwordNueva, 10));
    res.json({ mensaje: 'Contraseña actualizada ✅' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al cambiar la contraseña', error: error.message });
  }
};
