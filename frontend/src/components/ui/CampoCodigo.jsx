import { useRef, useState, useEffect } from 'react';

/**
 * Las seis casillas donde se escribe el código que llegó al correo.
 *
 * Una casilla por dígito en lugar de un campo normal: se ve cuántos faltan y
 * el teclado del móvil sale numérico. Al escribir salta sola a la siguiente,
 * y al pegar el código entero se reparte entre todas.
 *
 * Hacia fuera el valor sigue siendo una cadena de seis caracteres; quien lo
 * use no se entera de que por dentro son varios campos.
 *
 * Para vaciarlo (cuando el código estaba mal, por ejemplo) se le cambia la
 * `key` desde fuera: React lo vuelve a montar, las casillas quedan limpias y
 * el foco regresa solo a la primera.
 */

const CASILLAS = 6;

const vacias = () => Array(CASILLAS).fill('');

export const CampoCodigo = ({ onChange, onCompleto, error, deshabilitado }) => {
  const referencias = useRef([]);

  // Los dígitos se guardan aquí dentro y no en las props. Escribiendo deprisa
  // llegan varias pulsaciones antes de que React vuelva a pintar, y leyendo de
  // las props cada una sobrescribiría a la anterior: se escribían seis dígitos
  // y solo quedaba el último.
  const [digitos, setDigitos] = useState(vacias);

  // Las funciones del padre viven en una referencia para poder avisarle sin
  // meterlas en las dependencias del efecto, que lo volvería a disparar en
  // cada pintada.
  const avisos = useRef({ onChange, onCompleto });
  useEffect(() => {
    avisos.current = { onChange, onCompleto };
  });

  useEffect(() => {
    const texto = digitos.join('');
    avisos.current.onChange(texto);
    if (texto.length === CASILLAS) avisos.current.onCompleto?.(texto);
  }, [digitos]);

  const escribir = (texto, desde) => {
    const limpio = texto.replace(/\D/g, '');
    if (!limpio) return;

    setDigitos((previo) => {
      const siguiente = previo.slice();
      for (let i = 0; i < limpio.length && desde + i < CASILLAS; i += 1) {
        siguiente[desde + i] = limpio[i];
      }
      return siguiente;
    });

    referencias.current[Math.min(desde + limpio.length, CASILLAS - 1)]?.focus();
  };

  const alPulsar = (evento, indice) => {
    if (evento.key === 'Backspace') {
      evento.preventDefault();

      // Si la casilla ya está vacía, se borra la anterior y el foco retrocede.
      const objetivo = evento.target.value ? indice : Math.max(indice - 1, 0);

      setDigitos((previo) => {
        const siguiente = previo.slice();
        siguiente[objetivo] = '';
        return siguiente;
      });
      referencias.current[objetivo]?.focus();
      return;
    }

    if (evento.key === 'ArrowLeft') referencias.current[indice - 1]?.focus();
    if (evento.key === 'ArrowRight') referencias.current[indice + 1]?.focus();
  };

  return (
    <div>
      <label className="etiqueta">Código de verificación</label>

      <div className="flex justify-between gap-2" role="group" aria-label="Código de seis dígitos">
        {digitos.map((digito, indice) => (
          <input
            key={indice}
            ref={(elemento) => {
              referencias.current[indice] = elemento;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={indice === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            disabled={deshabilitado}
            autoFocus={indice === 0}
            aria-label={`Dígito ${indice + 1}`}
            value={digito}
            onChange={(evento) => escribir(evento.target.value, indice)}
            onKeyDown={(evento) => alPulsar(evento, indice)}
            onPaste={(evento) => {
              evento.preventDefault();
              escribir(evento.clipboardData.getData('text'), 0);
            }}
            onFocus={(evento) => evento.target.select()}
            className={`campo h-14 flex-1 text-center text-xl font-bold tabular-nums ${
              error ? '!border-peligro' : ''
            }`}
          />
        ))}
      </div>

      {error && <p className="mt-1.5 text-xs text-peligro">{error}</p>}
    </div>
  );
};
