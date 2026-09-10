import {
  crearPedido,
  obtenerTodosLosPedidos,
  obtenerPedidosPorUsuario,
  obtenerPedidoPorId,
  obtenerItemsDePedido,
  cambiarEstadoPedido,
  eliminarPedido,
  TIPOS_VALIDOS,
  ESTADOS_PEDIDO,
} from '../models/pedidoModel.js';

const ROL_ADMIN = 1;
const ROL_EMPLEADO = 2;

// El cliente confirma su carrito y se genera el pedido.
export const registrarPedido = async (req, res) => {
  try {
    const { items, notas } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ mensaje: 'El carrito está vacío.' });
    }

    const itemInvalido = items.find(
      (item) => !TIPOS_VALIDOS.includes(item.tipo) || !item.id
    );
    if (itemInvalido) {
      return res.status(400).json({ mensaje: 'Hay items inválidos en el carrito.' });
    }

    const { idPedido, total } = await crearPedido(req.usuario.id, items, notas);
    res.status(201).json({ mensaje: 'Pedido confirmado ✅', idPedido, total });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al crear el pedido', error: error.message });
  }
};

// Admin y Empleado ven todos los pedidos.
export const listarPedidos = async (req, res) => {
  try {
    const pedidos = await obtenerTodosLosPedidos();
    res.json(pedidos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener los pedidos', error: error.message });
  }
};

// Cada cliente ve solamente su propio historial.
export const listarMisPedidos = async (req, res) => {
  try {
    const pedidos = await obtenerPedidosPorUsuario(req.usuario.id);
    res.json(pedidos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener tus pedidos', error: error.message });
  }
};

// Devuelve el pedido con su detalle. Un cliente solo puede abrir los suyos.
export const obtenerPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const pedido = await obtenerPedidoPorId(id);

    if (!pedido) {
      return res.status(404).json({ mensaje: 'Pedido no encontrado.' });
    }

    const esDelPersonal = [ROL_ADMIN, ROL_EMPLEADO].includes(req.usuario.idRol);
    if (!esDelPersonal && pedido.id_usuario !== req.usuario.id) {
      return res.status(403).json({ mensaje: 'No puedes ver este pedido.' });
    }

    const items = await obtenerItemsDePedido(id);
    res.json({ ...pedido, items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener el pedido', error: error.message });
  }
};

export const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!ESTADOS_PEDIDO.includes(estado)) {
      return res.status(400).json({
        mensaje: `Estado inválido. Debe ser uno de: ${ESTADOS_PEDIDO.join(', ')}.`,
      });
    }

    const pedido = await obtenerPedidoPorId(id);
    if (!pedido) {
      return res.status(404).json({ mensaje: 'Pedido no encontrado.' });
    }

    await cambiarEstadoPedido(id, estado);
    res.json({ mensaje: `Pedido marcado como ${estado} ✅` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al cambiar el estado', error: error.message });
  }
};

// El cliente puede cancelar su pedido mientras siga pendiente.
export const cancelarMiPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const pedido = await obtenerPedidoPorId(id);

    if (!pedido) {
      return res.status(404).json({ mensaje: 'Pedido no encontrado.' });
    }

    if (pedido.id_usuario !== req.usuario.id) {
      return res.status(403).json({ mensaje: 'No puedes cancelar este pedido.' });
    }

    if (pedido.estado !== 'pendiente') {
      return res.status(400).json({
        mensaje: 'Solo puedes cancelar pedidos que sigan pendientes.',
      });
    }

    await cambiarEstadoPedido(id, 'cancelado');
    res.json({ mensaje: 'Pedido cancelado ✅' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al cancelar el pedido', error: error.message });
  }
};

export const borrarPedido = async (req, res) => {
  try {
    const { id } = req.params;

    const pedido = await obtenerPedidoPorId(id);
    if (!pedido) {
      return res.status(404).json({ mensaje: 'Pedido no encontrado.' });
    }

    await eliminarPedido(id);
    res.json({ mensaje: 'Pedido eliminado ✅' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al eliminar el pedido', error: error.message });
  }
};
