import { useState, useEffect, useMemo } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { ModalServicio } from '../components/ModalServicio';
import { useCarrito } from '../context/carritoContexto';
import { obtenerServiciosApi } from '../services/api';
import { formatearPrecio, formatearDuracion, resolverImagen } from '../utils/formato';
import { IconoReloj, IconoCarrito } from '../components/ui/Iconos';
import { RejillaEsqueleto } from '../components/ui/RejillaEsqueleto';

export const Servicios = () => {
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [categoria, setCategoria] = useState('todas');

  const { agregar, estaEnCarrito } = useCarrito();
  const [detalle, setDetalle] = useState(null);

  useEffect(() => {
    obtenerServiciosApi()
      .then(setServicios)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, []);

  // Las categorías salen de los datos, así que no hay que tocar código
  // cuando el admin invente una nueva desde el panel.
  const categorias = useMemo(
    () => ['todas', ...new Set(servicios.map((s) => s.categoria).filter(Boolean))],
    [servicios]
  );

  const visibles = useMemo(
    () => (categoria === 'todas' ? servicios : servicios.filter((s) => s.categoria === categoria)),
    [servicios, categoria]
  );

  return (
    <div className="min-h-screen bg-canvas">
      <Header />

      {/* --- Encabezado --- */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center md:py-20">
          <p className="rotulo">Taller BIXE</p>
          <h1 className="titular mt-3 text-5xl md:text-7xl">
            Servicios
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink-soft">
            Mantenimiento, mecánica y estética para tu máquina. Arma tu paquete,
            agrégalo al carrito y confirma en un par de clics.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* --- Filtro por categoría --- */}
        {categorias.length > 2 && (
          <div className="mb-9 flex flex-wrap justify-center gap-2">
            {categorias.map((valor) => (
              <button
                key={valor}
                onClick={() => setCategoria(valor)}
                className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider capitalize transition ${
                  categoria === valor
                    ? 'border-ink bg-ink text-white'
                    : 'border-line bg-surface text-ink-soft hover:border-ink-faint hover:text-ink'
                }`}
              >
                {valor}
              </button>
            ))}
          </div>
        )}

        {error && <p className="py-16 text-center text-peligro">{error}</p>}

        {!cargando && !error && visibles.length === 0 && (
          <p className="py-16 text-center text-ink-mute">
            Todavía no hay servicios publicados en esta categoría.
          </p>
        )}

        {cargando ? (
          <RejillaEsqueleto cantidad={6} columnas={3} etiqueta="Cargando servicios…" />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visibles.map((servicio, indice) => {
              const imagen = resolverImagen(servicio.imagen_url);
              const duracion = formatearDuracion(servicio.duracion_min);
              const yaAgregado = estaEnCarrito('servicio', servicio.id);

              return (
                <article
                  key={servicio.id}
                  style={{ animationDelay: `${Math.min(indice, 8) * 55}ms` }}
                  onClick={() => setDetalle(servicio)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(evento) => {
                    if (evento.key === 'Enter' || evento.key === ' ') {
                      evento.preventDefault();
                      setDetalle(servicio);
                    }
                  }}
                  className="tarjeta tarjeta-hover flex cursor-pointer flex-col overflow-hidden animate-mosaico"
                >
                  <div className="relative h-44 overflow-hidden bg-canvas">
                    {imagen ? (
                      <img
                        src={imagen}
                        alt={servicio.nombre}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-gradient-to-br from-canvas to-brand-wash">
                        <span className="text-2xl font-bold uppercase tracking-[0.3em] text-ink-faint">
                          BIXE
                        </span>
                      </div>
                    )}

                    <span className="insignia insignia-marca absolute left-3 top-3 capitalize backdrop-blur">
                      {servicio.categoria}
                    </span>

                    {servicio.imagenes?.length > 0 && (
                      <span className="absolute right-3 top-3 rounded-full bg-ink/70 px-2.5 py-1 text-[0.7rem] font-semibold tabular-nums text-white backdrop-blur">
                        {servicio.imagenes.length + (servicio.imagen_url ? 1 : 0)} fotos
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="titular text-xl">{servicio.nombre}</h2>

                    {duracion && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-mute">
                        <IconoReloj className="h-3.5 w-3.5" />
                        {duracion} aprox.
                      </p>
                    )}

                    <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">
                      {servicio.descripcion}
                    </p>

                    <div className="mt-5 flex items-end justify-between gap-3 border-t border-line pt-4">
                      <div>
                        <p className="text-[0.65rem] uppercase tracking-wider text-ink-mute">Desde</p>
                        <p className="titular text-2xl tabular-nums">
                          {formatearPrecio(servicio.precio)}
                        </p>
                      </div>

                      <button
                        onClick={(evento) => {
                          // El clic no debe abrir además el detalle de la tarjeta.
                          evento.stopPropagation();
                          agregar({
                            tipo: 'servicio',
                            id: servicio.id,
                            nombre: servicio.nombre,
                            precio: servicio.precio,
                            imagenUrl: servicio.imagen_url,
                          });
                        }}
                        className={`btn ${yaAgregado ? 'btn-contorno' : 'btn-primario'}`}
                      >
                        <IconoCarrito className="h-4 w-4" />
                        {yaAgregado ? 'Agregar otro' : 'Agregar'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <ModalServicio
        servicio={detalle}
        onCerrar={() => setDetalle(null)}
        onAgregar={(s) =>
          agregar({
            tipo: 'servicio',
            id: s.id,
            nombre: s.nombre,
            precio: s.precio,
            imagenUrl: s.imagen_url,
          })
        }
      />

      <Footer />
    </div>
  );
};
