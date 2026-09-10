import { useState, useEffect } from 'react';

/**
 * Cortina de entrada del sitio.
 *
 * Mientras el navegador termina de bajar imágenes y tipografías se ve una
 * pantalla con el logotipo montándose letra a letra y una barra de progreso.
 * Cuando todo está listo, la pantalla se parte por la mitad y se abre como un
 * telón dejando ver la página.
 *
 * Aparece una sola vez por pestaña: moverse entre secciones no la repite.
 * Para volver a verla sin abrir otra pestaña, basta con entrar a la página
 * con «?intro» al final de la dirección.
 */

const CLAVE = 'bixe:cortina-vista';

// Tiempo mínimo en pantalla. Sin esto, en una carga rápida la cortina daría
// un parpadeo feo en lugar de una animación.
const MINIMO_MS = 1200;

// Lo que tarda el telón en abrirse. Tiene que coincidir con la duración de la
// transición de las dos mitades, más abajo.
const SALIDA_MS = 900;

// Cada cuánto avanza la barra. Los saltos entre un paso y el siguiente los
// suaviza una transición de CSS, así que no hace falta bajar de aquí.
const PASO_MS = 60;

const LETRAS = ['B', 'I', 'X', 'E'];

/** Ni animación ni espera para quien pidió menos movimiento en su sistema. */
const prefiereQuietud = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

export const CortinaCarga = () => {
  // El valor inicial se calcula una sola vez: si ya se vio, el componente
  // no llega a renderizar nada.
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined' || prefiereQuietud()) return false;
    if (new URLSearchParams(window.location.search).has('intro')) return true;
    try {
      return sessionStorage.getItem(CLAVE) === null;
    } catch {
      // Modo incógnito con almacenamiento bloqueado: se muestra igual.
      return true;
    }
  });

  const [progreso, setProgreso] = useState(0);
  const [abriendo, setAbriendo] = useState(false);

  useEffect(() => {
    if (!visible) return undefined;

    const desbordeOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const inicio = Date.now();
    let listo = false;
    let valor = 0;
    let salida = 0;

    // «Listo» es que la página haya terminado de cargar Y que las tipografías
    // estén disponibles; si no, el texto salta de fuente justo al abrirse.
    const esperas = [];
    if (document.readyState !== 'complete') {
      esperas.push(
        new Promise((resolver) => window.addEventListener('load', resolver, { once: true }))
      );
    }
    if (document.fonts) esperas.push(document.fonts.ready);

    Promise.all(esperas).then(() => {
      listo = true;
    });

    function abrirTelon() {
      window.clearInterval(reloj);
      window.clearTimeout(rescate);
      window.clearTimeout(tope);
      setProgreso(100);
      setAbriendo(true);
      salida = window.setTimeout(() => setVisible(false), SALIDA_MS);
    }

    // El avance va por temporizador y no por requestAnimationFrame: en una
    // pestaña que el navegador no está dibujando (en segundo plano, tapada por
    // otra ventana) rAF no se ejecuta nunca y la cortina se quedaría puesta
    // para siempre. Los temporizadores se retrasan, pero siguen llegando.
    const reloj = window.setInterval(() => {
      // Hasta que la página no esté lista la barra se acerca al 92% sin
      // llegar: prometer el 100% antes de tiempo sería mentir.
      const techo = listo && Date.now() - inicio >= MINIMO_MS ? 100 : 92;
      valor = Math.min(techo, valor + (techo - valor) * 0.16 + 1.5);

      if (valor >= 99.5) {
        abrirTelon();
        return;
      }
      setProgreso(valor);
    }, PASO_MS);

    // Dos redes de seguridad. La primera da por cargada la página si algo se
    // quedó colgado; la segunda abre el telón pase lo que pase, porque una
    // animación de adorno no puede dejar el sitio inservible.
    const rescate = window.setTimeout(() => {
      listo = true;
    }, 4000);
    const tope = window.setTimeout(abrirTelon, 8000);

    return () => {
      window.clearInterval(reloj);
      window.clearTimeout(rescate);
      window.clearTimeout(tope);
      window.clearTimeout(salida);
      document.body.style.overflow = desbordeOriginal;
    };
  }, [visible]);

  // Se marca al desaparecer, no al aparecer: si se recarga a media animación,
  // la cortina vuelve a verse entera.
  useEffect(() => {
    if (visible) return;
    try {
      sessionStorage.setItem(CLAVE, '1');
    } catch {
      // Sin almacenamiento la cortina se repetirá; no es un error que valga
      // la pena molestar al usuario.
    }
  }, [visible]);

  if (!visible) return null;

  const porcentaje = Math.round(progreso);

  return (
    // z-[300] la deja por encima de todo lo demás: el botón de WhatsApp vive
    // en 200 y los modales en 120.
    <div
      className="fixed inset-0 z-[300] overflow-hidden"
      style={{ pointerEvents: abriendo ? 'none' : 'auto' }}
    >
      {/* --- Las dos hojas del telón --- */}
      <div
        className={`absolute inset-x-0 top-0 h-1/2 bg-ink transition-transform duration-[900ms] ease-[cubic-bezier(0.76,0,0.24,1)] ${
          abriendo ? '-translate-y-full' : 'translate-y-0'
        }`}
      />
      <div
        className={`absolute inset-x-0 bottom-0 h-1/2 bg-ink transition-transform duration-[900ms] ease-[cubic-bezier(0.76,0,0.24,1)] ${
          abriendo ? 'translate-y-full' : 'translate-y-0'
        }`}
      />

      {/* --- Lo que se ve encima: logotipo y progreso --- */}
      <div
        className={`relative grid h-full place-items-center px-8 transition-opacity duration-[400ms] ${
          abriendo ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="w-full max-w-xs text-center">
          {/* Logotipo: una letra tras otra, con un destello que lo recorre. */}
          <div className="relative overflow-hidden py-2">
            <h1 className="titular flex justify-center text-6xl tracking-[0.18em] text-white md:text-7xl">
              {LETRAS.map((letra, indice) => (
                <span
                  key={letra}
                  className="animate-letra"
                  style={{ animationDelay: `${120 + indice * 90}ms` }}
                >
                  {letra}
                </span>
              ))}
              <span
                className="animate-letra text-brand"
                style={{ animationDelay: `${120 + LETRAS.length * 90}ms` }}
              >
                .
              </span>
            </h1>

            <span aria-hidden="true" className="destello-logo" />
          </div>

          <p
            className="rotulo animate-aparecer mt-5 text-white/40"
            style={{ animationDelay: '650ms' }}
          >
            Motos y autos de alto rendimiento
          </p>

          {/* Barra de progreso */}
          <div
            className="animate-aparecer mt-7"
            style={{ animationDelay: '800ms' }}
            role="progressbar"
            aria-label="Cargando el sitio"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={porcentaje}
          >
            <div className="h-px w-full overflow-hidden bg-white/15">
              <div
                className="h-full bg-brand transition-[width] duration-[120ms] ease-linear"
                style={{ width: `${progreso}%`, boxShadow: '0 0 12px var(--color-brand)' }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-white/35">
              <span>Cargando</span>
              <span className="tabular-nums text-white/70">
                {String(porcentaje).padStart(2, '0')}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
