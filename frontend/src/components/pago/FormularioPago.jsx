import { useState } from 'react';
import { IconoCarrito, IconoEscudo, IconoPerfil } from '../ui/Iconos';
import { formatearPrecio } from '../../utils/formato';
import {
  detectarMarca,
  formatearTarjeta,
  soloDigitos,
  validarCvv,
  validarTarjeta,
  validarVencimiento,
} from '../../utils/validacion';

const ETIQUETA_MARCA = {
  visa: 'VISA',
  mastercard: 'Mastercard',
  amex: 'Amex',
  diners: 'Diners',
};

const ICONO_METODO = {
  tarjeta: IconoCarrito,
  pse: IconoEscudo,
  nequi: IconoPerfil,
};

// Datos que la pasarela reconoce, para poder demostrar cada camino.
const PRUEBAS = {
  tarjeta: [
    { valor: '4242 4242 4242 4242', que: 'Aprueba' },
    { valor: '4000 0000 0000 9995', que: 'Fondos insuficientes' },
    { valor: '4000 0000 0000 0002', que: 'La rechaza el banco' },
  ],
  pse: [
    { valor: '1036425871', que: 'Aprueba' },
    { valor: '10000000', que: 'El banco rechaza el débito' },
  ],
  nequi: [
    { valor: '3012345678', que: 'Aprueba' },
    { valor: '3000000000', que: 'Sin saldo' },
  ],
};

const VACIO = {
  tarjeta: { numero: '', titular: '', mes: '', anio: '', cvv: '' },
  pse: { banco: '', tipo_persona: 'natural', tipo_documento: 'CC', numero_documento: '' },
  nequi: { celular: '' },
};

