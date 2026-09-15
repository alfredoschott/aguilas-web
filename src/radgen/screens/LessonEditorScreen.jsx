import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getSeries, getLeccionPorId, crearLeccion, actualizarLeccion } from '../store'
import { extraerYoutubeId } from '../utils/youtube'

const PREGUNTA_VACIA = () => ({ pregunta: '', opciones: ['', '', '', ''], correcta: 0 })

export default function LessonEditorScreen() {
  const { leccionId } = useParams()
  const navigate = useNavigate()
  const existente = leccionId ? getLeccionPorId(leccionId) : null
  const series = getSeries()

  const [modoSerie, setModoSerie] = useState(series.length === 0 ? 'nueva' : 'existente')
  const [serieId, setSerieId] = useState(existente?.serieId || series[0]?.serieId || '')
  const [serieNueva, setSerieNueva] = useState('')
  const [titulo, setTitulo] = useState(existente?.titulo || '')
  const [icono, setIcono] = useState(existente?.icono || '📖')
  const [youtubeInput, setYoutubeInput] = useState(existente?.youtubeId || '')
  const [versiculoReferencia, setVersiculoReferencia] = useState(existente?.versiculo?.referencia || '')
  const [versiculoTexto, setVersiculoTexto] = useState(existente?.versiculo?.texto || '')
  const [notas, setNotas] = useState(existente?.notas || '')
  const [puntos, setPuntos] = useState(existente?.puntos?.length ? existente.puntos : [''])
  const [imagen, setImagen] = useState(existente?.imagen || '')
  const [quiz, setQuiz] = useState(existente?.quiz?.length ? existente.quiz : [])
  const [mensaje, setMensaje] = useState('')

  const usaSerieNueva = modoSerie === 'nueva' || series.length === 0

  function cambiarPunto(i, valor) {
    setPuntos((prev) => prev.map((p, idx) => (idx === i ? valor : p)))
  }
  function agregarPunto() {
    setPuntos((prev) => [...prev, ''])
  }
  function quitarPunto(i) {
    setPuntos((prev) => prev.filter((_, idx) => idx !== i))
  }

  function agregarPregunta() {
    setQuiz((prev) => [...prev, PREGUNTA_VACIA()])
  }
  function quitarPregunta(i) {
    setQuiz((prev) => prev.filter((_, idx) => idx !== i))
  }
  function cambiarPregunta(i, valor) {
    setQuiz((prev) => prev.map((p, idx) => (idx === i ? { ...p, pregunta: valor } : p)))
  }
  function cambiarOpcion(i, j, valor) {
    setQuiz((prev) =>
      prev.map((p, idx) => (idx === i ? { ...p, opciones: p.opciones.map((o, k) => (k === j ? valor : o)) } : p)),
    )
  }
  function cambiarCorrecta(i, j) {
    setQuiz((prev) => prev.map((p, idx) => (idx === i ? { ...p, correcta: j } : p)))
  }

  function guardar() {
    if (!titulo.trim()) return
    if (usaSerieNueva && !serieNueva.trim()) return
    if (!usaSerieNueva && !serieId) return

    const payload = {
      titulo: titulo.trim(),
      serieId: usaSerieNueva ? undefined : serieId,
      serieTitulo: usaSerieNueva
        ? `Serie: ${serieNueva.trim()}`
        : series.find((s) => s.serieId === serieId)?.serieTitulo,
      icono: icono.trim() || '📖',
      youtubeId: extraerYoutubeId(youtubeInput) || null,
      versiculo: versiculoReferencia.trim() || versiculoTexto.trim()
        ? { referencia: versiculoReferencia.trim(), texto: versiculoTexto.trim() }
        : null,
      notas: notas.trim(),
      puntos: puntos.map((p) => p.trim()).filter(Boolean),
      imagen: imagen.trim() || null,
      quiz: quiz
        .filter((p) => p.pregunta.trim() && p.opciones.every((o) => o.trim()))
        .map((p) => ({ ...p, pregunta: p.pregunta.trim(), opciones: p.opciones.map((o) => o.trim()) })),
    }

    if (existente) {
      actualizarLeccion(existente.id, payload)
    } else {
      crearLeccion(payload)
    }

    setMensaje('Guardado.')
    setTimeout(() => navigate('/radgen/education/lider', { state: { tab: 'cursos' } }), 600)
  }

  return (
    <div className="re-shell re-shell--ancho">
      <button
        className="re-vinculo"
        style={{ marginBottom: 16 }}
        onClick={() => navigate('/radgen/education/lider', { state: { tab: 'cursos' } })}
      >
        ← Volver a cursos
      </button>

      <h1 className="re-titulo-pagina">{existente ? 'Editar lección' : 'Nueva lección'}</h1>

      <div className="re-card">
        <h2 className="re-subtitulo">Serie</h2>
        {series.length > 0 && (
          <div className="re-check-grid">
            <button
              type="button"
              className={`re-check-pill ${!usaSerieNueva ? 'activo' : ''}`}
              onClick={() => setModoSerie('existente')}
            >
              Serie existente
            </button>
            <button
              type="button"
              className={`re-check-pill ${usaSerieNueva ? 'activo' : ''}`}
              onClick={() => setModoSerie('nueva')}
            >
              + Nueva serie
            </button>
          </div>
        )}

        {usaSerieNueva ? (
          <>
            <label className="re-label">Nombre de la serie nueva</label>
            <input
              className="re-input"
              placeholder="Ej. Génesis"
              value={serieNueva}
              onChange={(e) => setSerieNueva(e.target.value)}
            />
          </>
        ) : (
          <>
            <label className="re-label">Elige la serie</label>
            <select className="re-input" value={serieId} onChange={(e) => setSerieId(e.target.value)}>
              {series.map((s) => (
                <option key={s.serieId} value={s.serieId}>{s.serieTitulo}</option>
              ))}
            </select>
          </>
        )}
      </div>

      <div className="re-card">
        <h2 className="re-subtitulo">Lo básico</h2>
        <label className="re-label">Título</label>
        <input
          className="re-input"
          placeholder="Ej. Génesis — Cápsula 1: En el principio"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />

        <label className="re-label">Ícono</label>
        <input
          className="re-input"
          style={{ maxWidth: 120 }}
          placeholder="📖"
          value={icono}
          onChange={(e) => setIcono(e.target.value)}
        />

        <label className="re-label">Video de YouTube (URL o ID, opcional)</label>
        <input
          className="re-input"
          placeholder="https://youtu.be/…"
          value={youtubeInput}
          onChange={(e) => setYoutubeInput(e.target.value)}
        />

        <label className="re-label">Imagen destacada (URL, opcional)</label>
        <input
          className="re-input"
          placeholder="https://…"
          value={imagen}
          onChange={(e) => setImagen(e.target.value)}
        />
        {imagen.trim() && (
          <img
            src={imagen.trim()}
            alt="Vista previa"
            style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 10, marginBottom: '1rem', display: 'block' }}
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        )}
      </div>

      <div className="re-card">
        <h2 className="re-subtitulo">Versículo destacado</h2>
        <label className="re-label">Referencia</label>
        <input
          className="re-input"
          placeholder="Ej. Génesis 1:1"
          value={versiculoReferencia}
          onChange={(e) => setVersiculoReferencia(e.target.value)}
        />
        <label className="re-label">Texto (opcional)</label>
        <textarea
          className="re-input"
          rows={2}
          placeholder="Cita o paráfrasis del versículo…"
          value={versiculoTexto}
          onChange={(e) => setVersiculoTexto(e.target.value)}
          style={{ resize: 'vertical', fontFamily: 'inherit' }}
        />
      </div>

      <div className="re-card">
        <h2 className="re-subtitulo">Notas de la lección</h2>
        <textarea
          className="re-input"
          rows={4}
          placeholder="Resumen o contexto que verá el joven…"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          style={{ resize: 'vertical', fontFamily: 'inherit' }}
        />
      </div>

      <div className="re-card">
        <h2 className="re-subtitulo">Puntos clave</h2>
        {puntos.map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              className="re-input"
              style={{ marginBottom: 0 }}
              placeholder={`Punto ${i + 1}`}
              value={p}
              onChange={(e) => cambiarPunto(i, e.target.value)}
            />
            <button type="button" className="re-btn re-btn--sm" onClick={() => quitarPunto(i)}>✕</button>
          </div>
        ))}
        <button type="button" className="re-btn re-btn--sm" onClick={agregarPunto}>+ Agregar punto</button>
      </div>

      <div className="re-card">
        <h2 className="re-subtitulo">Quiz (opcional)</h2>
        <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.75 }}>
          Si no agregas preguntas, la lección no tendrá quiz al final.
        </p>
        {quiz.map((p, i) => (
          <div key={i} className="re-tarea" style={{ display: 'block', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <input
                className="re-input"
                style={{ marginBottom: 0 }}
                placeholder={`Pregunta ${i + 1}`}
                value={p.pregunta}
                onChange={(e) => cambiarPregunta(i, e.target.value)}
              />
              <button type="button" className="re-btn re-btn--sm" onClick={() => quitarPregunta(i)}>✕</button>
            </div>
            {p.opciones.map((o, j) => (
              <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <input
                  type="radio"
                  name={`correcta-${i}`}
                  checked={p.correcta === j}
                  onChange={() => cambiarCorrecta(i, j)}
                  aria-label={`Opción ${j + 1} correcta`}
                />
                <input
                  className="re-input"
                  style={{ marginBottom: 0 }}
                  placeholder={`Opción ${j + 1}`}
                  value={o}
                  onChange={(e) => cambiarOpcion(i, j, e.target.value)}
                />
              </div>
            ))}
            <p style={{ fontSize: '0.7rem', opacity: 0.6, margin: '4px 0 0' }}>
              Marca con el circulito cuál opción es la correcta.
            </p>
          </div>
        ))}
        <button type="button" className="re-btn re-btn--sm" onClick={agregarPregunta}>+ Agregar pregunta</button>
      </div>

      <button
        className="re-btn re-btn--lleno re-btn--bloque"
        onClick={guardar}
        disabled={!titulo.trim() || (usaSerieNueva ? !serieNueva.trim() : !serieId)}
      >
        {existente ? 'Guardar cambios' : 'Crear lección'}
      </button>
      {mensaje && <p style={{ textAlign: 'center', marginTop: 10, fontWeight: 700 }}>{mensaje}</p>}
    </div>
  )
}
