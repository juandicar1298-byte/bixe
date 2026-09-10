import { useState, useEffect, useCallback } from 'react';
import { TarjetaKPI } from './TarjetaKPI';
import { GraficoVentas } from './GraficoVentas';
import { PanelSeccion, EstadoVacio } from './PanelSeccion';
import { CLASE_INSIGNIA_ESTADO } from '../../utils/pedidos';
import { IconoPedidos, IconoUsuarios, IconoProductos, IconoServicios, IconoReloj } from '../ui/Iconos';
import { obtenerEstadisticasApi } from '../../services/api';
import { formatearPrecio, formatearFecha } from '../../utils/formato';

/**
 * Vista de "Resumen" de los paneles de gestión: cifras clave, ingresos por
 * mes, lo más vendido y los últimos pedidos.
 *
 * mostrarUsuarios: solo el Administrador ve las métricas de cuentas.
 */
export const ResumenGestion = ({ mostrarUsuarios = false, recarga = 0, onIrAPedidos }) => {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const respuesta = await obtenerEstadisticasApi();
      setDatos(respuesta);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // Cargar datos al montar es justo para lo que sirve un efecto. La regla
    // no puede ver que el setState ocurre después del await, no de forma
    // síncrona, así que aquí es un falso positivo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar, recarga]);

  if (cargando) {
    return <p className="py-16 text-center text-ink-mute">Cargando el resumen…</p>;
  }

  if (error) {
    return (
      <EstadoVacio
        titulo="No se pudo cargar el resumen"
        descripcion={error}
        accion={
          <button onClick={cargar} className="btn btn-contorno">
            Reintentar
          </button>
        }
      />
    );
  }

  const pendientes =
    datos.pedidos_por_estado.find((fila) => fila.estado === 'pendiente')?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* --- Cifras clave --- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaKPI
          etiqueta="Ingresos"
          valor={formatearPrecio(datos.pedidos.ingresos)}
          pie="Suma de pedidos no cancelados"
          icono={IconoPedidos}
          acento
        />
        <TarjetaKPI
          etiqueta="Pedidos"
          valor={datos.pedidos.total}
          pie={`${pendientes} pendientes por atender`}
          icono={IconoReloj}
        />
        <TarjetaKPI
          etiqueta="Productos"
          valor={datos.productos.total}
          pie={`${datos.productos.activos ?? 0} publicados en la web`}
          icono={IconoProductos}
        />
        <TarjetaKPI
          etiqueta="Servicios"
          valor={datos.servicios.total}
          pie={`${datos.servicios.activos ?? 0} publicados en la web`}
          icono={IconoServicios}
        />
      </div>

      {mostrarUsuarios && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TarjetaKPI
            etiqueta="Usuarios"
            valor={datos.usuarios.total}
            pie={`${datos.usuarios.activos ?? 0} activos`}
            icono={IconoUsuarios}
          />
          {datos.usuarios_por_rol.map((rol) => (
            <TarjetaKPI key={rol.rol_id} etiqueta={rol.rol} valor={rol.total} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* --- Ingresos por mes --- */}
        <PanelSeccion
          titulo="Ingresos por mes"
          descripcion="Últimos 6 meses, sin contar pedidos cancelados"
          className="lg:col-span-3"
        >
          <GraficoVentas datos={datos.ventas_por_mes} />
        </PanelSeccion>

        {/* --- Lo más pedido --- */}
        <PanelSeccion titulo="Lo más pedido" className="lg:col-span-2">
          {datos.mas_vendidos.length === 0 ? (
            <EstadoVacio
              titulo="Sin datos todavía"
              descripcion="Aquí aparecerá el ranking cuando haya pedidos confirmados."
            />
          ) : (
            <ol className="space-y-3">
              {datos.mas_vendidos.map((fila, indice) => {
                const tope = Number(datos.mas_vendidos[0].unidades) || 1;
                const proporcion = (Number(fila.unidades) / tope) * 100;

                return (
                  <li key={`${fila.tipo}-${fila.nombre}`}>
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-medium text-ink">
                        <span className="mr-1.5 tabular-nums text-ink-faint">{indice + 1}.</span>
                        {fila.nombre}
                      </p>
                      <span className="shrink-0 text-xs tabular-nums text-ink-mute">
                        {fila.unidades} und.
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-canvas">
                      <div
                        style={{ width: `${proporcion}%` }}
                        className="h-full rounded-full bg-brand-deep"
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </PanelSeccion>
      </div>

      {/* --- Últimos pedidos --- */}
      <PanelSeccion
        titulo="Últimos pedidos"
        acciones={
          onIrAPedidos && (
            <button onClick={onIrAPedidos} className="btn btn-sutil !px-3">
              Ver todos
            </button>
          )
        }
      >
        {datos.pedidos_recientes.length === 0 ? (
          <EstadoVacio
            titulo="Aún no hay pedidos"
            descripcion="Cuando un cliente confirme su carrito, aparecerá aquí."
          />
        ) : (
          <ul className="divide-y divide-line">
            {datos.pedidos_recientes.map((pedido) => (
              <li key={pedido.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    #{pedido.id} · {pedido.cliente}
                  </p>
                  <p className="text-xs text-ink-mute">{formatearFecha(pedido.fecha_creacion)}</p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-bold tabular-nums text-ink">
                    {formatearPrecio(pedido.total)}
                  </span>
                  <span className={`insignia ${CLASE_INSIGNIA_ESTADO[pedido.estado]}`}>
                    {pedido.estado}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PanelSeccion>
    </div>
  );
};
