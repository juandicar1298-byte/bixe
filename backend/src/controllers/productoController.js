import {
  obtenerProductos,
  obtenerProductoPorId,
  obtenerTodosLosProductos,
  crearProducto,
  actualizarProducto,
  cambiarEstadoProducto,
  eliminarProducto,
} from '../models/productoModel.js';

// Pública: cualquiera puede ver el catálogo (solo productos activos)
// Acepta ?categoria=moto | ?categoria=auto para filtrar
export const listarProductos = async (req, res) => {
  try {
    const { categoria } = req.query;
    const productos = await obtenerProductos(categoria);
    res.json(productos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener productos', error: error.message });
  }
};

// Pública: cualquiera puede ver el catálogo
// Protegida: Admin/Empleado ven TODOS los productos (activos e inactivos)
export const listarTodosProductos = async (req, res) => {
  try {
    const productos = await obtenerTodosLosProductos();
    res.json(productos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener productos', error: error.message });
  }
};

// Pública: ver el detalle de un producto específico
export const obtenerProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const producto = await obtenerProductoPorId(id);

    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado.' });
    }

    res.json(producto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener el producto', error: error.message });
  }
};

// Protegida: solo Admin/Empleado pueden crear
export const registrarProducto = async (req, res) => {
  try {
    const { nombre, categoria, precio } = req.body;

    if (!nombre || !categoria || precio === undefined) {
      return res.status(400).json({ mensaje: 'Nombre, categoría y precio son obligatorios.' });
    }

    const idProducto = await crearProducto(req.body);
    res.status(201).json({ mensaje: 'Producto creado ✅', idProducto });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al crear el producto', error: error.message });
  }
};

// Protegida: solo Admin/Empleado pueden editar
export const editarProducto = async (req, res) => {
  try {
    const { id } = req.params;

    const productoExiste = await obtenerProductoPorId(id);
    if (!productoExiste) {
      return res.status(404).json({ mensaje: 'Producto no encontrado.' });
    }

    await actualizarProducto(id, req.body);
    res.json({ mensaje: 'Producto actualizado ✅' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al actualizar el producto', error: error.message });
  }
};

// Protegida: cambiar estado activo/inactivo
export const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['activo', 'inactivo'].includes(estado)) {
      return res.status(400).json({ mensaje: 'Estado inválido.' });
    }

    const productoExiste = await obtenerProductoPorId(id);
    if (!productoExiste) {
      return res.status(404).json({ mensaje: 'Producto no encontrado.' });
    }

    await cambiarEstadoProducto(id, estado);
    res.json({ mensaje: `Producto marcado como ${estado} ✅` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al cambiar el estado', error: error.message });
  }
};

// Protegida: solo Admin puede eliminar definitivamente
export const borrarProducto = async (req, res) => {
  try {
    const { id } = req.params;

    const productoExiste = await obtenerProductoPorId(id);
    if (!productoExiste) {
      return res.status(404).json({ mensaje: 'Producto no encontrado.' });
    }

    await eliminarProducto(id);
    res.json({ mensaje: 'Producto eliminado ✅' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al eliminar el producto', error: error.message });
  }
};