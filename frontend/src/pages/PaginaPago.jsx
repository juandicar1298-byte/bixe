import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { FormularioPago } from '../components/pago/FormularioPago';
import { FacturaEmitida } from '../components/pago/FacturaEmitida';
import { IconoFlecha, IconoEscudo } from '../components/ui/Iconos';
import {
  obtenerPedidoPorIdApi,
  obtenerMetodosPagoApi,
  pagarPedidoApi,
} from '../services/api';
import { desglosarIva, formatearPrecio, resolverImagen } from '../utils/formato';

const Envoltura = ({ children }) => (
  <div className="min-h-screen bg-canvas">
    <Header />
    {children}
    <Footer />
  </div>
);

export const PaginaPago = () => {
  const { pedidoId } = useParams();
  const navigate = useNavigate();

  const [pedido, setPedido] = useState(null);
  const [metodos, setMetodos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [rechazo, setRechazo] = useState('');
  const [resultado, setResultado] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const [datosPedido, datosMetodos] = await Promise.all([
        obtenerPedidoPorIdApi(pedidoId),
        obtenerMetodosPagoApi(),
      ]);
      setPedido(datosPedido);
      setMetodos(datosMetodos);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [pedidoId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  const pagar = async (datos) => {
    setEnviando(true);
    setRechazo('');
    try {
      const respuesta = await pagarPedidoApi(pedidoId, datos);
      if (respuesta.aprobado) {
        setResultado(respuesta);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setRechazo(respuesta.mensaje);
      }
    } catch (err) {
      setRechazo(err.message);
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <Envoltura>
        <p className="py-32 text-center text-ink-mute">Cargando el pedido…</p>
      </Envoltura>
    );
  }

  if (error) {
    return (
      <Envoltura>
        <div className="px-6 py-32 text-center">
          <h1 className="titular text-4xl">No pudimos abrir el pedido</h1>
          <p className="mx-auto mt-3 max-w-md text-ink-mute">{error}</p>
          <Link to="/cliente" className="btn btn-primario mt-8">
            Ir a mis pedidos
          </Link>
        </div>
      </Envoltura>
    );
  }

  // --- Pago ya realizado: se muestra la factura y no el formulario ---
  if (resultado || pedido.estado_pago === 'pagado') {
    return (
      <Envoltura>
        <div className="mx-auto max-w-3xl px-6 py-14">
          <FacturaEmitida
            pedido={pedido}
            resultado={resultado}
            onVerPedidos={() => navigate('/cliente')}
          />
        </div>
      </Envoltura>
    );
  }

  if (pedido.estado === 'cancelado') {
    return (
      <Envoltura>
        <div className="px-6 py-32 text-center">
          <h1 className="titular text-4xl">Este pedido está cancelado</h1>
          <p className="mt-3 text-ink-mute">Un pedido cancelado ya no se puede pagar.</p>
          <Link to="/servicios" className="btn btn-primario mt-8">
            Ver servicios
          </Link>
        </div>
      </Envoltura>
    );
  }

  const desglose = desglosarIva(pedido.total);

  return (
    <Envoltura>
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-8">
        <Link
          to="/cliente"
          className="accion inline-flex items-center gap-1.5 text-ink-mute transition hover:text-brand-deep"
        >
          <IconoFlecha className="h-3.5 w-3.5 rotate-180" />
          Volver a mis pedidos
        </Link>

        <div className="mt-5">
          <p className="rotulo">Pedido #{pedido.id}</p>
          <h1 className="titular mt-2 text-4xl md:text-5xl">Finalizar compra</h1>
        </div>

        <div className="mt-9 grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* ------------------ Lo que se está comprando ------------------ */}
          <section className="tarjeta h-fit overflow-hidden lg:col-span-2">
            <header className="border-b border-line px-5 py-4">
              <h2 className="titular text-lg">Tu compra</h2>
              <p className="mt-0.5 text-xs text-ink-mute">
                {pedido.items.length}{' '}
                {pedido.items.length === 1 ? 'artículo' : 'artículos'}
              </p>
            </header>

            <ul className="divide-y divide-line">
              {pedido.items.map((item) => {
                const imagen = resolverImagen(item.imagen_url);

                return (
                  <li key={item.id} className="flex gap-3 px-5 py-4">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-canvas">
                      {imagen ? (
                        <img src={imagen} alt={item.nombre} className="h-full w-full object-cover" />
                      ) : (
                        <span className="grid h-full w-full place-items-center text-[0.6rem] uppercase tracking-wider text-ink-faint">
                          BIXE
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="insignia insignia-neutra mb-1">{item.tipo}</span>
                      <p className="text-sm font-semibold text-ink">{item.nombre}</p>
                      <p className="mt-0.5 text-xs text-ink-mute">
                        {item.cantidad} × {formatearPrecio(item.precio_unitario)}
                      </p>
                    </div>

                    <p className="shrink-0 text-sm font-bold tabular-nums text-ink">
                      {formatearPrecio(item.precio_unitario * item.cantidad)}
                    </p>
                  </li>
                );
              })}
            </ul>

            <div className="space-y-2 border-t border-line bg-veil px-5 py-4">
              <div className="flex justify-between text-sm">
                <span className="text-ink-mute">Base gravable</span>
                <span className="tabular-nums text-ink-soft">
                  {formatearPrecio(desglose.base)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-mute">IVA (19%)</span>
                <span className="tabular-nums text-ink-soft">
                  {formatearPrecio(desglose.iva)}
                </span>
              </div>
              <div className="flex items-end justify-between border-t border-line pt-3">
                <span className="rotulo">Total</span>
                <span className="titular text-2xl tabular-nums">
                  {formatearPrecio(pedido.total)}
                </span>
              </div>
              <p className="pt-1 text-[0.7rem] leading-relaxed text-ink-mute">
                Los precios ya incluyen IVA. Al confirmar se emite la factura
                electrónica a tu nombre.
              </p>
            </div>
          </section>

          {/* --------------------- Medios de pago --------------------- */}
          <section className="lg:col-span-3">
            <FormularioPago
              metodos={metodos}
              total={pedido.total}
              enviando={enviando}
              rechazo={rechazo}
              onPagar={pagar}
            />

            <p className="mt-4 flex items-start gap-2 text-[0.7rem] leading-relaxed text-ink-mute">
              <IconoEscudo className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
              Pasarela de demostración: no se cobra dinero real. De todos modos
              solo se guardan la entidad y los cuatro últimos dígitos; el código
              de seguridad no se almacena en ningún momento.
            </p>
          </section>
        </div>
      </div>
    </Envoltura>
  );
};
