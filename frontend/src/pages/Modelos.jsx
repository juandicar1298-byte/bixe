import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { obtenerProductos } from '../services/api';
import { formatearPrecio, resolverImagen } from '../utils/formato';
import { IconoBuscar } from '../components/ui/Iconos';
import { RejillaEsqueleto } from '../components/ui/RejillaEsqueleto';

const CATEGORIAS = [
  { valor: 'todas', etiqueta: 'Todos' },
  { valor: 'moto', etiqueta: 'Motos' },
  { valor: 'auto', etiqueta: 'Autos' },
];

export const Modelos = () => {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [categoria, setCategoria] = useState('todas');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    obtenerProductos()
      .then(setProductos)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, []);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return productos.filter((p) => {
      if (categoria !== 'todas' && p.categoria !== categoria) return false;
      if (!texto) return true;
      return `${p.nombre} ${p.descripcion ?? ''}`.toLowerCase().includes(texto);
    });
  }, [productos, categoria, busqueda]);

  return (
    <div className="min-h-screen bg-canvas">
      <Header />

      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center md:py-20">
          <p className="rotulo">Catálogo</p>
          <h1 className="titular mt-3 text-5xl md:text-7xl">
            Nuestros <span className="text-brand">modelos</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink-soft">
            Cada máquina de nuestro catálogo, con su ficha técnica completa.
            Filtra por tipo o busca la que ya tienes en mente.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-12 md:px-8">
        {/* --- Filtros --- */}
        <div className="mb-10 flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <div className="flex gap-2">
            {CATEGORIAS.map((item) => (
              <button
                key={item.valor}
                onClick={() => setCategoria(item.valor)}
                className={`rounded-full border px-5 py-2 text-xs font-bold uppercase tracking-wider transition ${
                  categoria === item.valor
                    ? 'border-ink bg-ink text-white'
                    : 'border-line bg-surface text-ink-soft hover:border-ink-faint hover:text-ink'
                }`}
              >
                {item.etiqueta}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <IconoBuscar className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              className="campo !rounded-full !pl-10"
              placeholder="Buscar modelo…"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
            />
          </div>
        </div>

        {error && <p className="py-20 text-center text-peligro">{error}</p>}

        {!cargando && !error && visibles.length === 0 && (
          <p className="py-20 text-center text-ink-mute">
            No encontramos modelos con esos criterios.
          </p>
        )}

        {cargando ? (
          <RejillaEsqueleto cantidad={6} columnas={3} etiqueta="Cargando modelos…" />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visibles.map((producto, indice) => {
              const imagen = resolverImagen(producto.imagen_url);

              return (
                <Link
                  key={producto.id}
                  to={`/modelos/${producto.id}`}
                  style={{ animationDelay: `${Math.min(indice, 8) * 55}ms` }}
                  className="tarjeta tarjeta-hover group overflow-hidden animate-mosaico"
                >
                  <div className="relative h-60 overflow-hidden bg-canvas">
                    {imagen ? (
                      <img
                        src={imagen}
                        alt={producto.nombre}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-gradient-to-br from-canvas to-brand-wash">
                        <span className="text-xl font-bold uppercase tracking-[0.3em] text-ink-faint">
                          BIXE
                        </span>
                      </div>
                    )}

                    <span className="insignia insignia-neutra absolute left-3 top-3 capitalize backdrop-blur">
                      {producto.categoria}
                    </span>
                  </div>

                  <div className="p-5">
                    <h2 className="titular text-2xl">{producto.nombre}</h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">
                      {producto.descripcion}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {producto.cilindraje && (
                        <span className="insignia insignia-neutra">{producto.cilindraje} cc</span>
                      )}
                      {producto.potencia && (
                        <span className="insignia insignia-neutra">{producto.potencia}</span>
                      )}
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                      <div>
                        <p className="text-[0.65rem] uppercase tracking-wider text-ink-mute">Desde</p>
                        <p className="titular text-xl tabular-nums">
                          {formatearPrecio(producto.precio)}
                        </p>
                      </div>
                      <span className="accion text-ink-mute transition group-hover:text-brand-deep">
                        Ver ficha →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};
