import { useState } from 'react';
import { Input } from './Input';
import { Button } from './Button';
import { solicitarRecuperacionApi } from '../services/api';

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const RecoverPassword = ({ onVolverALogin }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [respuesta, setRespuesta] = useState(null);

  const validarEmail = (valor) => {
    if (!valor.trim()) return 'El correo es obligatorio.';
    if (!REGEX_EMAIL.test(valor)) return 'Formato de correo inválido.';
    return '';
  };

  const handleChange = (evento) => {
    const valor = evento.target.value;
    setEmail(valor);
    setError(validarEmail(valor));
  };

  const handleSubmit = async (evento) => {
    evento.preventDefault();

    const mensaje = validarEmail(email);
    setError(mensaje);
    if (mensaje) return;

    setEnviando(true);
    try {
      setRespuesta(await solicitarRecuperacionApi(email));
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm">
      <p className="rotulo">Recuperar</p>
      <h2 className="titular mt-2 text-4xl">Tu contraseña</h2>
      <p className="mb-8 mt-2 text-sm text-ink-mute">
        Escribe tu correo y te enviamos un enlace para crear una nueva.
      </p>

      {respuesta ? (
        <div className="space-y-4">
          <p className="rounded-2xl border border-brand-borde bg-brand-wash px-5 py-4 text-sm font-medium text-brand-ink">
            {respuesta.mensaje}
          </p>

          {/* En desarrollo, si el correo aún no está configurado en el backend,
              la API devuelve el enlace para poder probar el flujo completo. */}
          {respuesta.enlace_recuperacion && (
            <div className="rounded-2xl border border-line bg-veil px-5 py-4">
              <p className="rotulo mb-2">Modo desarrollo</p>
              <p className="mb-3 text-xs text-ink-mute">
                El servidor de correo todavía no está configurado, así que el
                enlace se muestra aquí:
              </p>
              <a
                href={respuesta.enlace_recuperacion}
                className="break-all text-xs font-semibold text-brand-deep hover:underline"
              >
                {respuesta.enlace_recuperacion}
              </a>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            label="Correo electrónico"
            type="email"
            name="email"
            value={email}
            onChange={handleChange}
            error={error}
            placeholder="tucorreo@ejemplo.com"
            autoComplete="email"
          />
          <Button type="submit" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar enlace'}
          </Button>
        </form>
      )}

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
