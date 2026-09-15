import { useEffect, useState } from 'react'
import { getRankingCampamento } from '../store'
import logo from '../../assets/radgen-education-logo.png'

const MEDALLAS = ['🥇', '🥈', '🥉']

export default function ProyectorScreen() {
  const [ranking, setRanking] = useState([])

  // Modo proyector: se refresca solo, pensado para dejarse abierto en una
  // pantalla durante todo el evento sin que nadie tenga que tocar nada.
  useEffect(() => {
    getRankingCampamento().then(setRanking)
    const intervalo = setInterval(() => {
      getRankingCampamento().then(setRanking)
    }, 5000)
    return () => clearInterval(intervalo)
  }, [])

  return (
    <div className="re-proyector">
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
        <img src={logo} alt="RadGen Education" style={{ height: 90, width: 'auto' }} />
      </div>
      <h1 className="re-proyector__titulo">Ranking del campamento</h1>

      {ranking.map((fila, i) => (
        <div key={fila.joven.uid} className="re-proyector__fila">
          <div className="re-proyector__puesto">{MEDALLAS[i] || `#${i + 1}`}</div>
          <div className="re-proyector__nombre">{fila.joven.nombre}</div>
          <div className="re-proyector__stats">
            <span>{fila.totalCompletadas} cápsula{fila.totalCompletadas === 1 ? '' : 's'}</span>
            {fila.racha > 0 && <span>🔥 {fila.racha}</span>}
            {fila.nivelActual && <span>{fila.nivelActual.icono} {fila.nivelActual.nombre}</span>}
          </div>
        </div>
      ))}

      {ranking.length === 0 && (
        <p style={{ textAlign: 'center', opacity: 0.7, fontSize: '1.3rem' }}>
          Todavía no hay jóvenes registrados.
        </p>
      )}
    </div>
  )
}
