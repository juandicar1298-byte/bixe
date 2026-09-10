import { buscarUsuarioPorEmail, buscarUsuarioPorDocumento } from '../models/usuarioModel.js';

export const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Valida los datos de un usuario nuevo (registro público o alta desde el panel admin).
// Devuelve { status, mensaje } si algo falla, o null si todo está correcto.
export const validarDatosNuevoUsuario = async (datos) => {
  const {
    nombre, apellido, tipoDocumento, numeroDocumento,
    direccion, telefono, email, password,
  } = datos;

  if (!nombre || !apellido || !tipoDocumento || !numeroDocumento || !direccion || !telefono || !email || !password) {
    return { status: 400, mensaje: 'Todos los campos son obligatorios.' };
  }

  if (password.length < 6 || password.length > 20) {
    return { status: 400, mensaje: 'La contraseña debe tener entre 6 y 20 caracteres.' };
  }

  if (!REGEX_EMAIL.test(email)) {
    return { status: 400, mensaje: 'Formato de correo inválido.' };
  }

  if (await buscarUsuarioPorEmail(email)) {
    return { status: 409, mensaje: 'Ya existe una cuenta con ese correo.' };
  }

  if (await buscarUsuarioPorDocumento(numeroDocumento)) {
    return { status: 409, mensaje: 'Ya existe una cuenta con ese número de documento.' };
  }

  return null;
};
