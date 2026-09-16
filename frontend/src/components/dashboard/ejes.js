/**
 * Utilidades que comparten las gráficas del dashboard.
 *
 * Están fuera de los componentes para que la de barras y la de línea etiqueten
 * y escalen exactamente igual: si cada una redondeara por su cuenta, dos
 * gráficas de los mismos datos acabarían contando cosas distintas.
 */

const NOMBRE_MES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

/** "2026-09-14" → "14 sep"  ·  "2026-09" → "sep 26" */
export const etiquetaDePeriodo = (periodo) => {
  const partes = String(periodo).split('-');
  if (partes.length === 3) {
    return `${Number(partes[2])} ${NOMBRE_MES[Number(partes[1]) - 1]}`;
  }
  return `${NOMBRE_MES[Number(partes[1]) - 1]} ${partes[0].slice(2)}`;
};

/** Fecha larga para el tooltip, donde sí hay sitio. */
export const periodoLargo = (periodo) => {
  const partes = String(periodo).split('-');
  const mes = NOMBRE_MES[Number(partes[1]) - 1];
  return partes.length === 3
    ? `${Number(partes[2])} de ${mes} de ${partes[0]}`
    : `${mes} de ${partes[0]}`;
};

/** 2 400 000 → "2,4 M". Los ejes no necesitan el peso exacto. */
export const abreviarMonto = (valor) => {
  const numero = Number(valor) || 0;
  if (numero >= 1_000_000) {
    return `${(numero / 1_000_000).toFixed(1).replace('.0', '').replace('.', ',')} M`;
  }
  if (numero >= 1_000) return `${Math.round(numero / 1_000)} k`;
  return String(Math.round(numero));
};

/**
 * Techo "redondo" por encima del máximo, para que las líneas de referencia
 * caigan en números que se puedan leer (10, 25, 50, 100…) en vez de en el
 * valor crudo del dato más alto.
 */
export const techoRedondo = (maximo) => {
  if (maximo <= 0) return 1;
  const magnitud = 10 ** Math.floor(Math.log10(maximo));
  const escalado = maximo / magnitud;
  const paso = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10].find((p) => escalado <= p) ?? 10;
  return paso * magnitud;
};

/**
 * Cuántas etiquetas caben en el eje horizontal sin encimarse. Con 30 días no
 * se pueden escribir 30 fechas, así que se muestran una de cada n.
 */
export const saltoDeEtiquetas = (cuantos, maximoVisible = 8) =>
  Math.max(1, Math.ceil(cuantos / maximoVisible));

/**
 * Las tres marcas del eje vertical, ya formateadas y sin repetidos.
 *
 * Con series pequeñas —una venta al día, por ejemplo— el techo es 1 y la mitad
 * se redondea también a 1, así que el eje decía «1, 1, 0». Cuando pasa eso se
 * quita la marca de en medio en lugar de escribir dos veces lo mismo.
 */
export const marcasDelEje = (techo, formatear) => {
  const valores = [techo, techo / 2, 0];
  const textos = valores.map(formatear);

  return textos[0] === textos[1] || textos[1] === textos[2]
    ? [{ clave: 'techo', texto: textos[0] }, { clave: 'cero', texto: textos[2] }]
    : valores.map((valor, i) => ({ clave: String(valor), texto: textos[i] }));
};
