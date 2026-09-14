import { useState } from 'react';
import { Input } from './Input';
import { Button } from './Button';
import { Toast } from './Toast';
import { useAuth } from '../hooks/useAuth';
import { iniciarSesion } from '../services/api';

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const Login = ({ onIrARecuperar, onIrARegistro, onLoginExitoso }) => {
  const { guardarSesion } = useAuth();
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nuevosErrores = {
      email: validarCampo('email', datos.email),
      contrasena: validarCampo('contrasena', datos.contrasena),
    };
    setErrores(nuevosErrores);

    if (Object.values(nuevosErrores).some((mensaje) => mensaje !== '')) return;

    setCargando(true);
    try {
      const respuesta = await iniciarSesion(datos.email, datos.contrasena);

      // Se guarda en la sesión compartida, no directamente en localStorage:
      // así el carrito y la cabecera se enteran en el mismo instante.
      guardarSesion(respuesta.acceso, respuesta.usuario);

      setToastMensaje(`¡Hola, ${respuesta.usuario.nombre}!`);
      setToastTipo('exito');
      setToastVisible(true);

      if (onLoginExitoso) {
        setTimeout(() => onLoginExitoso(respuesta.usuario), 700);
      }
    } catch (error) {
      setToastMensaje(error.message);
      setToastTipo('error');
      setToastVisible(true);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm">
      <p className="rotulo">Acceso</p>
      <h2 className="titular mt-2 text-4xl">Bienvenido</h2>
      <p className="mb-8 mt-2 text-sm text-ink-mute">Ingresa a tu cuenta BIXE</p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Correo electrónico"
          type="email"
          name="email"
          value={datos.email}
          onChange={handleChange}
          error={errores.email}
          placeholder="tucorreo@ejemplo.com"
          autoComplete="email"
        />
        <Input
          label="Contraseña"
          type="password"
          name="contrasena"
          value={datos.contrasena}
          onChange={handleChange}
          error={errores.contrasena}
          placeholder="••••••••"
          autoComplete="current-password"
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
      </form>

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
