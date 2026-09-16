import { useEffect, useState } from 'react';
import { PanelSeccion, EstadoVacio, ContenedorTabla } from './PanelSeccion';
import { TarjetaKPI } from './TarjetaKPI';
import { GraficoBarras } from './GraficoBarras';
import { abreviarMonto } from './ejes';
import { obtenerMiPanelApi } from '../../services/api';
import { formatearFechaHora, formatearPrecio } from '../../utils/formato';
import { IconoVentas, IconoFactura, IconoPqr } from '../ui/Iconos';

/**
 * El dashboard del cliente.
 *
 * Solo ve lo suyo, y no porque el frontend filtre: el backend saca el
 * identificador del token, así que no hay nada que se pueda cambiar desde
 * aquí para ver las cifras de otra persona.
 */
export const PanelCliente = () => {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    obtenerMiPanelApi()
      .then(setDatos)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, []);

  if (error) {
    return <p className="py-10 text-center text-peligro">{error}</p>;
  }

  const compras = datos?.compras;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <TarjetaKPI
          etiqueta="Total comprado"
          valor={cargando ? '…' : formatearPrecio(compras?.ingresos ?? 0)}
          pie={`IVA incluido: ${formatearPrecio(compras?.impuesto ?? 0)}`}
          icono={IconoFactura}
          acento
        />
        <TarjetaKPI
          etiqueta="Compras"
          valor={cargando ? '…' : (compras?.ventas ?? 0)}
          pie={
            compras?.ticket_promedio
              ? `Promedio: ${formatearPrecio(compras.ticket_promedio)}`
              : 'Todavía sin compras'
          }
          icono={IconoVentas}
        />
        <TarjetaKPI
          etiqueta="Mis PQR"
          valor={cargando ? '…' : (datos?.pqr?.total ?? 0)}
          pie={`${datos?.pqr?.pendientes ?? 0} sin responder`}
          icono={IconoPqr}
        />
      </div>

      <PanelSeccion
        titulo="Lo que has gastado"
        descripcion="Por mes, en los últimos meses"
      >
        {cargando ? (
          <div className="h-56 animate-pulse rounded-2xl bg-canvas" />
        ) : (
          <GraficoBarras
            datos={datos?.serie ?? []}
            titulo="Compras por mes"
            formatear={abreviarMonto}
            campo="ingresos"
          />
        )}
      </PanelSeccion>

      <div className="grid gap-6 xl:grid-cols-2">
        <PanelSeccion titulo="Lo que más has llevado" descripcion="Por unidades">
          {(datos?.top_articulos ?? []).length === 0 ? (
            <EstadoVacio
              titulo="Todavía nada"
              descripcion="Cuando hagas tu primera compra, aquí verás el detalle."
            />
          ) : (
            <ul className="space-y-3">
              {datos.top_articulos.map((articulo) => (
                <li
                  key={`${articulo.tipo}-${articulo.nombre}`}
                  className="flex items-baseline justify-between gap-3 border-b border-line pb-2 last:border-0"
                >
                  <span className="truncate text-sm font-semibold text-ink">
                    {articulo.nombre}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-ink-mute">
                    {articulo.unidades} und · {formatearPrecio(articulo.monto)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </PanelSeccion>

        <PanelSeccion titulo="Mis últimas compras" descripcion="Las más recientes">
          {(datos?.ultimas ?? []).length === 0 ? (
            <EstadoVacio
              titulo="Sin compras todavía"
              descripcion="Explora el catálogo y los servicios del taller."
            />
          ) : (
            <ContenedorTabla>
              <thead>
                <tr className="border-b border-line">
                  <th className="th">Venta</th>
                  <th className="th text-right">Total</th>
                  <th className="th">Estado</th>
                  <th className="th">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {datos.ultimas.map((venta) => (
                  <tr key={venta.id} className="border-b border-line last:border-0">
                    <td className="td font-semibold text-ink">{venta.numero}</td>
                    <td className="td text-right tabular-nums">
                      {formatearPrecio(venta.total)}
                    </td>
                    <td className="td">
                      <span
                        className={`insignia ${
                          venta.estado === 'anulada'
                            ? 'insignia-peligro'
                            : 'insignia-exito'
                        } capitalize`}
                      >
                        {venta.estado}
                      </span>
                    </td>
                    <td className="td whitespace-nowrap text-xs">
                      {formatearFechaHora(venta.fecha)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </ContenedorTabla>
          )}
        </PanelSeccion>
      </div>
    </div>
  );
};
