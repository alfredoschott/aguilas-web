import { Link } from 'react-router-dom'
import Sky from './Sky'
import { textoTiempoRestante, nivelUrgencia } from '../utils/tiempo'

function lineaValor(valor) {
  if (!valor) return null
  const porcentaje = Math.round(valor.factor * 100)
  if (valor.enPausa) return { texto: `⏸ Vale ${porcentaje}% · calendario en pausa`, clase: 'pausa' }
  if (valor.msParaBajar === null) return { texto: `Vale ${porcentaje}% · ¡hazla ya!`, clase: 'urgente' }
  const cuando = textoTiempoRestante(valor.msParaBajar)
  return {
    texto: valor.factor === 1 ? `⚡ Vale 100% por ${cuando} más` : `⚡ Vale ${porcentaje}% · baja en ${cuando}`,
    clase: nivelUrgencia(valor.msParaBajar),
  }
}

// La tarjeta más importante de la pantalla: qué te toca hacer ahora, cuánto
// vale si la haces hoy y un botón grande para empezar — en vez de que el
// joven tenga que buscarla en el mapa.
export default function HeroSiguiente({ siguiente, valor, nombre, pose, mensaje, sinLecciones }) {
  const primerNombre = (nombre || '').split(' ')[0]

  if (!siguiente) {
    return (
      <section className="re-hero-sig re-hero-sig--aldia">
        <div className="re-hero-sig__cuerpo">
          <p className="re-hero-sig__eyebrow">{sinLecciones ? 'Bienvenido' : 'Misión cumplida'}</p>
          <h1 className="re-hero-sig__titulo">
            {sinLecciones ? `¡Hola, ${primerNombre}!` : `¡Vas al día, ${primerNombre}!`}
          </h1>
          <p className="re-hero-sig__texto">
            {sinLecciones ? mensaje : 'Completaste todo lo que tienes. Tu próxima cápsula aparece aquí en cuanto tu líder la libere.'}
          </p>
          {!sinLecciones && (
            <Link to="/radgen/education/companeros" className="re-btn re-btn--lleno re-btn--duelo re-hero-sig__cta">
              ⚔️ Mientras tanto, reta a alguien
            </Link>
          )}
        </div>
        <div className="re-hero-sig__sky">
          <Sky size={130} pose={pose} animado />
        </div>
      </section>
    )
  }

  const { nodo, serie, indice, total, color } = siguiente
  const linea = lineaValor(valor)

  return (
    <section className="re-hero-sig" style={{ '--serie-color': color }}>
      <div className="re-hero-sig__cuerpo">
        <p className="re-hero-sig__eyebrow">
          Tu siguiente cápsula · {indice + 1} de {total}
        </p>
        <h1 className="re-hero-sig__titulo">{nodo.leccion.titulo}</h1>
        <p className="re-hero-sig__serie">{serie.serieTitulo.replace(/^Serie:\s*/i, '')}</p>
        {linea && <span className={`re-hero-sig__valor re-hero-sig__valor--${linea.clase}`}>{linea.texto}</span>}
        <Link to={`/radgen/education/leccion/${nodo.asignacion.id}`} className="re-hero-sig__cta re-hero-sig__cta--empezar">
          Empezar
          <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className="re-hero-sig__arte" aria-hidden="true">
        <span className="re-hero-sig__halo" />
        <span className="re-hero-sig__icono">{nodo.leccion.icono}</span>
        <span className="re-hero-sig__sky-mini">
          <Sky size={62} pose={pose} animado={false} />
        </span>
      </div>
    </section>
  )
}
