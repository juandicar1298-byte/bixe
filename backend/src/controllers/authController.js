import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { crearUsuario, buscarUsuarioPorEmail } from '../models/usuarioModel.js';
import { validarDatosNuevoUsuario } from '../utils/validaciones.js';

export const registrar = async (req, res) => {
  try {
    const { nombre, apellido, tipoDocumento, numeroDocumento, direccion, telefono, email, password } = req.body;

    // Validación backend (obligatoria, aunque el frontend ya valide):
    // campos vacíos, longitud de contraseña, formato de correo y duplicados.
    const error = await validarDatosNuevoUsuario(req.body);
    if (error) {
      return res.status(error.status).json({ mensaje: error.mensaje });
    }

    // Hashear la contraseña (nunca se guarda en texto plano)
    const passwordHash = await bcrypt.hash(password, 10);

    const idUsuario = await crearUsuario({
      nombre, apellido, tipoDocumento, numeroDocumento, direccion, telefono, email, passwordHash,
    });

    res.status(201).json({ mensaje: 'Registro exitoso ✅', idUsuario });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ mensaje: 'Correo y contraseña son obligatorios.' });
    }

    const usuario = await buscarUsuarioPorEmail(email);
    if (!usuario) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas.' });
    }

    if (usuario.estado === 'inactivo') {
      return res.status(403).json({ mensaje: 'Tu cuenta está inactiva. Contacta al administrador.' });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas.' });
    }

    const token = jwt.sign(
      { id: usuario.id_usuario, email: usuario.email, idRol: usuario.id_rol },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      mensaje: 'Inicio de sesión exitoso ✅',
      token,
      usuario: {
        id: usuario.id_usuario,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        idRol: usuario.id_rol,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
};