import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import moto1 from '../assets/images/moto1.png';
import moto2 from '../assets/images/moto2.jpg';
import moto3 from '../assets/images/moto3.png';
import moto4 from '../assets/images/moto4.jpg';
import moto5 from '../assets/images/moto5.jpg';

const items = [
  { img: moto1, categoria: 'La cuota de la velocidad', titulo: 'Moto Deportiva', descripcion: 'Velocidad y estilo en cada curva.' },
  { img: moto2, categoria: 'Movilidad urbana', titulo: 'Moto Urbana', descripcion: 'Ideal para moverte por la ciudad.' },
  { img: moto3, categoria: 'Diseño atemporal', titulo: 'Moto Custom', descripcion: 'Diseño clásico con carácter propio.' },
  { img: moto4, categoria: 'Actitud pura', titulo: 'Moto Naked', descripcion: 'Potencia sin carenado, pura actitud.' },
  { img: moto5, categoria: 'Sin límites', titulo: 'Moto Touring', descripcion: 'Comodidad para largos recorridos.' },
];

const DURACION = 6000;

export const Carousel = () => {
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);

  // Todas las diapositivas están montadas a la vez y solo cambia la opacidad,
  // así que el cambio es inmediato: no hay setTimeout que se pueda apilar ni
  // que deje el desvanecido a medias si se pulsan las flechas rápido.
  const ir = useCallback((calcular) => {
    setIndice((previo) => (calcular(previo) + items.length) % items.length);
  }, []);

  const anterior = useCallback(() => ir((i) => i - 1), [ir]);
  const siguiente = useCallback(() => ir((i) => i + 1), [ir]);

  // El efecto depende de "indice", así que el reloj vuelve a empezar cada vez
  // que se cambia de diapositiva. Sin esto, pulsar una flecha justo antes de
  // que salte sola hacía avanzar dos de golpe.
  useEffect(() => {
    if (pausado) return undefined;

    const temporizador = setTimeout(siguiente, DURACION);
    return () => clearTimeout(temporizador);
  }, [indice, pausado, siguiente]);

  // Flechas del teclado, por accesibilidad.
  useEffect(() => {
    const alPulsar = (evento) => {
      if (evento.key === 'ArrowLeft') anterior();
      if (evento.key === 'ArrowRight') siguiente();
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [anterior, siguiente]);

  const actual = items[indice];

  return (
    <section
      className="relative h-[88vh] w-full overflow-hidden bg-ink"
      aria-roledescription="carrusel"
      aria-label="Modelos destacados"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      {/* Todas las imágenes apiladas; solo una es visible */}
      {items.map((item, i) => (
        <img
          key={item.titulo}
          src={item.img}
          alt={i === indice ? item.titulo : ''}
          aria-hidden={i !== indice}
          loading={i === 0 ? 'eager' : 'lazy'}
          className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out ${
            i === indice ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
          }`}
        />
      ))}

      {/* Degradados: uno para el texto abajo, otro para que el header respire */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/45 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink/50 to-transparent" />

      {/* --- Controles --- */}
      <button
        onClick={anterior}
        aria-label="Modelo anterior"
        className="absolute left-4 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/25 text-white backdrop-blur-sm transition hover:border-white hover:bg-white hover:text-ink md:left-8"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <button
        onClick={siguiente}
        aria-label="Modelo siguiente"
        className="absolute right-4 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/25 text-white backdrop-blur-sm transition hover:border-white hover:bg-white hover:text-ink md:right-8"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      {/* --- Texto principal --- */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="mx-auto max-w-7xl px-6 pb-12 md:px-8 md:pb-16">
          {/* La key hace que React reinicie la animación en cada cambio */}
          <div key={actual.titulo} className="max-w-2xl animate-subir">
            <p className="rotulo !text-white/70">{actual.categoria}</p>

            <h2 className="titular mt-3 text-6xl !text-white md:text-8xl">
              {actual.titulo}
            </h2>

            <p className="mt-4 max-w-md text-base text-white/70">{actual.descripcion}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/modelos" className="btn btn-marca">
                Ver el catálogo
              </Link>
              <Link
                to="/servicios"
                className="btn border border-white/30 bg-white/5 text-white backdrop-blur-sm hover:border-white hover:bg-white hover:text-ink"
              >
                Servicios del taller
              </Link>
            </div>
          </div>

          {/* --- Indicadores --- */}
          <div className="mt-10 flex gap-2">
            {items.map((item, i) => (
              <button
                key={item.titulo}
                onClick={() => setIndice(i)}
                aria-label={`Ir a ${item.titulo}`}
                aria-current={i === indice}
                className={`h-[3px] rounded-full transition-all duration-300 ${
                  i === indice ? 'w-12 bg-brand' : 'w-5 bg-white/30 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
