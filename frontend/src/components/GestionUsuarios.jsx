import { useState, useEffect, useMemo } from 'react';
import { Toast } from './Toast';
import { Modal } from './ui/Modal';
import { PanelSeccion, EstadoVacio, ContenedorTabla } from './dashboard/PanelSeccion';
import { IconoMas, IconoBuscar } from './ui/Iconos';
import { useAuth } from '../hooks/useAuth';
import { formatearFecha } from '../utils/formato';
import {
  obtenerUsuarios,
  obtenerRolesApi,
  crearUsuarioApi,
  actualizarUsuarioApi,
  cambiarEstadoUsuarioApi,
  eliminarUsuarioApi,
} from '../services/api';

const usuarioVacio = {
  nombre: '',
  apellido: '',
  tipo_documento: 'CC',
  numero_documento: '',
  direccion: '',
  telefono: '',
  email: '',
  contrasena: '',
  rol_id: 3,
};

// Si la tabla "roles" no responde, el panel sigue funcionando con estos valores.
const ROLES_POR_DEFECTO = [
  { id: 1, nombre: 'Administrador' },
  { id: 2, nombre: 'Empleado' },
  { id: 3, nombre: 'Cliente' },
];

const mapearUsuarioAForm = (u) => ({
  nombre: u.nombre || '',
  apellido: u.apellido || '',
  tipo_documento: u.tipo_documento || 'CC',
  numero_documento: u.numero_documento || '',
  direccion: u.direccion || '',
  telefono: u.telefono || '',
  email: u.email || '',
  contrasena: '',
  rol_id: u.rol.id,
});

