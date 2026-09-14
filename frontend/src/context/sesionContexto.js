import { createContext } from 'react';

// Vive en un archivo aparte del proveedor para que Vite pueda recargar el
// componente en caliente sin perder la sesión (un archivo .jsx que exporta
// algo que no es un componente rompe el refresco rápido).
export const SesionContexto = createContext(null);
