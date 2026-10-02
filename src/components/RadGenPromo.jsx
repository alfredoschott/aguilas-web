import { ArrowRight } from 'lucide-react'
import useReveal from '../hooks/useReveal'
import LinkSitio from './LinkSitio'
import { urlRadgen } from '../dominios'

function RadGenPromo() {
  const refCard = useReveal()

  return (
    <section style={{
      background: 'var(--fondo)',
      padding: 'clamp(2.5rem, 8vw, 5rem) 2rem',
      borderTop: '1px solid var(--borde)',
    }}>
      <div
        ref={refCard}
        className="reveal radgen-promo-card"
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(1.5rem, 4vw, 2.5rem)',
          flexWrap: 'wrap',
          justifyContent: 'center',
          textAlign: 'left',
        }}
      >
        <div style={{ position: 'relative', flexShrink: 0, margin: '18px 8px 0' }}>
          <span className="radgen-promo-badge">¡Hola, soy Sky! 🦅</span>
          <img
            src="/sky-mascota.png"
            alt="Sky, la mascota de RadGen"
            width="200"
            height="257"
            loading="lazy"
            style={{
              width: 'clamp(170px, 22vw, 200px)',
              height: 'auto',
              display: 'block',
              filter: 'drop-shadow(0 14px 22px rgba(0,0,0,0.4))',
            }}
          />
        </div>

        <div style={{ flex: '1 1 320px', minWidth: '260px' }}>
          <p style={{
            color: '#F5F3EE',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: '900',
            fontSize: '0.72rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: '0.6rem',
            opacity: 0.85,
          }}>
            Ministerio de jóvenes
          </p>
          <h2 style={{
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: '900',
            fontSize: 'clamp(1.5rem, 3.2vw, 2.1rem)',
            color: '#F5F3EE',
            textTransform: 'uppercase',
            marginBottom: '0.75rem',
            lineHeight: 1.1,
          }}>
            ¿Ya conoces RadGen MX?
          </h2>
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.95rem',
            color: '#E4EEFF',
            fontWeight: '500',
            marginBottom: '1.5rem',
            maxWidth: '440px',
          }}>
            Es el espacio para adolescentes y jóvenes de Águilas CFC: fe real, amigos de verdad y un propósito que vale la pena.
          </p>
          <LinkSitio to={urlRadgen()} className="radgen-promo-btn">
            Conocer RadGen MX
            <ArrowRight size={16} strokeWidth={2.5} />
          </LinkSitio>
        </div>
      </div>
    </section>
  )
}

export default RadGenPromo
