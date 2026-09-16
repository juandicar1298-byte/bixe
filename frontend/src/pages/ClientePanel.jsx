import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { PanelSeccion } from '../components/dashboard/PanelSeccion';
import { MisPedidos } from '../components/MisPedidos';
import { MisPqr } from '../components/MisPqr';
import { PanelCliente } from '../components/dashboard/PanelCliente';
import { Toast } from '../components/Toast';
import {
  IconoPedidos,
  IconoPerfil,
  IconoEscudo,
  IconoGrafico,
  IconoPqr,
} from '../components/ui/Iconos';
import { useAuth } from '../hooks/useAuth';
import {
  obtenerMiPerfilApi,
  actualizarMiPerfilApi,
  cambiarMiContrasenaApi,
} from '../services/api';

const SECCIONES = [
  { id: 'resumen', etiqueta: 'Mi resumen', icono: IconoGrafico },
  { id: 'pedidos', etiqueta: 'Mis pedidos', icono: IconoPedidos },
  { id: 'pqr', etiqueta: 'Mis PQR', icono: IconoPqr },
  { id: 'perfil', etiqueta: 'Mis datos', icono: IconoPerfil },
  { id: 'seguridad', etiqueta: 'Seguridad', icono: IconoEscudo },
];

const DESCRIPCIONES = {
  resumen: 'Cuánto has comprado en BIXE y en qué.',
  pqr: 'Las solicitudes que has radicado y lo que te respondió el taller.',
  pedidos: 'El historial de todo lo que has pedido en BIXE.',
  perfil: 'Tus datos de contacto para que el taller pueda ubicarte.',
  seguridad: 'Cambia la contraseña con la que entras a tu cuenta.',
};

const CONTRASENA_VACIA = {
  contrasena_actual: '',
  contrasena_nueva: '',
  confirmar_contrasena: '',
};

const Dato = ({ etiqueta, valor }) => (
  <div className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-0">
    <span className="rotulo shrink-0">{etiqueta}</span>
    <span className="break-all text-right text-sm font-semibold text-ink">{valor || '—'}</span>
  </div>
);

