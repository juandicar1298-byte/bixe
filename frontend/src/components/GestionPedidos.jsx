import { useState, useEffect, useMemo } from 'react';
import { Toast } from './Toast';
import { Modal } from './ui/Modal';
import { PanelSeccion, EstadoVacio, ContenedorTabla } from './dashboard/PanelSeccion';
import { IconoBuscar } from './ui/Iconos';
import { formatearPrecio, formatearFechaHora } from '../utils/formato';
import { ESTADOS_PEDIDO as ESTADOS, CLASE_INSIGNIA_ESTADO } from '../utils/pedidos';
import {
  obtenerPedidosApi,
  obtenerPedidoPorIdApi,
  cambiarEstadoPedidoApi,
  eliminarPedidoApi,
} from '../services/api';

export function GestionPedidos({ permitirEliminar = false, onCambio }) {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const [toastMensaje, setToastMensaje] = useState('');
  const [toastTipo, setToastTipo] = useState('exito');
  const [toastVisible, setToastVisible] = useState(false);

  const mostrarToast = (mensaje, tipo = 'exito') => {
    setToastMensaje(mensaje);
    setToastTipo(tipo);
    setToastVisible(true);
  };

  const cargarPedidos = async () => {
    setCargando(true);
    try {
      const data = await obtenerPedidosApi();
      setPedidos(data);
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
    cargarPedidos();
  }, []);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return pedidos.filter((p) => {
      if (filtroEstado !== 'todos' && p.estado !== filtroEstado) return false;
      if (!texto) return true;
      return `#${p.id} ${p.usuario.nombre} ${p.usuario.apellido} ${p.usuario.email}`.toLowerCase().includes(texto);
    });
  }, [pedidos, busqueda, filtroEstado]);

  const abrirDetalle = async (idPedido) => {
    setCargandoDetalle(true);
    setDetalle({ id: idPedido });
    try {
      const data = await obtenerPedidoPorIdApi(idPedido);
      setDetalle(data);
    } catch (err) {
      mostrarToast(err.message, 'error');
      setDetalle(null);
    } finally {
      setCargandoDetalle(false);
    }
  };

  const handleCambiarEstado = async (pedido, estado) => {
    try {
      await cambiarEstadoPedidoApi(pedido.id, estado);
      mostrarToast(`Pedido #${pedido.id} marcado como ${estado} ✅`);
      cargarPedidos();
      onCambio?.();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  };

  const handleEliminar = async (pedido) => {
    if (!confirm(`¿Eliminar el pedido #${pedido.id}? Esta acción no se puede deshacer.`)) return;
    try {
      await eliminarPedidoApi(pedido.id);
      mostrarToast('Pedido eliminado ✅');
      cargarPedidos();
      onCambio?.();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  };

  const pendientes = pedidos.filter((p) => p.estado === 'pendiente').length;

  return (
    <>
      <PanelSeccion
        titulo="Pedidos"
        descripcion={`${pedidos.length} en total · ${pendientes} pendientes por atender`}
      >
        <div className="mb-5 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <IconoBuscar className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              className="campo !pl-10"
              placeholder="Buscar por número o cliente…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <select
            className="campo sm:w-44"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="todos">Todos los estados</option>
            {ESTADOS.map((estado) => (
              <option key={estado} value={estado} className="capitalize">
                {estado}
              </option>
            ))}
          </select>
        </div>

        {cargando && <p className="py-8 text-center text-ink-mute">Cargando pedidos…</p>}
        {error && <p className="py-8 text-center text-peligro">{error}</p>}

        {!cargando && !error && visibles.length === 0 && (
          <EstadoVacio
            titulo="Sin pedidos por aquí"
            descripcion={
              pedidos.length === 0
                ? 'Cuando un cliente confirme su carrito, el pedido aparecerá en esta tabla.'
                : 'Ningún pedido coincide con los filtros actuales.'
            }
          />
        )}

        {!cargando && !error && visibles.length > 0 && (
          <ContenedorTabla>
            <thead>
              <tr className="border-b border-line">
                <th className="th">Pedido</th>
                <th className="th">Cliente</th>
                <th className="th">Fecha</th>
                <th className="th">Total</th>
                <th className="th">Estado</th>
                <th className="th text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0 transition hover:bg-veil">
                  <td className="td font-semibold tabular-nums text-ink">#{p.id}</td>
                  <td className="td">
                    <p className="font-medium text-ink">{p.usuario.nombre} {p.usuario.apellido}</p>
                    <p className="text-xs text-ink-mute">{p.usuario.email}</p>
                  </td>
                  <td className="td whitespace-nowrap text-xs">{formatearFechaHora(p.fecha_creacion)}</td>
                  <td className="td tabular-nums font-medium text-ink">{formatearPrecio(p.total)}</td>
                  <td className="td">
                    <select
                      value={p.estado}
                      onChange={(e) => handleCambiarEstado(p, e.target.value)}
                      className={`insignia ${CLASE_INSIGNIA_ESTADO[p.estado]} cursor-pointer border-0 capitalize outline-none`}
                    >
                      {ESTADOS.map((estado) => (
                        <option key={estado} value={estado} className="capitalize">
                          {estado}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="td">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => abrirDetalle(p.id)} className="accion text-brand-deep hover:underline">
                        Ver detalle
                      </button>
                      {permitirEliminar && (
                        <button onClick={() => handleEliminar(p)} className="accion text-peligro hover:underline">
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </ContenedorTabla>
        )}
      </PanelSeccion>

      <Modal
        abierto={Boolean(detalle)}
        onCerrar={() => setDetalle(null)}
        titulo={`Pedido #${detalle?.id ?? ''}`}
        descripcion={detalle?.fecha_creacion ? formatearFechaHora(detalle.fecha_creacion) : undefined}
        ancho="max-w-xl"
      >
        {cargandoDetalle || !detalle?.items ? (
          <p className="py-8 text-center text-ink-mute">Cargando detalle…</p>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-canvas px-4 py-3">
              <div>
                <p className="rotulo">Cliente</p>
                <p className="font-semibold text-ink">{detalle.usuario.nombre} {detalle.usuario.apellido}</p>
                <p className="text-xs text-ink-mute">{detalle.usuario.email} · {detalle.usuario.telefono}</p>
              </div>
              <span className={`insignia ${CLASE_INSIGNIA_ESTADO[detalle.estado]}`}>
                {detalle.estado}
              </span>
            </div>

            {detalle.notas && (
              <div>
                <p className="rotulo mb-1">Notas del cliente</p>
                <p className="rounded-xl border border-line bg-veil px-4 py-3 text-sm text-ink-soft">
                  {detalle.notas}
                </p>
              </div>
            )}

            <div>
              <p className="rotulo mb-2">Detalle</p>
              <ul className="divide-y divide-line rounded-2xl border border-line">
                {detalle.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <span className="insignia insignia-neutra mb-1">{item.tipo}</span>
                      <p className="truncate text-sm font-medium text-ink">{item.nombre}</p>
                      <p className="text-xs text-ink-mute">
                        {item.cantidad} × {formatearPrecio(item.precio_unitario)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold tabular-nums text-ink">
                      {formatearPrecio(item.cantidad * item.precio_unitario)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-end justify-between border-t border-line pt-4">
              <span className="rotulo">Total</span>
              <span className="titular text-3xl tabular-nums">{formatearPrecio(detalle.total)}</span>
            </div>
          </div>
        )}
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
