import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCarrito } from '../context/carritoContexto';
import { IconoCarrito, IconoMenu, IconoCerrar, IconoPerfil } from './ui/Iconos';

const ENLACES = [
  { a: '/', texto: 'Inicio' },
  { a: '/modelos', texto: 'Modelos' },
  { a: '/servicios', texto: 'Servicios' },
  { a: '/quienes-somos', texto: 'Quiénes somos' },
  { a: '/contacto', texto: 'Contacto' },
  { a: '/pqr', texto: 'PQR' },
];

const NOMBRE_ROL = { 1: 'Administrador', 2: 'Empleado', 3: 'Cliente' };

export function Header() {
  const { usuario, cerrarSesion } = useAuth();
  const { cantidadTotal, abrirCarrito } = useCarrito();
  const navigate = useNavigate();

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const perfilRef = useRef(null);

  useEffect(() => {
    const handleClickFuera = (evento) => {
      if (perfilRef.current && !perfilRef.current.contains(evento.target)) {
        setPerfilAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, []);

  const rutaPanel =
    usuario?.rol?.id === 1 ? '/admin' : usuario?.rol?.id === 2 ? '/empleado' : '/cliente';

  const handleCerrarSesion = () => {
    cerrarSesion();
    setPerfilAbierto(false);
    navigate('/');
  };

  const iniciales = usuario
    ? `${usuario.nombre?.[0] ?? ''}${usuario.apellido?.[0] ?? ''}`.toUpperCase()
    : '';

  const claseEnlace = ({ isActive }) =>
    `relative text-[0.8rem] font-semibold uppercase tracking-[0.12em] transition after:absolute after:-bottom-1.5 after:left-0 after:h-[2px] after:bg-brand after:transition-all ${
      isActive
        ? 'text-ink after:w-full'
        : 'text-ink-mute after:w-0 hover:text-ink hover:after:w-full'
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-4 md:px-8">
        <button
          onClick={() => setMenuAbierto(true)}
          aria-label="Abrir menú"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-soft transition hover:bg-canvas lg:hidden"
        >
          <IconoMenu className="h-5 w-5" />
        </button>

        <Link
          to="/"
          className="shrink-0 text-lg font-bold uppercase tracking-[0.32em] text-ink"
        >
          BIXE<span className="text-brand">.</span>
        </Link>

        <nav className="ml-6 hidden flex-1 items-center gap-8 lg:flex">
          {ENLACES.map((enlace) => (
            <NavLink key={enlace.a} to={enlace.a} className={claseEnlace} end={enlace.a === '/'}>
              {enlace.texto}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
          <button
            onClick={abrirCarrito}
            aria-label={`Abrir carrito (${cantidadTotal} artículos)`}
            className="relative grid h-10 w-10 place-items-center rounded-full text-ink-soft transition hover:bg-canvas hover:text-ink"
          >
            <IconoCarrito className="h-5 w-5" />
            {cantidadTotal > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[0.62rem] font-bold text-white">
                {cantidadTotal}
              </span>
            )}
          </button>

          {usuario ? (
            <div className="relative" ref={perfilRef}>
              {/* El nombre del usuario autenticado va visible en el navbar */}
              <button
                onClick={() => setPerfilAbierto((previo) => !previo)}
                aria-label="Abrir menú de perfil"
                className="flex items-center gap-2.5 rounded-full py-1 pl-3.5 pr-1 transition hover:bg-canvas"
              >
                <span className="hidden text-[0.8rem] font-semibold text-ink-soft lg:block">
                  Bienvenido, <span className="text-ink">{usuario.nombre}</span>
                </span>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-white">
                  {iniciales}
                </span>
              </button>

              {perfilAbierto && (
                <div className="absolute right-0 mt-3 w-72 rounded-2xl border border-line bg-surface p-5 shadow-alta animate-subir">
                  <div className="flex items-center gap-3 border-b border-line pb-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-white">
                      {iniciales}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">
                        {usuario.nombre} {usuario.apellido}
                      </p>
                      <p className="truncate text-xs text-ink-mute">{usuario.email}</p>
                    </div>
                  </div>

                  <p className="mb-4 mt-3 text-[0.68rem] uppercase tracking-[0.14em] text-ink-mute">
                    {NOMBRE_ROL[usuario.rol?.id] ?? 'Usuario'}
                  </p>

                  <Link
                    to={rutaPanel}
                    onClick={() => setPerfilAbierto(false)}
                    className="btn btn-contorno mb-2 w-full"
                  >
                    Ver mi panel
                  </Link>

                  <button
                    onClick={handleCerrarSesion}
                    className="btn btn-primario w-full hover:!border-peligro hover:!bg-peligro hover:!shadow-none"
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="grid h-10 w-10 place-items-center rounded-full text-ink-soft transition hover:bg-canvas hover:text-ink lg:hidden"
              aria-label="Iniciar sesión"
            >
              <IconoPerfil className="h-5 w-5" />
            </Link>
          )}

          {!usuario && (
            <Link to="/login" className="btn btn-primario ml-1.5 hidden lg:inline-flex">
              Iniciar sesión
            </Link>
          )}
        </div>
      </div>

      {/* --- Menú lateral en móvil --- */}
      <div
        onClick={() => setMenuAbierto(false)}
        className={`fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          menuAbierto ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <nav
        className={`fixed left-0 top-0 z-50 flex h-full w-72 max-w-[82%] flex-col gap-1 border-r border-line bg-surface p-6 shadow-alta transition-transform duration-300 ease-out lg:hidden ${
          menuAbierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <span className="text-lg font-bold uppercase tracking-[0.3em] text-ink">
            BIXE<span className="text-brand">.</span>
          </span>
          <button
            onClick={() => setMenuAbierto(false)}
            aria-label="Cerrar menú"
            className="grid h-9 w-9 place-items-center rounded-full text-ink-mute hover:bg-canvas"
          >
            <IconoCerrar className="h-4 w-4" />
          </button>
        </div>

        {ENLACES.map((enlace) => (
          <NavLink
            key={enlace.a}
            to={enlace.a}
            end={enlace.a === '/'}
            onClick={() => setMenuAbierto(false)}
            className={({ isActive }) =>
              `rounded-xl px-3 py-2.5 text-sm font-semibold uppercase tracking-wider transition ${
                isActive ? 'bg-ink text-white' : 'text-ink-soft hover:bg-canvas hover:text-ink'
              }`
            }
          >
            {enlace.texto}
          </NavLink>
        ))}

        <div className="mt-auto space-y-2 border-t border-line pt-4">
          {usuario ? (
            <Link
              to={rutaPanel}
              onClick={() => setMenuAbierto(false)}
              className="btn btn-primario w-full"
            >
              Mi panel
            </Link>
          ) : (
            <Link to="/login" onClick={() => setMenuAbierto(false)} className="btn btn-primario w-full">
              Iniciar sesión
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
