import { useCallback, useEffect, useState } from 'react';
import { PanelSeccion, EstadoVacio, ContenedorTabla } from './dashboard/PanelSeccion';
import { Select } from './Select';
import { Modal } from './ui/Modal';
import { Toast } from './Toast';
import { VentaNueva } from './VentaNueva';
import {
  anularVentaApi,
  descargarReporteExcelApi,
  descargarReportePdfApi,
  obtenerProductos,
  obtenerReporteDiarioApi,
  obtenerServiciosApi,
  obtenerVentaApi,
  obtenerVentasApi,
} from '../services/api';
import { formatearFechaHora, formatearPrecio } from '../utils/formato';
import { IconoBuscar, IconoDescargar, IconoMas } from './ui/Iconos';

const HOY = () => new Date().toISOString().slice(0, 10);

const FILTROS_INICIALES = {
  texto: '',
  desde: '',
  hasta: '',
  estado: '',
  canal: '',
  producto_id: '',
  servicio_id: '',
  monto_minimo: '',
  monto_maximo: '',
};

const INSIGNIA_ESTADO = {
  completada: 'insignia-exito',
  anulada: 'insignia-peligro',
};

/** Fuerza la descarga de un blob con el nombre indicado. */
const descargar = (blob, nombre) => {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
};

