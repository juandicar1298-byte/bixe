import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Las imágenes se guardan en backend/uploads y se sirven como /uploads/<archivo>
export const CARPETA_UPLOADS = path.join(__dirname, '../../uploads');

if (!fs.existsSync(CARPETA_UPLOADS)) {
  fs.mkdirSync(CARPETA_UPLOADS, { recursive: true });
}

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
const TAMANO_MAXIMO = 3 * 1024 * 1024; // 3 MB

const almacenamiento = multer.diskStorage({
  destination: (req, file, cb) => cb(null, CARPETA_UPLOADS),
  filename: (req, file, cb) => {
    // Se antepone la fecha para que dos archivos con el mismo nombre no se pisen,
    // y se limpia el nombre original para evitar caracteres raros en la URL.
    const extension = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, extension)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'imagen';

    cb(null, `${Date.now()}-${base}${extension}`);
  },
});

const subida = multer({
  storage: almacenamiento,
  limits: { fileSize: TAMANO_MAXIMO },
  fileFilter: (req, file, cb) => {
    if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
      return cb(new Error('Formato no permitido. Usa JPG, PNG, WEBP, AVIF o GIF.'));
    }
    cb(null, true);
  },
}).single('imagen');

// Envuelve a multer para que sus errores salgan como JSON igual que el resto de la API.
export const subirImagen = (req, res, next) => {
  subida(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      const mensaje =
        error.code === 'LIMIT_FILE_SIZE'
          ? 'La imagen no puede pesar más de 3 MB.'
          : 'No se pudo subir la imagen.';
      return res.status(400).json({ mensaje });
    }

    if (error) {
      return res.status(400).json({ mensaje: error.message });
    }

    next();
  });
};
