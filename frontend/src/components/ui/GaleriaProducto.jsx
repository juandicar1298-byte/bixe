import { useRef, useState } from 'react';
import { agregarImagenApi, eliminarImagenApi, subirImagenApi } from '../../services/api';
import { resolverImagen } from '../../utils/formato';
import { IconoBasura, IconoMas } from './Iconos';

const MAXIMO = 8;

/**
 * Fotos adicionales de un producto. La portada se elige aparte con
 * SelectorImagen; esto es la galería que se ve en la ficha del modelo.
 *
 * Solo aparece al editar, porque hace falta el id del producto para asociar
 * cada foto.
 */
export const GaleriaProducto = ({ productoId, imagenes, onCambio, onError }) => {
  const inputRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);

  const subir = async (archivos) => {
    const lista = [...archivos].filter((a) => a.type.startsWith('image/'));
    if (lista.length === 0) return;

    const espacio = MAXIMO - imagenes.length;
    if (espacio <= 0) {
      onError?.(`La galería admite como máximo ${MAXIMO} fotos.`);
      return;
    }

    setSubiendo(true);
    try {
      // Se suben de una en una para poder avisar del primer fallo sin dejar
      // el resto a medias.
      for (const archivo of lista.slice(0, espacio)) {
        const { url } = await subirImagenApi(archivo);
        await agregarImagenApi(productoId, { url });
      }

      if (lista.length > espacio) {
        onError?.(`Solo cabían ${espacio} fotos más; el resto no se subieron.`);
      }
      await onCambio();
    } catch (error) {
      onError?.(error.message);
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const quitar = async (imagen) => {
    try {
      await eliminarImagenApi(productoId, imagen.id);
      await onCambio();
    } catch (error) {
      onError?.(error.message);
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="etiqueta !mb-0">Galería del modelo</span>
        <span className="text-[0.7rem] text-ink-mute">
          {imagenes.length} de {MAXIMO}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
        className="hidden"
        onChange={(evento) => subir(evento.target.files)}
      />

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {imagenes.map((imagen) => (
          <div
            key={imagen.id}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-line bg-canvas"
          >
            <img
              src={resolverImagen(imagen.url)}
              alt={imagen.descripcion || ''}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => quitar(imagen)}
              aria-label="Quitar foto"
              className="absolute inset-0 grid place-items-center bg-ink/60 text-white opacity-0 backdrop-blur-[2px] transition group-hover:opacity-100"
            >
              <IconoBasura className="h-5 w-5" />
            </button>
          </div>
        ))}

        {imagenes.length < MAXIMO && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(evento) => {
              evento.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(evento) => {
              evento.preventDefault();
              setArrastrando(false);
              subir(evento.dataTransfer.files);
            }}
            disabled={subiendo}
            className={`flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-xs transition ${
              arrastrando
                ? 'border-brand bg-brand-wash text-brand-deep'
                : 'border-line-fuerte bg-veil text-ink-mute hover:border-brand hover:bg-brand-wash hover:text-brand-deep'
            }`}
          >
            {subiendo ? (
              <span className="text-[0.7rem]">Subiendo…</span>
            ) : (
              <>
                <IconoMas className="h-5 w-5" />
                <span className="text-[0.7rem]">Agregar</span>
              </>
            )}
          </button>
        )}
      </div>

      <p className="mt-2 text-[0.7rem] text-ink-mute">
        Puedes elegir varias a la vez o arrastrarlas. La portada se define
        arriba y también aparece en la galería.
      </p>
    </div>
  );
};