export const FormularioPago = ({ metodos, total, enviando, rechazo, onPagar }) => {
  const [metodo, setMetodo] = useState('tarjeta');
  const [datos, setDatos] = useState(VACIO);
  const [errores, setErrores] = useState({});

  const actual = datos[metodo];
  const marca = detectarMarca(datos.tarjeta.numero);
  const bancos = metodos.find((m) => m.codigo === 'pse')?.bancos ?? [];

  const cambiarMetodo = (codigo) => {
    setMetodo(codigo);
    setErrores({});
  };

  const handleChange = (evento) => {
    const { name, value } = evento.target;

    let limpio = value;
    if (name === 'numero') limpio = formatearTarjeta(value);
    if (name === 'cvv') limpio = soloDigitos(value).slice(0, 4);
    if (name === 'mes') limpio = soloDigitos(value).slice(0, 2);
    if (name === 'anio') limpio = soloDigitos(value).slice(0, 4);
    if (name === 'titular') limpio = value.toUpperCase().slice(0, 60);
    if (name === 'numero_documento') limpio = soloDigitos(value).slice(0, 15);
    if (name === 'celular') limpio = soloDigitos(value).slice(0, 10);

    setDatos((previo) => ({ ...previo, [metodo]: { ...previo[metodo], [name]: limpio } }));
    setErrores((previo) => ({ ...previo, [name]: '' }));
  };

  const rellenarPrueba = (valor) => {
    if (metodo === 'tarjeta') {
      setDatos((previo) => ({
        ...previo,
        tarjeta: {
          numero: valor,
          titular: previo.tarjeta.titular || 'CLIENTE DE PRUEBA',
          mes: previo.tarjeta.mes || '12',
          anio: previo.tarjeta.anio || '2030',
          cvv: previo.tarjeta.cvv || '123',
        },
      }));
    } else if (metodo === 'pse') {
      setDatos((previo) => ({
        ...previo,
        pse: {
          ...previo.pse,
          banco: previo.pse.banco || bancos[0]?.codigo || '',
          numero_documento: valor,
        },
      }));
    } else {
      setDatos((previo) => ({ ...previo, nequi: { celular: valor } }));
    }
    setErrores({});
  };

  // Cada método valida lo suyo. Las mismas reglas que aplica la pasarela.
  const revisarCampos = () => {
    if (metodo === 'tarjeta') {
      return {
        numero: validarTarjeta(actual.numero),
        titular: actual.titular.trim().length < 3 ? 'Escribe el nombre del titular.' : '',
        mes: validarVencimiento(actual.mes, actual.anio),
        cvv: validarCvv(actual.cvv, marca),
      };
    }

    if (metodo === 'pse') {
      return {
        banco: actual.banco ? '' : 'Elige tu banco.',
        numero_documento:
          actual.numero_documento.length < 6
            ? 'El documento debe tener al menos 6 dígitos.'
            : '',
      };
    }

    return {
      celular:
        actual.celular.length !== 10 || !actual.celular.startsWith('3')
          ? 'El celular debe tener 10 dígitos y empezar por 3.'
          : '',
    };
  };

  const validar = () => {
    const nuevos = revisarCampos();
    setErrores(nuevos);
    return Object.values(nuevos).every((mensaje) => !mensaje);
  };

  const handleSubmit = (evento) => {
    evento.preventDefault();
    if (!validar()) return;

    const cuerpo =
      metodo === 'tarjeta'
        ? { ...actual, numero: soloDigitos(actual.numero), mes: Number(actual.mes), anio: Number(actual.anio) }
        : actual;

    onPagar({ metodo, ...cuerpo });
  };

  return (
    <form onSubmit={handleSubmit} className="tarjeta overflow-hidden">
      <header className="border-b border-line px-5 py-4">
        <h2 className="titular text-lg">¿Cómo quieres pagar?</h2>
      </header>

      {/* ------------------- Selector de método ------------------- */}
      <div className="grid grid-cols-3 gap-2 border-b border-line p-4">
        {metodos.map((m) => {
          const Icono = ICONO_METODO[m.codigo] ?? IconoCarrito;
          const activo = metodo === m.codigo;

          return (
            <button
              key={m.codigo}
              type="button"
              onClick={() => cambiarMetodo(m.codigo)}
              aria-pressed={activo}
              className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-3 py-4 text-center transition ${
                activo
                  ? 'border-brand bg-brand-wash'
                  : 'border-line bg-surface hover:border-ink-faint'
              }`}
            >
              <Icono className={`h-5 w-5 ${activo ? 'text-brand-deep' : 'text-ink-mute'}`} />
              <span
                className={`text-[0.7rem] font-bold uppercase leading-tight tracking-wide ${
                  activo ? 'text-brand-deep' : 'text-ink-soft'
                }`}
              >
                {m.codigo === 'tarjeta' ? 'Tarjeta' : m.codigo === 'pse' ? 'PSE' : 'Nequi'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-4 p-5">
        {rechazo && (
          <div className="rounded-2xl border border-peligro/30 bg-peligro-wash px-4 py-3">
            <p className="text-sm font-semibold text-peligro">No se pudo procesar el pago</p>
            <p className="mt-0.5 text-xs text-ink-soft">{rechazo}</p>
          </div>
        )}

        {/* ------------------------- Tarjeta ------------------------- */}
        {metodo === 'tarjeta' && (
          <>
            <div>
              <label className="etiqueta">Número de tarjeta</label>
              <div className="relative">
                <input
                  className={`campo !pr-24 ${errores.numero ? '!border-peligro' : ''}`}
                  name="numero"
                  value={actual.numero}
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
                value={actual.titular}
                onChange={handleChange}
                placeholder="COMO APARECE EN LA TARJETA"
                autoComplete="off"
              />
              {errores.titular && <p className="mt-1.5 text-xs text-peligro">{errores.titular}</p>}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="etiqueta">Mes</label>
                <input className={`campo ${errores.mes ? '!border-peligro' : ''}`} name="mes" value={actual.mes} onChange={handleChange} placeholder="12" inputMode="numeric" />
              </div>
              <div>
                <label className="etiqueta">Año</label>
                <input className={`campo ${errores.mes ? '!border-peligro' : ''}`} name="anio" value={actual.anio} onChange={handleChange} placeholder="2030" inputMode="numeric" />
              </div>
              <div>
                <label className="etiqueta">CVV</label>
                <input className={`campo ${errores.cvv ? '!border-peligro' : ''}`} name="cvv" value={actual.cvv} onChange={handleChange} placeholder="123" inputMode="numeric" autoComplete="off" />
              </div>
            </div>

            {(errores.mes || errores.cvv) && (
              <p className="text-xs text-peligro">{errores.mes || errores.cvv}</p>
            )}
          </>
        )}

        {/* --------------------------- PSE --------------------------- */}
        {metodo === 'pse' && (
          <>
            <div>
              <label className="etiqueta">Banco</label>
              <select
                className={`campo ${errores.banco ? '!border-peligro' : ''}`}
                name="banco"
                value={actual.banco}
                onChange={handleChange}
              >
                <option value="">Elige tu banco</option>
                {bancos.map((banco) => (
                  <option key={banco.codigo} value={banco.codigo}>
                    {banco.nombre}
                  </option>
                ))}
              </select>
              {errores.banco && <p className="mt-1.5 text-xs text-peligro">{errores.banco}</p>}
            </div>

            <div>
              <label className="etiqueta">Tipo de persona</label>
              <select className="campo" name="tipo_persona" value={actual.tipo_persona} onChange={handleChange}>
                <option value="natural">Persona natural</option>
                <option value="juridica">Persona jurídica</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="etiqueta">Tipo</label>
                <select className="campo" name="tipo_documento" value={actual.tipo_documento} onChange={handleChange}>
                  <option value="CC">CC</option>
                  <option value="CE">CE</option>
                  <option value="NIT">NIT</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="etiqueta">Número de documento</label>
                <input
                  className={`campo ${errores.numero_documento ? '!border-peligro' : ''}`}
                  name="numero_documento"
                  value={actual.numero_documento}
                  onChange={handleChange}
                  placeholder="1036425871"
                  inputMode="numeric"
                />
              </div>
            </div>
            {errores.numero_documento && (
              <p className="text-xs text-peligro">{errores.numero_documento}</p>
            )}
          </>
        )}

        {/* -------------------------- Nequi -------------------------- */}
        {metodo === 'nequi' && (
          <div>
            <label className="etiqueta">Celular Nequi</label>
            <input
              className={`campo ${errores.celular ? '!border-peligro' : ''}`}
              name="celular"
              value={actual.celular}
              onChange={handleChange}
              placeholder="3001234567"
              inputMode="numeric"
            />
            {errores.celular ? (
              <p className="mt-1.5 text-xs text-peligro">{errores.celular}</p>
            ) : (
              <p className="mt-1.5 text-xs text-ink-mute">
                Te llegaría una notificación a la app para aprobar el pago.
              </p>
            )}
          </div>
        )}

        {/* --------------------- Datos de prueba --------------------- */}
        <div className="rounded-2xl border border-line bg-veil px-4 py-3">
          <p className="rotulo mb-2">Datos de prueba</p>
          <ul className="space-y-1.5">
            {PRUEBAS[metodo].map((prueba) => (
              <li key={prueba.valor} className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => rellenarPrueba(prueba.valor)}
                  className="font-mono text-xs text-brand-deep hover:underline"
                >
                  {prueba.valor}
                </button>
                <span className="text-[0.7rem] text-ink-mute">{prueba.que}</span>
              </li>
            ))}
          </ul>
        </div>

        <button type="submit" disabled={enviando} className="btn btn-primario w-full !py-4">
          {enviando ? 'Procesando el pago…' : `Pagar ${formatearPrecio(total)}`}
        </button>
      </div>
    </form>
  );
};
