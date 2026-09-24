import { Link } from 'react-router-dom'
import Avatar from './Avatar'

const ORDEN_PODIO = [1, 0, 2] // 2º a la izquierda, 1º al centro, 3º a la derecha
const MEDALLAS = ['🥇', '🥈', '🥉']

function nombreDe(joven) {
  return joven.apodo || joven.nombre
}

export function PodioRanking({ ranking, rutaPerfil, uidActual }) {
  const top = ranking.slice(0, 3)
  if (top.length === 0) return null

  return (
    <div className="re-podio">
      {ORDEN_PODIO.map((pos) => {
        const fila = top[pos]
        if (!fila) return <div key={pos} className="re-podio__lugar re-podio__lugar--vacio" />
        return (
          <Link
            key={fila.joven.uid}
            to={rutaPerfil(fila.joven.uid)}
            className={`re-podio__lugar re-podio__lugar--${Math.min(fila.posicion, 3)} ${fila.joven.uid === uidActual ? 're-podio__lugar--yo' : ''}`}
            style={{ animationDelay: `${[0.25, 0, 0.4][pos]}s` }}
          >
            <span className="re-podio__medalla">{MEDALLAS[fila.posicion - 1] || '🏅'}</span>
            <Avatar
              nombre={fila.joven.nombre}
              foto={fila.joven.fotoPerfil}
              uid={fila.joven.uid}
              size={fila.posicion === 1 ? 64 : 50}
              marco={fila.joven.marcoAvatar || fila.nivelActual?.id}
              colorAcento={fila.joven.colorAcento}
            />
            <span className="re-podio__nombre">{nombreDe(fila.joven)}</span>
            <span className="re-podio__xp">{fila.xpTotal} XP</span>
            <div className="re-podio__base">
              <span>{fila.posicion}</span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

function FilaRanking({ fila, fija, rutaPerfil, uidActual, detallado }) {
  return (
    <div className={`re-ranking-fila ${fila.joven.uid === uidActual ? 're-ranking-fila--yo' : ''} ${fija ? 're-ranking-fila--fija' : ''}`}>
      <span className="re-ranking-fila__pos">{fila.posicion <= 3 ? MEDALLAS[fila.posicion - 1] : fila.posicion}</span>
      <Link to={rutaPerfil(fila.joven.uid)} className="re-ranking-fila__joven">
        <Avatar
          nombre={fila.joven.nombre}
          foto={fila.joven.fotoPerfil}
          uid={fila.joven.uid}
          size={34}
          marco={fila.joven.marcoAvatar || fila.nivelActual?.id}
          racha={fila.racha}
          colorAcento={fila.joven.colorAcento}
        />
        <span className="re-ranking-fila__nombre">{nombreDe(fila.joven)}</span>
      </Link>
      <span className="re-ranking-fila__stats">
        <span className="re-ranking-fila__chip" title="Nivel">Nv {fila.experiencia.nivel}</span>
        <span className="re-ranking-fila__chip" title="Insignias totales">🏅 {fila.insigniasTotal}</span>
        {detallado && <span className="re-ranking-fila__chip" title="Cápsulas completadas">📘 {fila.totalCompletadas}</span>}
        {fila.racha > 0 && <span className="re-ranking-fila__chip" title="Racha">🔥 {fila.racha}</span>}
      </span>
      <span className="re-ranking-fila__xp">{fila.xpTotal} XP</span>
    </div>
  )
}

// Tabla del resto del grupo (del 4º en adelante si hay podio). Si quien la
// ve está más abajo, su propia fila se repite fija al final para que
// siempre sepa dónde va sin tener que buscarse.
export function TablaRanking({ ranking, rutaPerfil, uidActual, desde = 3, detallado = false }) {
  const resto = ranking.slice(desde)
  const miPosicion = ranking.findIndex((f) => f.joven.uid === uidActual)

  return (
    <div className="re-ranking-lista">
      {resto.map((fila) => (
        <FilaRanking key={fila.joven.uid} fila={fila} rutaPerfil={rutaPerfil} uidActual={uidActual} detallado={detallado} />
      ))}
      {miPosicion >= desde + resto.length && (
        <FilaRanking fila={ranking[miPosicion]} fija rutaPerfil={rutaPerfil} uidActual={uidActual} detallado={detallado} />
      )}
    </div>
  )
}

export function RankingEquipos({ equipos }) {
  if (equipos.length === 0) return null
  const maximo = Math.max(1, ...equipos.map((e) => e.promedio))
  return (
    <div className="re-equipos-ranking">
      {equipos.map((e, i) => (
        <div key={e.id} className="re-equipo-fila" style={{ '--equipo-color': e.color || 'var(--rg-blue)' }}>
          <div className="re-equipo-fila__cabecera">
            <span className="re-equipo-fila__pos">{MEDALLAS[i] || i + 1}</span>
            <span className="re-equipo-fila__nombre">{e.nombre}</span>
            <span className="re-equipo-fila__xp">{e.promedio} XP prom.</span>
          </div>
          <div className="re-equipo-fila__barra">
            <div className="re-equipo-fila__relleno" style={{ width: `${(e.promedio / maximo) * 100}%` }} />
          </div>
          <div className="re-equipo-fila__miembros">
            {e.integrantes.map((f) => (
              <Avatar key={f.joven.uid} nombre={f.joven.nombre} foto={f.joven.fotoPerfil} uid={f.joven.uid} size={24} colorAcento={f.joven.colorAcento} />
            ))}
            <span className="re-equipo-fila__total">{e.total} XP en total · {e.integrantes.length} integrante{e.integrantes.length === 1 ? '' : 's'}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
