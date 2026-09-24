import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getDuelo, getJovenPorUid, responderDuelo, ganadorDeDuelo } from '../store'
import Sky from '../components/Sky'
import Avatar from '../components/Avatar'
import Confetti from '../components/Confetti'
import { sonidoCompletar, sonidoNivel } from '../utils/sonidos'

function segundos(ms) {
  return (ms / 1000).toFixed(1)
}

function Jugada({ preguntas, onTerminar }) {
  const [indice, setIndice] = useState(0)
  const [seleccion, setSeleccion] = useState(null)
  const [correctas, setCorrectas] = useState(0)
  const [transcurrido, setTranscurrido] = useState(0)
  const inicio = useRef(0)

  useEffect(() => {
    inicio.current = performance.now()
    const id = setInterval(() => setTranscurrido(performance.now() - inicio.current), 100)
    return () => clearInterval(id)
  }, [])

  const pregunta = preguntas[indice]

  function elegir(i) {
    if (seleccion !== null) return
    setSeleccion(i)
    const acierto = i === pregunta.correcta
    const nuevasCorrectas = correctas + (acierto ? 1 : 0)
    setCorrectas(nuevasCorrectas)
    setTimeout(() => {
      if (indice === preguntas.length - 1) {
        onTerminar({ correctas: nuevasCorrectas, tiempoMs: performance.now() - inicio.current })
        return
      }
      setIndice((x) => x + 1)
      setSeleccion(null)
    }, 650)
  }

  return (
    <div className="re-card re-duelo-jugada">
      <div className="re-duelo-jugada__barra">
        <span>Pregunta {indice + 1}/{preguntas.length}</span>
        <span className="re-duelo-jugada__reloj">⏱ {segundos(transcurrido)} s</span>
      </div>
      <div className="re-barra re-barra--mini" style={{ marginBottom: 18 }}>
        <div className="re-barra__relleno" style={{ width: `${(indice / preguntas.length) * 100}%` }} />
      </div>
      <p className="re-duelo-jugada__leccion">{pregunta.leccionTitulo}</p>
      <h2 className="re-subtitulo" style={{ marginBottom: '1.2rem' }}>{pregunta.pregunta}</h2>
      <div className="re-quiz__opciones">
        {pregunta.opciones.map((opcion, i) => {
          let estado = ''
          if (seleccion !== null) {
            if (i === pregunta.correcta) estado = 'correcta'
            else if (i === seleccion) estado = 'incorrecta'
          }
          return (
            <button key={opcion} type="button" className={`re-quiz__opcion ${estado}`} onClick={() => elegir(i)} disabled={seleccion !== null}>
              {opcion}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TarjetaJugador({ joven, respuesta, total, gano }) {
  return (
    <div className={`re-duelo-jugador ${gano ? 're-duelo-jugador--gano' : ''}`}>
      {gano && <span className="re-duelo-jugador__corona">👑</span>}
      <Avatar nombre={joven?.nombre} foto={joven?.fotoPerfil} uid={joven?.uid} size={60} colorAcento={joven?.colorAcento} />
      <p className="re-duelo-jugador__nombre">{joven?.apodo || joven?.nombre || '…'}</p>
      {respuesta ? (
        <>
          <p className="re-duelo-jugador__puntos">{respuesta.correctas}/{total}</p>
          <p className="re-duelo-jugador__tiempo">{segundos(respuesta.tiempoMs)} s</p>
        </>
      ) : (
        <p className="re-duelo-jugador__tiempo">Todavía no juega</p>
      )}
    </div>
  )
}

export default function DueloScreen({ usuario }) {
  const { dueloId } = useParams()
  const [duelo, setDuelo] = useState(undefined)
  const [jugadores, setJugadores] = useState({})
  const [jugando, setJugando] = useState(false)

  useEffect(() => {
    getDuelo(dueloId).then(async (d) => {
      setDuelo(d)
      if (!d) return
      const [a, b] = await Promise.all([getJovenPorUid(d.retadorUid), getJovenPorUid(d.retadoUid)])
      setJugadores({ [d.retadorUid]: a, [d.retadoUid]: b })
    })
  }, [dueloId])

  async function terminar({ correctas, tiempoMs }) {
    const actualizado = await responderDuelo({ dueloId, uid: usuario.uid, correctas, tiempoMs })
    setJugando(false)
    setDuelo(actualizado)
    if (ganadorDeDuelo(actualizado) === usuario.uid) sonidoNivel()
    else sonidoCompletar()
  }

  if (duelo === undefined) {
    return (
      <div className="re-shell" style={{ textAlign: 'center' }}>
        <Sky size={72} pose="estudiando" animado />
      </div>
    )
  }

  const participo = duelo && (duelo.retadorUid === usuario.uid || duelo.retadoUid === usuario.uid)
  if (!duelo || !participo) {
    return (
      <div className="re-shell">
        <div className="re-card">Este duelo no existe o no es tuyo.</div>
        <Link to="/radgen/education/lecciones" className="re-btn">← Mis lecciones</Link>
      </div>
    )
  }

  const rivalUid = duelo.retadorUid === usuario.uid ? duelo.retadoUid : duelo.retadorUid
  const rival = jugadores[rivalUid]
  const yaJugue = !!duelo.respuestas?.[usuario.uid]
  const ambos = yaJugue && !!duelo.respuestas?.[rivalUid]
  const ganador = ganadorDeDuelo(duelo)

  if (jugando) {
    return (
      <div className="re-shell">
        <Jugada preguntas={duelo.preguntas} onTerminar={terminar} />
      </div>
    )
  }

  return (
    <div className="re-shell">
      <Link to="/radgen/education/lecciones" className="re-vinculo re-vinculo--volver" style={{ marginBottom: 16, display: 'inline-block' }}>
        ← Mis lecciones
      </Link>
      <div className="re-card re-duelo" style={{ position: 'relative', overflow: 'hidden' }}>
        {ambos && ganador === usuario.uid && <Confetti piezas={40} contenida />}
        <p className="re-duelo__eyebrow">⚔️ Duelo de repaso</p>
        <div className="re-duelo__versus">
          <TarjetaJugador joven={jugadores[usuario.uid]} respuesta={duelo.respuestas?.[usuario.uid]} total={duelo.preguntas.length} gano={ambos && ganador === usuario.uid} />
          <span className="re-duelo__vs">VS</span>
          <TarjetaJugador joven={rival} respuesta={ambos ? duelo.respuestas?.[rivalUid] : null} total={duelo.preguntas.length} gano={ambos && ganador === rivalUid} />
        </div>

        {!yaJugue && (
          <>
            <p className="re-duelo__texto">
              {duelo.preguntas.length} preguntas de cápsulas que los dos ya vieron. Gana quien acierte más; si empatan, el más rápido.
            </p>
            <button className="re-btn re-btn--lleno re-btn--bloque" onClick={() => setJugando(true)}>
              ¡Empezar! ⚔️
            </button>
          </>
        )}

        {yaJugue && !ambos && (
          <p className="re-duelo__texto">
            ✅ Ya jugaste. Esperando a que {rival?.apodo || rival?.nombre || 'tu rival'} responda — el resultado aparece aquí en cuanto juegue.
          </p>
        )}

        {ambos && (
          <p className="re-duelo__resultado">
            {ganador === usuario.uid ? '🏆 ¡Ganaste el duelo!' : ganador ? `${rival?.apodo || rival?.nombre} ganó esta vez. ¡Revancha!` : '🤝 ¡Empate exacto!'}
          </p>
        )}
      </div>
    </div>
  )
}
