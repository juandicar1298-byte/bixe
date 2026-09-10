import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { useCarrito } from '../context/carritoContexto';
import { obtenerProductoPorId } from '../services/api';
import { formatearPrecio, resolverImagen } from '../utils/formato';
import { IconoCarrito, IconoFlecha } from '../components/ui/Iconos';

// Solo se muestran las filas que el producto realmente tenga cargadas.
const FICHA = [
  { clave: 'cilindraje', etiqueta: 'Cilindraje', sufijo: ' cc' },
  { clave: 'potencia', etiqueta: 'Potencia' },
  { clave: 'torque', etiqueta: 'Torque' },
  { clave: 'velocidad_maxima', etiqueta: 'Velocidad máxima' },
  { clave: 'peso', etiqueta: 'Peso' },
  { clave: 'transmision', etiqueta: 'Transmisión' },
  { clave: 'combustible', etiqueta: 'Combustible' },
];

const Envoltura = ({ children }) => (
  <div className="min-h-screen bg-canvas">
    <Header />
    {children}
    <Footer />
  </div>
);

export const ModeloDetalle = () => {
  const { id } = useParams();
  const [producto, setProducto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const { agregar } = useCarrito();
  const [indiceFoto, setIndiceFoto] = useState(0);

  // La portada va primero y luego la galería, sin repetir la misma URL.
  const fotos = useMemo(() => {
    if (!producto) return [];

    const candidatas = [
      { url: producto.imagen_url, descripcion: producto.nombre },
      ...(producto.imagenes ?? []),
    ];

    const vistas = new Set();
    return candidatas
      .filter((foto) => foto.url && !vistas.has(foto.url) && vistas.add(foto.url))
      .map((foto) => ({ ...foto, url: resolverImagen(foto.url) }));
  }, [producto]);

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      try {
        const data = await obtenerProductoPorId(id);
        setProducto(data);
        setIndiceFoto(0);
        setError('');
      } catch (err) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [id]);

  if (cargando) {
    return (
      <Envoltura>
        <p className="py-32 text-center text-ink-mute">Cargando modelo…</p>
      </Envoltura>
    );
  }

  if (error || !producto) {
    return (
      <Envoltura>
        <div className="px-6 py-32 text-center">
          <h1 className="titular text-4xl">Modelo no encontrado</h1>
          <p className="mt-3 text-ink-mute">{error || 'Este modelo ya no está disponible.'}</p>
          <Link to="/modelos" className="btn btn-primario mt-8">
            Volver al catálogo
          </Link>
        </div>
      </Envoltura>
    );
  }

  const especificaciones = FICHA.filter((fila) => producto[fila.clave]);

  return (
    <Envoltura>
      <div className="mx-auto max-w-7xl px-6 py-10 md:px-8">
        <Link
          to="/modelos"
          className="accion inline-flex items-center gap-1.5 text-ink-mute transition hover:text-brand-deep"
        >
          <IconoFlecha className="h-3.5 w-3.5 rotate-180" />
          Volver al catálogo
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
          {/* --- Galería --- */}
          <div>
            <div className="relative overflow-hidden rounded-3xl border border-line bg-surface">
              {fotos.length > 0 ? (
                <>
                  <img
                    key={fotos[indiceFoto].url}
                    src={fotos[indiceFoto].url}
                    alt={fotos[indiceFoto].descripcion || producto.nombre}
                    className="h-[340px] w-full object-cover animate-aparecer md:h-[480px]"
                  />

                  {fotos.length > 1 && (
                    <>
                      <button
                        onClick={() => setIndiceFoto((i) => (i - 1 + fotos.length) % fotos.length)}
                        aria-label="Foto anterior"
                        className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-surface/85 text-ink shadow-suave backdrop-blur transition hover:bg-surface"
                      >
                        <IconoFlecha className="h-4 w-4 rotate-180" />
                      </button>
                      <button
                        onClick={() => setIndiceFoto((i) => (i + 1) % fotos.length)}
                        aria-label="Foto siguiente"
                        className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-surface/85 text-ink shadow-suave backdrop-blur transition hover:bg-surface"
                      >
                        <IconoFlecha className="h-4 w-4" />
                      </button>

                      <span className="absolute bottom-3 right-3 rounded-full bg-ink/70 px-2.5 py-1 text-[0.7rem] font-semibold tabular-nums text-white backdrop-blur">
                        {indiceFoto + 1} / {fotos.length}
                      </span>
                    </>
                  )}
                </>
              ) : (
                <div className="grid h-[340px] w-full place-items-center bg-gradient-to-br from-canvas to-brand-wash md:h-[480px]">
                  <span className="text-3xl font-bold uppercase tracking-[0.3em] text-ink-faint">
                    BIXE
                  </span>
                </div>
              )}
            </div>

            {/* --- Miniaturas --- */}
            {fotos.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {fotos.map((foto, i) => (
                  <button
                    key={foto.url}
                    onClick={() => setIndiceFoto(i)}
                    aria-label={`Ver foto ${i + 1}`}
                    aria-current={i === indiceFoto}
                    className={`h-16 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                      i === indiceFoto
                        ? 'border-brand'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={foto.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* --- Información --- */}
          <div className="animate-subir">
            <span className="insignia insignia-marca capitalize">{producto.categoria}</span>

            <h1 className="titular mt-4 text-5xl md:text-6xl">{producto.nombre}</h1>

            <p className="mt-4 text-base leading-relaxed text-ink-soft">
              {producto.descripcion}
            </p>

            <div className="mt-7 flex items-end gap-3 border-y border-line py-6">
              <div>
                <p className="rotulo">Precio</p>
                <p className="titular mt-1 text-4xl tabular-nums">
                  {formatearPrecio(producto.precio)}
                </p>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                onClick={() =>
                  agregar({
                    tipo: 'producto',
                    id: producto.id,
                    nombre: producto.nombre,
                    precio: producto.precio,
                    imagenUrl: producto.imagen_url,
                  })
                }
                className="btn btn-primario"
              >
                <IconoCarrito className="h-4 w-4" />
                Agregar al carrito
              </button>

              <Link to="/contacto" className="btn btn-contorno">
                Consultar por este modelo
              </Link>
            </div>

            {/* --- Ficha técnica --- */}
            {especificaciones.length > 0 && (
              <div className="mt-10">
                <p className="rotulo mb-3">Ficha técnica</p>
                <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                  {especificaciones.map((fila) => (
                    <div
                      key={fila.clave}
                      className="flex items-baseline justify-between gap-4 border-b border-line py-3"
                    >
                      <dt className="text-xs uppercase tracking-wider text-ink-mute">
                        {fila.etiqueta}
                      </dt>
                      <dd className="text-sm font-semibold text-ink">
                        {producto[fila.clave]}
                        {fila.sufijo ?? ''}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>

        {/* --- Descripción larga --- */}
        {producto.descripcion_larga && (
          <section className="mt-16 max-w-3xl">
            <p className="rotulo">Sobre este modelo</p>
            <h2 className="titular mt-2 text-3xl">Los detalles</h2>
            <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-ink-soft">
              {producto.descripcion_larga}
            </p>
          </section>
        )}
      </div>
    </Envoltura>
  );
};
