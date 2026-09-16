import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PanelSeccion, EstadoVacio } from './dashboard/PanelSeccion';
import { ETIQUETA_ESTADO, INSIGNIA_PQR } from '../utils/pqr';
import { obtenerMisPqrApi } from '../services/api';
import { formatearFechaHora } from '../utils/formato';

/** Las PQR del propio cliente, con la respuesta del taller si ya la hay. */
export const MisPqr = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    obtenerMisPqrApi({ limite: 50 })
      .then((pagina) => setSolicitudes(pagina.pqr))
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, []);

  return (
    <PanelSeccion
      titulo="Mis solicitudes"
      descripcion="Peticiones, quejas y reclamos que has radicado."
      acciones={
        <Link to="/pqr" className="btn btn-primario">
          Radicar una nueva
        </Link>
      }
    >
      {error && <p className="mb-3 text-xs text-peligro">{error}</p>}

      {cargando ? (
        <p className="py-8 text-center text-ink-mute">Cargando solicitudes…</p>
      ) : solicitudes.length === 0 ? (
        <EstadoVacio
          titulo="No has radicado ninguna"
          descripcion="Si algo no salió como esperabas, cuéntanoslo y le hacemos seguimiento."
          accion={
            <Link to="/pqr" className="btn btn-contorno">
              Radicar una PQR
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {solicitudes.map((solicitud) => (
            <li
              key={solicitud.id}
              className="rounded-2xl border border-line bg-veil p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="titular text-lg">{solicitud.radicado}</span>
                  <span className="insignia insignia-neutra capitalize">
                    {solicitud.tipo}
                  </span>
                </div>
                <span className={`insignia ${INSIGNIA_PQR[solicitud.estado]}`}>
                  {ETIQUETA_ESTADO[solicitud.estado]}
                </span>
              </div>

              <p className="mt-2 text-sm font-semibold text-ink">{solicitud.asunto}</p>
              <p className="mt-1 text-xs text-ink-mute">
                Radicada el {formatearFechaHora(solicitud.fecha_creacion)}
              </p>

              {solicitud.respuesta && (
                <div className="mt-3 rounded-xl border border-exito/30 bg-exito-wash p-3">
                  <p className="rotulo mb-1 !text-exito">Respuesta del taller</p>
                  <p className="whitespace-pre-line text-sm text-ink-soft">
                    {solicitud.respuesta}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </PanelSeccion>
  );
};
