import { pool } from '../config/db.js';

// Alta genérica: permite definir el rol y el estado (la usa el panel de Administrador).
export const crearUsuarioConRol = async (usuario) => {
  const {
    nombre, apellido, tipoDocumento, numeroDocumento,
    direccion, telefono, email, passwordHash, idRol, estado = 'activo',
  } = usuario;

  const [resultado] = await pool.query(
    `INSERT INTO usuarios 
      (nombre, apellido, tipo_documento, numero_documento, direccion, telefono, email, password, id_rol, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [nombre, apellido, tipoDocumento, numeroDocumento, direccion, telefono, email, passwordHash, idRol, estado]
  );

  return resultado.insertId;
};

// Registro público: siempre entra como Cliente (id_rol = 3) y activo.
export const crearUsuario = async (usuario) =>
  crearUsuarioConRol({ ...usuario, idRol: 3, estado: 'activo' });

export const buscarUsuarioPorEmail = async (email) => {
  const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
  return rows[0];
};

export const buscarUsuarioPorDocumento = async (numeroDocumento) => {
  const [rows] = await pool.query('SELECT * FROM usuarios WHERE numero_documento = ?', [numeroDocumento]);
  return rows[0];
};

export const obtenerTodosLosUsuarios = async () => {
  const [rows] = await pool.query(
    `SELECT u.id_usuario, u.nombre, u.apellido, u.tipo_documento, u.numero_documento,
            u.direccion, u.telefono, u.email, u.id_rol, r.nombre_rol, u.estado, u.fecha_creacion
     FROM usuarios u
     JOIN roles r ON u.id_rol = r.id_rol
     ORDER BY u.fecha_creacion DESC`
  );
  return rows;
};

export const obtenerUsuarioPorId = async (id) => {
  const [rows] = await pool.query(
    `SELECT u.id_usuario, u.nombre, u.apellido, u.tipo_documento, u.numero_documento,
            u.direccion, u.telefono, u.email, u.id_rol, r.nombre_rol, u.estado
     FROM usuarios u
     JOIN roles r ON u.id_rol = r.id_rol
     WHERE u.id_usuario = ?`,
    [id]
  );
  return rows[0];
};

export const actualizarUsuario = async (id, datos) => {
  const { nombre, apellido, direccion, telefono, idRol } = datos;
  await pool.query(
    `UPDATE usuarios 
     SET nombre = ?, apellido = ?, direccion = ?, telefono = ?, id_rol = ?
     WHERE id_usuario = ?`,
    [nombre, apellido, direccion, telefono, idRol, id]
  );
};

export const cambiarEstadoUsuario = async (id, estado) => {
  await pool.query('UPDATE usuarios SET estado = ? WHERE id_usuario = ?', [estado, id]);
};

export const eliminarUsuario = async (id) => {
  await pool.query('DELETE FROM usuarios WHERE id_usuario = ?', [id]);
};
// ---- Perfil propio (cualquier usuario autenticado sobre su propia cuenta) ----

export const actualizarPerfil = async (id, datos) => {
  const { nombre, apellido, direccion, telefono } = datos;
  await pool.query(
    `UPDATE usuarios 
     SET nombre = ?, apellido = ?, direccion = ?, telefono = ?
     WHERE id_usuario = ?`,
    [nombre, apellido, direccion, telefono, id]
  );
};

export const obtenerPasswordUsuario = async (id) => {
  const [rows] = await pool.query('SELECT password FROM usuarios WHERE id_usuario = ?', [id]);
  return rows[0]?.password;
};

export const actualizarPassword = async (id, passwordHash) => {
  await pool.query('UPDATE usuarios SET password = ? WHERE id_usuario = ?', [passwordHash, id]);
};

export const obtenerRoles = async () => {
  const [rows] = await pool.query('SELECT id_rol, nombre_rol FROM roles ORDER BY id_rol');
  return rows;
};
