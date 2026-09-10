import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Toast } from './Toast';
import { Modal } from './ui/Modal';
import { PanelSeccion, EstadoVacio, ContenedorTabla } from './dashboard/PanelSeccion';
import { CLASE_INSIGNIA_ESTADO, CLASE_INSIGNIA_PAGO } from '../utils/pedidos';
import { formatearPrecio, formatearFechaHora } from '../utils/formato';
import {
  obtenerMisPedidosApi,
  obtenerPedidoPorIdApi,
  cancelarMiPedidoApi,
  descargarFacturaApi,
} from '../services/api';

export function MisPedidos() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

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
      const data = await obtenerMisPedidosApi();
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

  const abrirDetalle = async (idPedido) => {
    setCargandoDetalle(true);
    setDetalle({ id: idPedido });
    try {
      setDetalle(await obtenerPedidoPorIdApi(idPedido));
    } catch (err) {
      mostrarToast(err.message, 'error');
      setDetalle(null);
    } finally {
      setCargandoDetalle(false);
    }
  };

  const cancelar = async (pedido) => {
    if (!confirm(`¿Cancelar el pedido #${pedido.id}?`)) return;
    try {
      await cancelarMiPedidoApi(pedido.id);
      mostrarToast('Pedido cancelado ✅');
      cargarPedidos();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  };

  const descargarFactura = async (pedido) => {
    try {
      const blob = await descargarFacturaApi(pedido.id);
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `factura-pedido-${pedido.id}.pdf`;
      enlace.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  };

  const gastado = pedidos
    .filter((p) => p.estado !== 'cancelado')
    .reduce((suma, p) => suma + Number(p.total), 0);

  return (
    <>
      <PanelSeccion
        titulo="Mis pedidos"
        descripcion={
          pedidos.length > 0
            ? `${pedidos.length} en total · ${formatearPrecio(gastado)} acumulado`
            : undefined
        }
      >
        {cargando && <p className="py-8 text-center text-ink-mute">Cargando tus pedidos…</p>}
        {error && <p className="py-8 text-center text-peligro">{error}</p>}

        {!cargando && !error && pedidos.length === 0 && (
          <EstadoVacio
            titulo="Todavía no has hecho ningún pedido"
            descripcion="Explora los servicios del taller y agrega lo que necesites al carrito."
            accion={
              <Link to="/servicios" className="btn btn-primario">
                Ver servicios
              </Link>
            }
          />
        )}

        {!cargando && !error && pedidos.length > 0 && (
          <ContenedorTabla>
            <thead>
              <tr className="border-b border-line">
                <th className="th">Pedido</th>
                <th className="th">Fecha</th>
                <th className="th">Total</th>
                <th className="th">Estado</th>
                <th className="th">Pago</th>
                <th className="th text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0 transition hover:bg-veil">
                  <td className="td font-semibold tabular-nums text-ink">#{p.id}</td>
                  <td className="td whitespace-nowrap text-xs">{formatearFechaHora(p.fecha_creacion)}</td>
                  <td className="td tabular-nums font-medium text-ink">{formatearPrecio(p.total)}</td>
                  <td className="td">
                    <span className={`insignia ${CLASE_INSIGNIA_ESTADO[p.estado]}`}>{p.estado}</span>
                  </td>
                  <td className="td">
                    <span className={`insignia ${CLASE_INSIGNIA_PAGO[p.estado_pago]}`}>
                      {p.estado_pago}
                    </span>
                  </td>
                  <td className="td">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => abrirDetalle(p.id)} className="accion text-brand-deep hover:underline">
                        Ver detalle
                      </button>
                      {p.estado_pago === 'pagado' ? (
                        <button
                          onClick={() => descargarFactura(p)}
                          className="accion text-exito hover:underline"
                        >
                          Factura
                        </button>
                      ) : (
                        p.estado !== 'cancelado' && (
                          <button
                            onClick={() => navigate(`/pago/${p.id}`)}
                            className="accion text-brand-deep hover:underline"
                          >
                            Pagar
                          </button>
                        )
                      )}

                      {/* Solo se puede cancelar mientras no se haya pagado ni lo haya tomado el taller */}
                      {p.estado === 'pendiente' && p.estado_pago !== 'pagado' && (
                        <button onClick={() => cancelar(p)} className="accion text-peligro hover:underline">
                          Cancelar
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
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-canvas px-4 py-3">
              <span className="rotulo">Estado</span>
              <span className={`insignia ${CLASE_INSIGNIA_ESTADO[detalle.estado]}`}>
                {detalle.estado}
              </span>
            </div>

            {detalle.notas && (
              <div>
                <p className="rotulo mb-1">Tus notas</p>
                <p className="rounded-xl border border-line bg-veil px-4 py-3 text-sm text-ink-soft">
                  {detalle.notas}
                </p>
              </div>
            )}

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
