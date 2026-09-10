import { useState, useEffect, useMemo } from 'react';
import { Toast } from './Toast';
import { Modal } from './ui/Modal';
import { SelectorImagen } from './ui/SelectorImagen';
import { GaleriaImagenes } from './ui/GaleriaImagenes';
import { PanelSeccion, EstadoVacio, ContenedorTabla } from './dashboard/PanelSeccion';
import { IconoMas, IconoBuscar } from './ui/Iconos';
import { formatearPrecio, formatearDuracion, resolverImagen } from '../utils/formato';
import {
  obtenerTodosLosServiciosApi,
  crearServicioApi,
  actualizarServicioApi,
  cambiarEstadoServicioApi,
  eliminarServicioApi,
} from '../services/api';

const servicioVacio = {
  nombre: '',
  categoria: 'mantenimiento',
  descripcion: '',
  descripcion_larga: '',
  duracion_min: '',
  precio: '',
  imagen_url: '',
};

const mapearServicioAForm = (s) => ({
  nombre: s.nombre || '',
  categoria: s.categoria || 'mantenimiento',
  descripcion: s.descripcion || '',
  descripcion_larga: s.descripcion_larga || '',
  duracion_min: s.duracion_min || '',
  precio: s.precio || '',
  imagen_url: s.imagen_url || '',
});

