import { Router } from 'express';
import { verificarToken, verificarRol } from '../middleware/authMiddleware.js';
import {
  listarProductos,
  listarTodosProductos,
  obtenerProducto,
  registrarProducto,
  editarProducto,
  cambiarEstado,
  borrarProducto,
} from '../controllers/productoController.js';

const router = Router();

// Rutas públicas: cualquier visitante puede ver el catálogo, sin necesidad de login
router.get('/', listarProductos);

// Protegida: Admin/Empleado ven todos los productos (activos e inactivos) para gestión
router.get('/admin/todos', verificarToken, verificarRol(1, 2), listarTodosProductos);

router.get('/:id', obtenerProducto);

// Rutas protegidas: solo Administrador (1) o Empleado (2) pueden gestionar productos
router.post('/', verificarToken, verificarRol(1, 2), registrarProducto);
router.put('/:id', verificarToken, verificarRol(1, 2), editarProducto);
router.patch('/:id/estado', verificarToken, verificarRol(1, 2), cambiarEstado);
router.delete('/:id', verificarToken, verificarRol(1), borrarProducto); // solo Admin elimina

export default router;