export const ClientePanel = () => {
  const { actualizarUsuarioLocal } = useAuth();

  const [seccion, setSeccion] = useState('resumen');

  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [editando, setEditando] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', apellido: '', direccion: '', telefono: '' });
  const [guardando, setGuardando] = useState(false);

  const [formPassword, setFormPassword] = useState(CONTRASENA_VACIA);
  const [cambiandoPassword, setCambiandoPassword] = useState(false);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMensaje, setToastMensaje] = useState('');
  const [toastTipo, setToastTipo] = useState('exito');

  const mostrarToast = (mensaje, tipo = 'exito') => {
    setToastMensaje(mensaje);
    setToastTipo(tipo);
    setToastVisible(true);
  };

  const cargarPerfil = async () => {
    try {
      setPerfil(await obtenerMiPerfilApi());
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
    cargarPerfil();
  }, []);

  const abrirEdicion = () => {
    setFormData({
      nombre: perfil.nombre || '',
      apellido: perfil.apellido || '',
      direccion: perfil.direccion || '',
      telefono: perfil.telefono || '',
    });
    setEditando(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleChangePassword = (e) => {
    const { name, value } = e.target;
    setFormPassword((prev) => ({ ...prev, [name]: value }));
  };

  const handleGuardarPerfil = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      // La API devuelve el perfil actualizado directamente.
      const usuario = await actualizarMiPerfilApi(formData);
      setPerfil(usuario);
      // Refresca la sesión guardada para que el Header muestre el nombre nuevo.
      actualizarUsuarioLocal({ nombre: usuario.nombre, apellido: usuario.apellido });
      setEditando(false);
      mostrarToast('Perfil actualizado ✅');
    } catch (err) {
      mostrarToast(err.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarPassword = async (e) => {
    e.preventDefault();

    setCambiandoPassword(true);
    try {
      await cambiarMiContrasenaApi(formPassword);
      setFormPassword(CONTRASENA_VACIA);
      mostrarToast('Contraseña actualizada ✅');
    } catch (err) {
      mostrarToast(err.message, 'error');
    } finally {
      setCambiandoPassword(false);
    }
  };

  const seccionActual = SECCIONES.find((s) => s.id === seccion);

  return (
    <DashboardLayout
      secciones={SECCIONES}
      seccionActiva={seccion}
      onCambiarSeccion={setSeccion}
      titulo={seccionActual?.etiqueta ?? 'Mi cuenta'}
      descripcion={DESCRIPCIONES[seccion]}
    >
      {seccion === 'resumen' && <PanelCliente />}
      {seccion === 'pedidos' && <MisPedidos />}
      {seccion === 'pqr' && <MisPqr />}

      {seccion === 'perfil' && (
        <>
          {cargando && <p className="py-8 text-center text-ink-mute">Cargando tu perfil…</p>}
          {error && <p className="py-8 text-center text-peligro">{error}</p>}

          {!cargando && !error && perfil && (
            <div className="grid max-w-4xl grid-cols-1 gap-6 lg:grid-cols-5">
              {/* --- Tarjeta de identidad --- */}
              <div className="tarjeta p-7 lg:col-span-2">
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-ink text-2xl font-bold text-white">
                  {perfil.nombre?.charAt(0)}
                </span>
                <h2 className="titular mt-5 text-2xl">
                  {perfil.nombre} {perfil.apellido}
                </h2>
                <p className="mt-1 break-all text-sm text-ink-mute">{perfil.email}</p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="insignia insignia-marca">{perfil.rol.nombre}</span>
                  <span className={`insignia ${perfil.estado === 'activo' ? 'insignia-exito' : 'insignia-neutra'}`}>
                    {perfil.estado}
                  </span>
                </div>
              </div>

              {/* --- Datos / edición --- */}
              <PanelSeccion
                titulo="Datos de contacto"
                className="lg:col-span-3"
                acciones={
                  !editando && (
                    <button onClick={abrirEdicion} className="btn btn-contorno">
                      Editar
                    </button>
                  )
                }
              >
                {!editando ? (
                  <div>
                    <Dato
                      etiqueta="Documento"
                      valor={`${perfil.tipo_documento} ${perfil.numero_documento}`}
                    />
                    <Dato etiqueta="Correo" valor={perfil.email} />
                    <Dato etiqueta="Dirección" valor={perfil.direccion} />
                    <Dato etiqueta="Teléfono" valor={perfil.telefono} />
                  </div>
                ) : (
                  <form onSubmit={handleGuardarPerfil} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="etiqueta">Nombre</label>
                        <input className="campo" name="nombre" value={formData.nombre} onChange={handleChange} maxLength={30} required />
                      </div>
                      <div>
                        <label className="etiqueta">Apellido</label>
                        <input className="campo" name="apellido" value={formData.apellido} onChange={handleChange} maxLength={30} required />
                      </div>
                    </div>

                    <div>
                      <label className="etiqueta">Dirección</label>
                      <input className="campo" name="direccion" value={formData.direccion} onChange={handleChange} maxLength={60} required />
                    </div>

                    <div>
                      <label className="etiqueta">Teléfono</label>
                      <input className="campo" name="telefono" value={formData.telefono} onChange={handleChange} maxLength={10} required />
                    </div>

                    {/* El correo y el documento identifican la cuenta, por eso no se editan aquí. */}
                    <p className="text-xs text-ink-mute">
                      Para cambiar tu correo o documento, contacta al administrador.
                    </p>

                    <div className="flex gap-3 border-t border-line pt-4">
                      <button type="button" onClick={() => setEditando(false)} className="btn btn-contorno flex-1">
                        Cancelar
                      </button>
                      <button type="submit" disabled={guardando} className="btn btn-primario flex-1">
                        {guardando ? 'Guardando…' : 'Guardar cambios'}
                      </button>
                    </div>
                  </form>
                )}
              </PanelSeccion>
            </div>
          )}
        </>
      )}

      {seccion === 'seguridad' && (
        <div className="max-w-lg">
          <PanelSeccion
            titulo="Cambiar contraseña"
            descripcion="Necesitas tu contraseña actual para confirmar el cambio."
          >
            <form onSubmit={handleGuardarPassword} className="space-y-4">
              <div>
                <label className="etiqueta">Contraseña actual</label>
                <input
                  className="campo"
                  type="password"
                  name="contrasena_actual"
                  value={formPassword.contrasena_actual}
                  onChange={handleChangePassword}
                  required
                />
              </div>

              <div>
                <label className="etiqueta">Contraseña nueva</label>
                <input
                  className="campo"
                  type="password"
                  name="contrasena_nueva"
                  value={formPassword.contrasena_nueva}
                  onChange={handleChangePassword}
                  minLength={8}
                  maxLength={20}
                  placeholder="Entre 8 y 20 caracteres"
                  required
                />
              </div>

              <div>
                <label className="etiqueta">Confirmar contraseña nueva</label>
                <input
                  className="campo"
                  type="password"
                  name="confirmar_contrasena"
                  value={formPassword.confirmar_contrasena}
                  onChange={handleChangePassword}
                  minLength={8}
                  maxLength={20}
                  required
                />
              </div>

              <button type="submit" disabled={cambiandoPassword} className="btn btn-primario w-full">
                {cambiandoPassword ? 'Guardando…' : 'Cambiar contraseña'}
              </button>
            </form>
          </PanelSeccion>
        </div>
      )}

      <Toast
        mensaje={toastMensaje}
        tipo={toastTipo}
        visible={toastVisible}
        onCerrar={() => setToastVisible(false)}
      />
    </DashboardLayout>
  );
};
