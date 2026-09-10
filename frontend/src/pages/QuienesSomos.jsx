import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import hero from '../assets/images/moto3.png';

const VALORES = [
  {
    titulo: 'Selección',
    texto: 'No listamos todo lo que existe. Cada modelo del catálogo pasa por una revisión técnica antes de entrar.',
  },
  {
    titulo: 'Taller propio',
    texto: 'Lo que vendemos lo sabemos mantener. Mecánica, mantenimiento y estética bajo el mismo techo.',
  },
  {
    titulo: 'Acompañamiento',
    texto: 'Antes y después de la compra. Asesoría honesta, incluso cuando la respuesta es "esta no es para ti".',
  },
];

export const QuienesSomos = () => (
  <div className="min-h-screen bg-canvas">
    <Header />

    {/* --- Encabezado --- */}
    <section className="border-b border-line bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-16 text-center md:py-24">
        <p className="rotulo">Nuestra historia</p>
        <h1 className="titular mt-3 text-5xl md:text-7xl">
          Quiénes <span className="text-brand">somos</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
          En BIXE nos dedicamos a ofrecer el mejor catálogo de motos y autos,
          combinando diseño, tecnología y pasión por la velocidad. Cada modelo
          es seleccionado pensando en quienes buscan algo más que transporte:
          buscan una experiencia.
        </p>
      </div>
    </section>

    {/* --- Imagen + texto --- */}
    <section className="mx-auto max-w-7xl px-6 py-20 md:px-8">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-line bg-surface">
          <img src={hero} alt="Taller BIXE" className="h-[380px] w-full object-cover" />
        </div>

        <div>
          <p className="rotulo">Desde 2019</p>
          <h2 className="titular mt-2 text-4xl md:text-5xl">
            Una obsesión con <span className="text-brand">el detalle</span>
          </h2>
          <p className="mt-5 leading-relaxed text-ink-soft">
            Empezamos como un taller pequeño en Medellín arreglando las motos del
            barrio. Hoy tenemos catálogo propio, pero seguimos midiendo el trabajo
            igual: por cómo queda la máquina cuando sale por la puerta.
          </p>
          <p className="mt-4 leading-relaxed text-ink-soft">
            Esa es toda la filosofía. Sin atajos en el mantenimiento y sin vender
            un modelo que no le sirva a quien lo va a manejar.
          </p>

          <Link to="/servicios" className="btn btn-primario mt-8">
            Conoce el taller
          </Link>
        </div>
      </div>
    </section>

    {/* --- Valores --- */}
    <section className="border-t border-line bg-surface">
      <div className="mx-auto max-w-7xl px-6 py-20 md:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {VALORES.map((valor, indice) => (
            <article key={valor.titulo} className="tarjeta p-7">
              <span className="titular text-5xl text-brand">0{indice + 1}</span>
              <h3 className="titular mt-4 text-2xl">{valor.titulo}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{valor.texto}</p>
            </article>
          ))}
        </div>
      </div>
    </section>

    <Footer />
  </div>
);
