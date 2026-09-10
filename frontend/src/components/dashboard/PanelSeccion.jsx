/** Tarjeta con encabezado para agrupar bloques dentro del dashboard. */
export const PanelSeccion = ({ titulo, descripcion, acciones, children, className = '' }) => (
  <section className={`tarjeta overflow-hidden ${className}`}>
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
      <div>
        <h2 className="titular text-lg">{titulo}</h2>
        {descripcion && <p className="mt-0.5 text-xs text-ink-mute">{descripcion}</p>}
      </div>
      {acciones && <div className="flex items-center gap-2">{acciones}</div>}
    </header>

    <div className="p-5">{children}</div>
  </section>
);

/** Mensaje para tablas y listas sin datos. */
export const EstadoVacio = ({ titulo, descripcion, accion }) => (
  <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-veil px-6 py-12 text-center">
    <p className="font-semibold text-ink">{titulo}</p>
    {descripcion && <p className="max-w-sm text-sm text-ink-mute">{descripcion}</p>}
    {accion && <div className="mt-2">{accion}</div>}
  </div>
);

/** Envuelve una tabla para que desborde en horizontal sin romper la página. */
export const ContenedorTabla = ({ children }) => (
  <div className="-mx-5 overflow-x-auto px-5">
    <table className="w-full min-w-[640px] border-collapse text-left">{children}</table>
  </div>
);
