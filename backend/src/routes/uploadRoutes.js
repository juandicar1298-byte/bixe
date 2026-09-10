import { Router } from 'express';
import { verificarToken, verificarRol } from '../middleware/authMiddleware.js';
import { subirImagen } from '../middleware/uploadMiddleware.js';

const router = Router();

// Solo Administrador (1) y Empleado (2) pueden subir imágenes al catalogo.
router.post('/', verificarToken, verificarRol(1, 2), subirImagen, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ mensaje: 'No se recibió ninguna imagen.' });
  }

  // El frontend guarda esta ruta relativa en imagen_url.
  res.status(201).json({
    mensaje: 'Imagen subida ✅',
    url: `/uploads/${req.file.filename}`,
    nombre: req.file.originalname,
    tamano: req.file.size,
  });
});

export default router;
