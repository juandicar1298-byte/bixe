import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

const CANALES = [
  {
    rotulo: 'Correo',
    valor: 'contacto@bixe.com',
    enlace: 'mailto:contacto@bixe.com',
    detalle: 'Respondemos el mismo día hábil.',
  },
  {
    rotulo: 'Teléfono',
    valor: '+57 300 123 4567',
    enlace: 'tel:+573001234567',
    detalle: 'Lunes a sábado, 8:00 — 18:00.',
  },
  {
    rotulo: 'WhatsApp',
    valor: '+57 302 417 0803',
    enlace: 'https://wa.me/573024170803',
    detalle: 'Lo más rápido para cotizar.',
  },
];

export const Contacto = () => (
  <div className="min-h-screen bg-canvas">
    <Header />

    <section className="border-b border-line bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-16 text-center md:py-24">
        <p className="rotulo">Hablemos</p>
        <h1 className="titular mt-3 text-5xl md:text-7xl">
          Cont<span className="text-brand">acto</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
          Escríbenos por el canal que prefieras y con gusto te atendemos.
          Si es sobre un modelo puntual, cuéntanos cuál y te mandamos la ficha completa.
        </p>
      </div>
    </section>

    <div className="mx-auto max-w-5xl px-6 py-16 md:px-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {CANALES.map((canal) => (
          <a
            key={canal.rotulo}
            href={canal.enlace}
            target={canal.enlace.startsWith('http') ? '_blank' : undefined}
            rel={canal.enlace.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="tarjeta tarjeta-hover group flex flex-col p-7"
          >
            <p className="rotulo">{canal.rotulo}</p>
            <p className="titular mt-3 text-xl transition group-hover:text-brand-deep">
              {canal.valor}
            </p>
            <p className="mt-2 flex-1 text-sm text-ink-mute">{canal.detalle}</p>
            <span className="accion mt-5 text-ink-mute transition group-hover:text-brand-deep">
              Abrir →
            </span>
          </a>
        ))}
      </div>

      {/* --- Dirección --- */}
      <div className="tarjeta mt-6 flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center">
        <div>
          <p className="rotulo">Taller y showroom</p>
          <p className="titular mt-2 text-3xl">Medellín, Colombia</p>
          <p className="mt-2 text-sm text-ink-soft">
            Carrera 43A #1-50, El Poblado · Lun a sáb, 8:00 — 18:00
          </p>
        </div>

        <a
          href="https://maps.google.com/?q=Medellin+Colombia"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primario shrink-0"
        >
          Ver en el mapa
        </a>
      </div>
    </div>

    <Footer />
  </div>
);
