/**
 * `placeholder` es el texto de la opción vacía. En un formulario tiene sentido
 * pedir que se elija algo; en un filtro, no: ahí la opción vacía ya significa
 * «todos» y va escrita en la lista. Con null no se pinta ninguna.
 */
export const Select = ({
  label,
  name,
  value,
  onChange,
  options,
  error,
  placeholder = 'Selecciona una opción',
}) => (
  <div className="w-full">
    {label && <label className="etiqueta">{label}</label>}

    <div className="relative">
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={`campo appearance-none pr-10 ${error ? '!border-peligro' : ''}`}
      >
        {placeholder !== null && <option value="">{placeholder}</option>}
        {options.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>

      <svg
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        viewBox="0 0 24 24"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>

    {error && <p className="mt-1.5 text-xs text-peligro">{error}</p>}
  </div>
);
