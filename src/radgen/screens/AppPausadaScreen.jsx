import { Link } from 'react-router-dom'
import Sky from '../components/Sky'

// Se ve cuando la líder pausó todo desde Ajustes — ya sea al lanzamiento
// (todavía no hay nada que mostrar) o a medio curso (está haciendo
// ajustes y no quiere que nadie vea algo a medias). El texto es neutral
// para servir en ambos casos.
export default function AppPausadaScreen({ usuario }) {
  return (
    <div className="re-shell" style={{ textAlign: 'center' }}>
      <div className="re-card re-pausa-tarjeta">
        <span className="re-eyebrow" style={{ margin: '0 auto 1.5rem' }}>⏸ En pausa</span>

        <Sky size={110} pose="relajado" mensaje={`¡Aguanta tantito, ${usuario.nombre.split(' ')[0]}!`} />

        <h1 className="re-subtitulo" style={{ fontSize: 'clamp(1.4rem, 4vw, 1.8rem)', margin: '1.8rem 0 0.8rem' }}>
          El currículo está en pausa
        </h1>
        <p style={{ fontWeight: 600, opacity: 0.75, maxWidth: 380, margin: '0 auto 1.8rem' }}>
          Tu líder está haciendo algunos ajustes. En cuanto reactive el currículo, tus lecciones vuelven a aparecer
          aquí mismo — no tienes que hacer nada más.
        </p>
        <Link to="/radgen/education/perfil" className="re-btn re-btn--lleno">
          Personaliza tu perfil mientras tanto
        </Link>
      </div>
    </div>
  )
}
