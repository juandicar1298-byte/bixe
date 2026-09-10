import { createContext, useContext } from 'react';

export const CarritoContext = createContext(null);

export const useCarrito = () => {
  const contexto = useContext(CarritoContext);
  if (!contexto) {
    throw new Error('useCarrito debe usarse dentro de <CarritoProvider>.');
  }
  return contexto;
};
