import {
  obtenerServicios,
  obtenerServicioPorId,
  obtenerTodosLosServicios,
  crearServicio,
  actualizarServicio,
  cambiarEstadoServicio,
  eliminarServicio,
} from '../models/servicioModel.js';

// Pública: cualquiera puede ver los servicios activos.
// Acepta ?categoria=mantenimiento | mecanica | estetica para filtrar.
export const listarServicios = async (req, res) => {
  try {
    const { categoria } = req.query;
    const servicios = await obtenerServicios(categoria);
    res.json(servicios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener servicios', error: error.message });
  }
};

// Protegida: Admin/Empleado ven TODOS los servicios (activos e inactivos) para gestión.
export const listarTodosServicios = async (req, res) => {
  try {
    const servicios = await obtenerTodosLosServicios();
    res.json(servicios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener servicios', error: error.message });
  }
};

export const obtenerServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const servicio = await obtenerServicioPorId(id);

    if (!servicio) {
      return res.status(404).json({ mensaje: 'Servicio no encontrado.' });
    }

    res.json(servicio);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener el servicio', error: error.message });
  }
};

export const registrarServicio = async (req, res) => {
  try {
    const { nombre, categoria, precio } = req.body;

    if (!nombre || !categoria || precio === undefined) {
      return res.status(400).json({ mensaje: 'Nombre, categoría y precio son obligatorios.' });
    }

    const idServicio = await crearServicio(req.body);
    res.status(201).json({ mensaje: 'Servicio creado ✅', idServicio });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al crear el servicio', error: error.message });
  }
};

export const editarServicio = async (req, res) => {
  try {
    const { id } = req.params;

    const servicioExiste = await obtenerServicioPorId(id);
    if (!servicioExiste) {
      return res.status(404).json({ mensaje: 'Servicio no encontrado.' });
    }

    await actualizarServicio(id, req.body);
    res.json({ mensaje: 'Servicio actualizado ✅' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al actualizar el servicio', error: error.message });
  }
};

export const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['activo', 'inactivo'].includes(estado)) {
      return res.status(400).json({ mensaje: 'Estado inválido.' });
    }

    const servicioExiste = await obtenerServicioPorId(id);
    if (!servicioExiste) {
      return res.status(404).json({ mensaje: 'Servicio no encontrado.' });
    }

    await cambiarEstadoServicio(id, estado);
    res.json({ mensaje: `Servicio marcado como ${estado} ✅` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al cambiar el estado', error: error.message });
  }
};

export const borrarServicio = async (req, res) => {
  try {
    const { id } = req.params;

    const servicioExiste = await obtenerServicioPorId(id);
    if (!servicioExiste) {
      return res.status(404).json({ mensaje: 'Servicio no encontrado.' });
    }

    await eliminarServicio(id);
    res.json({ mensaje: 'Servicio eliminado ✅' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al eliminar el servicio', error: error.message });
  }
};
