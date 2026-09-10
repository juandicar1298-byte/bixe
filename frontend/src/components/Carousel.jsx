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
  const [visible, setVisible] = useState(true);

  const cambiarSlide = useCallback((calcularNuevo) => {
    setVisible(false);
    setTimeout(() => {
      setIndice(calcularNuevo);
      setVisible(true);
    }, 320);
  }, []);

  useEffect(() => {
    const temporizador = setInterval(() => {
      cambiarSlide((previo) => (previo === items.length - 1 ? 0 : previo + 1));
    }, DURACION);
    return () => clearInterval(temporizador);
  }, [cambiarSlide]);

  const anterior = () => cambiarSlide((previo) => (previo === 0 ? items.length - 1 : previo - 1));
  const siguiente = () => cambiarSlide((previo) => (previo === items.length - 1 ? 0 : previo + 1));

  const actual = items[indice];

  return (
    <div className="relative h-[88vh] w-full overflow-hidden bg-ink">
      <img
        src={actual.img}
        alt={actual.titulo}
        className={`h-full w-full object-cover transition-all duration-500 ease-out ${
          visible ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
        }`}
      />

      {/* Degradados: uno para el texto abajo, otro para que el header respire */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/45 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink/50 to-transparent" />

      {/* --- Controles --- */}
      <button
        onClick={anterior}
        aria-label="Modelo anterior"
        className="absolute left-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/25 text-white backdrop-blur-sm transition hover:border-white hover:bg-white hover:text-ink md:left-8"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <button
        onClick={siguiente}
        aria-label="Modelo siguiente"
        className="absolute right-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/25 text-white backdrop-blur-sm transition hover:border-white hover:bg-white hover:text-ink md:right-8"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      {/* --- Texto principal --- */}
      <div className="absolute inset-x-0 bottom-0">
        <div className="mx-auto max-w-7xl px-6 pb-12 md:px-8 md:pb-16">
          <div
            className={`max-w-2xl transition-all duration-500 ease-out ${
              visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
          >
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
                onClick={() => cambiarSlide(() => i)}
                aria-label={`Ir a ${item.titulo}`}
                className={`h-[3px] rounded-full transition-all duration-300 ${
                  i === indice ? 'w-12 bg-brand' : 'w-5 bg-white/30 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
