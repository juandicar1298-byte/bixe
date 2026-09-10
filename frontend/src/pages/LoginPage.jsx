import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Login } from '../components/Login';
import { RecoverPassword } from '../components/RecoverPassword';
import { RegisterForm } from '../components/RegisterForm';
import moto3 from '../assets/images/moto1.png';

export const LoginPage = () => {
  const [vista, setVista] = useState('login'); // 'login' | 'recuperar' | 'registro'
  const [modoRegistro, setModoRegistro] = useState(false);
  const navigate = useNavigate();

  const irARegistro = () => {
    setVista('registro');
    setModoRegistro(true);
  };

  const irALogin = () => {
    setVista('login');
    setModoRegistro(false);
  };

  const handleLoginExitoso = () => {
    navigate('/');
  };

  return (
    <div className="bg-white min-h-screen">
      <Header />

      <div className="relative w-full h-[90vh] flex overflow-hidden">
        {/* Panel del formulario */}
        <div
          className={`w-full md:w-1/2 h-full overflow-y-auto flex items-start justify-center px-8 py-16 transition-transform duration-700 ease-in-out ${
            modoRegistro ? 'md:translate-x-full' : 'translate-x-0'
          }`}
        >
          <div className="w-full max-w-sm">
            {vista === 'login' && (
              <Login
                onIrARecuperar={() => setVista('recuperar')}
                onIrARegistro={irARegistro}
                onLoginExitoso={handleLoginExitoso}
              />
            )}
            {vista === 'recuperar' && (
              <RecoverPassword onVolverALogin={irALogin} />
            )}
            {vista === 'registro' && (
              <RegisterForm onVolverLogin={irALogin} />
            )}
          </div>
        </div>

        {/* Panel de imagen / marca */}
        <div
          className={`hidden md:flex w-1/2 h-full relative items-center justify-center text-center px-12 transition-transform duration-700 ease-in-out ${
            modoRegistro ? '-translate-x-full' : 'translate-x-0'
          }`}
        >
          <img
            src={moto3}
            alt="BIXE"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60"></div>

          <div className="relative z-10">
            <h2 className="text-4xl font-black tracking-[0.3em] text-white mb-4">
              BIXE<span className="text-[#3fa9f5]">.</span>
            </h2>
            <p className="text-slate-300 max-w-xs mx-auto mb-8">
              {modoRegistro
                ? 'Vuelve a iniciar sesión y sigue explorando el catálogo.'
                : '¿Nuevo en BIXE? Únete y descubre motos y autos de alto rendimiento.'}
            </p>
            <button
              onClick={() => (modoRegistro ? irALogin() : irARegistro())}
              className="border-2 border-white text-white px-8 py-3 rounded-full font-bold uppercase text-xs tracking-widest hover:bg-white hover:text-black transition"
            >
              {modoRegistro ? 'Iniciar Sesión' : 'Registrarse'}
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};