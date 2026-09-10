import { useEffect } from 'react';

const ESTILOS = {
  exito: {
    borde: 'border-l-exito',
    icono: 'bg-exito-wash text-exito',
    path: 'M4.5 12.5l5 5 10-11',
  },
  error: {
    borde: 'border-l-peligro',
    icono: 'bg-peligro-wash text-peligro',
    path: 'M6 6l12 12M18 6L6 18',
  },
};

export const Toast = ({ mensaje, tipo = 'exito', visible, onCerrar }) => {
  useEffect(() => {
    if (!visible) return undefined;

    const temporizador = setTimeout(onCerrar, 3500);
    return () => clearTimeout(temporizador);
  }, [visible, onCerrar]);

  if (!visible) return null;

  const estilo = ESTILOS[tipo] ?? ESTILOS.exito;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed right-5 top-5 z-[200] flex min-w-[290px] max-w-sm items-center gap-3 rounded-2xl border border-line ${estilo.borde} border-l-4 bg-surface px-5 py-4 shadow-alta animate-deslizar`}
    >
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${estilo.icono}`}>
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d={estilo.path} />
        </svg>
      </span>

      <p className="flex-1 text-sm font-medium text-ink">{mensaje}</p>

      <button
        onClick={onCerrar}
        aria-label="Cerrar aviso"
        className="shrink-0 text-ink-faint transition hover:text-ink"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
};