export function GestionUsuarios({ onCambio }) {
  const { usuario: usuarioSesion } = useAuth();

  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState(ROLES_POR_DEFECTO);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('todos');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [usuarioIdEditando, setUsuarioIdEditando] = useState(null); // null = creando
  const [formData, setFormData] = useState(usuarioVacio);
  const [guardando, setGuardando] = useState(false);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMensaje, setToastMensaje] = useState('');
  const [toastTipo, setToastTipo] = useState('exito');

  const mostrarToast = (mensaje, tipo = 'exito') => {
    setToastMensaje(mensaje);
    setToastTipo(tipo);
    setToastVisible(true);
  };

  const cargarUsuarios = async () => {
    setCargando(true);
    try {
      const data = await obtenerUsuarios();
      setUsuarios(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    // Cargar datos al montar es justo para lo que sirve un efecto. La regla
    // no puede ver que el setState ocurre después del await, no de forma
    // síncrona, así que aquí es un falso positivo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarUsuarios();
    obtenerRolesApi()
      .then((data) => {
        if (data.length > 0) setRoles(data);
      })
      .catch(() => setRoles(ROLES_POR_DEFECTO));
  }, []);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return usuarios.filter((u) => {
      if (filtroRol !== 'todos' && u.rol.id !== Number(filtroRol)) return false;
      if (!texto) return true;
      return `${u.nombre} ${u.apellido} ${u.email} ${u.numero_documento}`
        .toLowerCase()
        .includes(texto);
    });
  }, [usuarios, busqueda, filtroRol]);

  const abrirCrear = () => {
    setUsuarioIdEditando(null);
    setFormData(usuarioVacio);
    setModalAbierto(true);
  };

  const abrirEditar = (u) => {
    setUsuarioIdEditando(u.id);
    setFormData(mapearUsuarioAForm(u));
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setUsuarioIdEditando(null);
    setFormData(usuarioVacio);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'rol_id' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      if (usuarioIdEditando) {
        // El backend solo permite cambiar estos campos en la edición.
        await actualizarUsuarioApi(usuarioIdEditando, {
          nombre: formData.nombre,
          apellido: formData.apellido,
          direccion: formData.direccion,
          telefono: formData.telefono,
          rol_id: formData.rol_id,
        });
        mostrarToast('Usuario actualizado ✅');
      } else {
        await crearUsuarioApi(formData);
        mostrarToast('Usuario creado ✅');
      }
      cerrarModal();
      cargarUsuarios();
      onCambio?.();
    } catch (err) {
      mostrarToast(err.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const handleCambiarEstado = async (u) => {
    const nuevoEstado = u.estado === 'activo' ? 'inactivo' : 'activo';
    try {
      await cambiarEstadoUsuarioApi(u.id, nuevoEstado);
      mostrarToast(`Usuario marcado como ${nuevoEstado} ✅`);
      cargarUsuarios();
      onCambio?.();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  };

  const handleEliminar = async (u) => {
    if (!confirm(`¿Seguro que quieres eliminar a ${u.nombre} ${u.apellido}? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      await eliminarUsuarioApi(u.id);
      mostrarToast('Usuario eliminado ✅');
      cargarUsuarios();
      onCambio?.();
    } catch (err) {
      mostrarToast(err.message, 'error');
    }
  };

  const editandoMiCuenta = usuarioIdEditando === usuarioSesion?.id;

  return (
    <>
      <PanelSeccion
        titulo="Usuarios"
        descripcion={`${usuarios.length} registrados · ${usuarios.filter((u) => u.estado === 'activo').length} activos`}
        acciones={
          <button onClick={abrirCrear} className="btn btn-primario">
            <IconoMas className="h-4 w-4" />
            Nuevo usuario
          </button>
        }
      >
        <div className="mb-5 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <IconoBuscar className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              className="campo !pl-10"
              placeholder="Buscar por nombre, correo o documento…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <select
            className="campo sm:w-48"
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
          >
            <option value="todos">Todos los roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </div>

        {cargando && <p className="py-8 text-center text-ink-mute">Cargando usuarios…</p>}
        {error && <p className="py-8 text-center text-peligro">{error}</p>}

        {!cargando && !error && visibles.length === 0 && (
          <EstadoVacio
            titulo="No se encontraron usuarios"
            descripcion="Ningún usuario coincide con los criterios de búsqueda."
          />
        )}

        {!cargando && !error && visibles.length > 0 && (
          <ContenedorTabla>
            <thead>
              <tr className="border-b border-line">
                <th className="th">Usuario</th>
                <th className="th">Documento</th>
                <th className="th">Contacto</th>
                <th className="th">Rol</th>
                <th className="th">Alta</th>
                <th className="th">Estado</th>
                <th className="th text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((u) => {
                const esMiCuenta = u.id === usuarioSesion?.id;
                const iniciales = `${u.nombre?.[0] ?? ''}${u.apellido?.[0] ?? ''}`.toUpperCase();

                return (
                  <tr key={u.id} className="border-b border-line last:border-0 transition hover:bg-veil">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-canvas text-[0.7rem] font-bold text-ink-soft">
                          {iniciales}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-ink">
                            {u.nombre} {u.apellido}
                            {esMiCuenta && (
                              <span className="ml-1.5 text-[0.65rem] font-bold uppercase text-brand-deep">
                                (tú)
                              </span>
                            )}
                          </p>
                          <p className="truncate text-xs text-ink-mute">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="td whitespace-nowrap">{u.tipo_documento} {u.numero_documento}</td>
                    <td className="td">{u.telefono}</td>
                    <td className="td">
                      <span className={`insignia ${u.rol.id === 1 ? 'insignia-marca' : 'insignia-neutra'}`}>
                        {u.rol.nombre}
                      </span>
                    </td>
                    <td className="td whitespace-nowrap text-xs">{formatearFecha(u.fecha_creacion)}</td>
                    <td className="td">
                      <span className={`insignia ${u.estado === 'activo' ? 'insignia-exito' : 'insignia-neutra'}`}>
                        {u.estado}
                      </span>
                    </td>
                    <td className="td">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => abrirEditar(u)} className="accion text-brand-deep hover:underline">
                          Editar
                        </button>
                        {/* Un admin no puede desactivarse ni borrarse a sí mismo:
                            perdería el acceso al panel. El backend también lo bloquea. */}
                        {!esMiCuenta && (
                          <>
                            <button onClick={() => handleCambiarEstado(u)} className="accion text-alerta hover:underline">
                              {u.estado === 'activo' ? 'Desactivar' : 'Activar'}
                            </button>
                            <button onClick={() => handleEliminar(u)} className="accion text-peligro hover:underline">
                              Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </ContenedorTabla>
        )}
      </PanelSeccion>

      <Modal
        abierto={modalAbierto}
        onCerrar={cerrarModal}
        titulo={usuarioIdEditando ? 'Editar usuario' : 'Nuevo usuario'}
        descripcion={
          usuarioIdEditando
            ? 'El correo y el documento identifican la cuenta y no se pueden cambiar.'
            : 'La contraseña se guarda cifrada; el usuario podrá cambiarla desde su panel.'
        }
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="etiqueta">Nombre</label>
              <input className="campo" name="nombre" value={formData.nombre} onChange={handleChange} required />
            </div>
            <div>
              <label className="etiqueta">Apellido</label>
              <input className="campo" name="apellido" value={formData.apellido} onChange={handleChange} required />
            </div>
          </div>

          {!usuarioIdEditando && (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="etiqueta">Tipo de documento</label>
                  <select className="campo" name="tipo_documento" value={formData.tipo_documento} onChange={handleChange}>
                    <option value="CC">Cédula de ciudadanía</option>
                    <option value="CE">Cédula de extranjería</option>
                  </select>
                </div>
                <div>
                  <label className="etiqueta">Número de documento</label>
                  <input className="campo" name="numero_documento" value={formData.numero_documento} onChange={handleChange} maxLength={12} required />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="etiqueta">Correo</label>
                  <input className="campo" type="email" name="email" value={formData.email} onChange={handleChange} required />
                </div>
                <div>
                  <label className="etiqueta">Contraseña</label>
                  <input
                    className="campo"
                    type="password"
                    name="contrasena"
                    value={formData.contrasena}
                    onChange={handleChange}
                    minLength={8}
                    maxLength={20}
                    placeholder="Entre 8 y 20, con mayúscula, número y símbolo"
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="etiqueta">Dirección</label>
              <input className="campo" name="direccion" value={formData.direccion} onChange={handleChange} maxLength={60} required />
            </div>
            <div>
              <label className="etiqueta">Teléfono</label>
              <input className="campo" name="telefono" value={formData.telefono} onChange={handleChange} maxLength={10} required />
            </div>
          </div>

          <div>
            <label className="etiqueta">Rol</label>
            <select
              className="campo"
              name="rol_id"
              value={formData.rol_id}
              onChange={handleChange}
              disabled={editandoMiCuenta}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
            {editandoMiCuenta && (
              <p className="mt-1.5 text-xs text-ink-mute">No puedes cambiar tu propio rol.</p>
            )}
          </div>

          <div className="flex gap-3 border-t border-line pt-5">
            <button type="button" onClick={cerrarModal} className="btn btn-contorno flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="btn btn-primario flex-1">
              {guardando ? 'Guardando…' : 'Guardar usuario'}
            </button>
          </div>
        </form>
      </Modal>

      <Toast
        mensaje={toastMensaje}
        tipo={toastTipo}
        visible={toastVisible}
        onCerrar={() => setToastVisible(false)}
      />
    </>
  );
}
