// Cliente HTTP de la API de BIXE (FastAPI).
//
// La URL se toma de VITE_API_URL para no dejarla quemada en el código: basta
// cambiar el .env del frontend para apuntar a otro servidor.
export const API_ORIGEN = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

const API_URL = `${API_ORIGEN}/api`;

export const CLAVE_TOKEN = 'bixe_token';
export const CLAVE_USUARIO = 'bixe_usuario';

/** Error de la API, con el código y el detalle por campo que devuelve el backend. */
export class ErrorDeApi extends Error {
  constructor(mensaje, { estado, codigo, detalles } = {}) {
    super(mensaje);
    this.name = 'ErrorDeApi';
    this.estado = estado;
    this.codigo = codigo;
    this.detalles = detalles ?? [];
  }
}

const cabeceras = (extra = {}) => {
  const token = localStorage.getItem(CLAVE_TOKEN);
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
};

// El backend responde siempre con la misma forma: { codigo, mensaje, ruta, detalles }.
// En los 422 el detalle viene campo a campo, y se arma un mensaje legible.
const mensajeDeError = (datos, respuesta) => {
  if (datos?.detalles?.length) {
    return datos.detalles
      .map((d) => (d.campo ? `${d.campo}: ${d.problema}` : d.problema))
      .join(' · ');
  }
  return datos?.mensaje ?? `Error ${respuesta.status}`;
};

const peticion = async (ruta, { metodo = 'GET', cuerpo, formulario } = {}) => {
  const opciones = {
    method: metodo,
    // Con FormData no se manda Content-Type: el navegador pone el boundary.
    headers: cabeceras(formulario ? {} : { 'Content-Type': 'application/json' }),
  };

  if (formulario) opciones.body = formulario;
  else if (cuerpo !== undefined) opciones.body = JSON.stringify(cuerpo);

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, opciones);
  } catch {
    throw new ErrorDeApi(
      'No se pudo contactar el servidor. ¿Está corriendo el backend?',
      { estado: 0, codigo: 'sin_conexion' }
    );
  }

  if (respuesta.status === 204) return null;

  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    throw new ErrorDeApi(mensajeDeError(datos, respuesta), {
      estado: respuesta.status,
      codigo: datos?.codigo,
      detalles: datos?.detalles,
    });
  }

  return datos;
};

/**
 * Descarga un archivo protegido. No se puede usar un <a href> normal porque
 * el endpoint exige la cabecera Authorization, así que se pide con fetch y se
 * entrega como Blob.
 */
const peticionArchivo = async (ruta) => {
  const respuesta = await fetch(`${API_URL}${ruta}`, { headers: cabeceras() });

  if (!respuesta.ok) {
    const datos = await respuesta.json().catch(() => null);
    throw new ErrorDeApi(mensajeDeError(datos, respuesta), {
      estado: respuesta.status,
      codigo: datos?.codigo,
    });
  }

  return respuesta.blob();
};

// Convierte { rol_id: 3, limite: 20 } en "?rol_id=3&limite=20", saltando vacíos.
const consulta = (parametros = {}) => {
  const partes = Object.entries(parametros).filter(
    ([, valor]) => valor !== undefined && valor !== null && valor !== ''
  );
  return partes.length ? `?${new URLSearchParams(partes)}` : '';
};

// ---------------------------- Autenticación ----------------------------

export const registrarUsuario = (datos) =>
  peticion('/usuarios/registro', { metodo: 'POST', cuerpo: datos });

export const iniciarSesion = (email, contrasena) =>
  peticion('/auth/login', { metodo: 'POST', cuerpo: { email, contrasena } });

export const solicitarRecuperacionApi = (email) =>
  peticion('/auth/recuperar', { metodo: 'POST', cuerpo: { email } });

export const verificarCodigoApi = (email, codigo) =>
  peticion('/auth/verificar-codigo', { metodo: 'POST', cuerpo: { email, codigo } });

export const restablecerContrasenaApi = (datos) =>
  peticion('/auth/restablecer', { metodo: 'POST', cuerpo: datos });

// ------------------------------- Usuarios -------------------------------

