import { useState } from 'react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { ResumenGestion } from '../components/dashboard/ResumenGestion';
import { GestionUsuarios } from '../components/GestionUsuarios';
import { GestionProductos } from '../components/GestionProductos';
import { GestionServicios } from '../components/GestionServicios';
import { GestionPedidos } from '../components/GestionPedidos';
import { GestionVentas } from '../components/GestionVentas';
import { GestionPqr } from '../components/GestionPqr';
import { PanelVentas } from '../components/dashboard/PanelVentas';
import {
  IconoResumen,
  IconoUsuarios,
  IconoProductos,
  IconoServicios,
  IconoPedidos,
  IconoVentas,
  IconoGrafico,
  IconoPqr,
} from '../components/ui/Iconos';

const SECCIONES = [
  { id: 'resumen', etiqueta: 'Resumen', icono: IconoResumen },
  { id: 'usuarios', etiqueta: 'Usuarios', icono: IconoUsuarios },
  { id: 'productos', etiqueta: 'Productos', icono: IconoProductos },
  { id: 'servicios', etiqueta: 'Servicios', icono: IconoServicios },
  { id: 'pedidos', etiqueta: 'Pedidos', icono: IconoPedidos },
  { id: 'ventas', etiqueta: 'Ventas', icono: IconoVentas },
  { id: 'analitica', etiqueta: 'Dashboard', icono: IconoGrafico },
  { id: 'pqr', etiqueta: 'PQR', icono: IconoPqr },
];

const DESCRIPCIONES = {
  resumen: 'Cómo va el negocio de un vistazo: ingresos, pedidos y catálogo.',
  usuarios: 'Crea, edita, activa o elimina cuentas de administradores, empleados y clientes.',
  productos: 'El catálogo de motos y autos que se publica en la web.',
  servicios: 'Los servicios del taller que los clientes pueden agregar al carrito.',
  pedidos: 'Todo lo que los clientes han confirmado desde el carrito.',
  ventas: 'Las ventas registradas, el reporte diario y sus descargas.',
  analitica: 'Indicadores y gráficas de las ventas, con filtros.',
  pqr: 'Peticiones, quejas y reclamos que han radicado los clientes.',
};

export const AdminPanel = () => {
  const [seccion, setSeccion] = useState('resumen');
  // Se incrementa tras cualquier cambio para que el resumen vuelva a pedir cifras.
  const [recarga, setRecarga] = useState(0);

  const refrescar = () => setRecarga((valor) => valor + 1);

  const seccionActual = SECCIONES.find((s) => s.id === seccion);

  return (
    <DashboardLayout
      secciones={SECCIONES}
      seccionActiva={seccion}
      onCambiarSeccion={setSeccion}
      titulo={seccionActual?.etiqueta ?? 'Panel'}
      descripcion={DESCRIPCIONES[seccion]}
    >
      {seccion === 'resumen' && (
        <ResumenGestion
          mostrarUsuarios
          recarga={recarga}
          onIrAPedidos={() => setSeccion('pedidos')}
        />
      )}

      {seccion === 'usuarios' && <GestionUsuarios onCambio={refrescar} />}

      {/* El administrador es el único que puede borrar definitivamente */}
      {seccion === 'productos' && <GestionProductos permitirEliminar />}
      {seccion === 'servicios' && <GestionServicios permitirEliminar />}
      {seccion === 'pedidos' && <GestionPedidos permitirEliminar onCambio={refrescar} />}

      {/* Anular una venta la deja fuera de los reportes, así que solo el
          administrador puede hacerlo. */}
      {seccion === 'ventas' && <GestionVentas permitirAnular onCambio={refrescar} />}
      {seccion === 'analitica' && <PanelVentas />}
      {seccion === 'pqr' && <GestionPqr onCambio={refrescar} />}
    </DashboardLayout>
  );
};
