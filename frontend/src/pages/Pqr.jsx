import { useState } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { consultarPqrPorRadicadoApi, radicarPqrApi } from '../services/api';
import { formatearFechaHora } from '../utils/formato';
import { ETIQUETA_ESTADO, INSIGNIA_PQR, TIPOS_PQR } from '../utils/pqr';

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VACIO = {
  tipo: 'peticion',
  asunto: '',
  mensaje: '',
  nombre_contacto: '',
  email_contacto: '',
};

/**
 * Página pública de PQR: radicar una solicitud y consultar su estado.
 *
 * Funciona con y sin sesión. Con sesión, el nombre y el correo salen de la
 * cuenta; sin ella hay que indicarlos, y el número de radicado es lo único
 * que hace falta después para seguir la solicitud.
 */
export const Pqr = () => {
  const { usuario } = useAuth();

  const [datos, setDatos] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [radicada, setRadicada] = useState(null);

  const [radicado, setRadicado] = useState('');
  const [consulta, setConsulta] = useState(null);
  const [errorConsulta, setErrorConsulta] = useState('');
  const [consultando, setConsultando] = useState(false);

  const validar = () => {
    const nuevos = {};
    if (datos.asunto.trim().length < 5) nuevos.asunto = 'Mínimo 5 caracteres.';
    if (datos.mensaje.trim().length < 15) {
      nuevos.mensaje = 'Cuéntanos con algo más de detalle (mínimo 15 caracteres).';
    }
    if (!usuario) {
      if (datos.nombre_contacto.trim().length < 3) {
        nuevos.nombre_contacto = 'Escribe tu nombre.';
      }
      if (!REGEX_EMAIL.test(datos.email_contacto)) {
        nuevos.email_contacto = 'Necesitamos un correo válido para responderte.';
      }
    }
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const cambiar = (evento) => {
    const { name, value } = evento.target;
    setDatos((previos) => ({ ...previos, [name]: value }));
  };

  const enviar = async (evento) => {
    evento.preventDefault();
    if (!validar()) return;

    setEnviando(true);
    setError('');
    try {
      const cuerpo = {
        tipo: datos.tipo,
        asunto: datos.asunto.trim(),
        mensaje: datos.mensaje.trim(),
      };
      if (!usuario) {
        cuerpo.nombre_contacto = datos.nombre_contacto.trim();
        cuerpo.email_contacto = datos.email_contacto.trim();
      }
      const respuesta = await radicarPqrApi(cuerpo);
      setRadicada(respuesta);
      setDatos(VACIO);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const buscar = async (evento) => {
    evento.preventDefault();
    if (!radicado.trim()) return;

    setConsultando(true);
    setErrorConsulta('');
    setConsulta(null);
    try {
      setConsulta(await consultarPqrPorRadicadoApi(radicado.trim()));
    } catch (err) {
      setErrorConsulta(err.message);
    } finally {
      setConsultando(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <Header />

      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center md:py-20">
          <p className="rotulo">Atención al cliente</p>
          <h1 className="titular mt-3 text-5xl md:text-7xl">
            P<span className="text-brand">Q</span>R
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink-soft">
            Peticiones, quejas, reclamos y sugerencias. Radica la tuya y te damos
            un número con el que puedes seguirla cuando quieras.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-12 lg:grid-cols-[1.4fr_1fr]">
        {/* --------------------------- Radicar --------------------------- */}
        <section className="tarjeta p-6 md:p-8">
          {radicada ? (
            <div className="space-y-4 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-exito-wash text-exito">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.5 12.5l5 5 10-11" />
                </svg>
              </span>
              <h2 className="titular text-3xl">Solicitud radicada</h2>
              <p className="text-sm text-ink-soft">
                Guarda este número: con él puedes consultar el estado en
                cualquier momento.
              </p>
              <p className="titular text-4xl tracking-[0.15em] text-brand-deep">
                {radicada.radicado}
              </p>
              <p className="text-xs text-ink-mute">
                Te responderemos al correo {radicada.email_contacto}.
              </p>
              <button onClick={() => setRadicada(null)} className="btn btn-contorno">
                Radicar otra
              </button>
            </div>
          ) : (
            <>
              <p className="rotulo">Nueva solicitud</p>
              <h2 className="titular mt-2 text-3xl">Cuéntanos qué pasó</h2>
              <p className="mb-6 mt-2 text-sm text-ink-mute">
                {usuario
                  ? `Radicarás como ${usuario.nombre} ${usuario.apellido}.`
                  : 'Si tienes cuenta, inicia sesión y no tendrás que escribir tus datos.'}
              </p>

              <form onSubmit={enviar} noValidate className="space-y-4">
                <Select
                  label="Tipo de solicitud"
                  name="tipo"
                  value={datos.tipo}
                  onChange={cambiar}
                  placeholder={null}
                  options={TIPOS_PQR}
                />

                <Input
                  label="Asunto"
                  name="asunto"
                  value={datos.asunto}
                  onChange={cambiar}
                  error={errores.asunto}
                  placeholder="Resume el motivo en una línea"
                  maxLength={120}
                />

                <div>
                  <label className="etiqueta" htmlFor="mensaje">
                    Mensaje
                  </label>
                  <textarea
                    id="mensaje"
                    name="mensaje"
                    rows={5}
                    maxLength={2000}
                    className="campo resize-y"
                    placeholder="Cuéntanos con detalle qué ocurrió…"
                    value={datos.mensaje}
                    onChange={cambiar}
                  />
                  {errores.mensaje && (
                    <p className="mt-1.5 text-xs text-peligro">{errores.mensaje}</p>
                  )}
                </div>

                {!usuario && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Tu nombre"
                      name="nombre_contacto"
                      value={datos.nombre_contacto}
                      onChange={cambiar}
                      error={errores.nombre_contacto}
                      placeholder="Nombre y apellido"
                    />
                    <Input
                      label="Tu correo"
                      type="email"
                      name="email_contacto"
                      value={datos.email_contacto}
                      onChange={cambiar}
                      error={errores.email_contacto}
                      placeholder="tucorreo@ejemplo.com"
                    />
                  </div>
                )}

                {error && <p className="text-xs text-peligro">{error}</p>}

                <Button type="submit" disabled={enviando}>
                  {enviando ? 'Radicando…' : 'Radicar solicitud'}
                </Button>
              </form>
            </>
          )}
        </section>

        {/* -------------------------- Consultar -------------------------- */}
        <section className="tarjeta h-fit p-6 md:p-8">
          <p className="rotulo">Seguimiento</p>
          <h2 className="titular mt-2 text-2xl">Consulta tu radicado</h2>
          <p className="mb-5 mt-2 text-sm text-ink-mute">
            Escribe el número que te dimos al radicar.
          </p>

          <form onSubmit={buscar} className="flex gap-2">
            <input
              className="campo"
              placeholder="PQR-000001"
              value={radicado}
              onChange={(evento) => setRadicado(evento.target.value)}
            />
            <button type="submit" disabled={consultando} className="btn btn-primario">
              {consultando ? '…' : 'Buscar'}
            </button>
          </form>

          {errorConsulta && (
            <p className="mt-4 text-xs text-peligro">{errorConsulta}</p>
          )}

          {consulta && (
            <article className="mt-5 space-y-3 rounded-2xl border border-line bg-veil p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="titular text-lg">{consulta.radicado}</span>
                <span className={`insignia ${INSIGNIA_PQR[consulta.estado]}`}>
                  {ETIQUETA_ESTADO[consulta.estado]}
                </span>
              </div>

              <div>
                <p className="rotulo">Asunto</p>
                <p className="text-sm font-semibold text-ink">{consulta.asunto}</p>
              </div>

              <p className="text-xs text-ink-mute">
                Radicada el {formatearFechaHora(consulta.fecha_creacion)}
              </p>

              {consulta.respuesta ? (
                <div className="rounded-xl border border-exito/30 bg-exito-wash p-3">
                  <p className="rotulo mb-1 !text-exito">Respuesta del taller</p>
                  <p className="whitespace-pre-line text-sm text-ink-soft">
                    {consulta.respuesta}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-ink-mute">
                  Todavía no tiene respuesta. Te avisaremos al correo registrado.
                </p>
              )}
            </article>
          )}
        </section>
      </div>

      <Footer />
    </div>
  );
};
