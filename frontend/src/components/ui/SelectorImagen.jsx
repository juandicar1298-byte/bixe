import { useRef, useState } from 'react';
import { subirImagenApi } from '../../services/api';
import { resolverImagen } from '../../utils/formato';

/**
 * Selector de imagen para el panel: se elige un archivo del computador
 * (clic o arrastrando), se sube al backend y lo que queda guardado en el
 * formulario es la ruta que devuelve la API (/uploads/...).
 *
 * También acepta pegar una URL externa, por si la imagen ya está en internet.
 */
export const SelectorImagen = ({ valor, onCambiar, onError }) => {
  const inputRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [mostrarUrl, setMostrarUrl] = useState(false);

  const subir = async (archivo) => {
    if (!archivo) return;

    if (!archivo.type.startsWith('image/')) {
      onError?.('El archivo seleccionado no es una imagen.');
      return;
    }

    setSubiendo(true);
    try {
      const { url } = await subirImagenApi(archivo);
      onCambiar(url);
    } catch (error) {
      onError?.(error.message);
    } finally {
      setSubiendo(false);
      // Permite volver a elegir el mismo archivo si hizo falta reintentar.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const alSoltar = (evento) => {
    evento.preventDefault();
    setArrastrando(false);
    subir(evento.dataTransfer.files?.[0]);
  };

  const vistaPrevia = resolverImagen(valor);

  return (
    <div>
      <span className="etiqueta">Imagen</span>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
        className="hidden"
        onChange={(evento) => subir(evento.target.files?.[0])}
      />

      {vistaPrevia ? (
        <div className="group relative overflow-hidden rounded-2xl border border-line bg-veil">
          <img
            src={vistaPrevia}
            alt="Vista previa"
            className="h-48 w-full object-cover"
            onError={(evento) => {
              evento.currentTarget.style.display = 'none';
            }}
          />

          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-ink/60 opacity-0 backdrop-blur-[2px] transition group-hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={subiendo}
              className="btn btn-marca !py-2 !px-4 !text-[0.65rem]"
            >
              Cambiar
            </button>
            <button
              type="button"
              onClick={() => onCambiar('')}
              className="btn !border-white/40 !bg-white/10 !py-2 !px-4 !text-[0.65rem] !text-white hover:!bg-white hover:!text-ink"
            >
              Quitar
            </button>
          </div>

          {subiendo && (
            <div className="absolute inset-0 grid place-items-center bg-surface/80">
              <p className="rotulo">Subiendo…</p>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(evento) => {
            evento.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={alSoltar}
          disabled={subiendo}
          className={`flex h-48 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition ${
            arrastrando
              ? 'border-brand bg-brand-wash'
              : 'border-line-fuerte bg-veil hover:border-brand hover:bg-brand-wash'
          }`}
        >
          {subiendo ? (
            <p className="rotulo">Subiendo…</p>
          ) : (
            <>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-surface text-brand-deep shadow-suave">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <path d="M17 8l-5-5-5 5" />
                  <path d="M12 3v12" />
                </svg>
              </span>
              <p className="text-sm font-semibold text-ink">
                Elegir imagen del computador
              </p>
              <p className="text-xs text-ink-mute">
                o arrástrala aquí · JPG, PNG o WEBP · máx. 3 MB
              </p>
            </>
          )}
        </button>
      )}

      <div className="mt-2">
        {mostrarUrl ? (
          <input
            className="campo !text-xs"
            placeholder="https://ejemplo.com/imagen.jpg"
            value={valor || ''}
            onChange={(evento) => onCambiar(evento.target.value)}
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => setMostrarUrl(true)}
            className="accion text-ink-mute hover:text-brand-deep"
          >
            o pegar una URL
          </button>
        )}
      </div>
    </div>
  );
};
