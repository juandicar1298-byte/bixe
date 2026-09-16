// Set de iconos de línea usado en toda la app.
// Todos heredan el color con currentColor y el tamaño con las clases de Tailwind.

const Base = ({ children, className = 'h-5 w-5', ...rest }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
);

export const IconoResumen = (props) => (
  <Base {...props}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </Base>
);

export const IconoUsuarios = (props) => (
  <Base {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </Base>
);

export const IconoProductos = (props) => (
  <Base {...props}>
    <circle cx="5.5" cy="17.5" r="3.5" />
    <circle cx="18.5" cy="17.5" r="3.5" />
    <path d="M15 17.5h-6l-2.5-5H3" />
    <path d="M9 12.5L11.5 7H15" />
    <path d="M14 7h3l1.5 10.5" />
  </Base>
);

export const IconoServicios = (props) => (
  <Base {...props}>
    <path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 1 5.4-5.4l-2.5 2.5-1.4-1.4 2.5-2.5z" />
  </Base>
);

export const IconoPedidos = (props) => (
  <Base {...props}>
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </Base>
);

export const IconoCarrito = (props) => (
  <Base {...props}>
    <circle cx="9" cy="20" r="1.5" />
    <circle cx="18" cy="20" r="1.5" />
    <path d="M2 3h2.2l2.4 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 7H5" />
  </Base>
);

export const IconoPerfil = (props) => (
  <Base {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
  </Base>
);

export const IconoEscudo = (props) => (
  <Base {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </Base>
);

export const IconoSalir = (props) => (
  <Base {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </Base>
);

export const IconoSitio = (props) => (
  <Base {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z" />
  </Base>
);

export const IconoMas = (props) => (
  <Base {...props} strokeWidth="2.2">
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const IconoBuscar = (props) => (
  <Base {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </Base>
);

export const IconoMenu = (props) => (
  <Base {...props} strokeWidth="2">
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Base>
);

export const IconoCerrar = (props) => (
  <Base {...props} strokeWidth="2.2">
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
);

export const IconoFlecha = (props) => (
  <Base {...props}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Base>
);

export const IconoBasura = (props) => (
  <Base {...props}>
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
  </Base>
);

export const IconoReloj = (props) => (
  <Base {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Base>
);

// ---------------------------- Quinto avance ----------------------------

export const IconoVentas = (props) => (
  <Base {...props}>
    <path d="M3 17l5-6 4 3 5-7" />
    <path d="M17 7h4v4" />
    <path d="M3 21h18" />
  </Base>
);

export const IconoGrafico = (props) => (
  <Base {...props}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </Base>
);

export const IconoPqr = (props) => (
  <Base {...props}>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
    <path d="M12 8v4M12 16h.01" />
  </Base>
);

export const IconoChat = (props) => (
  <Base {...props}>
    <path d="M20 15a3 3 0 0 1-3 3H8l-4 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3z" />
    <path d="M9 10h6M9 13h3" />
  </Base>
);

export const IconoDescargar = (props) => (
  <Base {...props}>
    <path d="M12 3v11M8 11l4 4 4-4" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </Base>
);

export const IconoFactura = (props) => (
  <Base {...props}>
    <path d="M6 2h9l4 4v16l-3-2-3 2-3-2-3 2z" />
    <path d="M9 8h6M9 12h6M9 16h3" />
  </Base>
);

export const IconoEnviar = (props) => (
  <Base {...props}>
    <path d="M21 3L10.5 13.5M21 3l-6.5 18-4-8-8-4z" />
  </Base>
);
