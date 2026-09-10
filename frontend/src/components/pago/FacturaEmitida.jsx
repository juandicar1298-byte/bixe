import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { descargarFacturaApi, obtenerFacturaApi, obtenerPagoApi } from '../../services/api';
import { formatearPrecio, formatearFechaHora, resolverImagen } from '../../utils/formato';

const ETIQUETA_METODO = {
  tarjeta: 'Tarjeta',
  pse: 'PSE',
  nequi: 'Nequi',
};

const NOMBRE_ENTIDAD = {
  visa: 'VISA',
  mastercard: 'Mastercard',
  amex: 'Amex',
  diners: 'Diners',
  nequi: 'Nequi',
  bancolombia: 'Bancolombia',
  davivienda: 'Davivienda',
  bbva: 'BBVA Colombia',
  bogota: 'Banco de Bogotá',
  occidente: 'Banco de Occidente',
  nubank: 'Nu Colombia',
};

/**
 * Comprobante que se muestra en la misma página en cuanto el pago se aprueba.
 *
 * Si se llega aquí con un pedido que ya estaba pagado (por ejemplo entrando
 * de nuevo a la URL), el pago y la factura se piden a la API.
 */
export const FacturaEmitida = ({ pedido, resultado, onVerPedidos }) => {
  const [pago, setPago] = useState(resultado?.pago ?? null);
  const [factura, setFactura] = useState(resultado?.factura ?? null);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState('');

  const faltanDatos = !pago || !factura;

  const cargar = useCallback(async () => {
    if (!faltanDatos) return;
    try {
      const [datosPago, datosFactura] = await Promise.all([
        obtenerPagoApi(pedido.id),
        obtenerFacturaApi(pedido.id),
      ]);
      setPago(datosPago);
      setFactura(datosFactura);
    } catch (err) {
      setError(err.message);
    }
  }, [faltanDatos, pedido.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  const descargar = async () => {
    setDescargando(true);
    setError('');
    try {
      const blob = await descargarFacturaApi(pedido.id);
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `${factura.numero}.pdf`;
      enlace.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setDescargando(false);
    }
  };

  if (faltanDatos) {
    return (
      <p className="py-20 text-center text-ink-mute">
        {error || 'Cargando el comprobante…'}
      </p>
    );
  }

  return (
    <div className="animate-subir">
      {/* --------------------- Confirmación --------------------- */}
      <div className="text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-exito-wash text-exito">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 12.5l5 5 10-11" />
          </svg>
        </span>

        <h1 className="titular mt-5 text-4xl md:text-5xl">¡Pago aprobado!</h1>
        <p className="mt-3 text-ink-soft">
          Emitimos la factura <strong className="text-ink">{factura.numero}</strong> a
          tu nombre. También la tienes disponible en tu panel.
        </p>
      </div>

      {/* ------------------------ Factura ------------------------ */}
      <article className="tarjeta mt-9 overflow-hidden">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <p className="rotulo">Factura de venta</p>
            <p className="titular mt-1 text-2xl">{factura.numero}</p>
            <p className="mt-1 text-xs text-ink-mute">
              {formatearFechaHora(factura.fecha_emision)}
            </p>
          </div>

          <div className="text-right">
            <p className="rotulo">Pagado con</p>
            <p className="mt-1 text-sm font-semibold text-ink">
              {ETIQUETA_METODO[pago.metodo] ?? pago.metodo}
              {' · '}
              {NOMBRE_ENTIDAD[pago.marca] ?? pago.marca}
            </p>
            <p className="mt-0.5 text-xs text-ink-mute">
              ····{pago.ultimos_cuatro} · Ref. {pago.referencia}
            </p>
          </div>
        </header>

        <ul className="divide-y divide-line">
          {pedido.items.map((item) => {
            const imagen = resolverImagen(item.imagen_url);

            return (
              <li key={item.id} className="flex items-center gap-3 px-6 py-4">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-canvas">
                  {imagen ? (
                    <img src={imagen} alt={item.nombre} className="h-full w-full object-cover" />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-[0.55rem] uppercase tracking-wider text-ink-faint">
                      BIXE
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{item.nombre}</p>
                  <p className="text-xs text-ink-mute">
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

        <div className="space-y-2 border-t border-line bg-veil px-6 py-5">
          <div className="flex justify-between text-sm">
            <span className="text-ink-mute">Base gravable</span>
            <span className="tabular-nums text-ink-soft">
              {formatearPrecio(factura.base_gravable)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-mute">
              IVA ({Math.round(factura.porcentaje_iva)}%)
            </span>
            <span className="tabular-nums text-ink-soft">
              {formatearPrecio(factura.valor_iva)}
            </span>
          </div>
          <div className="flex items-end justify-between border-t border-line pt-3">
            <span className="rotulo">Total pagado</span>
            <span className="titular text-3xl tabular-nums">
              {formatearPrecio(factura.total)}
            </span>
          </div>
        </div>
      </article>

      {error && <p className="mt-4 text-center text-sm text-peligro">{error}</p>}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button onClick={descargar} disabled={descargando} className="btn btn-primario flex-1">
          {descargando ? 'Generando…' : 'Descargar factura en PDF'}
        </button>
        <button onClick={onVerPedidos} className="btn btn-contorno flex-1">
          Ver mis pedidos
        </button>
        <Link to="/servicios" className="btn btn-sutil flex-1">
          Seguir comprando
        </Link>
      </div>
    </div>
  );
};
