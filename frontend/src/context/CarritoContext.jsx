import { useState, useEffect, useMemo, useCallback } from 'react';
import { CarritoContext } from './carritoContexto';

const CLAVE_ALMACEN = 'bixe_carrito';

// El carrito sobrevive a recargas guardándose en localStorage.
const leerCarritoGuardado = () => {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_ALMACEN));
    return Array.isArray(guardado) ? guardado : [];
  } catch {
    return [];
  }
};

// Un producto y un servicio pueden compartir el id, así que la clave los combina.
const claveDe = (tipo, id) => `${tipo}-${id}`;

export const CarritoProvider = ({ children }) => {
  const [items, setItems] = useState(leerCarritoGuardado);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(items));
  }, [items]);

  const agregar = useCallback((item, cantidad = 1) => {
    setItems((previos) => {
      const clave = claveDe(item.tipo, item.id);
      const existente = previos.find((i) => claveDe(i.tipo, i.id) === clave);

      if (existente) {
        return previos.map((i) =>
          claveDe(i.tipo, i.id) === clave ? { ...i, cantidad: i.cantidad + cantidad } : i
        );
      }

      return [...previos, { ...item, cantidad }];
    });
    setAbierto(true);
  }, []);

  const quitar = useCallback((tipo, id) => {
    setItems((previos) => previos.filter((i) => claveDe(i.tipo, i.id) !== claveDe(tipo, id)));
  }, []);

  const cambiarCantidad = useCallback((tipo, id, cantidad) => {
    const nueva = Number(cantidad);

    setItems((previos) => {
      if (nueva < 1) {
        return previos.filter((i) => claveDe(i.tipo, i.id) !== claveDe(tipo, id));
      }
      return previos.map((i) =>
        claveDe(i.tipo, i.id) === claveDe(tipo, id) ? { ...i, cantidad: nueva } : i
      );
    });
  }, []);

  const vaciar = useCallback(() => setItems([]), []);

  const abrirCarrito = useCallback(() => setAbierto(true), []);
  const cerrarCarrito = useCallback(() => setAbierto(false), []);

  const { cantidadTotal, subtotal } = useMemo(
    () =>
      items.reduce(
        (acumulado, item) => ({
          cantidadTotal: acumulado.cantidadTotal + item.cantidad,
          subtotal: acumulado.subtotal + Number(item.precio) * item.cantidad,
        }),
        { cantidadTotal: 0, subtotal: 0 }
      ),
    [items]
  );

  const estaEnCarrito = useCallback(
    (tipo, id) => items.some((i) => claveDe(i.tipo, i.id) === claveDe(tipo, id)),
    [items]
  );

  const valor = useMemo(
    () => ({
      items,
      abierto,
      cantidadTotal,
      subtotal,
      agregar,
      quitar,
      cambiarCantidad,
      vaciar,
      abrirCarrito,
      cerrarCarrito,
      estaEnCarrito,
    }),
    [
      items, abierto, cantidadTotal, subtotal,
      agregar, quitar, cambiarCantidad, vaciar,
      abrirCarrito, cerrarCarrito, estaEnCarrito,
    ]
  );

  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>;
};