export const GestionVentas = ({ permitirAnular = false, onCambio }) => {
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [ventas, setVentas] = useState([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [productos, setProductos] = useState([]);
  const [servicios, setServicios] = useState([]);

  const [detalle, setDetalle] = useState(null);
  const [registrando, setRegistrando] = useState(false);

  const [fechaReporte, setFechaReporte] = useState(HOY);
  const [reporte, setReporte] = useState(null);
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [descargandoExcel, setDescargandoExcel] = useState(false);

  const [toast, setToast] = useState(null);

  useEffect(() => {
    obtenerProductos().then(setProductos).catch(() => setProductos([]));
    obtenerServiciosApi().then(setServicios).catch(() => setServicios([]));
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const pagina = await obtenerVentasApi({ ...filtros, limite: 50 });
      setVentas(pagina.ventas);
      setTotal(pagina.total);
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

  const cargarReporte = useCallback(async () => {
    try {
      setReporte(await obtenerReporteDiarioApi(fechaReporte));
    } catch (err) {
      setError(err.message);
    }
  }, [fechaReporte]);

  useEffect(() => {
    // Cargar al montar (y al cambiar los filtros) es justo para lo que sirve
    // un efecto. La regla avisa de renders en cascada; aquí el único estado
    // que cambia de forma síncrona es el indicador de «cargando», una vez
    // por carga.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarReporte();
  }, [cargarReporte]);

  const cambiar = (campo) => (evento) =>
    setFiltros((previos) => ({ ...previos, [campo]: evento.target.value }));

  const bajarReporte = async (formato) => {
    const marcar = formato === 'pdf' ? setDescargandoPdf : setDescargandoExcel;
    marcar(true);
    try {
      const bajar =
        formato === 'pdf' ? descargarReportePdfApi : descargarReporteExcelApi;
      descargar(await bajar(fechaReporte), `ventas-${fechaReporte}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`);
    } catch (err) {
      setToast({ mensaje: err.message, tipo: 'error' });
    } finally {
      marcar(false);
    }
  };

  const verDetalle = async (id) => {
    try {
      setDetalle(await obtenerVentaApi(id));
    } catch (err) {
      setToast({ mensaje: err.message, tipo: 'error' });
    }
  };

  const anular = async (venta) => {
    if (!window.confirm(`¿Anular la venta ${venta.numero}? Dejará de sumar en los reportes.`)) {
      return;
    }
    try {
      await anularVentaApi(venta.id);
      setToast({ mensaje: `Venta ${venta.numero} anulada.`, tipo: 'exito' });
      setDetalle(null);
      cargar();
      cargarReporte();
      onCambio?.();
    } catch (err) {
      setToast({ mensaje: err.message, tipo: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      {/* --------------------------- Reporte diario --------------------------- */}
      <PanelSeccion
        titulo="Reporte diario"
        descripcion="Las ventas de una fecha, listas para descargar."
        acciones={
          <>
            <input
              type="date"
              className="campo !w-auto !py-2"
              value={fechaReporte}
              max={HOY()}
              onChange={(evento) => setFechaReporte(evento.target.value)}
            />
            <button
              onClick={() => bajarReporte('pdf')}
              disabled={descargandoPdf}
              className="btn btn-contorno"
            >
              <IconoDescargar className="h-4 w-4" />
              {descargandoPdf ? 'Generando…' : 'PDF'}
            </button>
            <button
              onClick={() => bajarReporte('excel')}
              disabled={descargandoExcel}
              className="btn btn-contorno"
            >
              <IconoDescargar className="h-4 w-4" />
              {descargandoExcel ? 'Generando…' : 'Excel'}
            </button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Ventas del día', reporte?.total_ventas ?? 0],
            ['Unidades', reporte?.unidades ?? 0],
            ['IVA', formatearPrecio(reporte?.impuesto ?? 0)],
            ['Total', formatearPrecio(reporte?.total ?? 0)],
          ].map(([etiqueta, valor], indice) => (
            <div
              key={etiqueta}
              className={`rounded-2xl border px-4 py-3 ${
                indice === 3
                  ? 'border-brand-borde bg-brand-wash'
                  : 'border-line bg-veil'
              }`}
            >
              <p className="rotulo">{etiqueta}</p>
              <p
                className={`titular mt-1 text-2xl tabular-nums ${
                  indice === 3 ? 'text-brand-ink' : ''
                }`}
              >
                {valor}
              </p>
            </div>
          ))}
        </div>

        {reporte?.lineas?.length === 0 && (
          <p className="mt-4 text-sm text-ink-mute">
            No se registraron ventas en esa fecha. El reporte se descarga igual,
            indicándolo.
          </p>
        )}
      </PanelSeccion>

      {/* ------------------------------ Historial ------------------------------ */}
      <PanelSeccion
        titulo="Historial de ventas"
        descripcion={`${total} venta(s) con los filtros actuales.`}
        acciones={
          <button onClick={() => setRegistrando(true)} className="btn btn-primario">
            <IconoMas className="h-4 w-4" />
            Nueva venta
          </button>
        }
      >
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="relative sm:col-span-2">
            <span className="etiqueta">Buscar</span>
            <IconoBuscar className="pointer-events-none absolute left-3.5 top-[2.15rem] h-4 w-4 text-ink-faint" />
            <input
              className="campo !pl-10"
              placeholder="N.º de venta, cliente, documento o correo…"
              value={filtros.texto}
              onChange={cambiar('texto')}
            />
          </div>

          <label className="block">
            <span className="etiqueta">Desde</span>
            <input type="date" className="campo" value={filtros.desde} onChange={cambiar('desde')} />
          </label>

          <label className="block">
            <span className="etiqueta">Hasta</span>
            <input type="date" className="campo" value={filtros.hasta} onChange={cambiar('hasta')} />
          </label>

          <Select
            label="Estado"
            value={filtros.estado}
            onChange={cambiar('estado')}
            placeholder="Todos"
            options={[
              { value: 'completada', label: 'Completada' },
              { value: 'anulada', label: 'Anulada' },
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

          <label className="block">
            <span className="etiqueta">Valor desde</span>
            <input
              type="number"
              min="0"
              className="campo"
              placeholder="0"
              value={filtros.monto_minimo}
              onChange={cambiar('monto_minimo')}
            />
          </label>

          <label className="block">
            <span className="etiqueta">Valor hasta</span>
            <input
              type="number"
              min="0"
              className="campo"
              placeholder="Sin tope"
              value={filtros.monto_maximo}
              onChange={cambiar('monto_maximo')}
            />
          </label>

          <div className="flex items-end">
            <button
              onClick={() => setFiltros(FILTROS_INICIALES)}
              className="btn btn-sutil w-full"
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        {error && <p className="mb-3 text-xs text-peligro">{error}</p>}

        {cargando ? (
          <p className="py-8 text-center text-ink-mute">Cargando ventas…</p>
        ) : ventas.length === 0 ? (
          <EstadoVacio
            titulo="Sin ventas"
            descripcion="No hay ventas que cumplan esos criterios."
          />
        ) : (
          <ContenedorTabla>
            <thead>
              <tr className="border-b border-line">
                <th className="th">Venta</th>
                <th className="th">Cliente</th>
                <th className="th">Canal</th>
                <th className="th text-right">Total</th>
                <th className="th">Estado</th>
                <th className="th">Fecha</th>
                <th className="th text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((venta) => (
                <tr key={venta.id} className="border-b border-line last:border-0">
                  <td className="td font-semibold text-ink">{venta.numero}</td>
                  <td className="td">
                    {venta.cliente.nombre} {venta.cliente.apellido}
                  </td>
                  <td className="td">
                    <span className="insignia insignia-neutra capitalize">{venta.canal}</span>
                  </td>
                  <td className="td text-right tabular-nums">
                    {formatearPrecio(venta.total)}
                  </td>
                  <td className="td">
                    <span className={`insignia ${INSIGNIA_ESTADO[venta.estado]} capitalize`}>
                      {venta.estado}
                    </span>
                  </td>
                  <td className="td whitespace-nowrap text-xs">
                    {formatearFechaHora(venta.fecha)}
                  </td>
                  <td className="td text-right">
                    <button
                      onClick={() => verDetalle(venta.id)}
                      className="accion text-brand-deep hover:underline"
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </ContenedorTabla>
        )}
      </PanelSeccion>

      {/* ------------------------------- Detalle ------------------------------- */}
      <Modal
        abierto={Boolean(detalle)}
        onCerrar={() => setDetalle(null)}
        titulo={detalle ? `Venta ${detalle.numero}` : ''}
        descripcion={detalle ? formatearFechaHora(detalle.fecha) : ''}
        ancho="max-w-2xl"
      >
        {detalle && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Dato etiqueta="Cliente" valor={`${detalle.cliente.nombre} ${detalle.cliente.apellido}`} />
              <Dato etiqueta="Correo" valor={detalle.cliente.email} />
              <Dato
                etiqueta="Registrada por"
                valor={
                  detalle.vendedor
                    ? `${detalle.vendedor.nombre} ${detalle.vendedor.apellido}`
                    : 'El propio cliente (web)'
                }
              />
              <Dato etiqueta="Factura" valor={detalle.factura_numero ?? 'Sin factura'} />
            </div>

            <ContenedorTabla>
              <thead>
                <tr className="border-b border-line">
                  <th className="th">Artículo</th>
                  <th className="th text-right">Cant.</th>
                  <th className="th text-right">Precio</th>
                  <th className="th text-right">Descuento</th>
                  <th className="th text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detalle.detalle.map((linea) => (
                  <tr key={linea.id} className="border-b border-line last:border-0">
                    <td className="td">
                      <span className="insignia insignia-neutra mr-2 capitalize">{linea.tipo}</span>
                      {linea.nombre}
                    </td>
                    <td className="td text-right tabular-nums">{linea.cantidad}</td>
                    <td className="td text-right tabular-nums">
                      {formatearPrecio(linea.precio_unitario)}
                    </td>
                    <td className="td text-right tabular-nums">
                      {linea.descuento ? `− ${formatearPrecio(linea.descuento)}` : '—'}
                    </td>
                    <td className="td text-right font-semibold tabular-nums text-ink">
                      {formatearPrecio(linea.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </ContenedorTabla>

            <div className="space-y-1.5 border-t border-line pt-4 text-sm">
              <Linea etiqueta="Base gravable" valor={formatearPrecio(detalle.subtotal)} />
              <Linea etiqueta="IVA (19%)" valor={formatearPrecio(detalle.impuesto)} />
              {detalle.descuento > 0 && (
                <Linea etiqueta="Descuentos" valor={`− ${formatearPrecio(detalle.descuento)}`} />
              )}
              <div className="flex items-baseline justify-between border-t border-line pt-2">
                <span className="rotulo">Total</span>
                <span className="titular text-2xl tabular-nums">
                  {formatearPrecio(detalle.total)}
                </span>
              </div>
            </div>

            {detalle.notas && (
              <p className="rounded-xl bg-veil px-4 py-3 text-sm text-ink-soft">
                {detalle.notas}
              </p>
            )}

            {permitirAnular && detalle.estado === 'completada' && (
              <button onClick={() => anular(detalle)} className="btn btn-contorno w-full">
                Anular esta venta
              </button>
            )}
          </div>
        )}
      </Modal>

      {/* ----------------------------- Nueva venta ----------------------------- */}
      <VentaNueva
        abierto={registrando}
        onCerrar={() => setRegistrando(false)}
        onRegistrada={(venta) => {
          setRegistrando(false);
          setToast({ mensaje: `Venta ${venta.numero} registrada.`, tipo: 'exito' });
          cargar();
          cargarReporte();
          onCambio?.();
        }}
      />

      <Toast
        visible={Boolean(toast)}
        mensaje={toast?.mensaje ?? ''}
        tipo={toast?.tipo ?? 'exito'}
        onCerrar={() => setToast(null)}
      />
    </div>
  );
};

const Dato = ({ etiqueta, valor }) => (
  <div>
    <p className="rotulo">{etiqueta}</p>
    <p className="mt-0.5 break-all text-sm font-semibold text-ink">{valor}</p>
  </div>
);

const Linea = ({ etiqueta, valor }) => (
  <div className="flex items-baseline justify-between">
    <span className="text-ink-mute">{etiqueta}</span>
    <span className="tabular-nums text-ink">{valor}</span>
  </div>
);
