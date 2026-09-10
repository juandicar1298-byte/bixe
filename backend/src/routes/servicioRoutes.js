import { Router } from 'express';
import { verificarToken, verificarRol } from '../middleware/authMiddleware.js';
import {
  listarServicios,
  listarTodosServicios,
  obtenerServicio,
  registrarServicio,
  editarServicio,
  cambiarEstado,
  borrarServicio,
} from '../controllers/servicioController.js';

const router = Router();

// Ruta pública: cualquier visitante puede ver los servicios activos
router.get('/', listarServicios);

// Protegida: Admin/Empleado ven todos los servicios para gestionarlos
router.get('/admin/todos', verificarToken, verificarRol(1, 2), listarTodosServicios);

router.get('/:id', obtenerServicio);

// Rutas protegidas: solo Administrador (1) o Empleado (2) gestionan servicios
router.post('/', verificarToken, verificarRol(1, 2), registrarServicio);
router.put('/:id', verificarToken, verificarRol(1, 2), editarServicio);
router.patch('/:id/estado', verificarToken, verificarRol(1, 2), cambiarEstado);
router.delete('/:id', verificarToken, verificarRol(1), borrarServicio); // solo Admin elimina

export default router;
