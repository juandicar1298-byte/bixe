import { formatearPrecio } from '../../utils/formato';

const NOMBRE_MES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

// "2026-09" -> "sep 26"
const etiquetaDeMes = (mes) => {
  const [anio, numero] = mes.split('-');
  return `${NOMBRE_MES[Number(numero) - 1]} ${anio.slice(2)}`;
};

const abreviarMonto = (valor) => {
  const numero = Number(valor) || 0;
  if (numero >= 1_000_000) return `${(numero / 1_000_000).toFixed(1).replace('.0', '')} M`;
  if (numero >= 1_000) return `${Math.round(numero / 1_000)} k`;
  return String(numero);
};

/**
 * Ingresos por mes. Una sola serie, así que no lleva leyenda: el título
 * ya dice qué se está midiendo. El monto exacto aparece al pasar el mouse
 * y también como texto sobre la barra más alta, para no depender del hover.
 */
export const GraficoVentas = ({ datos = [] }) => {
  if (datos.length === 0) {
    return (
      <div className="grid h-56 place-items-center rounded-2xl border border-dashed border-line bg-veil">
        <p className="text-sm text-ink-mute">
          Todavía no hay pedidos para graficar.
        </p>
      </div>
    );
  }

  const montos = datos.map((d) => Number(d.ingresos) || 0);
  const maximo = Math.max(...montos, 1);
  const indiceMaximo = montos.indexOf(Math.max(...montos));

  // Tres líneas de referencia discretas: 0, la mitad y el tope.
  const referencias = [maximo, maximo / 2, 0];

  return (
    <div className="flex gap-3">
      {/* Eje vertical */}
      <div className="flex h-56 w-12 shrink-0 flex-col justify-between py-1 text-right">
        {referencias.map((valor) => (
          <span key={valor} className="text-[0.65rem] tabular-nums text-ink-faint">
            {abreviarMonto(valor)}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative h-56">
          {/* Rejilla de fondo, deliberadamente tenue */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {referencias.map((valor) => (
              <div key={valor} className="border-t border-line" />
            ))}
          </div>

          {/* Barras */}
          <div className="absolute inset-0 flex items-end gap-2 px-1">
            {datos.map((fila, indice) => {
              const monto = Number(fila.ingresos) || 0;
              const altura = Math.max((monto / maximo) * 100, monto > 0 ? 3 : 1);

              return (
                // h-full es imprescindible: sin una altura definida en el padre,
                // el height en % de la barra no resuelve y se queda en 0.
                <div
                  key={fila.mes}
                  className="group relative flex h-full flex-1 flex-col justify-end"
                >
                  <div
                    style={{ height: `${altura}%` }}
                    className="relative mx-auto w-full max-w-[72px] rounded-t-[4px] bg-brand-deep transition-colors group-hover:bg-brand"
                  >
                    {indice === indiceMaximo && monto > 0 && (
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[0.65rem] font-bold tabular-nums text-ink">
                        {abreviarMonto(monto)}
                      </span>
                    )}

                    {/* Globo con el dato exacto */}
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-max max-w-[180px] -translate-x-1/2 rounded-xl border border-line bg-surface px-3 py-2 text-center shadow-media group-hover:block">
                      <p className="text-[0.65rem] uppercase tracking-wider text-ink-mute">
                        {etiquetaDeMes(fila.mes)}
                      </p>
                      <p className="text-sm font-bold text-ink">{formatearPrecio(monto)}</p>
                      <p className="text-[0.65rem] text-ink-mute">
                        {fila.pedidos} {Number(fila.pedidos) === 1 ? 'pedido' : 'pedidos'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Eje horizontal */}
        <div className="mt-2 flex gap-2 px-1">
          {datos.map((fila) => (
            <span
              key={fila.mes}
              className="flex-1 text-center text-[0.65rem] uppercase tracking-wider text-ink-mute"
            >
              {etiquetaDeMes(fila.mes)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
