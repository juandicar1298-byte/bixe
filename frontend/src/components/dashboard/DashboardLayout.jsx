import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { IconoSalir, IconoSitio, IconoMenu, IconoCerrar } from '../ui/Iconos';

const NOMBRE_ROL = { 1: 'Administrador', 2: 'Empleado', 3: 'Cliente' };

/**
 * Armazón común de los tres paneles: barra lateral con la navegación,
 * cabecera con el título de la sección y el área de contenido.
 *
 * secciones: [{ id, etiqueta, icono: Componente, insignia?: número }]
 */
export const DashboardLayout = ({
  secciones,
  seccionActiva,
  onCambiarSeccion,
  titulo,
  descripcion,
  acciones,
  children,
}) => {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const iniciales = usuario
    ? `${usuario.nombre?.[0] ?? ''}${usuario.apellido?.[0] ?? ''}`.toUpperCase()
    : '';

  const handleCerrarSesion = () => {
    cerrarSesion();
    navigate('/');
  };

  const seleccionar = (id) => {
    onCambiarSeccion(id);
    setMenuAbierto(false);
  };

  const barraLateral = (
    <div className="flex h-full flex-col">
      <Link
        to="/"
        className="flex items-center gap-2 px-6 py-7 text-lg font-bold uppercase tracking-[0.3em] text-ink"
      >
        BIXE<span className="text-brand">.</span>
      </Link>

      <nav className="flex-1 space-y-1 px-3">
        {secciones.map((seccion) => {
          const Icono = seccion.icono;
          const activa = seccion.id === seccionActiva;

          return (
            <button
              key={seccion.id}
              onClick={() => seleccionar(seccion.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                activa
                  ? 'bg-ink text-white shadow-suave'
                  : 'text-ink-soft hover:bg-canvas hover:text-ink'
              }`}
            >
              <Icono className={`h-[18px] w-[18px] ${activa ? 'text-brand' : 'text-ink-mute'}`} />
              <span className="flex-1 text-left">{seccion.etiqueta}</span>

              {seccion.insignia > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[0.65rem] font-bold ${
                    activa ? 'bg-white/15 text-white' : 'bg-brand-wash text-brand-deep'
                  }`}
                >
                  {seccion.insignia}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-line p-4">
        <div className="flex items-center gap-3 rounded-xl bg-canvas px-3 py-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-white">
            {iniciales}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              {usuario?.nombre} {usuario?.apellido}
            </p>
            <p className="truncate text-[0.7rem] uppercase tracking-wider text-ink-mute">
              {NOMBRE_ROL[usuario?.rol?.id] ?? 'Usuario'}
            </p>
          </div>
        </div>

        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-canvas hover:text-ink"
        >
          <IconoSitio className="h-[18px] w-[18px] text-ink-mute" />
          Ver el sitio
        </Link>

        <button
          onClick={handleCerrarSesion}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-peligro-wash hover:text-peligro"
        >
          <IconoSalir className="h-[18px] w-[18px]" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
      {/* --- Barra lateral fija en escritorio --- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] border-r border-line bg-surface lg:block">
        {barraLateral}
      </aside>

      {/* --- Cajón deslizable en móvil --- */}
      <div
        onClick={() => setMenuAbierto(false)}
        className={`fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm transition-opacity lg:hidden ${
          menuAbierto ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[264px] border-r border-line bg-surface transition-transform duration-300 lg:hidden ${
          menuAbierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMenuAbierto(false)}
          aria-label="Cerrar menú"
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-ink-mute hover:bg-canvas hover:text-ink"
        >
          <IconoCerrar className="h-4 w-4" />
        </button>
        {barraLateral}
      </aside>

      {/* --- Contenido --- */}
      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-md">
          <div className="flex items-center gap-4 px-5 py-4 md:px-8">
            <button
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-canvas lg:hidden"
            >
              <IconoMenu className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <p className="rotulo">Panel · {NOMBRE_ROL[usuario?.rol?.id] ?? ''}</p>
              <h1 className="titular truncate text-2xl md:text-3xl">{titulo}</h1>
            </div>

            {acciones && <div className="flex shrink-0 items-center gap-2">{acciones}</div>}
          </div>
        </header>

        <main className="px-5 py-7 md:px-8 md:py-9">
          {descripcion && (
            <p className="mb-6 max-w-2xl text-sm text-ink-mute">{descripcion}</p>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};
