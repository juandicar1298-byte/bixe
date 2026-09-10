import { useState } from 'react';

export function Input({
  label,
  type = 'text',
  name,
  value,
  onChange,
  error,
  placeholder,
  ...rest
}) {
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const esPassword = type === 'password';
  const tipoFinal = esPassword && mostrarPassword ? 'text' : type;

  return (
    <div className="w-full">
      {label && <label className="etiqueta">{label}</label>}

      <div className="relative">
        <input
          type={tipoFinal}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`campo ${error ? '!border-peligro' : ''} ${esPassword ? '!pr-12' : ''}`}
          {...rest}
        />

        {esPassword && (
          <button
            type="button"
            onClick={() => setMostrarPassword((previo) => !previo)}
            aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-faint transition hover:text-brand-deep"
            tabIndex={-1}
          >
            {mostrarPassword ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            )}
          </button>
        )}
      </div>

      {error && <p className="mt-1.5 text-xs text-peligro">{error}</p>}
    </div>
  );
}
