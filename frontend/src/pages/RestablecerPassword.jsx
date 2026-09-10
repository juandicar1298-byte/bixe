import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { restablecerContrasenaApi } from '../services/api';
import { REGLA_CONTRASENA, validarContrasena } from '../utils/validacion';

export const RestablecerPassword = () => {
  const [parametros] = useSearchParams();
  const navigate = useNavigate();
  const token = parametros.get('token') ?? '';

  const [datos, setDatos] = useState({ contrasena_nueva: '', confirmar_contrasena: '' });
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);

  const validarCampo = (nombre, valor) => {
    if (nombre === 'contrasena_nueva') return validarContrasena(valor);
    if (nombre === 'confirmar_contrasena' && valor !== datos.contrasena_nueva) {
      return 'Las contraseñas no coinciden.';
    }
    return '';
  };

  const handleChange = (evento) => {
    const { name, value } = evento.target;
    setDatos((previo) => ({ ...previo, [name]: value }));
    setErrores((previo) => ({ ...previo, [name]: validarCampo(name, value) }));
  };

  const handleSubmit = async (evento) => {
    evento.preventDefault();

    const nuevosErrores = {
      contrasena_nueva: validarContrasena(datos.contrasena_nueva),
      confirmar_contrasena:
        datos.confirmar_contrasena !== datos.contrasena_nueva
          ? 'Las contraseñas no coinciden.'
          : '',
    };
    setErrores(nuevosErrores);

    if (Object.values(nuevosErrores).some((mensaje) => mensaje !== '')) return;

    setEnviando(true);
    setError('');
    try {
      await restablecerContrasenaApi({ token, ...datos });
      setListo(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <Header />

      <div className="mx-auto flex max-w-md flex-col justify-center px-6 py-20">
        <p className="rotulo">Recuperación</p>
        <h1 className="titular mt-2 text-4xl">Nueva contraseña</h1>

        {!token ? (
          <>
            <p className="mt-4 text-sm text-ink-soft">
              Este enlace no trae el código de recuperación. Vuelve a pedirlo
              desde la pantalla de inicio de sesión.
            </p>
            <Link to="/login" className="btn btn-primario mt-8">
              Ir al inicio de sesión
            </Link>
          </>
        ) : listo ? (
          <div className="mt-6 rounded-2xl border border-exito/30 bg-exito-wash px-5 py-4">
            <p className="text-sm font-semibold text-exito">
              Tu contraseña quedó actualizada.
            </p>
            <p className="mt-1 text-xs text-ink-mute">
              Te llevamos al inicio de sesión…
            </p>
          </div>
        ) : (
          <>
            <p className="mb-8 mt-2 text-sm text-ink-mute">{REGLA_CONTRASENA}</p>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <Input
                label="Contraseña nueva"
                type="password"
                name="contrasena_nueva"
                value={datos.contrasena_nueva}
                onChange={handleChange}
                error={errores.contrasena_nueva}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <Input
                label="Confirmar contraseña"
                type="password"
                name="confirmar_contrasena"
                value={datos.confirmar_contrasena}
                onChange={handleChange}
                error={errores.confirmar_contrasena}
                placeholder="••••••••"
                autoComplete="new-password"
              />

              {error && <p className="text-xs text-peligro">{error}</p>}

              <Button type="submit" disabled={enviando}>
                {enviando ? 'Guardando…' : 'Cambiar contraseña'}
              </Button>
            </form>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};
