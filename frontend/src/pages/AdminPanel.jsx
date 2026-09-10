import { useState } from 'react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { ResumenGestion } from '../components/dashboard/ResumenGestion';
import { GestionUsuarios } from '../components/GestionUsuarios';
import { GestionProductos } from '../components/GestionProductos';
import { GestionServicios } from '../components/GestionServicios';
import { GestionPedidos } from '../components/GestionPedidos';
import {
  IconoResumen,
  IconoUsuarios,
  IconoProductos,
  IconoServicios,
  IconoPedidos,
} from '../components/ui/Iconos';

const SECCIONES = [
  { id: 'resumen', etiqueta: 'Resumen', icono: IconoResumen },
  { id: 'usuarios', etiqueta: 'Usuarios', icono: IconoUsuarios },
  { id: 'productos', etiqueta: 'Productos', icono: IconoProductos },
  { id: 'servicios', etiqueta: 'Servicios', icono: IconoServicios },
  { id: 'pedidos', etiqueta: 'Pedidos', icono: IconoPedidos },
];

const DESCRIPCIONES = {
  resumen: 'Cómo va el negocio de un vistazo: ingresos, pedidos y catálogo.',
  usuarios: 'Crea, edita, activa o elimina cuentas de administradores, empleados y clientes.',
  productos: 'El catálogo de motos y autos que se publica en la web.',
  servicios: 'Los servicios del taller que los clientes pueden agregar al carrito.',
  pedidos: 'Todo lo que los clientes han confirmado desde el carrito.',
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
    </DashboardLayout>
  );
};
