import { Router } from 'express';
import { registrar, login } from '../controllers/authController.js';

const router = Router();

router.post('/registro', registrar);
router.post('/login', login);

export default router;