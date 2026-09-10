/**
 * Cifra destacada del dashboard. El número es el protagonista;
 * el icono y el pie son secundarios y van en tinta apagada.
 */
export const TarjetaKPI = ({ etiqueta, valor, pie, icono: Icono, acento = false }) => (
  <div className="tarjeta tarjeta-hover p-5">
    <div className="mb-3 flex items-start justify-between gap-3">
      <p className="rotulo leading-tight">{etiqueta}</p>

      {Icono && (
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
            acento ? 'bg-brand-wash text-brand-deep' : 'bg-canvas text-ink-mute'
          }`}
        >
          <Icono className="h-[18px] w-[18px]" />
        </span>
      )}
    </div>

    <p className="titular text-3xl tabular-nums md:text-[2.1rem]">{valor}</p>

    {pie && <p className="mt-1.5 text-xs text-ink-mute">{pie}</p>}
  </div>
);
