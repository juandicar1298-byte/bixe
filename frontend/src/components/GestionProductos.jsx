import { useState, useEffect, useMemo } from 'react';
import { Toast } from './Toast';
import { Modal } from './ui/Modal';
import { SelectorImagen } from './ui/SelectorImagen';
import { PanelSeccion, EstadoVacio, ContenedorTabla } from './dashboard/PanelSeccion';
import { IconoMas, IconoBuscar } from './ui/Iconos';
import { formatearPrecio, resolverImagen } from '../utils/formato';
import {
  obtenerTodosLosProductosApi,
  crearProductoApi,
  actualizarProductoApi,
  cambiarEstadoProductoApi,
  eliminarProductoApi,
} from '../services/api';

const productoVacio = {
  nombre: '',
  categoria: 'moto',
  cilindraje: '',
  potencia: '',
  torque: '',
  velocidad_maxima: '',
  peso: '',
  transmision: '',
  combustible: '',
  descripcion: '',
  descripcion_larga: '',
  precio: '',
  imagen_url: '',
};

// El backend devuelve los campos en snake_case; el formulario los maneja en camelCase.
const mapearProductoAForm = (p) => ({
  nombre: p.nombre || '',
  categoria: p.categoria || 'moto',
  cilindraje: p.cilindraje || '',
  potencia: p.potencia || '',
  torque: p.torque || '',
  velocidad_maxima: p.velocidad_maxima || '',
  peso: p.peso || '',
  transmision: p.transmision || '',
  combustible: p.combustible || '',
  descripcion: p.descripcion || '',
  descripcion_larga: p.descripcion_larga || '',
  precio: p.precio || '',
  imagen_url: p.imagen_url || '',
});

