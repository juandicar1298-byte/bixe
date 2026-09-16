import { useMemo, useRef, useState } from 'react';
import { SinDatos } from './GraficoBarras';
import {
  etiquetaDePeriodo,
  marcasDelEje,
  periodoLargo,
  saltoDeEtiquetas,
  techoRedondo,
} from './ejes';

// Lienzo en coordenadas propias: el SVG se estira al ancho del contenedor y
// estas medidas se mantienen proporcionales.
const ANCHO = 600;
const ALTO = 200;
const MARGEN = { arriba: 12, derecha: 8, abajo: 4, izquierda: 8 };

/**
 * Cantidad de ventas a lo largo del tiempo.
 *
 * Va aparte de la gráfica de ingresos a propósito: son dos magnitudes
 * distintas y meterlas juntas obligaría a un segundo eje vertical, que es la
 * forma más fácil de hacer que dos series parezcan relacionadas sin estarlo.
 */
export const GraficoLinea = ({
  datos = [],
  titulo = 'Número de ventas',
  campo = 'ventas',
  formatear = (v) => String(v),
}) => {
  const [encima, setEncima] = useState(null);
  const contenedor = useRef(null);

  const { puntos, ruta, techo } = useMemo(() => {
    const valores = datos.map((d) => Number(d[campo]) || 0);
    const limite = techoRedondo(Math.max(...valores, 1));

    const util = {
      ancho: ANCHO - MARGEN.izquierda - MARGEN.derecha,
      alto: ALTO - MARGEN.arriba - MARGEN.abajo,
    };

    const calculados = valores.map((valor, indice) => ({
      x:
        MARGEN.izquierda +
        (datos.length === 1 ? util.ancho / 2 : (indice / (datos.length - 1)) * util.ancho),
      y: MARGEN.arriba + util.alto - (valor / limite) * util.alto,
      valor,
      periodo: datos[indice].periodo,
    }));

    return {
      puntos: calculados,
      ruta: calculados.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' '),
      techo: limite,
    };
  }, [datos, campo]);

  if (datos.length === 0) {
    return <SinDatos mensaje="No hay ventas en el periodo seleccionado." />;
  }

  const salto = saltoDeEtiquetas(datos.length);
  const activo = encima !== null ? puntos[encima] : null;

  // El punto más cercano al ratón, en coordenadas del lienzo.
  const seguir = (evento) => {
    const caja = contenedor.current?.getBoundingClientRect();
    if (!caja) return;
    const x = ((evento.clientX - caja.left) / caja.width) * ANCHO;

    let cercano = 0;
    puntos.forEach((punto, indice) => {
      if (Math.abs(punto.x - x) < Math.abs(puntos[cercano].x - x)) cercano = indice;
    });
    setEncima(cercano);
  };

  return (
    <figure className="m-0">
      <figcaption className="rotulo mb-4">{titulo}</figcaption>

      <div className="flex gap-3">
        <div className="flex h-52 w-10 shrink-0 flex-col justify-between py-1 text-right">
          {marcasDelEje(techo, (valor) => formatear(Math.round(valor))).map((marca) => (
            <span key={marca.clave} className="text-[0.65rem] tabular-nums text-ink-faint">
              {marca.texto}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          <div
            ref={contenedor}
            onMouseMove={seguir}
            onMouseLeave={() => setEncima(null)}
            className="relative h-52"
          >
            <svg
              viewBox={`0 0 ${ANCHO} ${ALTO}`}
              preserveAspectRatio="none"
              className="h-full w-full overflow-visible"
              role="img"
              aria-label={`${titulo}. ${datos.length} periodos.`}
            >
              {/* Referencias horizontales, en el mismo sitio que las etiquetas */}
              {[0, 0.5, 1].map((proporcion) => {
                const y =
                  MARGEN.arriba + (ALTO - MARGEN.arriba - MARGEN.abajo) * proporcion;
                return (
                  <line
                    key={proporcion}
                    x1="0"
                    x2={ANCHO}
                    y1={y}
                    y2={y}
                    stroke="var(--color-line)"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}

              {/* Relleno suave bajo la línea: da volumen sin tapar la retícula */}
              <path
                d={`${ruta} L${puntos.at(-1).x} ${ALTO - MARGEN.abajo} L${puntos[0].x} ${
                  ALTO - MARGEN.abajo
                } Z`}
                fill="var(--color-brand)"
                opacity="0.10"
              />

              <path
                d={ruta}
                fill="none"
                stroke="var(--color-brand-deep)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />

              {activo && (
                <line
                  x1={activo.x}
                  x2={activo.x}
                  y1={MARGEN.arriba}
                  y2={ALTO - MARGEN.abajo}
                  stroke="var(--color-ink-faint)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {puntos.map((punto, indice) => {
                const destacado = encima === indice;
                if (!destacado && datos.length > 20) return null;
                return (
                  <circle
                    key={punto.periodo}
                    cx={punto.x}
                    cy={punto.y}
                    r={destacado ? 5 : 3}
                    fill="var(--color-brand-deep)"
                    // Aro del color de la superficie: separa el punto de la
                    // línea cuando se solapan.
                    stroke="var(--color-surface)"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </svg>

            {activo && (
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-white shadow-media"
                style={{
                  left: `${(activo.x / ANCHO) * 100}%`,
                  top: `${(activo.y / ALTO) * 100 - 4}%`,
                }}
              >
                <p className="text-[0.65rem] text-white/60">
                  {periodoLargo(activo.periodo)}
                </p>
                <p className="text-xs font-bold tabular-nums">
                  {formatear(activo.valor)}
                </p>
              </div>
            )}
          </div>

          <div className="mt-2 flex">
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
