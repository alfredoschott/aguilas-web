import { useEffect, useState } from 'react'
import { getRanking, getParticipacionSemanal, getEquipos, calcularRankingEquipos } from '../store'
import { PodioRanking, RankingEquipos } from '../components/Ranking'
import Avatar from '../components/Avatar'
import logo from '../../assets/radgen-education-logo.png'

const rutaPerfil = (uid) => `/radgen/education/lider/joven/${uid}`

export default function ProyectorScreen() {
  const [ranking, setRanking] = useState([])
  const [equipos, setEquipos] = useState([])
  const [participacion, setParticipacion] = useState({ activos: 0, total: 0 })

  // Modo proyector: se refresca solo, pensado para dejarse abierto en una
  // pantalla durante todo el evento sin que nadie tenga que tocar nada.
  useEffect(() => {
    function refrescar() {
      Promise.all([getRanking(), getEquipos()]).then(([rk, eq]) => {
        setRanking(rk)
        setEquipos(calcularRankingEquipos(eq, rk))
      })
      getParticipacionSemanal().then(setParticipacion)
    }
    refrescar()
    const intervalo = setInterval(refrescar, 30000)
    return () => clearInterval(intervalo)
  }, [])

  return (
    <div className="re-proyector">
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
        <img src={logo} alt="RadGen Education" style={{ height: 90, width: 'auto' }} />
      </div>
      <h1 className="re-proyector__titulo">Ranking del grupo</h1>

      {participacion.total > 0 && (
        <div className="re-proyector__meta-grupo">
          🙌 Esta semana: <strong>{participacion.activos}/{participacion.total}</strong> jóvenes ya completaron una cápsula
        </div>
      )}

      <div className="re-proyector__podio">
        <PodioRanking ranking={ranking} rutaPerfil={rutaPerfil} />
      </div>

      {ranking.slice(3).map((fila) => (
        <div key={fila.joven.uid} className="re-proyector__fila">
          <div className="re-proyector__puesto">#{fila.posicion}</div>
          <Avatar nombre={fila.joven.nombre} foto={fila.joven.fotoPerfil} uid={fila.joven.uid} size={56} colorAcento={fila.joven.colorAcento} marco={fila.joven.marcoAvatar || fila.nivelActual?.id} />
          <div className="re-proyector__nombre">{fila.joven.apodo || fila.joven.nombre}</div>
          <div className="re-proyector__stats">
            <span>Nv {fila.experiencia.nivel}</span>
            <span>🏅 {fila.insigniasTotal}</span>
            {fila.racha > 0 && <span>🔥 {fila.racha}</span>}
            <span className="re-proyector__xp">{fila.xpTotal} XP</span>
          </div>
        </div>
      ))}

      {equipos.length > 0 && (
        <div className="re-proyector__equipos">
          <h2 className="re-proyector__subtitulo">Equipos</h2>
          <RankingEquipos equipos={equipos} />
        </div>
      )}

      {ranking.length === 0 && (
        <p style={{ textAlign: 'center', opacity: 0.7, fontSize: '1.3rem' }}>
          Todavía no hay jóvenes registrados.
        </p>
      )}
    </div>
  )
}
