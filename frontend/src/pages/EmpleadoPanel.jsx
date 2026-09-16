import { useState } from 'react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { ResumenGestion } from '../components/dashboard/ResumenGestion';
import { GestionProductos } from '../components/GestionProductos';
import { GestionServicios } from '../components/GestionServicios';
import { GestionPedidos } from '../components/GestionPedidos';
import { GestionVentas } from '../components/GestionVentas';
import { GestionPqr } from '../components/GestionPqr';
import { PanelVentas } from '../components/dashboard/PanelVentas';
import {
  IconoResumen,
  IconoProductos,
  IconoServicios,
  IconoPedidos,
  IconoVentas,
  IconoGrafico,
  IconoPqr,
} from '../components/ui/Iconos';

const SECCIONES = [
  { id: 'resumen', etiqueta: 'Resumen', icono: IconoResumen },
  { id: 'productos', etiqueta: 'Productos', icono: IconoProductos },
  { id: 'servicios', etiqueta: 'Servicios', icono: IconoServicios },
  { id: 'pedidos', etiqueta: 'Pedidos', icono: IconoPedidos },
  { id: 'ventas', etiqueta: 'Ventas', icono: IconoVentas },
  { id: 'analitica', etiqueta: 'Dashboard', icono: IconoGrafico },
  { id: 'pqr', etiqueta: 'PQR', icono: IconoPqr },
];

const DESCRIPCIONES = {
  resumen: 'El estado del catálogo y de los pedidos que hay por atender.',
  productos: 'Publica y actualiza los modelos del catálogo.',
  servicios: 'Publica y actualiza los servicios del taller.',
  pedidos: 'Atiende los pedidos: cámbiales el estado a medida que avanzan.',
  ventas: 'Registra ventas de mostrador y descarga el reporte del día.',
  analitica: 'Cómo van las ventas, con sus gráficas y filtros.',
  pqr: 'Responde las peticiones, quejas y reclamos de los clientes.',
};

export const EmpleadoPanel = () => {
  const [seccion, setSeccion] = useState('resumen');
  const [recarga, setRecarga] = useState(0);

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
        <ResumenGestion recarga={recarga} onIrAPedidos={() => setSeccion('pedidos')} />
      )}

      {/* El empleado gestiona el catálogo y los pedidos, pero no elimina
          nada de forma definitiva: eso queda reservado al administrador. */}
      {seccion === 'productos' && <GestionProductos />}
      {seccion === 'servicios' && <GestionServicios />}
      {seccion === 'pedidos' && (
        <GestionPedidos onCambio={() => setRecarga((valor) => valor + 1)} />
      )}

      {/* Sin permitirAnular: anular una venta la saca de los reportes y eso
          queda reservado al administrador. */}
      {seccion === 'ventas' && (
        <GestionVentas onCambio={() => setRecarga((valor) => valor + 1)} />
      )}
      {seccion === 'analitica' && <PanelVentas />}
      {seccion === 'pqr' && <GestionPqr />}
    </DashboardLayout>
  );
};
