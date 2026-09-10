import { pool } from '../config/db.js';

/**
 * Ejecuta una consulta y, si la tabla todavía no existe (porque aún no se ha
 * corrido sql/servicios_pedidos.sql), devuelve un valor por defecto en lugar de
 * tumbar todo el dashboard.
 */
const consultarConRespaldo = async (sql, parametros, respaldo) => {
  try {
    const [rows] = await pool.query(sql, parametros);
    return rows;
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') return respaldo;
    throw error;
  }
};

export const obtenerEstadisticas = async () => {
  const [
    usuarios,
    usuariosPorRol,
    productos,
    servicios,
    pedidos,
    pedidosPorEstado,
    ventasPorMes,
    masVendidos,
    pedidosRecientes,
  ] = await Promise.all([
    consultarConRespaldo(
      `SELECT COUNT(*) AS total,
              SUM(estado = 'activo')   AS activos,
              SUM(estado = 'inactivo') AS inactivos
       FROM usuarios`,
      [],
      [{ total: 0, activos: 0, inactivos: 0 }]
    ),

    consultarConRespaldo(
      `SELECT r.id_rol, r.nombre_rol, COUNT(u.id_usuario) AS total
       FROM roles r
       LEFT JOIN usuarios u ON u.id_rol = r.id_rol
       GROUP BY r.id_rol, r.nombre_rol
       ORDER BY r.id_rol`,
      [],
      []
    ),

    consultarConRespaldo(
      `SELECT COUNT(*) AS total,
              SUM(estado = 'activo') AS activos
       FROM productos`,
      [],
      [{ total: 0, activos: 0 }]
    ),

    consultarConRespaldo(
      `SELECT COUNT(*) AS total,
              SUM(estado = 'activo') AS activos
       FROM servicios`,
      [],
      [{ total: 0, activos: 0 }]
    ),

    consultarConRespaldo(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN estado <> 'cancelado' THEN total END), 0) AS ingresos
       FROM pedidos`,
      [],
      [{ total: 0, ingresos: 0 }]
    ),

    consultarConRespaldo(
      `SELECT estado, COUNT(*) AS total, COALESCE(SUM(total), 0) AS monto
       FROM pedidos
       GROUP BY estado`,
      [],
      []
    ),

    consultarConRespaldo(
      `SELECT DATE_FORMAT(fecha_creacion, '%Y-%m') AS mes,
              COUNT(*) AS pedidos,
              COALESCE(SUM(CASE WHEN estado <> 'cancelado' THEN total END), 0) AS ingresos
       FROM pedidos
       WHERE fecha_creacion >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
       GROUP BY mes
       ORDER BY mes`,
      [],
      []
    ),

    consultarConRespaldo(
      `SELECT i.nombre, i.tipo,
              SUM(i.cantidad) AS unidades,
              SUM(i.cantidad * i.precio_unitario) AS monto
       FROM pedido_items i
       JOIN pedidos p ON p.id_pedido = i.id_pedido
       WHERE p.estado <> 'cancelado'
       GROUP BY i.nombre, i.tipo
       ORDER BY unidades DESC
       LIMIT 5`,
      [],
      []
    ),

    consultarConRespaldo(
      `SELECT p.id_pedido, p.total, p.estado, p.fecha_creacion,
              u.nombre, u.apellido
       FROM pedidos p
       JOIN usuarios u ON u.id_usuario = p.id_usuario
       ORDER BY p.fecha_creacion DESC
       LIMIT 5`,
      [],
      []
    ),
  ]);

  return {
    usuarios: usuarios[0],
    usuariosPorRol,
    productos: productos[0],
    servicios: servicios[0],
    pedidos: pedidos[0],
    pedidosPorEstado,
    ventasPorMes,
    masVendidos,
    pedidosRecientes,
  };
};
