import { Link } from 'react-router-dom'
import Sky from '../components/Sky'

export default function PreRegistroScreen({ usuario }) {
  return (
    <div className="re-shell" style={{ textAlign: 'center' }}>
      <div className="re-card re-preregistro-tarjeta">
        <span className="re-eyebrow" style={{ margin: '0 auto 1.5rem' }}>🎉 Ya estás dentro</span>

        <Sky size={110} pose="saludando" mensaje={`¡Qué bueno tenerte, ${usuario.nombre.split(' ')[0]}!`} />

        <h1 className="re-subtitulo" style={{ fontSize: 'clamp(1.4rem, 4vw, 1.8rem)', margin: '1.8rem 0 0.8rem' }}>
          Ya casi arrancamos
        </h1>
        <p style={{ fontWeight: 600, opacity: 0.75, maxWidth: 380, margin: '0 auto 1.8rem' }}>
          Tu líder está preparando las cápsulas. En cuanto estén listas, te avisamos y aparecerán aquí mismo — no
          tienes que hacer nada más.
        </p>
        <Link to="/radgen/education/perfil" className="re-btn re-btn--lleno">
          Personaliza tu perfil mientras tanto
        </Link>
      </div>
    </div>
  )
}
