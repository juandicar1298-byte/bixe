import { pool } from '../config/db.js';

// Cada tipo de item apunta a una tabla distinta. Se resuelve con este mapa
// (nunca con el texto que llega del navegador) para no abrir una inyección SQL.
const TABLAS_POR_TIPO = {
  producto: { tabla: 'productos', columnaId: 'id_producto' },
  servicio: { tabla: 'servicios', columnaId: 'id_servicio' },
};

export const TIPOS_VALIDOS = Object.keys(TABLAS_POR_TIPO);

export const ESTADOS_PEDIDO = ['pendiente', 'confirmado', 'completado', 'cancelado'];

/**
 * Crea un pedido con su detalle dentro de una transacción.
 * Los precios NO se toman del carrito del navegador: se releen de la base de
 * datos, para que nadie pueda enviar un precio manipulado desde el frontend.
 */
export const crearPedido = async (idUsuario, items, notas) => {
  const conexion = await pool.getConnection();

  try {
    await conexion.beginTransaction();

    const [resultado] = await conexion.query(
      'INSERT INTO pedidos (id_usuario, total, estado, notas) VALUES (?, 0, "pendiente", ?)',
      [idUsuario, notas || null]
    );
    const idPedido = resultado.insertId;

    let total = 0;

    for (const item of items) {
      const referencia = TABLAS_POR_TIPO[item.tipo];
      if (!referencia) {
        throw new Error(`Tipo de item inválido: ${item.tipo}`);
      }

      const [filas] = await conexion.query(
        `SELECT nombre, precio FROM ${referencia.tabla}
         WHERE ${referencia.columnaId} = ? AND estado = 'activo'`,
        [item.id]
      );

      if (filas.length === 0) {
        throw new Error(`Uno de los items del carrito ya no está disponible.`);
      }

      const { nombre, precio } = filas[0];
      const cantidad = Math.max(1, Number(item.cantidad) || 1);
      total += Number(precio) * cantidad;

      await conexion.query(
        `INSERT INTO pedido_items
          (id_pedido, tipo, id_referencia, nombre, precio_unitario, cantidad)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [idPedido, item.tipo, item.id, nombre, precio, cantidad]
      );
    }

    await conexion.query('UPDATE pedidos SET total = ? WHERE id_pedido = ?', [total, idPedido]);

    await conexion.commit();
    return { idPedido, total };
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
};

const SELECT_PEDIDO = `
  SELECT p.id_pedido, p.id_usuario, p.total, p.estado, p.notas, p.fecha_creacion,
         u.nombre, u.apellido, u.email, u.telefono
  FROM pedidos p
  JOIN usuarios u ON p.id_usuario = u.id_usuario`;

export const obtenerTodosLosPedidos = async () => {
  const [rows] = await pool.query(`${SELECT_PEDIDO} ORDER BY p.fecha_creacion DESC`);
  return rows;
};

export const obtenerPedidosPorUsuario = async (idUsuario) => {
  const [rows] = await pool.query(
    `${SELECT_PEDIDO} WHERE p.id_usuario = ? ORDER BY p.fecha_creacion DESC`,
    [idUsuario]
  );
  return rows;
};

export const obtenerPedidoPorId = async (id) => {
  const [rows] = await pool.query(`${SELECT_PEDIDO} WHERE p.id_pedido = ?`, [id]);
  return rows[0];
};

export const obtenerItemsDePedido = async (idPedido) => {
  const [rows] = await pool.query(
    'SELECT * FROM pedido_items WHERE id_pedido = ? ORDER BY id_item',
    [idPedido]
  );
  return rows;
};

export const cambiarEstadoPedido = async (id, estado) => {
  await pool.query('UPDATE pedidos SET estado = ? WHERE id_pedido = ?', [estado, id]);
};

export const eliminarPedido = async (id) => {
  // pedido_items tiene ON DELETE CASCADE, así que el detalle se borra solo.
  await pool.query('DELETE FROM pedidos WHERE id_pedido = ?', [id]);
};
