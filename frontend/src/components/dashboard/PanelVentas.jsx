import { useCallback, useEffect, useMemo, useState } from 'react';
import { PanelSeccion, EstadoVacio, ContenedorTabla } from './PanelSeccion';
import { TarjetaKPI } from './TarjetaKPI';
import { GraficoBarras } from './GraficoBarras';
import { GraficoLinea } from './GraficoLinea';
import { abreviarMonto } from './ejes';
import { Select } from '../Select';
import {
  obtenerPanelVentasApi,
  obtenerProductos,
  obtenerServiciosApi,
} from '../../services/api';
import { formatearPrecio, formatearFechaHora } from '../../utils/formato';
import {
  IconoVentas,
  IconoGrafico,
  IconoFactura,
  IconoPqr,
} from '../ui/Iconos';

/** AAAA-MM-DD de hoy y de hace n días, que es lo que espera <input type="date">. */
const haceDias = (dias) => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return fecha.toISOString().slice(0, 10);
};

const FILTROS_INICIALES = {
  desde: haceDias(29),
  hasta: new Date().toISOString().slice(0, 10),
  agrupar: 'dia',
  canal: '',
  estado: '',
  producto_id: '',
  servicio_id: '',
};

/**
 * Dashboard de ventas: indicadores, gráficas y los filtros que las gobiernan.
 *
 * Nada de esto está escrito en el frontend: todo llega de
 * /api/estadisticas/ventas, que calcula las cifras en la base de datos.
 */
