import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCarrito } from '../context/carritoContexto';
import { useAuth } from '../hooks/useAuth';
import { crearPedidoApi } from '../services/api';
import { formatearPrecio, resolverImagen } from '../utils/formato';
import { IconoCerrar, IconoCarrito, IconoBasura } from './ui/Iconos';

export const CarritoDrawer = () => {
  const { items, abierto, cerrarCarrito, quitar, cambiarCantidad, vaciar, subtotal } = useCarrito();
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const [notas, setNotas] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [pedidoCreado, setPedidoCreado] = useState(null);

  // Todos los caminos para cerrar el panel pasan por aquí, así el mensaje de
  // éxito no reaparece la próxima vez que se abra el carrito.
  const cerrar = () => {
    setPedidoCreado(null);
    setError('');
    cerrarCarrito();
  };

  const irALogin = () => {
    cerrar();
    navigate('/login');
  };

  const confirmar = async () => {
    setEnviando(true);
    setError('');

    try {
      const respuesta = await crearPedidoApi({
        items: items.map(({ tipo, id, cantidad }) => ({ tipo, id, cantidad })),
        notas: notas.trim() || undefined,
      });

      setPedidoCreado(respuesta);
      vaciar();
      setNotas('');
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <div
        onClick={cerrar}
        className={`fixed inset-0 z-[110] bg-ink/45 backdrop-blur-sm transition-opacity duration-300 ${
          abierto ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        aria-hidden={!abierto}
        className={`fixed inset-y-0 right-0 z-[115] flex w-full max-w-md flex-col border-l border-line bg-surface shadow-alta transition-transform duration-300 ease-out ${
          abierto ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between border-b border-line px-6 py-5">
          <div>
            <p className="rotulo">Tu selección</p>
            <h2 className="titular text-2xl">Carrito</h2>
          </div>
          <button
            onClick={cerrar}
            aria-label="Cerrar carrito"
            className="grid h-9 w-9 place-items-center rounded-full text-ink-mute transition hover:bg-canvas hover:text-ink"
          >
            <IconoCerrar className="h-4 w-4" />
          </button>
        </header>

        {/* --- Confirmación --- */}
        {pedidoCreado ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-exito-wash text-exito">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.5 12.5l5 5 10-11" />
              </svg>
            </span>
            <h3 className="titular text-2xl">Pedido confirmado</h3>
            <p className="text-sm text-ink-mute">
              Tu pedido <strong className="text-ink">#{pedidoCreado.id}</strong> quedó
              registrado por {formatearPrecio(pedidoCreado.total)}. Puedes seguirlo desde tu panel.
            </p>
            <div className="mt-3 flex w-full flex-col gap-2">
              <button
                onClick={() => {
                  cerrar();
                  navigate('/cliente');
                }}
                className="btn btn-primario w-full"
              >
                Ver mis pedidos
              </button>
              <button onClick={cerrar} className="btn btn-contorno w-full">
                Seguir explorando
              </button>
            </div>
          </div>
        ) : items.length === 0 ? (
          /* --- Carrito vacío --- */
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-canvas text-ink-faint">
              <IconoCarrito className="h-6 w-6" />
            </span>
            <h3 className="titular text-xl">Tu carrito está vacío</h3>
            <p className="text-sm text-ink-mute">
              Agrega servicios del taller o modelos del catálogo para continuar.
            </p>
            <button
              onClick={() => {
                cerrar();
                navigate('/servicios');
              }}
              className="btn btn-primario mt-2"
            >
              Ver servicios
            </button>
          </div>
        ) : (
          <>
            {/* --- Lista de items --- */}
            <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
              {items.map((item) => {
                const imagen = resolverImagen(item.imagenUrl);

                return (
                  <article
                    key={`${item.tipo}-${item.id}`}
                    className="flex gap-3 rounded-2xl border border-line bg-veil p-3"
                  >
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
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="insignia insignia-neutra mb-1">{item.tipo}</span>
                          <p className="truncate text-sm font-semibold text-ink">{item.nombre}</p>
                        </div>

                        <button
                          onClick={() => quitar(item.tipo, item.id)}
                          aria-label={`Quitar ${item.nombre}`}
                          className="shrink-0 text-ink-faint transition hover:text-peligro"
                        >
                          <IconoBasura className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 rounded-full border border-line bg-surface px-1">
                          <button
                            onClick={() => cambiarCantidad(item.tipo, item.id, item.cantidad - 1)}
                            aria-label="Quitar uno"
                            className="grid h-6 w-6 place-items-center rounded-full text-ink-soft transition hover:bg-canvas"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-sm font-semibold tabular-nums text-ink">
                            {item.cantidad}
                          </span>
                          <button
                            onClick={() => cambiarCantidad(item.tipo, item.id, item.cantidad + 1)}
                            aria-label="Agregar uno"
                            className="grid h-6 w-6 place-items-center rounded-full text-ink-soft transition hover:bg-canvas"
                          >
                            +
                          </button>
                        </div>

                        <p className="text-sm font-bold tabular-nums text-ink">
                          {formatearPrecio(Number(item.precio) * item.cantidad)}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}

              <button
                onClick={vaciar}
                className="accion w-full pt-1 text-center text-ink-mute hover:text-peligro"
              >
                Vaciar carrito
              </button>
            </div>

            {/* --- Pie con total y confirmación --- */}
            <footer className="space-y-3 border-t border-line px-6 py-5">
              {usuario && (
                <input
                  className="campo !text-xs"
                  placeholder="Notas para el taller (opcional)"
                  value={notas}
                  onChange={(evento) => setNotas(evento.target.value)}
                  maxLength={255}
                />
              )}

              <div className="flex items-end justify-between">
                <span className="rotulo">Total</span>
                <span className="titular text-2xl tabular-nums">{formatearPrecio(subtotal)}</span>
              </div>

              {error && <p className="text-xs text-peligro">{error}</p>}

              {usuario ? (
                <button
                  onClick={confirmar}
                  disabled={enviando}
                  className="btn btn-primario w-full"
                >
                  {enviando ? 'Confirmando…' : 'Confirmar pedido'}
                </button>
              ) : (
                <>
                  <button onClick={irALogin} className="btn btn-primario w-full">
                    Inicia sesión para pedir
                  </button>
                  <p className="text-center text-[0.7rem] text-ink-mute">
                    Tu carrito se guarda mientras tanto.
                  </p>
                </>
              )}
            </footer>
          </>
        )}
      </aside>
    </>
  );
};
