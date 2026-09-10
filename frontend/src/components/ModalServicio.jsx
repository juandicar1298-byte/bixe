import { useState, useMemo } from 'react';
import { Modal } from './ui/Modal';
import { IconoCarrito, IconoFlecha, IconoReloj } from './ui/Iconos';
import { formatearPrecio, formatearDuracion, resolverImagen } from '../utils/formato';

/**
 * Detalle de un servicio: la galería de fotos y la descripción larga, que no
 * caben en la tarjeta del catálogo. Desde aquí también se agrega al carrito.
 */
export const ModalServicio = ({ servicio, onCerrar, onAgregar }) => {
  const [indice, setIndice] = useState(0);

  // La portada encabeza la galería, sin repetirse si también está en la lista.
  const fotos = useMemo(() => {
    if (!servicio) return [];

    const candidatas = [
      { url: servicio.imagen_url, descripcion: servicio.nombre },
      ...(servicio.imagenes ?? []),
    ];

    const vistas = new Set();
    return candidatas
      .filter((foto) => foto.url && !vistas.has(foto.url) && vistas.add(foto.url))
      .map((foto) => ({ ...foto, url: resolverImagen(foto.url) }));
  }, [servicio]);

  if (!servicio) return null;

  const duracion = formatearDuracion(servicio.duracion_min);

  const cerrar = () => {
    setIndice(0);
    onCerrar();
  };

  return (
    <Modal
      abierto={Boolean(servicio)}
      onCerrar={cerrar}
      titulo={servicio.nombre}
      descripcion={duracion ? `Duración aproximada: ${duracion}` : undefined}
      ancho="max-w-2xl"
    >
      <div className="space-y-5">
        {/* --------------------------- Galería --------------------------- */}
        {fotos.length > 0 ? (
          <div>
            <div className="relative overflow-hidden rounded-2xl border border-line bg-canvas">
              <img
                key={fotos[indice].url}
                src={fotos[indice].url}
                alt={fotos[indice].descripcion || servicio.nombre}
                className="h-56 w-full object-cover animate-aparecer md:h-72"
              />

              {fotos.length > 1 && (
                <>
                  <button
                    onClick={() => setIndice((i) => (i - 1 + fotos.length) % fotos.length)}
                    aria-label="Foto anterior"
                    className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-surface/85 text-ink shadow-suave backdrop-blur transition hover:bg-surface"
                  >
                    <IconoFlecha className="h-4 w-4 rotate-180" />
                  </button>
                  <button
                    onClick={() => setIndice((i) => (i + 1) % fotos.length)}
                    aria-label="Foto siguiente"
                    className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-surface/85 text-ink shadow-suave backdrop-blur transition hover:bg-surface"
                  >
                    <IconoFlecha className="h-4 w-4" />
                  </button>

                  <span className="absolute bottom-3 right-3 rounded-full bg-ink/70 px-2.5 py-1 text-[0.7rem] font-semibold tabular-nums text-white backdrop-blur">
                    {indice + 1} / {fotos.length}
                  </span>
                </>
              )}
            </div>

            {fotos.length > 1 && (
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {fotos.map((foto, i) => (
                  <button
                    key={foto.url}
                    onClick={() => setIndice(i)}
                    aria-label={`Ver foto ${i + 1}`}
                    aria-current={i === indice}
                    className={`h-14 w-18 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                      i === indice
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
        ) : (
          <div className="grid h-40 place-items-center rounded-2xl border border-dashed border-line bg-veil">
            <span className="text-xl font-bold uppercase tracking-[0.3em] text-ink-faint">
              BIXE
            </span>
          </div>
        )}

        {/* --------------------------- Detalle --------------------------- */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="insignia insignia-marca capitalize">{servicio.categoria}</span>
          {duracion && (
            <span className="insignia insignia-neutra">
              <IconoReloj className="h-3 w-3" />
              {duracion}
            </span>
          )}
        </div>

        {servicio.descripcion && (
          <p className="text-sm leading-relaxed text-ink-soft">{servicio.descripcion}</p>
        )}

        {servicio.descripcion_larga && (
          <div>
            <p className="rotulo mb-2">Qué incluye</p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">
              {servicio.descripcion_larga}
            </p>
          </div>
        )}

        {/* ---------------------------- Precio ---------------------------- */}
        <div className="flex items-end justify-between gap-4 border-t border-line pt-5">
          <div>
            <p className="rotulo">Desde</p>
            <p className="titular text-3xl tabular-nums">
              {formatearPrecio(servicio.precio)}
            </p>
          </div>

          <button
            onClick={() => {
              onAgregar(servicio);
              cerrar();
            }}
            className="btn btn-primario"
          >
            <IconoCarrito className="h-4 w-4" />
            Agregar al carrito
          </button>
        </div>
      </div>
    </Modal>
  );
};
