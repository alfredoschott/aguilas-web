import { useEffect, useState } from 'react'
import { getComentariosDe, agregarComentario } from '../store'
import { useBorrador } from '../hooks/useBorrador'

export default function ComentariosLeccion({ asignacionId, jovenUid }) {
  const [comentarios, setComentarios] = useState([])
  const [texto, setTexto, limpiarBorrador] = useBorrador(`pregunta:${asignacionId}`)
  const [enviado, setEnviado] = useState(false)

  useEffect(() => {
    getComentariosDe(asignacionId).then(setComentarios)
  }, [asignacionId])

  async function enviar() {
    if (!texto.trim()) return
    const nuevos = await agregarComentario({ asignacionId, jovenUid, texto: texto.trim() })
    setComentarios(nuevos)
    limpiarBorrador()
    setEnviado(true)
    setTimeout(() => setEnviado(false), 2000)
  }

  return (
    <div className="re-card">
      <h2 className="re-subtitulo">¿Tienes alguna pregunta sobre esta lección?</h2>
      <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.75 }}>
        Escríbele a tu líder — ella la va a leer y responderte por aquí.
      </p>

      {comentarios.map((c) => (
        <div key={c.id} className="re-nota" style={{ marginBottom: 12 }}>
          <div className="re-nota__fecha">Tú — {new Date(c.fecha).toLocaleDateString('es-MX')}</div>
          <p style={{ margin: '0 0 8px' }}>{c.texto}</p>
          {c.respuesta ? (
            <div style={{ borderLeft: '3px solid var(--rg-blue)', paddingLeft: 10 }}>
              <div className="re-nota__fecha">Respuesta de tu líder</div>
              <p style={{ margin: 0, fontWeight: 700 }}>{c.respuesta}</p>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.6, fontStyle: 'italic' }}>
              Todavía sin responder.
            </p>
          )}
        </div>
      ))}

      <textarea
        className="re-input"
        rows={3}
        placeholder="Escribe tu pregunta o comentario…"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        style={{ resize: 'vertical', fontFamily: 'inherit' }}
      />
      <button className="re-btn re-btn--lleno" onClick={enviar} disabled={!texto.trim()}>
        Enviar
      </button>
      {enviado && <span style={{ marginLeft: 12, fontWeight: 700 }}>¡Enviado!</span>}
    </div>
  )
}
