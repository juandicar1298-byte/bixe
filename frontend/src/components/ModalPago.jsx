import { useState } from 'react';
import { Modal } from './ui/Modal';
import { pagarPedidoApi, descargarFacturaApi } from '../services/api';
import { formatearPrecio } from '../utils/formato';
import {
  detectarMarca,
  formatearTarjeta,
  soloDigitos,
  validarCvv,
  validarTarjeta,
  validarVencimiento,
} from '../utils/validacion';

const FORMULARIO_VACIO = { numero: '', titular: '', mes: '', anio: '', cvv: '' };

// Las mismas que reconoce la pasarela del backend.
const TARJETAS_DE_PRUEBA = [
  { numero: '4242 4242 4242 4242', que: 'Aprueba el pago' },
  { numero: '4000 0000 0000 9995', que: 'Fondos insuficientes' },
  { numero: '4000 0000 0000 0002', que: 'La rechaza el banco' },
];

const ETIQUETA_MARCA = {
  visa: 'VISA',
  mastercard: 'Mastercard',
  amex: 'Amex',
  diners: 'Diners',
};

export const ModalPago = ({ abierto, pedido, onCerrar, onPagado }) => {
  const [datos, setDatos] = useState(FORMULARIO_VACIO);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [descargando, setDescargando] = useState(false);
  const [verPruebas, setVerPruebas] = useState(false);

  const marca = detectarMarca(datos.numero);

  const reiniciar = () => {
    setDatos(FORMULARIO_VACIO);
    setErrores({});
    setResultado(null);
  };

  const cerrar = () => {
    reiniciar();
    onCerrar();
  };

  const handleChange = (evento) => {
    const { name, value } = evento.target;

    let limpio = value;
    if (name === 'numero') limpio = formatearTarjeta(value);
    if (name === 'cvv') limpio = soloDigitos(value).slice(0, 4);
    if (name === 'mes') limpio = soloDigitos(value).slice(0, 2);
    if (name === 'anio') limpio = soloDigitos(value).slice(0, 4);
    if (name === 'titular') limpio = value.toUpperCase().slice(0, 60);

    setDatos((previo) => ({ ...previo, [name]: limpio }));
    setErrores((previo) => ({ ...previo, [name]: '' }));
  };

  const validarTodo = () => {
    const nuevos = {
      numero: validarTarjeta(datos.numero),
      titular: datos.titular.trim().length < 3 ? 'Escribe el nombre del titular.' : '',
      mes: validarVencimiento(datos.mes, datos.anio),
      cvv: validarCvv(datos.cvv, marca),
    };
    setErrores(nuevos);
    return Object.values(nuevos).every((mensaje) => !mensaje);
  };

  const handleSubmit = async (evento) => {
    evento.preventDefault();
    if (!validarTodo()) return;

    setEnviando(true);
    try {
      const respuesta = await pagarPedidoApi(pedido.id, {
        numero: soloDigitos(datos.numero),
        titular: datos.titular.trim(),
        mes: Number(datos.mes),
        anio: Number(datos.anio),
        cvv: datos.cvv,
      });

      setResultado(respuesta);
      if (respuesta.aprobado) onPagado?.(respuesta);
    } catch (error) {
      setResultado({ aprobado: false, mensaje: error.message, pago: null });
    } finally {
      setEnviando(false);
    }
  };

  const descargarFactura = async () => {
    setDescargando(true);
    try {
      const blob = await descargarFacturaApi(pedido.id);
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `${resultado.factura.numero}.pdf`;
      enlace.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setResultado((previo) => ({ ...previo, mensaje: error.message }));
    } finally {
      setDescargando(false);
    }
  };

  if (!pedido) return null;

  const aprobado = resultado?.aprobado;

  return (
    <Modal
      abierto={abierto}
      onCerrar={cerrar}
      titulo={aprobado ? 'Pago aprobado' : `Pagar el pedido #${pedido.id}`}
      descripcion={
        aprobado
          ? undefined
          : 'Pasarela de demostración: no se cobra dinero real.'
      }
      ancho="max-w-lg"
    >
      {aprobado ? (
        <div className="space-y-5 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-exito-wash text-exito">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.5 12.5l5 5 10-11" />
            </svg>
          </span>

          <div>
            <p className="titular text-3xl tabular-nums">
              {formatearPrecio(resultado.pago.monto)}
            </p>
            <p className="mt-1 text-sm text-ink-mute">
              {ETIQUETA_MARCA[resultado.pago.marca] ?? resultado.pago.marca} ····
              {resultado.pago.ultimos_cuatro} · Ref. {resultado.pago.referencia}
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-veil px-5 py-4 text-left">
            <p className="rotulo mb-2">Factura {resultado.factura.numero}</p>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-mute">Base gravable</dt>
                <dd className="tabular-nums text-ink-soft">
                  {formatearPrecio(resultado.factura.base_gravable)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-mute">
                  IVA ({Math.round(resultado.factura.porcentaje_iva)}%)
                </dt>
                <dd className="tabular-nums text-ink-soft">
                  {formatearPrecio(resultado.factura.valor_iva)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2">
                <dt className="font-semibold text-ink">Total</dt>
                <dd className="font-bold tabular-nums text-ink">
                  {formatearPrecio(resultado.factura.total)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-col gap-2">
            <button onClick={descargarFactura} disabled={descargando} className="btn btn-primario w-full">
              {descargando ? 'Generando…' : 'Descargar factura en PDF'}
            </button>
            <button onClick={cerrar} className="btn btn-contorno w-full">
              Cerrar
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-end justify-between rounded-2xl bg-canvas px-5 py-4">
            <span className="rotulo">Total a pagar</span>
            <span className="titular text-3xl tabular-nums">
              {formatearPrecio(pedido.total)}
            </span>
          </div>

          {resultado && !resultado.aprobado && (
            <div className="rounded-2xl border border-peligro/30 bg-peligro-wash px-4 py-3">
              <p className="text-sm font-semibold text-peligro">Pago rechazado</p>
              <p className="mt-0.5 text-xs text-ink-soft">{resultado.mensaje}</p>
            </div>
          )}

          <div>
            <label className="etiqueta">Número de tarjeta</label>
            <div className="relative">
              <input
                className={`campo !pr-24 ${errores.numero ? '!border-peligro' : ''}`}
                name="numero"
                value={datos.numero}
                onChange={handleChange}
                placeholder="4242 4242 4242 4242"
                inputMode="numeric"
                autoComplete="off"
              />
              {marca && (
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md bg-canvas px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-ink-soft">
                  {ETIQUETA_MARCA[marca]}
                </span>
              )}
            </div>
            {errores.numero && <p className="mt-1.5 text-xs text-peligro">{errores.numero}</p>}
          </div>

          <div>
            <label className="etiqueta">Titular</label>
            <input
              className={`campo ${errores.titular ? '!border-peligro' : ''}`}
              name="titular"
              value={datos.titular}
              onChange={handleChange}
              placeholder="COMO APARECE EN LA TARJETA"
              autoComplete="off"
            />
            {errores.titular && <p className="mt-1.5 text-xs text-peligro">{errores.titular}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="etiqueta">Mes</label>
              <input
                className={`campo ${errores.mes ? '!border-peligro' : ''}`}
                name="mes"
                value={datos.mes}
                onChange={handleChange}
                placeholder="12"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="etiqueta">Año</label>
              <input
                className={`campo ${errores.mes ? '!border-peligro' : ''}`}
                name="anio"
                value={datos.anio}
                onChange={handleChange}
                placeholder="2030"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="etiqueta">CVV</label>
              <input
                className={`campo ${errores.cvv ? '!border-peligro' : ''}`}
                name="cvv"
                value={datos.cvv}
                onChange={handleChange}
                placeholder="123"
                inputMode="numeric"
                autoComplete="off"
              />
            </div>
          </div>

          {(errores.mes || errores.cvv) && (
            <p className="text-xs text-peligro">{errores.mes || errores.cvv}</p>
          )}

          {/* --- Tarjetas de prueba --- */}
          <div className="rounded-2xl border border-line bg-veil px-4 py-3">
            <button
              type="button"
              onClick={() => setVerPruebas((previo) => !previo)}
              className="accion w-full text-left text-ink-mute hover:text-brand-deep"
            >
              {verPruebas ? '− Ocultar' : '+ Ver'} tarjetas de prueba
            </button>

            {verPruebas && (
              <ul className="mt-3 space-y-2">
                {TARJETAS_DE_PRUEBA.map((tarjeta) => (
                  <li key={tarjeta.numero} className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setDatos((previo) => ({
                          ...previo,
                          numero: tarjeta.numero,
                          titular: previo.titular || 'CLIENTE DE PRUEBA',
                          mes: previo.mes || '12',
                          anio: previo.anio || '2030',
                          cvv: previo.cvv || '123',
                        }))
                      }
                      className="font-mono text-xs text-brand-deep hover:underline"
                    >
                      {tarjeta.numero}
                    </button>
                    <span className="text-[0.7rem] text-ink-mute">{tarjeta.que}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-[0.7rem] leading-relaxed text-ink-mute">
            Del número de tarjeta solo se guardan la marca y los cuatro últimos
            dígitos. El código de seguridad no se almacena en ningún momento.
          </p>

          <div className="flex gap-3 border-t border-line pt-5">
            <button type="button" onClick={cerrar} className="btn btn-contorno flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={enviando} className="btn btn-primario flex-1">
              {enviando ? 'Procesando…' : `Pagar ${formatearPrecio(pedido.total)}`}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
