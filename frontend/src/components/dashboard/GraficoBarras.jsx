import { useState } from 'react';
import {
  abreviarMonto,
  etiquetaDePeriodo,
  marcasDelEje,
  periodoLargo,
  saltoDeEtiquetas,
  techoRedondo,
} from './ejes';

/**
 * Ingresos por periodo.
 *
 * Una sola serie, así que no lleva leyenda: el título ya dice qué se mide. El
 * valor exacto sale al pasar el ratón y, además, escrito sobre la barra más
 * alta, para no depender del hover en una captura o en una impresión.
 */
export const GraficoBarras = ({
  datos = [],
  titulo = 'Ingresos por periodo',
  formatear = abreviarMonto,
  campo = 'ingresos',
}) => {
  const [encima, setEncima] = useState(null);

  if (datos.length === 0) {
    return <SinDatos mensaje="No hay ventas en el periodo seleccionado." />;
  }

  const valores = datos.map((d) => Number(d[campo]) || 0);
  const maximo = Math.max(...valores);
  const techo = techoRedondo(maximo);
  const indiceMaximo = valores.indexOf(maximo);
  const salto = saltoDeEtiquetas(datos.length);

  return (
    <figure className="m-0">
      <figcaption className="rotulo mb-4">{titulo}</figcaption>

      <div className="flex gap-3">
        {/* Eje vertical: tres referencias bastan para leer la altura */}
        <div className="flex h-56 w-12 shrink-0 flex-col justify-between py-1 text-right">
          {marcasDelEje(techo, formatear).map((marca) => (
            <span key={marca.clave} className="text-[0.65rem] tabular-nums text-ink-faint">
              {marca.texto}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Líneas de referencia, discretas: guían sin competir con los datos */}
          <div className="pointer-events-none absolute inset-0 flex h-56 flex-col justify-between">
            {[0, 1, 2].map((i) => (
              <div key={i} className="border-t border-line" />
            ))}
          </div>

          <div className="relative flex h-56 items-end gap-[2px]">
            {datos.map((punto, indice) => {
              const valor = Number(punto[campo]) || 0;
              const altura = techo > 0 ? (valor / techo) * 100 : 0;
              const activo = encima === indice;

              return (
                <div
                  key={punto.periodo}
                  onMouseEnter={() => setEncima(indice)}
                  onMouseLeave={() => setEncima(null)}
                  className="group relative flex h-full flex-1 items-end justify-center"
                >
                  {/* Zona de hover más alta que la barra: así se activa sin
                      tener que apuntar justo a una barra de dos píxeles. */}
                  <span
                    // Los extremos redondeados van solo arriba: la barra nace
                    // en la línea del cero y ahí tiene que quedar a ras.
                    className={`w-full max-w-[26px] rounded-t transition-colors ${
                      activo ? 'bg-brand-deep' : 'bg-brand'
                    }`}
                    style={{ height: `${Math.max(altura, valor > 0 ? 1.5 : 0)}%` }}
                  />

                  {indice === indiceMaximo && valor > 0 && (
                    <span className="pointer-events-none absolute -top-1 whitespace-nowrap text-[0.65rem] font-bold tabular-nums text-ink">
                      {formatear(valor)}
                    </span>
                  )}

                  {activo && (
                    <div className="pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-white shadow-media">
                      <p className="text-[0.65rem] text-white/60">
                        {periodoLargo(punto.periodo)}
                      </p>
                      <p className="text-xs font-bold tabular-nums">
                        {formatear(valor)}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Eje horizontal */}
          <div className="mt-2 flex gap-[2px]">
            {datos.map((punto, indice) => (
              <span
                key={punto.periodo}
                className="flex-1 text-center text-[0.6rem] text-ink-faint"
              >
                {indice % salto === 0 ? etiquetaDePeriodo(punto.periodo) : ''}
              </span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
};

export const SinDatos = ({ mensaje }) => (
  <div className="grid h-56 place-items-center rounded-2xl border border-dashed border-line bg-veil">
    <p className="px-6 text-center text-sm text-ink-mute">{mensaje}</p>
  </div>
);
