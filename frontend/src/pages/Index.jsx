import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Carousel } from '../components/Carousel';
import { useCarrito } from '../context/carritoContexto';
import { obtenerProductos, obtenerServiciosApi } from '../services/api';
import { formatearPrecio, formatearDuracion, resolverImagen } from '../utils/formato';
import { IconoFlecha, IconoReloj, IconoCarrito } from '../components/ui/Iconos';

const CIFRAS = [
  { valor: '300+', etiqueta: 'Modelos' },
  { valor: '15', etiqueta: 'Marcas' },
  { valor: '200 km/h', etiqueta: 'Alto rendimiento' },
  { valor: '24/7', etiqueta: 'Soporte' },
];

export const Index = () => {
  const [productos, setProductos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const { agregar } = useCarrito();

  useEffect(() => {
    // La portada muestra lo que realmente está publicado en el panel.
    obtenerProductos().then(setProductos).catch(() => setProductos([]));
    obtenerServiciosApi().then(setServicios).catch(() => setServicios([]));
  }, []);

  const destacados = productos.slice(0, 4);
  const serviciosDestacados = servicios.slice(0, 3);

  return (
    <div className="bg-canvas">
      <Header />
      <Carousel />

      {/* --- Cifras --- */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 py-12 text-center md:grid-cols-4">
          {CIFRAS.map((cifra) => (
            <div key={cifra.etiqueta}>
              <p className="titular text-4xl">{cifra.valor}</p>
              <p className="rotulo mt-2">{cifra.etiqueta}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- Modelos destacados --- */}
      <section className="mx-auto max-w-7xl px-6 py-20 md:px-8 md:py-28">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="rotulo">Catálogo</p>
            <h2 className="titular mt-2 text-5xl md:text-6xl">
              Modelos <span className="text-brand">destacados</span>
            </h2>
          </div>

          <Link to="/modelos" className="btn btn-contorno">
            Ver todo el catálogo
            <IconoFlecha className="h-4 w-4" />
          </Link>
        </div>

        {destacados.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line bg-surface px-6 py-20 text-center">
            <p className="text-ink-mute">
              Aún no hay modelos publicados. Agrégalos desde el panel de administración.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {destacados.map((producto, indice) => {
              const imagen = resolverImagen(producto.imagen_url);

              return (
                <Link
                  key={producto.id}
                  to={`/modelos/${producto.id}`}
                  style={{ animationDelay: `${indice * 70}ms` }}
                  className="tarjeta tarjeta-hover group overflow-hidden animate-subir"
                >
                  <div className="h-56 overflow-hidden bg-canvas">
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
                  </div>

                  <div className="p-5">
                    <span className="insignia insignia-neutra capitalize">{producto.categoria}</span>
                    <h3 className="titular mt-2.5 text-xl">{producto.nombre}</h3>
                    <p className="mt-1.5 line-clamp-2 text-sm text-ink-soft">
                      {producto.descripcion}
                    </p>

                    <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                      <span className="text-sm font-bold tabular-nums text-ink">
                        {formatearPrecio(producto.precio)}
                      </span>
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
      </section>

      {/* --- Servicios --- */}
      {serviciosDestacados.length > 0 && (
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-7xl px-6 py-20 md:px-8 md:py-28">
            <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="rotulo">Taller</p>
                <h2 className="titular mt-2 text-5xl md:text-6xl">
                  Mantenla <span className="text-brand">a punto</span>
                </h2>
                <p className="mt-4 max-w-md text-ink-soft">
                  Agenda el mantenimiento de tu máquina en línea. Agrega los
                  servicios al carrito y confirma; nosotros te contactamos.
                </p>
              </div>

              <Link to="/servicios" className="btn btn-contorno">
                Ver todos los servicios
                <IconoFlecha className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {serviciosDestacados.map((servicio) => {
                const duracion = formatearDuracion(servicio.duracion_min);

                return (
                  <article key={servicio.id} className="tarjeta tarjeta-hover flex flex-col p-6">
                    <span className="insignia insignia-marca w-fit capitalize">
                      {servicio.categoria}
                    </span>

                    <h3 className="titular mt-3 text-2xl">{servicio.nombre}</h3>

                    {duracion && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-mute">
                        <IconoReloj className="h-3.5 w-3.5" />
                        {duracion} aprox.
                      </p>
                    )}

                    <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">
                      {servicio.descripcion}
                    </p>

                    <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-5">
                      <span className="titular text-2xl tabular-nums">
                        {formatearPrecio(servicio.precio)}
                      </span>

                      <button
                        onClick={() =>
                          agregar({
                            tipo: 'servicio',
                            id: servicio.id,
                            nombre: servicio.nombre,
                            precio: servicio.precio,
                            imagenUrl: servicio.imagen_url,
                          })
                        }
                        className="btn btn-primario"
                      >
                        <IconoCarrito className="h-4 w-4" />
                        Agregar
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* --- Llamado final --- */}
      <section className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="overflow-hidden rounded-3xl bg-ink px-8 py-20 text-center md:px-16">
          <p className="rotulo !text-white/50">Tu próxima máquina</p>
          <h2 className="titular mt-3 text-5xl !text-white md:text-7xl">
            ¿Listo para <span className="text-brand">rodar</span>?
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-white/60">
            Explora el catálogo completo de motos y autos de alto rendimiento,
            o escríbenos y te asesoramos sin compromiso.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link to="/modelos" className="btn btn-marca">
              Ver catálogo
            </Link>
            <Link
              to="/contacto"
              className="btn border border-white/25 bg-transparent text-white hover:border-white hover:bg-white hover:text-ink"
            >
              Hablar con un asesor
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
