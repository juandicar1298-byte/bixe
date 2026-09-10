import { Router } from 'express';
import { verificarToken, verificarRol } from '../middleware/authMiddleware.js';
import {
  listarUsuarios,
  listarRoles,
  obtenerUsuario,
  registrarUsuarioAdmin,
  editarUsuario,
  cambiarEstado,
  borrarUsuario,
  miPerfil,
  editarMiPerfil,
  cambiarMiPassword,
} from '../controllers/usuarioController.js';

const router = Router();

// --- Perfil propio: cualquier usuario autenticado sobre su propia cuenta ---
// Van ANTES de "/:id" para que Express no interprete "perfil" como un id.
router.get('/perfil', verificarToken, miPerfil);
router.put('/perfil', verificarToken, editarMiPerfil);
router.put('/perfil/password', verificarToken, cambiarMiPassword);

// --- Gestión de usuarios: requiere rol de Administrador (id_rol = 1) ---
router.get('/roles', verificarToken, verificarRol(1), listarRoles);
router.get('/', verificarToken, verificarRol(1), listarUsuarios);
router.post('/', verificarToken, verificarRol(1), registrarUsuarioAdmin);
router.get('/:id', verificarToken, verificarRol(1), obtenerUsuario);
router.put('/:id', verificarToken, verificarRol(1), editarUsuario);
router.patch('/:id/estado', verificarToken, verificarRol(1), cambiarEstado);
router.delete('/:id', verificarToken, verificarRol(1), borrarUsuario);

export default router;