export const PanelVentas = () => {
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [productos, setProductos] = useState([]);
  const [servicios, setServicios] = useState([]);

  useEffect(() => {
    // Para los desplegables de filtro. Si fallan, el panel sigue sirviendo.
    obtenerProductos().then(setProductos).catch(() => setProductos([]));
    obtenerServiciosApi().then(setServicios).catch(() => setServicios([]));
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setDatos(await obtenerPanelVentasApi(filtros));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => {
    // Cargar al montar (y al cambiar los filtros) es justo para lo que sirve
    // un efecto. La regla avisa de renders en cascada; aquí el único estado
    // que cambia de forma síncrona es el indicador de «cargando», una vez
    // por carga.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  const cambiar = (campo) => (evento) =>
    setFiltros((previos) => ({ ...previos, [campo]: evento.target.value }));

  const resumen = datos?.resumen;
  const hayFiltros = useMemo(
    () => JSON.stringify(filtros) !== JSON.stringify(FILTROS_INICIALES),
    [filtros]
  );

  return (
    <div className="space-y-6">
      {/* ----------------------------- Filtros ----------------------------- */}
      <PanelSeccion
        titulo="Filtros"
        descripcion="Gobiernan las tarjetas y las dos gráficas a la vez."
        acciones={
          hayFiltros && (
            <button
              onClick={() => setFiltros(FILTROS_INICIALES)}
              className="btn btn-sutil"
            >
              Limpiar
            </button>
          )
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <label className="block">
            <span className="etiqueta">Desde</span>
            <input
              type="date"
              className="campo"
              value={filtros.desde}
              max={filtros.hasta}
              onChange={cambiar('desde')}
            />
          </label>

          <label className="block">
            <span className="etiqueta">Hasta</span>
            <input
              type="date"
              className="campo"
              value={filtros.hasta}
              min={filtros.desde}
              onChange={cambiar('hasta')}
            />
          </label>

          <Select
            label="Agrupar por"
            value={filtros.agrupar}
            onChange={cambiar('agrupar')}
            placeholder={null}
            options={[
              { value: 'dia', label: 'Día' },
              { value: 'mes', label: 'Mes' },
            ]}
          />

          <Select
            label="Canal"
            value={filtros.canal}
            onChange={cambiar('canal')}
            placeholder="Todos"
            options={[
              { value: 'web', label: 'Web' },
              { value: 'mostrador', label: 'Mostrador' },
            ]}
          />

          <Select
            label="Producto"
            value={filtros.producto_id}
            onChange={cambiar('producto_id')}
            placeholder="Todos"
            options={productos.map((p) => ({ value: String(p.id), label: p.nombre }))}
          />

          <Select
            label="Servicio"
            value={filtros.servicio_id}
            onChange={cambiar('servicio_id')}
            placeholder="Todos"
            options={servicios.map((s) => ({ value: String(s.id), label: s.nombre }))}
          />
        </div>

        {error && <p className="mt-3 text-xs text-peligro">{error}</p>}
      </PanelSeccion>

      {/* ---------------------------- Indicadores ---------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaKPI
          etiqueta="Ingresos del periodo"
          valor={cargando ? '…' : formatearPrecio(resumen?.ingresos ?? 0)}
          pie={`IVA incluido: ${formatearPrecio(resumen?.impuesto ?? 0)}`}
          icono={IconoGrafico}
          acento
        />
        <TarjetaKPI
          etiqueta="Ventas"
          valor={cargando ? '…' : (resumen?.ventas ?? 0)}
          pie={`${resumen?.clientes ?? 0} cliente(s) distinto(s)`}
          icono={IconoVentas}
        />
        <TarjetaKPI
          etiqueta="Ticket promedio"
          valor={cargando ? '…' : formatearPrecio(resumen?.ticket_promedio ?? 0)}
          pie={
            resumen?.descuento
              ? `Descuentos: ${formatearPrecio(resumen.descuento)}`
              : 'Sin descuentos en el periodo'
          }
          icono={IconoFactura}
        />
        <TarjetaKPI
          etiqueta="PQR pendientes"
          valor={cargando ? '…' : (datos?.pqr?.pendientes ?? 0)}
          pie={`${datos?.pqr?.total ?? 0} radicadas en total`}
          icono={IconoPqr}
          acento={(datos?.pqr?.pendientes ?? 0) > 0}
        />
      </div>

      {/* ----------------------------- Gráficas ----------------------------- */}
      <div className="grid gap-6 xl:grid-cols-2">
        <PanelSeccion
          titulo="Ingresos"
          descripcion={filtros.agrupar === 'dia' ? 'Por día' : 'Por mes'}
        >
          {cargando ? (
            <div className="h-56 animate-pulse rounded-2xl bg-canvas" />
          ) : (
            <GraficoBarras
              datos={datos?.serie ?? []}
              titulo="Ingresos por periodo"
              formatear={abreviarMonto}
              campo="ingresos"
            />
          )}
        </PanelSeccion>

        <PanelSeccion
          titulo="Cantidad de ventas"
          descripcion="La tendencia del mismo periodo"
        >
          {cargando ? (
            <div className="h-56 animate-pulse rounded-2xl bg-canvas" />
          ) : (
            <GraficoLinea
              datos={datos?.serie ?? []}
              titulo="Ventas por periodo"
              campo="ventas"
            />
          )}
        </PanelSeccion>
      </div>

      {/* ------------------- Más vendidos y últimas ventas ------------------- */}
      <div className="grid gap-6 xl:grid-cols-2">
        <PanelSeccion titulo="Lo más vendido" descripcion="Por unidades en el periodo">
          {(datos?.top_articulos ?? []).length === 0 ? (
            <EstadoVacio
              titulo="Sin datos todavía"
              descripcion="Cuando haya ventas en el periodo, aquí sale el ranking."
            />
          ) : (
            <ol className="space-y-3">
              {datos.top_articulos.map((articulo, indice) => {
                const tope = datos.top_articulos[0].unidades || 1;
                return (
                  <li key={`${articulo.tipo}-${articulo.nombre}`}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-ink">
                        <span className="mr-1.5 text-ink-faint">{indice + 1}.</span>
                        {articulo.nombre}
                      </p>
                      <span className="shrink-0 text-xs tabular-nums text-ink-mute">
                        {articulo.unidades} und · {formatearPrecio(articulo.monto)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-canvas">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${(articulo.unidades / tope) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </PanelSeccion>

        <PanelSeccion
          titulo="Últimas ventas"
          descripcion={`Facturado en el periodo: ${formatearPrecio(
            datos?.facturacion?.facturado ?? 0
          )}`}
        >
          {(datos?.ultimas ?? []).length === 0 ? (
            <EstadoVacio
              titulo="Ninguna venta en el periodo"
              descripcion="Prueba a ampliar el rango de fechas."
            />
          ) : (
            <ContenedorTabla>
              <thead>
                <tr className="border-b border-line">
                  <th className="th">Venta</th>
                  <th className="th">Cliente</th>
                  <th className="th">Canal</th>
                  <th className="th text-right">Total</th>
                  <th className="th">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {datos.ultimas.map((venta) => (
                  <tr key={venta.id} className="border-b border-line last:border-0">
                    <td className="td font-semibold text-ink">{venta.numero}</td>
                    <td className="td">{venta.cliente}</td>
                    <td className="td">
                      <span className="insignia insignia-neutra capitalize">
                        {venta.canal}
                      </span>
                    </td>
                    <td className="td text-right tabular-nums">
                      {formatearPrecio(venta.total)}
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
