import { useState } from 'react'

export default function QuizLeccion({ preguntas, onTerminar }) {
  const [indice, setIndice] = useState(0)
  const [seleccion, setSeleccion] = useState(null)
  const [correctas, setCorrectas] = useState(0)

  const pregunta = preguntas[indice]
  const esUltima = indice === preguntas.length - 1
  const yaRespondio = seleccion !== null

  function elegir(i) {
    if (yaRespondio) return
    setSeleccion(i)
    if (i === pregunta.correcta) setCorrectas((c) => c + 1)
  }

  function siguiente() {
    if (esUltima) {
      const correctasFinal = seleccion === pregunta.correcta ? correctas : correctas
      onTerminar({ correctas: correctasFinal, total: preguntas.length })
      return
    }
    setIndice((i) => i + 1)
    setSeleccion(null)
  }

  return (
    <div className="re-card">
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
          <p className="re-quiz__feedback">
            {seleccion === pregunta.correcta ? '✔ ¡Correcto!' : '✘ No era esa, pero sigue adelante.'}
          </p>
          <button className="re-btn re-btn--lleno re-btn--bloque" onClick={siguiente}>
            {esUltima ? 'Terminar' : 'Siguiente pregunta'}
          </button>
        </>
      )}
    </div>
  )
}
