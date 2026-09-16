import { useCallback, useEffect, useState } from 'react';
import { PanelSeccion, EstadoVacio, ContenedorTabla } from './dashboard/PanelSeccion';
import { Select } from './Select';
import { Modal } from './ui/Modal';
import { Toast } from './Toast';
import { ETIQUETA_ESTADO, INSIGNIA_PQR } from '../utils/pqr';
import {
  cambiarEstadoPqrApi,
  obtenerBandejaPqrApi,
  obtenerPqrApi,
  responderPqrApi,
} from '../services/api';
import { formatearFechaHora } from '../utils/formato';
import { IconoBuscar } from './ui/Iconos';

const FILTROS_INICIALES = { texto: '', estado: '', tipo: '', desde: '', hasta: '' };

/** Bandeja de PQR del personal: leer, responder y mover de estado. */
export const GestionPqr = ({ onCambio }) => {
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [solicitudes, setSolicitudes] = useState([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [abierta, setAbierta] = useState(null);
  const [respuesta, setRespuesta] = useState('');
  const [estadoNuevo, setEstadoNuevo] = useState('respondida');
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState('');

  const [toast, setToast] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const pagina = await obtenerBandejaPqrApi({ ...filtros, limite: 50 });
      setSolicitudes(pagina.pqr);
      setTotal(pagina.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => {
    // Cargar al montar y al cambiar los filtros es justo para lo que sirve un
    // efecto. El único estado que cambia de forma síncrona es «cargando».
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  const cambiar = (campo) => (evento) =>
    setFiltros((previos) => ({ ...previos, [campo]: evento.target.value }));

  const abrir = async (id) => {
    try {
      const solicitud = await obtenerPqrApi(id);
      setAbierta(solicitud);
      setRespuesta(solicitud.respuesta ?? '');
      setEstadoNuevo(solicitud.estado === 'cerrada' ? 'cerrada' : 'respondida');
      setErrorModal('');
    } catch (err) {
      setToast({ mensaje: err.message, tipo: 'error' });
    }
  };

  const responder = async (evento) => {
    evento.preventDefault();
    if (respuesta.trim().length < 5) {
      return setErrorModal('Escribe una respuesta para el cliente.');
    }

    setGuardando(true);
    setErrorModal('');
    try {
      await responderPqrApi(abierta.id, {
        respuesta: respuesta.trim(),
        estado: estadoNuevo,
      });
      setToast({ mensaje: `${abierta.radicado} respondida.`, tipo: 'exito' });
      setAbierta(null);
      cargar();
      onCambio?.();
    } catch (err) {
      setErrorModal(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const moverA = async (solicitud, estado) => {
    try {
      await cambiarEstadoPqrApi(solicitud.id, estado);
      setToast({
        mensaje: `${solicitud.radicado}: ${ETIQUETA_ESTADO[estado].toLowerCase()}.`,
        tipo: 'exito',
      });
      cargar();
      onCambio?.();
    } catch (err) {
      setToast({ mensaje: err.message, tipo: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <PanelSeccion
        titulo="Bandeja de PQR"
        descripcion={`${total} solicitud(es) con los filtros actuales.`}
        acciones={
          <button
            onClick={() => setFiltros(FILTROS_INICIALES)}
            className="btn btn-sutil"
          >
            Limpiar filtros
          </button>
        }
      >
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <span className="etiqueta">Buscar</span>
            <IconoBuscar className="pointer-events-none absolute left-3.5 top-[2.15rem] h-4 w-4 text-ink-faint" />
            <input
              className="campo !pl-10"
              placeholder="Radicado, asunto o contacto…"
              value={filtros.texto}
              onChange={cambiar('texto')}
            />
          </div>

          <Select
            label="Estado"
            value={filtros.estado}
            onChange={cambiar('estado')}
            placeholder="Todos"
            options={Object.entries(ETIQUETA_ESTADO).map(([value, label]) => ({
              value,
              label,
            }))}
          />

          <Select
            label="Tipo"
            value={filtros.tipo}
            onChange={cambiar('tipo')}
            placeholder="Todos"
            options={[
              { value: 'peticion', label: 'Petición' },
              { value: 'queja', label: 'Queja' },
              { value: 'reclamo', label: 'Reclamo' },
              { value: 'sugerencia', label: 'Sugerencia' },
            ]}
          />

          <label className="block">
            <span className="etiqueta">Desde</span>
            <input type="date" className="campo" value={filtros.desde} onChange={cambiar('desde')} />
          </label>
        </div>

        {error && <p className="mb-3 text-xs text-peligro">{error}</p>}

        {cargando ? (
          <p className="py-8 text-center text-ink-mute">Cargando solicitudes…</p>
        ) : solicitudes.length === 0 ? (
          <EstadoVacio
            titulo="Bandeja vacía"
            descripcion="No hay solicitudes que cumplan esos criterios."
          />
        ) : (
          <ContenedorTabla>
            <thead>
              <tr className="border-b border-line">
                <th className="th">Radicado</th>
                <th className="th">Tipo</th>
                <th className="th">Asunto</th>
                <th className="th">Contacto</th>
                <th className="th">Estado</th>
                <th className="th">Fecha</th>
                <th className="th text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.map((solicitud) => (
                <tr key={solicitud.id} className="border-b border-line last:border-0">
                  <td className="td font-semibold text-ink">{solicitud.radicado}</td>
                  <td className="td">
                    <span className="insignia insignia-neutra capitalize">
                      {solicitud.tipo}
                    </span>
                  </td>
                  <td className="td max-w-[18rem] truncate">{solicitud.asunto}</td>
                  <td className="td text-xs">
                    {solicitud.nombre_contacto}
                    <br />
                    <span className="text-ink-mute">{solicitud.email_contacto}</span>
                  </td>
                  <td className="td">
                    <span className={`insignia ${INSIGNIA_PQR[solicitud.estado]}`}>
                      {ETIQUETA_ESTADO[solicitud.estado]}
                    </span>
                  </td>
                  <td className="td whitespace-nowrap text-xs">
                    {formatearFechaHora(solicitud.fecha_creacion)}
                  </td>
                  <td className="td space-x-3 whitespace-nowrap text-right">
                    <button
                      onClick={() => abrir(solicitud.id)}
                      className="accion text-brand-deep hover:underline"
                    >
                      Abrir
                    </button>
                    {solicitud.estado === 'pendiente' && (
                      <button
                        onClick={() => moverA(solicitud, 'en_proceso')}
                        className="accion text-ink-mute hover:text-ink"
                      >
                        En proceso
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </ContenedorTabla>
        )}
      </PanelSeccion>

      <Modal
        abierto={Boolean(abierta)}
        onCerrar={() => setAbierta(null)}
        titulo={abierta ? abierta.radicado : ''}
        descripcion={abierta ? abierta.asunto : ''}
        ancho="max-w-2xl"
      >
        {abierta && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="insignia insignia-neutra capitalize">{abierta.tipo}</span>
              <span className={`insignia ${INSIGNIA_PQR[abierta.estado]}`}>
                {ETIQUETA_ESTADO[abierta.estado]}
              </span>
              <span className="text-xs text-ink-mute">
                {formatearFechaHora(abierta.fecha_creacion)}
              </span>
            </div>

            <div className="rounded-2xl bg-veil p-4">
              <p className="rotulo mb-1">Lo que escribió el cliente</p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                {abierta.mensaje}
              </p>
              <p className="mt-3 text-xs text-ink-mute">
                {abierta.nombre_contacto} · {abierta.email_contacto}
                {abierta.usuario ? ' · cuenta registrada' : ' · sin cuenta'}
              </p>
            </div>

            {abierta.atendido_por && (
              <p className="text-xs text-ink-mute">
                Atendida por {abierta.atendido_por.nombre} {abierta.atendido_por.apellido}
                {abierta.fecha_respuesta
                  ? ` el ${formatearFechaHora(abierta.fecha_respuesta)}`
                  : ''}
              </p>
            )}

            {abierta.estado === 'cerrada' ? (
              <div className="rounded-2xl border border-line bg-veil p-4">
                <p className="rotulo mb-1">Respuesta</p>
                <p className="whitespace-pre-line text-sm text-ink-soft">
                  {abierta.respuesta || 'Se cerró sin respuesta.'}
                </p>
                <p className="mt-3 text-xs text-ink-mute">
                  Una solicitud cerrada no se reabre. Si el cliente insiste, radica
                  una nueva y queda el rastro de las dos.
                </p>
              </div>
            ) : (
              <form onSubmit={responder} className="space-y-4">
                <div>
                  <label className="etiqueta" htmlFor="respuesta">
                    Respuesta al cliente
                  </label>
                  <textarea
                    id="respuesta"
                    rows={5}
                    maxLength={2000}
                    className="campo resize-y"
                    placeholder="Explícale qué se hizo o qué se va a hacer…"
                    value={respuesta}
                    onChange={(evento) => setRespuesta(evento.target.value)}
                  />
                </div>

                <Select
                  label="Dejarla en estado"
                  value={estadoNuevo}
                  onChange={(evento) => setEstadoNuevo(evento.target.value)}
                  placeholder={null}
                  options={[
                    { value: 'respondida', label: 'Respondida' },
                    { value: 'cerrada', label: 'Cerrada' },
                  ]}
                />

                {errorModal && <p className="text-xs text-peligro">{errorModal}</p>}

                <button type="submit" disabled={guardando} className="btn btn-primario w-full">
                  {guardando ? 'Enviando…' : 'Guardar respuesta'}
                </button>
              </form>
            )}
          </div>
        )}
      </Modal>

      <Toast
        visible={Boolean(toast)}
        mensaje={toast?.mensaje ?? ''}
        tipo={toast?.tipo ?? 'exito'}
        onCerrar={() => setToast(null)}
      />
    </div>
  );
};