export const obtenerUsuarios = (parametros) =>
  peticion(`/usuarios${consulta(parametros)}`);

export const obtenerRolesApi = () => peticion('/usuarios/roles');

export const crearUsuarioApi = (datos) =>
  peticion('/usuarios', { metodo: 'POST', cuerpo: datos });

export const actualizarUsuarioApi = (id, datos) =>
  peticion(`/usuarios/${id}`, { metodo: 'PATCH', cuerpo: datos });

export const cambiarEstadoUsuarioApi = (id, estado) =>
  peticion(`/usuarios/${id}/estado`, { metodo: 'PATCH', cuerpo: { estado } });

export const eliminarUsuarioApi = (id) =>
  peticion(`/usuarios/${id}`, { metodo: 'DELETE' });

// --------------------------- Perfil del usuario ---------------------------

export const obtenerMiPerfilApi = () => peticion('/usuarios/perfil');

export const actualizarMiPerfilApi = (datos) =>
  peticion('/usuarios/perfil', { metodo: 'PUT', cuerpo: datos });

export const cambiarMiContrasenaApi = (datos) =>
  peticion('/usuarios/perfil/contrasena', { metodo: 'PUT', cuerpo: datos });

// ------------------------------- Productos -------------------------------

export const obtenerProductos = (parametros) =>
  peticion(`/productos${consulta(parametros)}`);

export const obtenerProductoPorId = (id) => peticion(`/productos/${id}`);

export const obtenerTodosLosProductosApi = () => peticion('/productos/gestion');

export const crearProductoApi = (datos) =>
  peticion('/productos', { metodo: 'POST', cuerpo: datos });

export const actualizarProductoApi = (id, datos) =>
  peticion(`/productos/${id}`, { metodo: 'PATCH', cuerpo: datos });

export const cambiarEstadoProductoApi = (id, estado) =>
  peticion(`/productos/${id}/estado`, { metodo: 'PATCH', cuerpo: { estado } });

export const eliminarProductoApi = (id) =>
  peticion(`/productos/${id}`, { metodo: 'DELETE' });

// ------------------------------- Servicios -------------------------------

export const obtenerServiciosApi = (parametros) =>
  peticion(`/servicios${consulta(parametros)}`);

export const obtenerServicioPorIdApi = (id) => peticion(`/servicios/${id}`);

export const obtenerTodosLosServiciosApi = () => peticion('/servicios/gestion');

export const crearServicioApi = (datos) =>
  peticion('/servicios', { metodo: 'POST', cuerpo: datos });

export const actualizarServicioApi = (id, datos) =>
  peticion(`/servicios/${id}`, { metodo: 'PATCH', cuerpo: datos });

export const cambiarEstadoServicioApi = (id, estado) =>
  peticion(`/servicios/${id}/estado`, { metodo: 'PATCH', cuerpo: { estado } });

export const eliminarServicioApi = (id) =>
  peticion(`/servicios/${id}`, { metodo: 'DELETE' });

// -------------------------------- Pedidos --------------------------------

export const crearPedidoApi = (datos) =>
  peticion('/pedidos', { metodo: 'POST', cuerpo: datos });

export const obtenerMisPedidosApi = () => peticion('/pedidos/mis');

export const obtenerPedidosApi = (parametros) =>
  peticion(`/pedidos${consulta(parametros)}`);

export const obtenerPedidoPorIdApi = (id) => peticion(`/pedidos/${id}`);

export const cambiarEstadoPedidoApi = (id, estado) =>
  peticion(`/pedidos/${id}/estado`, { metodo: 'PATCH', cuerpo: { estado } });

export const cancelarMiPedidoApi = (id) =>
  peticion(`/pedidos/${id}/cancelacion`, { metodo: 'PATCH' });

export const eliminarPedidoApi = (id) =>
  peticion(`/pedidos/${id}`, { metodo: 'DELETE' });

// ------------------------ Panel: cifras y archivos ------------------------

export const obtenerEstadisticasApi = () => peticion('/estadisticas');

export const subirImagenApi = (archivo) => {
  const formulario = new FormData();
  formulario.append('imagen', archivo);
  return peticion('/uploads', { metodo: 'POST', formulario });
};

