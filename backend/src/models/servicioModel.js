import { pool } from '../config/db.js';

export const obtenerServicios = async (categoria) => {
  if (categoria) {
    const [rows] = await pool.query(
      'SELECT * FROM servicios WHERE categoria = ? AND estado = "activo" ORDER BY id_servicio DESC',
      [categoria]
    );
    return rows;
  }
  const [rows] = await pool.query(
    'SELECT * FROM servicios WHERE estado = "activo" ORDER BY id_servicio DESC'
  );
  return rows;
};

export const obtenerTodosLosServicios = async () => {
  const [rows] = await pool.query('SELECT * FROM servicios ORDER BY id_servicio DESC');
  return rows;
};

export const obtenerServicioPorId = async (id) => {
  const [rows] = await pool.query('SELECT * FROM servicios WHERE id_servicio = ?', [id]);
  return rows[0];
};

export const crearServicio = async (servicio) => {
  const {
    nombre, categoria, descripcion, descripcionLarga,
    duracionMin, precio, imagenUrl,
  } = servicio;

  const [resultado] = await pool.query(
    `INSERT INTO servicios
      (nombre, categoria, descripcion, descripcion_larga, duracion_min, precio, imagen_url, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'activo')`,
    [nombre, categoria, descripcion, descripcionLarga, duracionMin, precio, imagenUrl]
  );
  return resultado.insertId;
};

export const actualizarServicio = async (id, servicio) => {
  const {
    nombre, categoria, descripcion, descripcionLarga,
    duracionMin, precio, imagenUrl,
  } = servicio;

  await pool.query(
    `UPDATE servicios SET
      nombre = ?, categoria = ?, descripcion = ?, descripcion_larga = ?,
      duracion_min = ?, precio = ?, imagen_url = ?
     WHERE id_servicio = ?`,
    [nombre, categoria, descripcion, descripcionLarga, duracionMin, precio, imagenUrl, id]
  );
};

export const cambiarEstadoServicio = async (id, estado) => {
  await pool.query('UPDATE servicios SET estado = ? WHERE id_servicio = ?', [estado, id]);
};

export const eliminarServicio = async (id) => {
  await pool.query('DELETE FROM servicios WHERE id_servicio = ?', [id]);
};
