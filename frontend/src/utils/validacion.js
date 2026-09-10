// Estas reglas son un espejo de app/schemas/comunes.py en el backend.
// Si cambia una, hay que cambiar la otra: el servidor siempre revalida, así
// que una diferencia se vería como un formulario que "pasa" y luego rebota.

export const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const REGEX_CONTRASENA =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_-]).+$/;

export const REGLA_CONTRASENA =
  'Entre 8 y 20 caracteres, con al menos una minúscula, una mayúscula, un número y un símbolo.';

export const REGEX_SOLO_DIGITOS = /^\d+$/;

export const validarContrasena = (valor) => {
  if (!valor) return 'La contraseña es obligatoria.';
  if (valor.length < 8 || valor.length > 20) {
    return 'La contraseña debe tener entre 8 y 20 caracteres.';
  }
  if (!REGEX_CONTRASENA.test(valor)) return REGLA_CONTRASENA;
  return '';
};

export const validarEmail = (valor) => {
  if (!valor?.trim()) return 'El correo es obligatorio.';
  if (!REGEX_EMAIL.test(valor)) return 'Formato de correo inválido.';
  if (valor.length > 100) return 'El correo no puede superar los 100 caracteres.';
  return '';
};

export const validarTexto = (valor, { minimo, maximo, etiqueta }) => {
  const limpio = (valor ?? '').trim();
  if (!limpio) return `${etiqueta} es obligatorio.`;
  if (limpio.length < minimo) return `${etiqueta} debe tener al menos ${minimo} caracteres.`;
  if (limpio.length > maximo) return `${etiqueta} no puede superar los ${maximo} caracteres.`;
  return '';
};

export const validarDocumento = (valor) => {
  if (!valor?.trim()) return 'El número de documento es obligatorio.';
  if (!REGEX_SOLO_DIGITOS.test(valor)) return 'El documento solo admite números.';
  if (valor.length < 6 || valor.length > 12) {
    return 'El documento debe tener entre 6 y 12 dígitos.';
  }
  return '';
};

export const validarTelefono = (valor) => {
  if (!valor?.trim()) return 'El teléfono es obligatorio.';
  if (!REGEX_SOLO_DIGITOS.test(valor)) return 'El teléfono solo admite números.';
  if (valor.length < 7 || valor.length > 10) {
    return 'El teléfono debe tener entre 7 y 10 dígitos.';
  }
  return '';
};
