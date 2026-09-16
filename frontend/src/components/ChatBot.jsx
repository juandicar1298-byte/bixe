import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { enviarMensajeChatApi, estadoAsistenteApi } from '../services/api';
import { IconoChat, IconoCerrar, IconoEnviar } from './ui/Iconos';

// La clave del hilo vive en el navegador para no perder la conversación al
// cambiar de página. Es sessionStorage y no localStorage: al cerrar la
// pestaña, la charla se acaba.
const CLAVE_HILO = 'bixe_chat';

const SALUDO = {
  rol: 'asistente',
  contenido:
    '¡Hola! Soy el asistente de BIXE. Puedo contarte sobre los modelos, los ' +
    'servicios del taller, cómo comprar o cómo radicar una PQR.',
};

const SUGERENCIAS = [
  '¿Qué servicios tiene el taller?',
  '¿Qué motos tienen y cuánto valen?',
  '¿Cómo pago un pedido?',
  'Quiero poner una queja',
];

export const ChatBot = () => {
  const [abierto, setAbierto] = useState(false);
  const [conIa, setConIa] = useState(false);
  const [mensajes, setMensajes] = useState([SALUDO]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const finDeLista = useRef(null);
  const campo = useRef(null);

  useEffect(() => {
    estadoAsistenteApi()
      .then((estado) => setConIa(Boolean(estado.con_ia)))
      .catch(() => setConIa(false));
  }, []);

  useEffect(() => {
    if (abierto) {
      finDeLista.current?.scrollIntoView({ block: 'end' });
      campo.current?.focus();
    }
  }, [abierto, mensajes]);

  const preguntar = async (pregunta) => {
    const limpio = pregunta.trim();
    if (!limpio || enviando) return;

    setMensajes((previos) => [...previos, { rol: 'usuario', contenido: limpio }]);
    setTexto('');
    setEnviando(true);
    setError('');

    try {
      const hilo = sessionStorage.getItem(CLAVE_HILO);
      const respuesta = await enviarMensajeChatApi(limpio, hilo);
      sessionStorage.setItem(CLAVE_HILO, respuesta.conversacion);
      setMensajes((previos) => [
        ...previos,
        { rol: 'asistente', contenido: respuesta.respuesta },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      {/* Botón flotante. Va encima del de WhatsApp, no a su lado, para no
          taparle el sitio a los controles de la propia página. */}
      <button
        onClick={() => setAbierto((previo) => !previo)}
        aria-label={abierto ? 'Cerrar el asistente' : 'Abrir el asistente'}
        aria-expanded={abierto}
        className="fixed bottom-24 right-6 z-[200] grid h-14 w-14 place-items-center rounded-full bg-ink text-white shadow-alta transition hover:scale-110 hover:bg-brand-deep"
      >
        {abierto ? <IconoCerrar className="h-6 w-6" /> : <IconoChat className="h-6 w-6" />}
      </button>

      {abierto && (
        <section
          aria-label="Asistente de BIXE"
          className="tarjeta animate-subir fixed bottom-44 right-6 z-[200] flex h-[min(30rem,70vh)] w-[min(23rem,calc(100vw-3rem))] flex-col overflow-hidden shadow-alta"
        >
          <header className="flex items-start justify-between gap-3 border-b border-line bg-ink px-5 py-4">
            <div>
              <p className="rotulo text-white/50">Asistente BIXE</p>
              <h2 className="titular text-xl text-white">¿En qué te ayudo?</h2>
            </div>
            <span
              className={`insignia ${conIa ? 'insignia-marca' : 'insignia-neutra'} shrink-0`}
              title={
                conIa
                  ? 'Las respuestas las genera un modelo de Inteligencia Artificial.'
                  : 'Respuestas preparadas a partir del catálogo.'
              }
            >
              {conIa ? 'IA' : 'Básico'}
            </span>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {mensajes.map((mensaje, indice) => (
              <div
                key={indice}
                className={`flex ${mensaje.rol === 'usuario' ? 'justify-end' : 'justify-start'}`}
              >
                <p
                  className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    mensaje.rol === 'usuario'
                      ? 'bg-ink text-white'
                      : 'bg-canvas text-ink-soft'
                  }`}
                >
                  {mensaje.contenido}
                </p>
              </div>
            ))}

            {enviando && (
              <div className="flex justify-start">
                <p className="rounded-2xl bg-canvas px-3.5 py-2.5 text-sm text-ink-mute">
                  Escribiendo…
                </p>
              </div>
            )}

            {mensajes.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGERENCIAS.map((sugerencia) => (
                  <button
                    key={sugerencia}
                    onClick={() => preguntar(sugerencia)}
                    className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink-soft transition hover:border-brand hover:text-brand-deep"
                  >
                    {sugerencia}
                  </button>
                ))}
              </div>
            )}

            {error && <p className="text-xs text-peligro">{error}</p>}

            <div ref={finDeLista} />
          </div>

          <form
            onSubmit={(evento) => {
              evento.preventDefault();
              preguntar(texto);
            }}
            className="flex items-center gap-2 border-t border-line px-3 py-3"
          >
            <input
              ref={campo}
              className="campo !rounded-full"
              placeholder="Escribe tu pregunta…"
              maxLength={1000}
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
            />
            <button
              type="submit"
              disabled={enviando || !texto.trim()}
              aria-label="Enviar"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-white transition hover:bg-brand-deep disabled:opacity-40"
            >
              <IconoEnviar className="h-4 w-4" />
            </button>
          </form>

          <p className="border-t border-line bg-veil px-4 py-2 text-center text-[0.7rem] text-ink-mute">
            ¿Necesitas algo formal?{' '}
            <Link
              to="/pqr"
              onClick={() => setAbierto(false)}
              className="font-semibold text-brand-deep hover:underline"
            >
              Radica una PQR
            </Link>
          </p>
        </section>
      )}
    </>
  );
};
