/**
 * Mosaico de carga.
 *
 * Mientras la API responde, en lugar de una línea de texto se ve la silueta
 * de las tarjetas que están por llegar: piezas de distinta altura repartidas
 * en columnas, con un brillo que las recorre. Las alturas van variadas a
 * propósito para que se lea como un mosaico y no como una rejilla vacía.
 */

// Se repiten cíclicamente, así que la cantidad de tarjetas puede ser
// cualquiera y el escalonado se mantiene.
const ALTURAS = [232, 296, 200, 268, 320, 216, 284, 244];

// Las clases van escritas enteras porque Tailwind lee el código fuente como
// texto: una cadena armada a pedazos no la detectaría.
const COLUMNAS = {
  2: 'mosaico columns-1 md:columns-2',
  3: 'mosaico columns-1 md:columns-2 lg:columns-3',
  4: 'mosaico columns-1 md:columns-2 lg:columns-4',
};

export const RejillaEsqueleto = ({ cantidad = 6, columnas = 3, etiqueta = 'Cargando…' }) => (
  <div role="status" aria-busy="true" aria-label={etiqueta}>
    <div className={COLUMNAS[columnas] ?? COLUMNAS[3]}>
      {Array.from({ length: cantidad }, (_, indice) => (
        <div
          key={indice}
          style={{ animationDelay: `${indice * 85}ms` }}
          className="tarjeta animate-mosaico overflow-hidden"
        >
          <div
            className="esqueleto w-full"
            style={{ height: `${ALTURAS[indice % ALTURAS.length]}px` }}
          />

          <div className="p-5">
            <div className="esqueleto h-6 w-3/5 rounded-lg" />
            <div className="esqueleto mt-3 h-3 w-full rounded-md" />
            <div className="esqueleto mt-2 h-3 w-4/5 rounded-md" />

            <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
              <div className="esqueleto h-7 w-28 rounded-lg" />
              <div className="esqueleto h-8 w-24 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);
