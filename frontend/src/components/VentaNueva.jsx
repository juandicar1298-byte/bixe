import { useEffect, useMemo, useState } from 'react';
import { Modal } from './ui/Modal';
import { Select } from './Select';
import {
  obtenerProductos,
  obtenerServiciosApi,
  obtenerUsuarios,
  registrarVentaApi,
} from '../services/api';
import { formatearPrecio } from '../utils/formato';
import { IconoBasura, IconoMas } from './ui/Iconos';

const LINEA_VACIA = { tipo: 'servicio', id: '', cantidad: 1, descuento: 0 };

/**
 * Registro de una venta de mostrador: la que no viene de la web.
 *
 * Los precios que se ven aquí son solo para que quien atiende sepa cuánto va a
 * cobrar. El importe que queda registrado lo vuelve a calcular el servidor
 * leyendo el catálogo, igual que en los pedidos, para que nadie pueda fijar un
 * precio desde el navegador.
 */
export const VentaNueva = ({ abierto, onCerrar, onRegistrada }) => {
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [servicios, setServicios] = useState([]);

  const [clienteId, setClienteId] = useState('');
  const [lineas, setLineas] = useState([{ ...LINEA_VACIA }]);
  const [notas, setNotas] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!abierto) return;

    // Al abrirse el modal se limpia el error anterior y se piden los
    // catálogos. La regla avisa de renders en cascada; aquí es un solo
    // estado que se pone a cero cada vez que se abre.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError('');
    // Solo clientes: una venta se le hace a un cliente, no a un empleado.
    obtenerUsuarios({ rol_id: 3, estado: 'activo', limite: 100 })
      .then((datos) => setClientes(datos.usuarios ?? datos))
      .catch(() => setClientes([]));
    obtenerProductos().then(setProductos).catch(() => setProductos([]));
    obtenerServiciosApi().then(setServicios).catch(() => setServicios([]));
  }, [abierto]);

  const catalogoDe = (tipo) => (tipo === 'producto' ? productos : servicios);

  const articuloDe = (linea) =>
    catalogoDe(linea.tipo).find((a) => String(a.id) === String(linea.id));

  const total = useMemo(
    () =>
      lineas.reduce((suma, linea) => {
        const articulo = articuloDe(linea);
        if (!articulo) return suma;
        const bruto = Number(articulo.precio) * Number(linea.cantidad || 0);
        return suma + Math.max(bruto - Number(linea.descuento || 0), 0);
      }, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lineas, productos, servicios]
  );

  const cambiarLinea = (indice, campo, valor) =>
    setLineas((previas) =>
      previas.map((linea, i) =>
        i === indice
          ? { ...linea, [campo]: valor, ...(campo === 'tipo' ? { id: '' } : {}) }
          : linea
      )
    );

  const limpiar = () => {
    setClienteId('');
    setLineas([{ ...LINEA_VACIA }]);
    setNotas('');
    setError('');
  };

  const enviar = async (evento) => {
    evento.preventDefault();

    const utiles = lineas.filter((linea) => linea.id);
    if (!clienteId) return setError('Elige el cliente de la venta.');
    if (utiles.length === 0) return setError('Agrega al menos un artículo.');

    setEnviando(true);
    setError('');
    try {
      const venta = await registrarVentaApi({
        cliente_id: Number(clienteId),
        items: utiles.map((linea) => ({
          tipo: linea.tipo,
          id: Number(linea.id),
          cantidad: Number(linea.cantidad) || 1,
          descuento: Number(linea.descuento) || 0,
        })),
        notas: notas.trim() || undefined,
      });
      limpiar();
      onRegistrada(venta);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={() => {
        limpiar();
        onCerrar();
      }}
      titulo="Registrar venta de mostrador"
      descripcion="Para lo que se vende en el taller, fuera de la web."
      ancho="max-w-3xl"
    >
      <form onSubmit={enviar} noValidate className="space-y-5">
        <Select
          label="Cliente"
          value={clienteId}
          onChange={(evento) => setClienteId(evento.target.value)}
          placeholder="Elige un cliente"
          options={clientes.map((c) => ({
            value: String(c.id),
            label: `${c.nombre} ${c.apellido} · ${c.numero_documento}`,
          }))}
        />

        <div className="space-y-3">
          <p className="rotulo">Artículos</p>

          {lineas.map((linea, indice) => {
            const articulo = articuloDe(linea);
            const bruto = articulo
              ? Number(articulo.precio) * Number(linea.cantidad || 0)
              : 0;

            return (
              <div
                key={indice}
                className="grid gap-3 rounded-2xl border border-line bg-veil p-3 sm:grid-cols-[110px_1fr_80px_130px_auto]"
              >
                <Select
                  value={linea.tipo}
                  onChange={(e) => cambiarLinea(indice, 'tipo', e.target.value)}
                  placeholder={null}
                  options={[
                    { value: 'servicio', label: 'Servicio' },
                    { value: 'producto', label: 'Producto' },
                  ]}
                />

                <Select
                  value={linea.id}
                  onChange={(e) => cambiarLinea(indice, 'id', e.target.value)}
                  placeholder="Elige uno"
                  options={catalogoDe(linea.tipo).map((a) => ({
                    value: String(a.id),
                    label: `${a.nombre} — ${formatearPrecio(a.precio)}`,
                  }))}
                />

                <input
                  type="number"
                  min="1"
                  max="99"
                  className="campo"
                  aria-label="Cantidad"
                  value={linea.cantidad}
                  onChange={(e) => cambiarLinea(indice, 'cantidad', e.target.value)}
                />

                <input
                  type="number"
                  min="0"
                  max={bruto || undefined}
                  className="campo"
                  aria-label="Descuento"
                  placeholder="Descuento"
                  value={linea.descuento}
                  onChange={(e) => cambiarLinea(indice, 'descuento', e.target.value)}
                />

                <button
                  type="button"
                  onClick={() =>
                    setLineas((previas) =>
                      previas.length === 1
                        ? [{ ...LINEA_VACIA }]
                        : previas.filter((_, i) => i !== indice)
                    )
                  }
                  aria-label="Quitar artículo"
                  className="grid h-10 w-10 shrink-0 place-items-center self-center rounded-full text-ink-faint transition hover:bg-canvas hover:text-peligro"
                >
                  <IconoBasura className="h-4 w-4" />
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => setLineas((previas) => [...previas, { ...LINEA_VACIA }])}
            className="btn btn-sutil"
          >
            <IconoMas className="h-4 w-4" />
            Agregar otro artículo
          </button>
        </div>

        <label className="block">
          <span className="etiqueta">Notas (opcional)</span>
          <input
            className="campo"
            maxLength={255}
            placeholder="Pagó en efectivo en el taller…"
            value={notas}
            onChange={(evento) => setNotas(evento.target.value)}
          />
        </label>

        {error && <p className="text-xs text-peligro">{error}</p>}

        <div className="flex items-center justify-between gap-4 border-t border-line pt-5">
          <div>
            <p className="rotulo">Total estimado</p>
            <p className="titular text-3xl tabular-nums">{formatearPrecio(total)}</p>
            <p className="mt-1 text-[0.7rem] text-ink-mute">
              El importe definitivo lo calcula el servidor con los precios del catálogo.
            </p>
          </div>

          <button type="submit" disabled={enviando} className="btn btn-primario">
            {enviando ? 'Registrando…' : 'Registrar venta'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
