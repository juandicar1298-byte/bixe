import { useState, useEffect } from 'react';
import { Input } from './Input';
import { Button } from './Button';
import { CampoCodigo } from './ui/CampoCodigo';
import { solicitarRecuperacionApi, verificarCodigoApi, restablecerContrasenaApi } from '../services/api';
import { REGLA_CONTRASENA, validarContrasena } from '../utils/validacion';

/**
 * Recuperar la contraseña, en tres pasos dentro de la misma pantalla:
 * el correo, el código de seis dígitos que llega a la bandeja y la contraseña
 * nueva. No se cambia de página en ningún momento, así que no se pierde lo ya
 * escrito si algo sale mal.
 */

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// El backend no emite un código nuevo si el anterior tiene menos de un minuto.
// La cuenta atrás del botón refleja esa misma espera.
const SEGUNDOS_PARA_REENVIAR = 60;

const PASOS = ['Correo', 'Código', 'Contraseña'];

export const RecoverPassword = ({ onVolverALogin }) => {
  const [paso, setPaso] = useState(0);

  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  // Cambiar esta cuenta remonta el campo del código y lo deja en blanco.
  const [intentoCodigo, setIntentoCodigo] = useState(0);
  const [token, setToken] = useState('');
  const [claves, setClaves] = useState({ contrasena_nueva: '', confirmar_contrasena: '' });

  const [errores, setErrores] = useState({});
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  const [espera, setEspera] = useState(0);
  const [pistaDesarrollo, setPistaDesarrollo] = useState(null);

  // Cuenta atrás del botón de reenviar.
  useEffect(() => {
    if (espera <= 0) return undefined;
    const reloj = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(reloj);
  }, [espera]);

  // --------------------------- Paso 1: correo ---------------------------

  const pedirCodigo = async (evento) => {
    evento?.preventDefault();

    if (!email.trim()) return setErrores({ email: 'El correo es obligatorio.' });
    if (!REGEX_EMAIL.test(email)) return setErrores({ email: 'Formato de correo inválido.' });

    setErrores({});
    setError('');
    setEnviando(true);
    try {
      const respuesta = await solicitarRecuperacionApi(email);
      // Solo llega con valor en desarrollo, cuando el servidor de correo
      // todavía no está configurado.
      setPistaDesarrollo(respuesta.codigo_recuperacion ?? null);
      setEspera(SEGUNDOS_PARA_REENVIAR);
      setPaso(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  // --------------------------- Paso 2: código ---------------------------

  const comprobarCodigo = async (valor = codigo) => {
    if (valor.length !== 6) {
      return setErrores({ codigo: 'Escribe los seis dígitos.' });
    }

    setErrores({});
    setError('');
    setEnviando(true);
    try {
      const { token: recibido } = await verificarCodigoApi(email, valor);
      setToken(recibido);
      setPaso(2);
    } catch (err) {
      setErrores({ codigo: err.message });
      setCodigo('');
      setIntentoCodigo((n) => n + 1);
    } finally {
      setEnviando(false);
    }
  };

  // ------------------------ Paso 3: contraseña ------------------------

  const validarCampo = (nombre, valor) => {
    if (nombre === 'contrasena_nueva') return validarContrasena(valor);
    if (nombre === 'confirmar_contrasena' && valor !== claves.contrasena_nueva) {
      return 'Las contraseñas no coinciden.';
    }
    return '';
  };

  const cambiarClave = (evento) => {
    const { name, value } = evento.target;
    setClaves((previo) => ({ ...previo, [name]: value }));
    setErrores((previo) => ({ ...previo, [name]: validarCampo(name, value) }));
  };

  const guardarContrasena = async (evento) => {
    evento.preventDefault();

    const nuevos = {
      contrasena_nueva: validarContrasena(claves.contrasena_nueva),
      confirmar_contrasena:
        claves.confirmar_contrasena !== claves.contrasena_nueva
          ? 'Las contraseñas no coinciden.'
          : '',
    };
    setErrores(nuevos);
    if (Object.values(nuevos).some(Boolean)) return;

    setError('');
    setEnviando(true);
    try {
      await restablecerContrasenaApi({ token, ...claves });
      setListo(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  // ------------------------------ Pantalla ------------------------------

  if (listo) {
    return (
      <div className="mx-auto w-full max-w-sm text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-exito-wash">
          <svg className="h-7 w-7 text-exito" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="titular mt-5 text-3xl">Contraseña cambiada</h2>
        <p className="mt-2 text-sm text-ink-mute">
          Ya puedes entrar con tu contraseña nueva.
        </p>
        <div className="mt-7">
          <Button onClick={onVolverALogin}>Ir al inicio de sesión</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <p className="rotulo">Recuperar</p>
      <h2 className="titular mt-2 text-4xl">Tu contraseña</h2>

      {/* Indicador de los tres pasos */}
      <div className="mt-5 flex items-center gap-2">
        {PASOS.map((nombre, indice) => (
          <div key={nombre} className="flex flex-1 flex-col gap-1.5">
            <span
              className={`h-1 rounded-full transition-colors duration-300 ${
                indice <= paso ? 'bg-brand' : 'bg-line'
              }`}
            />
            <span
              className={`text-[0.62rem] font-bold uppercase tracking-[0.12em] transition-colors ${
                indice <= paso ? 'text-brand-deep' : 'text-ink-faint'
              }`}
            >
              {nombre}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-7">
        {/* --------------------------- Paso 1 --------------------------- */}
        {paso === 0 && (
          <form onSubmit={pedirCodigo} noValidate className="space-y-4">
            <p className="text-sm text-ink-mute">
              Escribe tu correo y te enviamos un código de seis dígitos.
            </p>

            <Input
              label="Correo electrónico"
              type="email"
              name="email"
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              error={errores.email}
              placeholder="tucorreo@ejemplo.com"
              autoComplete="email"
            />

            {error && <p className="text-xs text-peligro">{error}</p>}

            <Button type="submit" disabled={enviando}>
              {enviando ? 'Enviando…' : 'Enviar código'}
            </Button>
          </form>
        )}

        {/* --------------------------- Paso 2 --------------------------- */}
        {paso === 1 && (
          <form
            onSubmit={(evento) => {
              evento.preventDefault();
              comprobarCodigo();
            }}
            noValidate
            className="space-y-5"
          >
            <p className="text-sm text-ink-mute">
              Enviamos un código a <span className="font-semibold text-ink">{email}</span>.
              Caduca en 30 minutos.
            </p>

            <CampoCodigo
              key={intentoCodigo}
              onChange={setCodigo}
              onCompleto={comprobarCodigo}
              error={errores.codigo}
              deshabilitado={enviando}
            />

            {/* Solo en desarrollo sin servidor de correo configurado. */}
            {pistaDesarrollo && (
              <div className="rounded-xl border border-line bg-veil px-4 py-3">
                <p className="rotulo mb-1">Modo desarrollo</p>
                <p className="text-xs text-ink-mute">
                  El correo no está configurado, así que el código es{' '}
                  <span className="font-bold tabular-nums text-ink">{pistaDesarrollo}</span>
                </p>
              </div>
            )}

            <Button type="submit" disabled={enviando || codigo.length !== 6}>
              {enviando ? 'Comprobando…' : 'Continuar'}
            </Button>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setPaso(0);
                  setCodigo('');
                  setIntentoCodigo((n) => n + 1);
                  setErrores({});
                }}
                className="font-semibold text-ink-mute hover:text-ink"
              >
                Cambiar de correo
              </button>

              <button
                type="button"
                onClick={pedirCodigo}
                disabled={espera > 0 || enviando}
                className="font-semibold text-brand-deep hover:underline disabled:text-ink-faint disabled:no-underline"
              >
                {espera > 0 ? `Reenviar en ${espera}s` : 'Reenviar código'}
              </button>
            </div>
          </form>
        )}

        {/* --------------------------- Paso 3 --------------------------- */}
        {paso === 2 && (
          <form onSubmit={guardarContrasena} noValidate className="space-y-4">
            <p className="text-sm text-ink-mute">{REGLA_CONTRASENA}</p>

            <Input
              label="Contraseña nueva"
              type="password"
              name="contrasena_nueva"
              value={claves.contrasena_nueva}
              onChange={cambiarClave}
              error={errores.contrasena_nueva}
              placeholder="••••••••"
              autoComplete="new-password"
            />
            <Input
              label="Confirmar contraseña"
              type="password"
              name="confirmar_contrasena"
              value={claves.confirmar_contrasena}
              onChange={cambiarClave}
              error={errores.confirmar_contrasena}
              placeholder="••••••••"
              autoComplete="new-password"
            />

            {error && <p className="text-xs text-peligro">{error}</p>}

            <Button type="submit" disabled={enviando}>
              {enviando ? 'Guardando…' : 'Cambiar contraseña'}
            </Button>
          </form>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-ink-mute">
        <button
          type="button"
          onClick={onVolverALogin}
          className="font-semibold text-brand-deep hover:underline"
        >
          ← Volver al inicio de sesión
        </button>
      </p>
    </div>
  );
};