// -------------------------- Pagos y facturación --------------------------

export const obtenerMetodosPagoApi = () => peticion('/pagos/metodos');

export const pagarPedidoApi = (pedidoId, tarjeta) =>
  peticion(`/pedidos/${pedidoId}/pago`, { metodo: 'POST', cuerpo: tarjeta });

export const obtenerPagoApi = (pedidoId) => peticion(`/pedidos/${pedidoId}/pago`);

export const obtenerFacturaApi = (pedidoId) => peticion(`/pedidos/${pedidoId}/factura`);

export const descargarFacturaApi = (pedidoId) =>
  peticionArchivo(`/pedidos/${pedidoId}/factura.pdf`);

// ----------------- Galería de un producto o un servicio -----------------
// "recurso" es "productos" o "servicios": las dos entidades exponen la misma
// galería en la API, así que estas funciones sirven para ambas.

export const obtenerImagenesApi = (recurso, id) =>
  peticion(`/${recurso}/${id}/imagenes`);

export const agregarImagenApi = (recurso, id, datos) =>
  peticion(`/${recurso}/${id}/imagenes`, { metodo: 'POST', cuerpo: datos });

export const eliminarImagenApi = (recurso, id, imagenId) =>
  peticion(`/${recurso}/${id}/imagenes/${imagenId}`, { metodo: 'DELETE' });

// ============================ Quinto avance ============================

const consultaDe = (filtros = {}) => {
  const parametros = new URLSearchParams();
  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') {
      parametros.append(clave, valor);
    }
  });
  const texto = parametros.toString();
  return texto ? `?${texto}` : '';
};

// ------------------------------- Ventas -------------------------------

export const obtenerVentasApi = (filtros) => peticion(`/ventas${consultaDe(filtros)}`);

export const obtenerVentaApi = (id) => peticion(`/ventas/${id}`);

export const registrarVentaApi = (datos) =>
  peticion('/ventas', { metodo: 'POST', cuerpo: datos });

export const anularVentaApi = (id) =>
  peticion(`/ventas/${id}/anulacion`, { metodo: 'PATCH' });

export const obtenerReporteDiarioApi = (fecha) =>
  peticion(`/ventas/reporte-diario${consultaDe({ fecha })}`);

export const descargarReportePdfApi = (fecha) =>
  peticionArchivo(`/ventas/reporte-diario.pdf${consultaDe({ fecha })}`);

export const descargarReporteExcelApi = (fecha) =>
  peticionArchivo(`/ventas/reporte-diario.xlsx${consultaDe({ fecha })}`);

// ----------------------------- Dashboards -----------------------------

export const obtenerPanelVentasApi = (filtros) =>
  peticion(`/estadisticas/ventas${consultaDe(filtros)}`);

export const obtenerMiPanelApi = () => peticion('/estadisticas/mi-panel');

// -------------------------------- PQR --------------------------------

export const radicarPqrApi = (datos) =>
  peticion('/pqr', { metodo: 'POST', cuerpo: datos });

export const obtenerMisPqrApi = (filtros) =>
  peticion(`/pqr/mias${consultaDe(filtros)}`);

export const obtenerBandejaPqrApi = (filtros) => peticion(`/pqr${consultaDe(filtros)}`);

export const obtenerPqrApi = (id) => peticion(`/pqr/${id}`);

export const consultarPqrPorRadicadoApi = (radicado) =>
  peticion(`/pqr/radicado/${encodeURIComponent(radicado)}`);

export const responderPqrApi = (id, datos) =>
  peticion(`/pqr/${id}/respuesta`, { metodo: 'PUT', cuerpo: datos });

export const cambiarEstadoPqrApi = (id, estado) =>
  peticion(`/pqr/${id}/estado`, { metodo: 'PATCH', cuerpo: { estado } });

// ------------------------------ Chatbot ------------------------------

export const estadoAsistenteApi = () => peticion('/chat/estado');

export const enviarMensajeChatApi = (mensaje, conversacion) =>
  peticion('/chat', { metodo: 'POST', cuerpo: { mensaje, conversacion } });
