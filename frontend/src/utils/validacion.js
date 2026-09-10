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

// ---------------------------- Tarjetas de pago ----------------------------
// Espejo de app/services/pasarela.py. El servidor vuelve a validar todo: esto
// es solo para avisar mientras se escribe.

const PREFIJOS_DE_MARCA = [
  ['visa', ['4']],
  ['mastercard', ['51', '52', '53', '54', '55', '2221', '2720']],
  ['amex', ['34', '37']],
  ['diners', ['36', '38', '300', '301', '302', '303', '304', '305']],
];

export const soloDigitos = (valor) => (valor ?? '').replace(/\D/g, '');

export const detectarMarca = (numero) => {
  const limpio = soloDigitos(numero);
  const encontrada = PREFIJOS_DE_MARCA.find(([, prefijos]) =>
    prefijos.some((p) => limpio.startsWith(p))
  );
  return encontrada ? encontrada[0] : null;
};

/** Algoritmo de Luhn: el mismo que usa la pasarela. */
export const pasaLuhn = (numero) => {
  const limpio = soloDigitos(numero);
  if (limpio.length < 12) return false;

  let suma = 0;
  for (let i = 0; i < limpio.length; i += 1) {
    let cifra = Number(limpio[limpio.length - 1 - i]);
    if (i % 2 === 1) {
      cifra *= 2;
      if (cifra > 9) cifra -= 9;
    }
    suma += cifra;
  }
  return suma % 10 === 0;
};

/** Agrupa el número en bloques de cuatro (o el formato de Amex) al escribir. */
export const formatearTarjeta = (valor) => {
  const limpio = soloDigitos(valor).slice(0, 16);
  if (detectarMarca(limpio) === 'amex') {
    return limpio.slice(0, 15).replace(/(\d{4})(\d{0,6})(\d{0,5})/, (_, a, b, c) =>
      [a, b, c].filter(Boolean).join(' ')
    );
  }
  return limpio.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
};

export const validarTarjeta = (numero) => {
  const limpio = soloDigitos(numero);
  if (!limpio) return 'El número de tarjeta es obligatorio.';

  const largoEsperado = detectarMarca(limpio) === 'amex' ? 15 : 16;
  if (limpio.length !== largoEsperado) {
    return `El número debe tener ${largoEsperado} dígitos.`;
  }
  if (!pasaLuhn(limpio)) return 'El número de tarjeta no es válido.';
  return '';
};

export const validarVencimiento = (mes, anio) => {
  const m = Number(mes);
  const a = Number(anio);
  if (!m || !a) return 'Indica el mes y el año de vencimiento.';
  if (m < 1 || m > 12) return 'El mes debe estar entre 01 y 12.';

  const hoy = new Date();
  const vencida = a < hoy.getFullYear() || (a === hoy.getFullYear() && m < hoy.getMonth() + 1);
  if (vencida) return 'La tarjeta está vencida.';
  return '';
};

export const validarCvv = (cvv, marca) => {
  const largo = marca === 'amex' ? 4 : 3;
  if (!cvv) return 'El código de seguridad es obligatorio.';
  if (soloDigitos(cvv).length !== largo) return `El código debe tener ${largo} dígitos.`;
  return '';
};
