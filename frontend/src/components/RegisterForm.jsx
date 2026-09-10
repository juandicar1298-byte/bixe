import { useState } from 'react';
import { Input } from './Input';
import { Select } from './Select';
import { Button } from './Button';
import { Toast } from './Toast';
import { registrarUsuario } from '../services/api';
import {
  REGLA_CONTRASENA,
  validarContrasena,
  validarDocumento,
  validarEmail,
  validarTelefono,
  validarTexto,
} from '../utils/validacion';

const FORMULARIO_VACIO = {
  nombre: '',
  apellido: '',
  tipo_documento: 'CC',
  numero_documento: '',
  direccion: '',
  telefono: '',
  email: '',
  contrasena: '',
  confirmar_contrasena: '',
};

const TIPOS_DOCUMENTO = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'CE', label: 'Cédula de extranjería' },
];

export function RegisterForm({ onVolverLogin }) {
  const [formData, setFormData] = useState(FORMULARIO_VACIO);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMensaje, setToastMensaje] = useState('');
  const [toastTipo, setToastTipo] = useState('exito');

  const mostrarToast = (mensaje, tipo = 'exito') => {
    setToastMensaje(mensaje);
    setToastTipo(tipo);
    setToastVisible(true);
  };

  // Las mismas reglas que aplica el backend, para avisar mientras se escribe.
  const validarCampo = (nombre, valor, datos = formData) => {
    switch (nombre) {
      case 'nombre':
        return validarTexto(valor, { minimo: 2, maximo: 30, etiqueta: 'El nombre' });
      case 'apellido':
        return validarTexto(valor, { minimo: 2, maximo: 30, etiqueta: 'El apellido' });
      case 'direccion':
        return validarTexto(valor, { minimo: 5, maximo: 60, etiqueta: 'La dirección' });
      case 'numero_documento':
        return validarDocumento(valor);
      case 'telefono':
        return validarTelefono(valor);
      case 'email':
        return validarEmail(valor);
      case 'contrasena':
        return validarContrasena(valor);
      case 'confirmar_contrasena':
        return valor !== datos.contrasena ? 'Las contraseñas no coinciden.' : '';
      default:
        return '';
    }
  };

  const handleChange = (evento) => {
    const { name, value } = evento.target;

    // Documento y teléfono solo admiten dígitos, y con tope de longitud.
    let limpio = value;
    if (name === 'numero_documento') limpio = value.replace(/\D/g, '').slice(0, 12);
    if (name === 'telefono') limpio = value.replace(/\D/g, '').slice(0, 10);

    const datos = { ...formData, [name]: limpio };
    setFormData(datos);

    setErrores((previo) => ({
      ...previo,
      [name]: validarCampo(name, limpio, datos),
      // Si cambia la contraseña, se revisa de nuevo la confirmación.
      ...(name === 'contrasena'
        ? { confirmar_contrasena: validarCampo('confirmar_contrasena', datos.confirmar_contrasena, datos) }
        : {}),
    }));
  };

  const handleSubmit = async (evento) => {
    evento.preventDefault();

    const nuevosErrores = Object.fromEntries(
      Object.keys(FORMULARIO_VACIO).map((campo) => [
        campo,
        validarCampo(campo, formData[campo]),
      ])
    );
    setErrores(nuevosErrores);

    if (Object.values(nuevosErrores).some((mensaje) => mensaje !== '')) return;

    setEnviando(true);
    try {
      await registrarUsuario(formData);
      mostrarToast('¡Cuenta creada! Ya puedes iniciar sesión.');
      setFormData(FORMULARIO_VACIO);
      setErrores({});
      setTimeout(() => onVolverLogin?.(), 1500);
    } catch (error) {
      mostrarToast(error.message, 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm">
      <p className="rotulo">Registro</p>
      <h2 className="titular mt-2 text-4xl">Crea tu cuenta</h2>
      <p className="mb-8 mt-2 text-sm text-ink-mute">
        Para pedir servicios del taller y seguir tus pedidos.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            error={errores.nombre}
            maxLength={30}
          />
          <Input
            label="Apellido"
            name="apellido"
            value={formData.apellido}
            onChange={handleChange}
            error={errores.apellido}
            maxLength={30}
          />
        </div>

        <Select
          label="Tipo de documento"
          name="tipo_documento"
          value={formData.tipo_documento}
          onChange={handleChange}
          options={TIPOS_DOCUMENTO}
        />

        <Input
          label="Número de documento"
          name="numero_documento"
          value={formData.numero_documento}
          onChange={handleChange}
          error={errores.numero_documento}
          inputMode="numeric"
          maxLength={12}
        />

        <Input
          label="Dirección"
          name="direccion"
          value={formData.direccion}
          onChange={handleChange}
          error={errores.direccion}
          maxLength={60}
        />

        <Input
          label="Teléfono"
          name="telefono"
          value={formData.telefono}
          onChange={handleChange}
          error={errores.telefono}
          inputMode="numeric"
          maxLength={10}
        />

        <Input
          label="Correo electrónico"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          error={errores.email}
          placeholder="tucorreo@ejemplo.com"
          maxLength={100}
          autoComplete="email"
        />

        <Input
          label="Contraseña"
          type="password"
          name="contrasena"
          value={formData.contrasena}
          onChange={handleChange}
          error={errores.contrasena}
          placeholder="••••••••"
          maxLength={20}
          autoComplete="new-password"
        />

        <Input
          label="Confirmar contraseña"
          type="password"
          name="confirmar_contrasena"
          value={formData.confirmar_contrasena}
          onChange={handleChange}
          error={errores.confirmar_contrasena}
          placeholder="••••••••"
          maxLength={20}
          autoComplete="new-password"
        />

        {!errores.contrasena && (
          <p className="px-1 text-xs text-ink-mute">{REGLA_CONTRASENA}</p>
        )}

        <Button type="submit" disabled={enviando}>
          {enviando ? 'Creando cuenta…' : 'Registrarme'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-mute">
        ¿Ya tienes cuenta?{' '}
        <button
          type="button"
          onClick={onVolverLogin}
          className="font-bold text-brand-deep hover:underline"
        >
          Inicia sesión
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
}
