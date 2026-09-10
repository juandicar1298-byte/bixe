import { Link } from 'react-router-dom';

const NAVEGACION = [
  { a: '/', texto: 'Inicio' },
  { a: '/modelos', texto: 'Modelos' },
  { a: '/servicios', texto: 'Servicios' },
  { a: '/quienes-somos', texto: 'Quiénes somos' },
  { a: '/contacto', texto: 'Contacto' },
];

const REDES = [
  { nombre: 'Instagram', abreviatura: 'IG' },
  { nombre: 'Facebook', abreviatura: 'FB' },
  { nombre: 'YouTube', abreviatura: 'YT' },
];

export const Footer = () => (
  <footer className="border-t border-line bg-surface">
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
        {/* --- Marca --- */}
        <div className="md:col-span-2">
          <span className="text-2xl font-bold uppercase tracking-[0.32em] text-ink">
            BIXE<span className="text-brand">.</span>
          </span>

          <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-soft">
            Catálogo de motos y autos de alto rendimiento, y un taller que los
            mantiene a punto. Diseño, velocidad y tecnología para quienes buscan
            algo más que transporte.
          </p>

          <div className="mt-7 flex gap-2.5">
            {REDES.map((red) => (
              <a
                key={red.abreviatura}
                href="#"
                aria-label={red.nombre}
                className="grid h-10 w-10 place-items-center rounded-full border border-line text-xs font-bold text-ink-mute transition hover:border-brand hover:bg-brand-wash hover:text-brand-deep"
              >
                {red.abreviatura}
              </a>
            ))}
          </div>
        </div>

        {/* --- Navegación --- */}
        <div>
          <p className="rotulo mb-5">Navegación</p>
          <nav className="flex flex-col gap-3">
            {NAVEGACION.map((enlace) => (
              <Link
                key={enlace.a}
                to={enlace.a}
                className="w-fit text-sm text-ink-soft transition hover:text-brand-deep"
              >
                {enlace.texto}
              </Link>
            ))}
          </nav>
        </div>

        {/* --- Contacto --- */}
        <div>
          <p className="rotulo mb-5">Contacto</p>
          <div className="flex flex-col gap-3 text-sm">
            <a href="mailto:contacto@bixe.com" className="w-fit text-ink-soft transition hover:text-brand-deep">
              contacto@bixe.com
            </a>
            <a href="tel:+573001234567" className="w-fit text-ink-soft transition hover:text-brand-deep">
              +57 300 123 4567
            </a>
            <p className="text-ink-mute">Medellín, Colombia</p>
            <p className="text-ink-mute">Lun a sáb · 8:00 — 18:00</p>
          </div>
        </div>
      </div>

      <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-line pt-8 md:flex-row">
        <p className="text-xs text-ink-mute">
          © {new Date().getFullYear()} BIXE. Todos los derechos reservados.
        </p>
        <div className="flex gap-6">
          <a href="#" className="text-xs text-ink-mute transition hover:text-brand-deep">
            Términos y condiciones
          </a>
          <a href="#" className="text-xs text-ink-mute transition hover:text-brand-deep">
            Privacidad
          </a>
        </div>
      </div>
    </div>
  </footer>
);