export function GestionServicios({ permitirEliminar = false }) {
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [servicioIdEditando, setServicioIdEditando] = useState(null);
  const [galeria, setGaleria] = useState([]);
  const [formData, setFormData] = useState(servicioVacio);
  const [guardando, setGuardando] = useState(false);

  const [toastMensaje, setToastMensaje] = useState('');
  const [toastTipo, setToastTipo] = useState('exito');
  const [toastVisible, setToastVisible] = useState(false);

  const mostrarToast = (mensaje, tipo = 'exito') => {
    setToastMensaje(mensaje);
    setToastTipo(tipo);
    setToastVisible(true);
  };

  const cargarServicios = async () => {
    setCargando(true);
    try {
      const data = await obtenerTodosLosServiciosApi();
      setServicios(data);
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
    cargarServicios();
  }, []);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return servicios;
    return servicios.filter((s) =>
      `${s.nombre} ${s.categoria ?? ''} ${s.descripcion ?? ''}`.toLowerCase().includes(texto)
    );
  }, [servicios, busqueda]);

  const abrirCrear = () => {
    setServicioIdEditando(null);
    setFormData(servicioVacio);
    setModalAbierto(true);
  };

  const abrirEditar = (servicio) => {
    setServicioIdEditando(servicio.id);
    setFormData(mapearServicioAForm(servicio));
    setGaleria(servicio.imagenes ?? []);
    setModalAbierto(true);
  };

  // Tras subir o quitar una foto se relee el servicio, que es quien manda.
  const refrescarGaleria = async () => {
    const data = await obtenerTodosLosServiciosApi();
    setServicios(data);
    setGaleria(data.find((s) => s.id === servicioIdEditando)?.imagenes ?? []);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setServicioIdEditando(null);
    setFormData(servicioVacio);
    setGaleria([]);
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
        duracion_min: formData.duracion_min === '' ? null : Number(formData.duracion_min),
        precio: Number(formData.precio),
      };

      if (servicioIdEditando) {
        await actualizarServicioApi(servicioIdEditando, datos);
        mostrarToast('Servicio actualizado ✅');
      } else {
        await crearServicioApi(datos);
        mostrarToast('Servicio creado ✅');
      }

      cerrarModal();
      cargarServicios();
    } catch (err) {
      mostrarToast(err.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const handleCambiarEstado = async (servicio) => {
    const nuevoEstado = servicio.estado === 'activo' ? 'inactivo' : 'activo';
    try {
      await cambiarEstadoServicioApi(servicio.id, nuevoEstado);
      mostrarToast(`Servicio marcado como ${nuevoEstado} ✅`);
      cargarServicios();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  };

  const handleEliminar = async (servicio) => {
    if (!confirm(`¿Eliminar "${servicio.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await eliminarServicioApi(servicio.id);
      mostrarToast('Servicio eliminado ✅');
      cargarServicios();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  };

  return (
    <>
      <PanelSeccion
        titulo="Servicios del taller"
        descripcion={`${servicios.length} en total · ${servicios.filter((s) => s.estado === 'activo').length} publicados`}
        acciones={
          <button onClick={abrirCrear} className="btn btn-primario">
            <IconoMas className="h-4 w-4" />
            Nuevo servicio
          </button>
        }
      >
        <div className="relative mb-5">
          <IconoBuscar className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            className="campo !pl-10"
            placeholder="Buscar servicio…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {cargando && <p className="py-8 text-center text-ink-mute">Cargando servicios…</p>}
        {error && <p className="py-8 text-center text-peligro">{error}</p>}

        {!cargando && !error && visibles.length === 0 && (
          <EstadoVacio
            titulo="No hay servicios que mostrar"
            descripcion={
              servicios.length === 0
                ? 'Publica el primer servicio para que los clientes puedan agregarlo al carrito.'
                : 'Ningún servicio coincide con la búsqueda.'
            }
            accion={
              servicios.length === 0 && (
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
                <th className="th">Servicio</th>
                <th className="th">Categoría</th>
                <th className="th">Duración</th>
                <th className="th">Precio</th>
                <th className="th">Estado</th>
                <th className="th text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((s) => {
                const imagen = resolverImagen(s.imagen_url);

                return (
                  <tr key={s.id} className="border-b border-line last:border-0 transition hover:bg-veil">
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
                        <div className="min-w-0 max-w-[260px]">
                          <p className="font-semibold text-ink">{s.nombre}</p>
                          <p className="truncate text-xs text-ink-mute">{s.descripcion || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="td capitalize">{s.categoria}</td>
                    <td className="td">{formatearDuracion(s.duracion_min) || '—'}</td>
                    <td className="td tabular-nums font-medium text-ink">{formatearPrecio(s.precio)}</td>
                    <td className="td">
                      <span className={`insignia ${s.estado === 'activo' ? 'insignia-exito' : 'insignia-neutra'}`}>
                        {s.estado}
                      </span>
                    </td>
                    <td className="td">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => abrirEditar(s)} className="accion text-brand-deep hover:underline">
                          Editar
                        </button>
                        <button onClick={() => handleCambiarEstado(s)} className="accion text-alerta hover:underline">
                          {s.estado === 'activo' ? 'Ocultar' : 'Publicar'}
                        </button>
                        {permitirEliminar && (
                          <button onClick={() => handleEliminar(s)} className="accion text-peligro hover:underline">
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
        titulo={servicioIdEditando ? 'Editar servicio' : 'Nuevo servicio'}
        descripcion="Lo que publiques aquí aparece en la página de Servicios y se puede agregar al carrito."
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <SelectorImagen
            valor={formData.imagen_url}
            onCambiar={(url) => setFormData((prev) => ({ ...prev, imagen_url: url }))}
            onError={(mensaje) => mostrarToast(mensaje, 'error')}
          />

          {servicioIdEditando ? (
            <GaleriaImagenes
              recurso="servicios"
              registroId={servicioIdEditando}
              imagenes={galeria}
              onCambio={refrescarGaleria}
              onError={(mensaje) => mostrarToast(mensaje, 'error')}
            />
          ) : (
            <p className="rounded-xl border border-dashed border-line bg-veil px-4 py-3 text-xs text-ink-mute">
              Guarda el servicio primero y vuelve a abrirlo para agregarle más
              fotos a la galería.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="etiqueta">Nombre</label>
              <input className="campo" name="nombre" value={formData.nombre} onChange={handleChange} required />
            </div>
            <div>
              <label className="etiqueta">Categoría</label>
              <input
                className="campo"
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
                list="categorias-servicio"
                placeholder="mantenimiento"
                required
              />
              <datalist id="categorias-servicio">
                <option value="mantenimiento" />
                <option value="mecanica" />
                <option value="estetica" />
                <option value="accesorios" />
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="etiqueta">Duración (minutos)</label>
              <input className="campo" name="duracion_min" type="number" min="0" value={formData.duracion_min} onChange={handleChange} placeholder="90" />
            </div>
            <div>
              <label className="etiqueta">Precio (COP)</label>
              <input className="campo" name="precio" type="number" min="0" value={formData.precio} onChange={handleChange} required />
            </div>
          </div>

          <div>
            <label className="etiqueta">Descripción corta</label>
            <textarea className="campo" rows={2} name="descripcion" value={formData.descripcion} onChange={handleChange} placeholder="La línea que se ve en la tarjeta del servicio." />
          </div>

          <div>
            <label className="etiqueta">Descripción larga</label>
            <textarea className="campo" rows={4} name="descripcion_larga" value={formData.descripcion_larga} onChange={handleChange} placeholder="Qué incluye el servicio, paso a paso." />
          </div>

          <div className="flex gap-3 border-t border-line pt-5">
            <button type="button" onClick={cerrarModal} className="btn btn-contorno flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="btn btn-primario flex-1">
              {guardando ? 'Guardando…' : 'Guardar servicio'}
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
