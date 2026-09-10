import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './config/db.js';
import { CARPETA_UPLOADS } from './middleware/uploadMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import usuarioRoutes from './routes/usuarioRoutes.js';
import productoRoutes from './routes/productoRoutes.js';
import servicioRoutes from './routes/servicioRoutes.js';
import pedidoRoutes from './routes/pedidoRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import estadisticaRoutes from './routes/estadisticaRoutes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Las imágenes subidas desde el panel se sirven como archivos estáticos:
// http://localhost:4000/uploads/<nombre-del-archivo>
app.use('/uploads', express.static(CARPETA_UPLOADS));

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/servicios', servicioRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/estadisticas', estadisticaRoutes);

// Ruta de prueba
app.get('/api/ping', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS resultado');
    res.json({ mensaje: 'Backend conectado a MySQL ✅', resultado: rows[0].resultado });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error de conexión a la base de datos', error: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
