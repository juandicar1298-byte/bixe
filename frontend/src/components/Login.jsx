import { useState } from 'react';
import { Input } from './Input';
import { Button } from './Button';
import { Toast } from './Toast';
import { useAuth } from '../hooks/useAuth';
import { iniciarSesion } from '../services/api';

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// El login está escalonado: primero el correo y después la contraseña, en dos
// formularios separados. Es la primera de las dos defensas del proyecto frente
// a la inyección SQL (la segunda, la consulta preparada, está en el backend).
//
// Con un solo formulario, la tentación es resolverlo con una única consulta
// del tipo  WHERE email = '...' AND clave = '...'  , que es justo la que
// permite el  ' OR '1'='1' --  de toda la vida. Al partirlo en dos pasos, el
// correo y la contraseña se tratan por separado: el correo identifica y la
// contraseña solo se compara contra el hash, ya fuera de la base de datos.
//
// OJO CON UNA COSA: el paso 1 NO le pregunta al servidor si el correo existe.
// Si lo hiciera, cualquiera podría averiguar qué correos están registrados
// probándolos uno por uno, y habríamos cambiado un agujero por otro. Aquí solo
// se valida el formato; las credenciales viajan juntas en una sola petición al
// pulsar «Iniciar sesión», y el error es el mismo se equivoque en lo que se
// equivoque.
const PASO_CORREO = 'correo';
const PASO_CONTRASENA = 'contrasena';

export const Login = ({ onIrARecuperar, onIrARegistro, onLoginExitoso }) => {
  const { guardarSesion } = useAuth();
  const [paso, setPaso] = useState(PASO_CORREO);
  const [datos, setDatos] = useState({ email: '', contrasena: '' });
  const [errores, setErrores] = useState({});
  const [recordarme, setRecordarme] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMensaje, setToastMensaje] = useState('');
  const [toastTipo, setToastTipo] = useState('exito');
  const [cargando, setCargando] = useState(false);

  const validarCampo = (name, value) => {
    if (name === 'email') {
      if (!value.trim()) return 'El correo es obligatorio.';
      if (!REGEX_EMAIL.test(value)) return 'Formato de correo inválido.';
    }

    if (name === 'contrasena' && !value) {
      return 'La contraseña es obligatoria.';
    }

    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDatos((prev) => ({ ...prev, [name]: value }));
    setErrores((prev) => ({ ...prev, [name]: validarCampo(name, value) }));
  };

  const avisar = (mensaje, tipo) => {
    setToastMensaje(mensaje);
    setToastTipo(tipo);
    setToastVisible(true);
  };

  // ---------------------------- Paso 1: el correo ----------------------------

  const continuarConElCorreo = (e) => {
    e.preventDefault();

    const error = validarCampo('email', datos.email);
    setErrores({ email: error });
    if (error) return;

    setPaso(PASO_CONTRASENA);
  };

  const volverAlCorreo = () => {
    // Al retroceder se borra la contraseña: no tiene por qué quedarse escrita
    // en un equipo compartido mientras se corrige el correo.
    setDatos((prev) => ({ ...prev, contrasena: '' }));
    setErrores({});
    setPaso(PASO_CORREO);
  };

  // -------------------------- Paso 2: la contraseña --------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nuevosErrores = {
      email: validarCampo('email', datos.email),
      contrasena: validarCampo('contrasena', datos.contrasena),
    };
    setErrores(nuevosErrores);

    // Si el correo se estropeó por el camino, se vuelve al primer paso.
    if (nuevosErrores.email) {
      setPaso(PASO_CORREO);
      return;
    }
    if (nuevosErrores.contrasena) return;

    setCargando(true);
    try {
      const respuesta = await iniciarSesion(datos.email, datos.contrasena);

      // Se guarda en la sesión compartida, no directamente en localStorage:
      // así el carrito y la cabecera se enteran en el mismo instante.
      guardarSesion(respuesta.acceso, respuesta.usuario);

      avisar(`¡Hola, ${respuesta.usuario.nombre}!`, 'exito');

      if (onLoginExitoso) {
        setTimeout(() => onLoginExitoso(respuesta.usuario), 700);
      }
    } catch (error) {
      avisar(error.message, 'error');
      // El backend responde lo mismo si el correo no existe o si la
      // contraseña está mal, así que no se puede saber cuál de los dos
      // falló. Se limpia la contraseña y se deja el foco para reintentar.
      setDatos((prev) => ({ ...prev, contrasena: '' }));
    } finally {
      setCargando(false);
    }
  };

  const enElCorreo = paso === PASO_CORREO;

  return (
    <div className="mx-auto w-full max-w-sm">
      <p className="rotulo">Acceso</p>
      <h2 className="titular mt-2 text-4xl">
        {enElCorreo ? 'Bienvenido' : 'Tu contraseña'}
      </h2>
      <p className="mb-6 mt-2 text-sm text-ink-mute">
        {enElCorreo
          ? 'Ingresa a tu cuenta BIXE'
          : 'Último paso para entrar a tu cuenta'}
      </p>

      {/* Indicador de los dos pasos */}
      <div className="mb-6 flex items-center gap-2" aria-hidden="true">
        <span className="h-1 flex-1 rounded-full bg-brand-deep" />
        <span
          className={`h-1 flex-1 rounded-full transition-colors ${
            enElCorreo ? 'bg-black/10' : 'bg-brand-deep'
          }`}
        />
      </div>

      {enElCorreo ? (
        <form onSubmit={continuarConElCorreo} noValidate className="space-y-4">
          <Input
            label="Correo electrónico"
            type="email"
            name="email"
            value={datos.email}
            onChange={handleChange}
            error={errores.email}
            placeholder="tucorreo@ejemplo.com"
            autoComplete="email"
            autoFocus
          />

          <Button type="submit">Continuar</Button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Con qué cuenta se está entrando, y cómo cambiarla */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-black/[0.03] px-4 py-3">
            <span className="truncate text-sm font-medium" title={datos.email}>
              {datos.email}
            </span>
            <button
              type="button"
              onClick={volverAlCorreo}
              className="shrink-0 text-sm font-semibold text-brand-deep hover:underline"
            >
              Cambiar
            </button>
          </div>

          <Input
            label="Contraseña"
            type="password"
            name="contrasena"
            value={datos.contrasena}
            onChange={handleChange}
            error={errores.contrasena}
            placeholder="••••••••"
            autoComplete="current-password"
            autoFocus
          />

          <div className="flex items-center justify-between px-1 py-2 text-sm">
            <label className="flex cursor-pointer items-center gap-2 text-ink-mute">
              <input
                type="checkbox"
                checked={recordarme}
                onChange={() => setRecordarme(!recordarme)}
                className="h-4 w-4 accent-[#3fa9f5]"
              />
              Recordarme
            </label>
            <button
              type="button"
              onClick={onIrARecuperar}
              className="font-semibold text-brand-deep hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <Button type="submit" disabled={cargando}>
            {cargando ? 'Ingresando…' : 'Iniciar sesión'}
          </Button>

          <Button type="button" variant="sutil" onClick={volverAlCorreo}>
            Volver
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-ink-mute md:hidden">
        ¿No tienes cuenta?{' '}
        <button
          type="button"
          onClick={onIrARegistro}
          className="font-bold text-brand-deep hover:underline"
        >
          Regístrate
        </button>
      </p>

      <Toast
        mensaje={toastMensaje}
        tipo={toastTipo}
        visible={toastVisible}
        onCerrar={() => setToastVisible(false)}
      />
    </div>
  );
};
