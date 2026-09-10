export const ESTADOS_PEDIDO = ['pendiente', 'confirmado', 'completado', 'cancelado'];

// Color de la insignia según el estado del pedido.
export const CLASE_INSIGNIA_ESTADO = {
  pendiente: 'insignia-alerta',
  confirmado: 'insignia-marca',
  completado: 'insignia-exito',
  cancelado: 'insignia-peligro',
};

// Color de la insignia según el estado del pago.
export const CLASE_INSIGNIA_PAGO = {
  pendiente: 'insignia-neutra',
  pagado: 'insignia-exito',
  rechazado: 'insignia-peligro',
};
