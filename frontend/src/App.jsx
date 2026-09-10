import { Routes, Route } from 'react-router-dom';
import { CarritoProvider } from './context/CarritoContext';
import { CarritoDrawer } from './components/CarritoDrawer';
import { RutaProtegida } from './components/RutaProtegida';
import { WhatsAppButton } from './components/WhatsAppButton';
import { Index } from './pages/Index';
import { QuienesSomos } from './pages/QuienesSomos';
import { Contacto } from './pages/Contacto';
import { LoginPage } from './pages/LoginPage';
import { Modelos } from './pages/Modelos';
import { ModeloDetalle } from './pages/ModeloDetalle';
import { Servicios } from './pages/Servicios';
import { RestablecerPassword } from './pages/RestablecerPassword';
import { PaginaPago } from './pages/PaginaPago';
import { AdminPanel } from './pages/AdminPanel';
import { ClientePanel } from './pages/ClientePanel';
import { EmpleadoPanel } from './pages/EmpleadoPanel';

function App() {
  return (
    <CarritoProvider>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/quienes-somos" element={<QuienesSomos />} />
        <Route path="/contacto" element={<Contacto />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/modelos" element={<Modelos />} />
        <Route path="/modelos/:id" element={<ModeloDetalle />} />
        <Route path="/servicios" element={<Servicios />} />
        <Route path="/restablecer" element={<RestablecerPassword />} />

        <Route
          path="/pago/:pedidoId"
          element={
            <RutaProtegida>
              <PaginaPago />
            </RutaProtegida>
          }
        />

        <Route
          path="/admin"
          element={
            <RutaProtegida rolesPermitidos={[1]}>
              <AdminPanel />
            </RutaProtegida>
          }
        />
        <Route
          path="/empleado"
          element={
            <RutaProtegida rolesPermitidos={[2]}>
              <EmpleadoPanel />
            </RutaProtegida>
          }
        />
        <Route
          path="/cliente"
          element={
            <RutaProtegida rolesPermitidos={[3]}>
              <ClientePanel />
            </RutaProtegida>
          }
        />
      </Routes>

      {/* Viven fuera de <Routes> para que sigan disponibles en todas las páginas */}
      <CarritoDrawer />
      <WhatsAppButton
        numero="573024170803"
        mensaje="Hola, quiero más información sobre el catálogo BIXE."
      />
    </CarritoProvider>
  );
}

export default App;
