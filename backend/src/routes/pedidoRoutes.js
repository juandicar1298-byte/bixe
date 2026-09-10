import { Router } from 'express';
import { verificarToken, verificarRol } from '../middleware/authMiddleware.js';
import {
  registrarPedido,
  listarPedidos,
  listarMisPedidos,
  obtenerPedido,
  cambiarEstado,
  cancelarMiPedido,
  borrarPedido,
} from '../controllers/pedidoController.js';

const router = Router();

// --- Cliente (cualquier usuario autenticado) ---
// "/mis" va antes de "/:id" para que Express no lo lea como un id.
router.get('/mis', verificarToken, listarMisPedidos);
router.post('/', verificarToken, registrarPedido);
router.patch('/:id/cancelar', verificarToken, cancelarMiPedido);

// --- Gestión (Administrador y Empleado) ---
router.get('/', verificarToken, verificarRol(1, 2), listarPedidos);
router.patch('/:id/estado', verificarToken, verificarRol(1, 2), cambiarEstado);
router.delete('/:id', verificarToken, verificarRol(1), borrarPedido); // solo Admin elimina

// El detalle lo puede abrir el personal, o el cliente dueño del pedido.
// El propio controlador verifica la propiedad.
router.get('/:id', verificarToken, obtenerPedido);

export default router;
