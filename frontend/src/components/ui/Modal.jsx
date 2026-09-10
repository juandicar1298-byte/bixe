import { useEffect } from 'react';

/**
 * Ventana modal reutilizable: cierra con Escape o clic en el fondo y
 * bloquea el scroll de la página mientras está abierta.
 */
export const Modal = ({
  abierto,
  titulo,
  descripcion,
  onCerrar,
  children,
  ancho = 'max-w-2xl',
}) => {
  useEffect(() => {
    if (!abierto) return undefined;

    const alPresionarTecla = (evento) => {
      if (evento.key === 'Escape') onCerrar();
    };

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', alPresionarTecla);

    return () => {
      document.body.style.overflow = overflowPrevio;
      document.removeEventListener('keydown', alPresionarTecla);
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-ink/45 p-4 backdrop-blur-sm animate-aparecer"
      onMouseDown={(evento) => {
        // Solo cierra si el clic empezó en el fondo, no arrastrando desde dentro.
        if (evento.target === evento.currentTarget) onCerrar();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`my-8 w-full ${ancho} rounded-3xl border border-line bg-surface shadow-alta animate-subir`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-7 py-5">
          <div>
            <h2 className="titular text-2xl">{titulo}</h2>
            {descripcion && (
              <p className="mt-1 text-sm text-ink-mute">{descripcion}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-mute transition hover:bg-canvas hover:text-ink"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="px-7 py-6">{children}</div>
      </div>
    </div>
  );
};