export function GestionProductos({ permitirEliminar = false }) {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoIdEditando, setProductoIdEditando] = useState(null); // null = creando
  const [formData, setFormData] = useState(productoVacio);
  const [guardando, setGuardando] = useState(false);

  const [toastMensaje, setToastMensaje] = useState('');
  const [toastTipo, setToastTipo] = useState('exito');
  const [toastVisible, setToastVisible] = useState(false);

  const mostrarToast = (mensaje, tipo = 'exito') => {
    setToastMensaje(mensaje);
    setToastTipo(tipo);
    setToastVisible(true);
  };

  const cargarProductos = async () => {
    setCargando(true);
    try {
      const data = await obtenerTodosLosProductosApi();
      setProductos(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    // Cargar datos al montar es justo para lo que sirve un efecto. La regla
    // no puede ver que el setState ocurre después del await, no de forma
    // síncrona, así que aquí es un falso positivo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarProductos();
  }, []);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return productos.filter((p) => {
      if (filtroCategoria !== 'todas' && p.categoria !== filtroCategoria) return false;
      if (!texto) return true;
      return `${p.nombre} ${p.descripcion ?? ''}`.toLowerCase().includes(texto);
    });
  }, [productos, busqueda, filtroCategoria]);

  const abrirCrear = () => {
    setProductoIdEditando(null);
    setFormData(productoVacio);
    setModalAbierto(true);
  };

  const abrirEditar = (producto) => {
    setProductoIdEditando(producto.id);
    setFormData(mapearProductoAForm(producto));
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setProductoIdEditando(null);
    setFormData(productoVacio);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const datos = {
        ...formData,
        cilindraje: formData.cilindraje === '' ? null : Number(formData.cilindraje),
        precio: Number(formData.precio),
      };

      if (productoIdEditando) {
        await actualizarProductoApi(productoIdEditando, datos);
        mostrarToast('Producto actualizado ✅');
      } else {
        await crearProductoApi(datos);
        mostrarToast('Producto creado ✅');
      }

      cerrarModal();
      cargarProductos();
    } catch (err) {
      mostrarToast(err.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const handleCambiarEstado = async (producto) => {
    const nuevoEstado = producto.estado === 'activo' ? 'inactivo' : 'activo';
    try {
      await cambiarEstadoProductoApi(producto.id, nuevoEstado);
      mostrarToast(`Producto marcado como ${nuevoEstado} ✅`);
      cargarProductos();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  };

  const handleEliminar = async (producto) => {
    if (!confirm(`¿Eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await eliminarProductoApi(producto.id);
      mostrarToast('Producto eliminado ✅');
      cargarProductos();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  };

  return (
    <>
      <PanelSeccion
        titulo="Catálogo de productos"
        descripcion={`${productos.length} en total · ${productos.filter((p) => p.estado === 'activo').length} publicados`}
        acciones={
          <button onClick={abrirCrear} className="btn btn-primario">
            <IconoMas className="h-4 w-4" />
            Nuevo producto
          </button>
        }
      >
        <div className="mb-5 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <IconoBuscar className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              className="campo !pl-10"
              placeholder="Buscar por nombre o descripción…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <select
            className="campo sm:w-44"
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
          >
            <option value="todas">Todas las categorías</option>
            <option value="moto">Motos</option>
            <option value="auto">Autos</option>
          </select>
        </div>

        {cargando && <p className="py-8 text-center text-ink-mute">Cargando productos…</p>}
        {error && <p className="py-8 text-center text-peligro">{error}</p>}

        {!cargando && !error && visibles.length === 0 && (
          <EstadoVacio
            titulo="No hay productos que mostrar"
            descripcion={
              productos.length === 0
                ? 'Crea el primer modelo del catálogo para que aparezca en la web.'
                : 'Ningún producto coincide con la búsqueda actual.'
            }
            accion={
              productos.length === 0 && (
                <button onClick={abrirCrear} className="btn btn-primario">
                  Crear el primero
                </button>
              )
            }
          />
        )}

        {!cargando && !error && visibles.length > 0 && (
          <ContenedorTabla>
            <thead>
              <tr className="border-b border-line">
                <th className="th">Producto</th>
                <th className="th">Categoría</th>
                <th className="th">Precio</th>
                <th className="th">Estado</th>
                <th className="th text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((p) => {
                const imagen = resolverImagen(p.imagen_url);

                return (
                  <tr key={p.id} className="border-b border-line last:border-0 transition hover:bg-veil">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-canvas">
                          {imagen ? (
                            <img src={imagen} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="grid h-full w-full place-items-center text-[0.55rem] uppercase tracking-wider text-ink-faint">
                              S/F
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-ink">{p.nombre}</p>
                          <p className="truncate text-xs text-ink-mute">{p.cilindraje || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="td capitalize">{p.categoria}</td>
                    <td className="td tabular-nums font-medium text-ink">{formatearPrecio(p.precio)}</td>
                    <td className="td">
                      <span className={`insignia ${p.estado === 'activo' ? 'insignia-exito' : 'insignia-neutra'}`}>
                        {p.estado}
                      </span>
                    </td>
                    <td className="td">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => abrirEditar(p)} className="accion text-brand-deep hover:underline">
                          Editar
                        </button>
                        <button onClick={() => handleCambiarEstado(p)} className="accion text-alerta hover:underline">
                          {p.estado === 'activo' ? 'Ocultar' : 'Publicar'}
                        </button>
                        {permitirEliminar && (
                          <button onClick={() => handleEliminar(p)} className="accion text-peligro hover:underline">
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </ContenedorTabla>
        )}
      </PanelSeccion>

      <Modal
        abierto={modalAbierto}
        onCerrar={cerrarModal}
        titulo={productoIdEditando ? 'Editar producto' : 'Nuevo producto'}
        descripcion="Los campos técnicos son opcionales y se muestran en la ficha del modelo."
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <SelectorImagen
            valor={formData.imagen_url}
            onCambiar={(url) => setFormData((prev) => ({ ...prev, imagen_url: url }))}
            onError={(mensaje) => mostrarToast(mensaje, 'error')}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="etiqueta">Nombre</label>
              <input className="campo" name="nombre" value={formData.nombre} onChange={handleChange} required />
            </div>
            <div>
              <label className="etiqueta">Categoría</label>
              <select className="campo" name="categoria" value={formData.categoria} onChange={handleChange}>
                <option value="moto">Moto</option>
                <option value="auto">Auto</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <label className="etiqueta">Cilindraje</label>
              <input className="campo" name="cilindraje" type="number" value={formData.cilindraje} onChange={handleChange} placeholder="650" />
            </div>
            <div>
              <label className="etiqueta">Potencia</label>
              <input className="campo" name="potencia" value={formData.potencia} onChange={handleChange} placeholder="76 HP" />
            </div>
            <div>
              <label className="etiqueta">Torque</label>
              <input className="campo" name="torque" value={formData.torque} onChange={handleChange} placeholder="68 Nm" />
            </div>
            <div>
              <label className="etiqueta">Vel. máxima</label>
              <input className="campo" name="velocidad_maxima" value={formData.velocidad_maxima} onChange={handleChange} placeholder="200 km/h" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="etiqueta">Peso</label>
              <input className="campo" name="peso" value={formData.peso} onChange={handleChange} placeholder="186 kg" />
            </div>
            <div>
              <label className="etiqueta">Transmisión</label>
              <input className="campo" name="transmision" value={formData.transmision} onChange={handleChange} placeholder="Manual 6 vel." />
            </div>
            <div>
              <label className="etiqueta">Combustible</label>
              <input className="campo" name="combustible" value={formData.combustible} onChange={handleChange} placeholder="Gasolina" />
            </div>
            <div>
              <label className="etiqueta">Precio (COP)</label>
              <input className="campo" name="precio" type="number" min="0" value={formData.precio} onChange={handleChange} required />
            </div>
          </div>

          <div>
            <label className="etiqueta">Descripción corta</label>
            <textarea className="campo" rows={2} name="descripcion" value={formData.descripcion} onChange={handleChange} placeholder="Una línea que resuma el modelo." />
          </div>

          <div>
            <label className="etiqueta">Descripción larga</label>
            <textarea className="campo" rows={4} name="descripcion_larga" value={formData.descripcion_larga} onChange={handleChange} />
          </div>

          <div className="flex gap-3 border-t border-line pt-5">
            <button type="button" onClick={cerrarModal} className="btn btn-contorno flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="btn btn-primario flex-1">
              {guardando ? 'Guardando…' : 'Guardar producto'}
            </button>
          </div>
        </form>
      </Modal>

      <Toast
        mensaje={toastMensaje}
        tipo={toastTipo}
        visible={toastVisible}
        onCerrar={() => setToastVisible(false)}
      />
    </>
  );
}
