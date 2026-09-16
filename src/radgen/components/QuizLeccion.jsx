import { useState } from 'react'
import Confetti from './Confetti'
import Sky from './Sky'

export default function QuizLeccion({ preguntas, onTerminar }) {
  const [indice, setIndice] = useState(0)
  const [seleccion, setSeleccion] = useState(null)
  const [correctas, setCorrectas] = useState(0)
  const [acierto, setAcierto] = useState(false)

  const pregunta = preguntas[indice]
  const esUltima = indice === preguntas.length - 1
  const yaRespondio = seleccion !== null

  function elegir(i) {
    if (yaRespondio) return
    setSeleccion(i)
    setAcierto(i === pregunta.correcta)
    if (i === pregunta.correcta) setCorrectas((c) => c + 1)
  }

  function siguiente() {
    if (esUltima) {
      onTerminar({ correctas, total: preguntas.length })
      return
    }
    setIndice((i) => i + 1)
    setSeleccion(null)
  }

  return (
    <div className="re-card" style={{ position: 'relative', overflow: 'hidden' }}>
      {yaRespondio && acierto && <Confetti piezas={16} contenida />}

      <div className="re-quiz__progreso">
        Pregunta {indice + 1} de {preguntas.length}
      </div>
      <h2 className="re-subtitulo" style={{ marginBottom: '1.2rem' }}>{pregunta.pregunta}</h2>

      <div className="re-quiz__opciones">
        {pregunta.opciones.map((opcion, i) => {
          let estado = ''
          if (yaRespondio) {
            if (i === pregunta.correcta) estado = 'correcta'
            else if (i === seleccion) estado = 'incorrecta'
          }
          return (
            <button
              key={opcion}
              type="button"
              className={`re-quiz__opcion ${estado}`}
              onClick={() => elegir(i)}
              disabled={yaRespondio}
            >
              {opcion}
            </button>
          )
        })}
      </div>

      {yaRespondio && (
        <>
          <div className="re-quiz__feedback">
            <Sky size={40} pose={acierto ? 'logrado' : 'estudiando'} animado={false} />
            <span>{acierto ? '¡Correcto!' : 'No era esa, pero sigue adelante.'}</span>
          </div>
          <button className="re-btn re-btn--lleno re-btn--bloque" onClick={siguiente}>
            {esUltima ? 'Terminar' : 'Siguiente pregunta'}
          </button>
        </>
      )}
    </div>
  )
}
