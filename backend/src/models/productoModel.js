import { pool } from '../config/db.js';

export const obtenerProductos = async (categoria) => {
  if (categoria) {
    const [rows] = await pool.query(
      'SELECT * FROM productos WHERE categoria = ? AND estado = "activo" ORDER BY id_producto DESC',
      [categoria]
    );
    return rows;
  }
  const [rows] = await pool.query(
    'SELECT * FROM productos WHERE estado = "activo" ORDER BY id_producto DESC'
  );
  return rows;
};

export const obtenerProductoPorId = async (id) => {
  const [rows] = await pool.query('SELECT * FROM productos WHERE id_producto = ?', [id]);
  return rows[0];
};

export const crearProducto = async (producto) => {
  const {
    nombre, categoria, cilindraje, potencia, torque, velocidadMaxima,
    peso, transmision, combustible, descripcion, descripcionLarga, precio, imagenUrl,
  } = producto;

  const [resultado] = await pool.query(
    `INSERT INTO productos
      (nombre, categoria, cilindraje, potencia, torque, velocidad_maxima, peso, transmision, combustible, descripcion, descripcion_larga, precio, imagen_url, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo')`,
    [nombre, categoria, cilindraje, potencia, torque, velocidadMaxima, peso, transmision, combustible, descripcion, descripcionLarga, precio, imagenUrl]
  );
  return resultado.insertId;
};

export const actualizarProducto = async (id, producto) => {
  const {
    nombre, categoria, cilindraje, potencia, torque, velocidadMaxima,
    peso, transmision, combustible, descripcion, descripcionLarga, precio, imagenUrl,
  } = producto;

  await pool.query(
    `UPDATE productos SET
      nombre = ?, categoria = ?, cilindraje = ?, potencia = ?, torque = ?, velocidad_maxima = ?,
      peso = ?, transmision = ?, combustible = ?, descripcion = ?, descripcion_larga = ?, precio = ?, imagen_url = ?
     WHERE id_producto = ?`,
    [nombre, categoria, cilindraje, potencia, torque, velocidadMaxima, peso, transmision, combustible, descripcion, descripcionLarga, precio, imagenUrl, id]
  );
};

export const cambiarEstadoProducto = async (id, estado) => {
  await pool.query('UPDATE productos SET estado = ? WHERE id_producto = ?', [estado, id]);
};

export const eliminarProducto = async (id) => {
  await pool.query('DELETE FROM productos WHERE id_producto = ?', [id]);
};

export const obtenerTodosLosProductos = async () => {
  const [rows] = await pool.query('SELECT * FROM productos ORDER BY id_producto DESC');
  return rows;
};