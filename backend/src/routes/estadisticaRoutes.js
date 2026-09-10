import { Router } from 'express';
import { verificarToken, verificarRol } from '../middleware/authMiddleware.js';
import { listarEstadisticas } from '../controllers/estadisticaController.js';

const router = Router();

router.get('/', verificarToken, verificarRol(1, 2), listarEstadisticas);

export default router;
