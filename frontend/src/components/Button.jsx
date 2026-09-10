const VARIANTES = {
  primary: 'btn-primario',
  secondary: 'btn-contorno',
  marca: 'btn-marca',
  sutil: 'btn-sutil',
};

export const Button = ({
  children,
  type = 'button',
  onClick,
  variant = 'primary',
  disabled = false,
  className = '',
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`btn ${VARIANTES[variant] ?? VARIANTES.primary} w-full ${className}`}
  >
    {children}
  </button>
);
