import { useMemo, useState } from 'react'
import Confetti from './Confetti'
import { textoPlano } from '../utils/formatoTexto'
import { sonidoCompletar, sonidoReto } from '../utils/sonidos'

const limpiar = (palabra) => palabra.replace(/[.,;:!?¡¿"“”«»()]/g, '').toLowerCase()

// Esconde algunas palabras "de peso" del versículo (las más largas, sin
// repetir) para que el joven lo reconstruya tocando las fichas en orden.
function armarJuego(texto) {
  const palabras = textoPlano(texto).split(/\s+/).filter(Boolean)
  const candidatas = palabras
    .map((p, i) => ({ i, limpia: limpiar(p) }))
    .filter((c) => c.limpia.length >= 4)
  const cuantas = Math.min(6, Math.max(2, Math.round(palabras.length * 0.3)))
  const vistas = new Set()
  const elegidas = [...candidatas]
    .sort((a, b) => b.limpia.length - a.limpia.length)
    .filter((c) => {
      if (vistas.has(c.limpia)) return false
      vistas.add(c.limpia)
      return true
    })
    .slice(0, cuantas)
    .sort((a, b) => a.i - b.i)
  const huecos = new Set(elegidas.map((e) => e.i))
  const fichas = elegidas
    .map((e) => ({ id: e.i, palabra: palabras[e.i].replace(/^[«"“¡¿(]+|[.,;:!?"“”»)]+$/g, '') }))
    .sort(() => Math.random() - 0.5)
  return { palabras, huecos: [...huecos], fichas }
}

export default function MemorizarVersiculo({ texto, referencia, yaMemorizado, xp, onCompletar }) {
  const juego = useMemo(() => armarJuego(texto), [texto])
  const [jugando, setJugando] = useState(false)
  const [llenos, setLlenos] = useState([]) // índices de huecos ya resueltos, en orden
  const [error, setError] = useState(null)
  const [terminado, setTerminado] = useState(false)
  const [ganoXp, setGanoXp] = useState(false)

  if (juego.huecos.length < 2) return null

  const siguienteHueco = juego.huecos[llenos.length]

  function tocar(ficha) {
    if (ficha.id === siguienteHueco) {
      const nuevos = [...llenos, ficha.id]
      setLlenos(nuevos)
      setError(null)
      sonidoReto()
      if (nuevos.length === juego.huecos.length) {
        setTerminado(true)
        sonidoCompletar()
        if (!yaMemorizado) {
          setGanoXp(true)
          onCompletar()
        }
      }
    } else {
      setError(ficha.id)
      setTimeout(() => setError(null), 450)
    }
  }

  function reiniciar() {
    setLlenos([])
    setTerminado(false)
    setGanoXp(false)
    setJugando(true)
  }

  if (!jugando) {
    return (
      <div className="re-card re-memorizar re-memorizar--invitacion">
        <div>
          <p className="re-memorizar__titulo">🧠 Memoriza el versículo</p>
          <p className="re-memorizar__texto">
            {yaMemorizado ? 'Ya lo memorizaste ✓ — juega otra vez para repasarlo.' : `Completa las palabras que faltan y gana +${xp} XP.`}
          </p>
        </div>
        <button className="re-btn re-btn--lleno re-btn--sm" onClick={reiniciar}>
          {yaMemorizado ? 'Repasar' : '¡Jugar!'}
        </button>
      </div>
    )
  }

  return (
    <div className="re-card re-memorizar" style={{ position: 'relative', overflow: 'hidden' }}>
      {terminado && <Confetti piezas={24} contenida />}
      <p className="re-memorizar__titulo">🧠 Memoriza el versículo</p>
      <p className="re-memorizar__versiculo">
        {juego.palabras.map((p, i) => {
          if (!juego.huecos.includes(i)) return <span key={i}>{p} </span>
          const resuelto = llenos.includes(i)
          return (
            <span key={i} className={`re-memorizar__hueco ${resuelto ? 'resuelto' : ''} ${i === siguienteHueco ? 'actual' : ''}`}>
              {resuelto ? p : '＿＿＿'}{' '}
            </span>
          )
        })}
      </p>
      {referencia && <p className="re-memorizar__referencia">{referencia}</p>}

      {terminado ? (
        <div className="re-memorizar__fin">
          <p>{ganoXp ? `¡Lo lograste! +${xp} XP 🙌` : '¡Perfecto otra vez! 🙌'}</p>
          <button className="re-btn re-btn--sm" onClick={reiniciar}>Otra vez</button>
        </div>
      ) : (
        <div className="re-memorizar__fichas">
          {juego.fichas
            .filter((f) => !llenos.includes(f.id))
            .map((f) => (
              <button
                key={f.id}
                type="button"
                className={`re-memorizar__ficha ${error === f.id ? 'error' : ''}`}
                onClick={() => tocar(f)}
              >
                {f.palabra}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
