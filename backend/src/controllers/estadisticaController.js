import { obtenerEstadisticas } from '../models/estadisticaModel.js';

// Alimenta las tarjetas y gráficas de los paneles de Administrador y Empleado.
export const listarEstadisticas = async (req, res) => {
  try {
    const estadisticas = await obtenerEstadisticas();
    res.json(estadisticas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener las estadísticas', error: error.message });
  }
};
