import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getSeries, getLeccionPorId, crearLeccion, actualizarLeccion, slugificar } from '../store'
import { extraerYoutubeId } from '../utils/youtube'
import { subirImagenLeccion, borrarImagenLeccion } from '../utils/imagenLeccion'
import Sky from '../components/Sky'

const PREGUNTA_VACIA = () => ({ pregunta: '', opciones: ['', '', '', ''], correcta: 0 })

export default function LessonEditorScreen() {
  const { leccionId } = useParams()
  const navigate = useNavigate()
  const [cargando, setCargando] = useState(true)
  const [existente, setExistente] = useState(null)
  const [series, setSeries] = useState([])

  const [modoSerie, setModoSerie] = useState('existente')
  const [serieId, setSerieId] = useState('')
  const [serieNueva, setSerieNueva] = useState('')
  const [titulo, setTitulo] = useState('')
  const [icono, setIcono] = useState('📖')
  const [youtubeInput, setYoutubeInput] = useState('')
  const [versiculoReferencia, setVersiculoReferencia] = useState('')
  const [versiculoTexto, setVersiculoTexto] = useState('')
  const [notas, setNotas] = useState('')
  const [puntos, setPuntos] = useState([''])
  const [imagen, setImagen] = useState('')
  const [subiendoImagen, setSubiendoImagen] = useState(false)
  const [quiz, setQuiz] = useState([])
  const [reto, setReto] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    Promise.all([leccionId ? getLeccionPorId(leccionId) : Promise.resolve(null), getSeries()]).then(([d, s]) => {
      setExistente(d)
      setSeries(s)
      setModoSerie(s.length === 0 ? 'nueva' : 'existente')
      setSerieId(d?.serieId || s[0]?.serieId || '')
      setTitulo(d?.titulo || '')
      setIcono(d?.icono || '📖')
      setYoutubeInput(d?.youtubeId || '')
      setVersiculoReferencia(d?.versiculo?.referencia || '')
      setVersiculoTexto(d?.versiculo?.texto || '')
      setNotas(d?.notas || '')
      setPuntos(d?.puntos?.length ? d.puntos : [''])
      setImagen(d?.imagen || '')
      setQuiz(d?.quiz?.length ? d.quiz : [])
      setReto(d?.reto || '')
      setCargando(false)
    })
  }, [leccionId])

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

  async function subirImagen(e) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    setSubiendoImagen(true)
    try {
      const urlAnterior = imagen.trim()
      const url = await subirImagenLeccion(archivo)
      if (urlAnterior) borrarImagenLeccion(urlAnterior)
      setImagen(url)
    } catch {
      setMensaje('No se pudo subir la imagen. Intenta de nuevo.')
    } finally {
      setSubiendoImagen(false)
      e.target.value = ''
    }
  }

  function quitarImagen() {
    borrarImagenLeccion(imagen.trim())
    setImagen('')
  }

  async function guardar() {
    if (!titulo.trim()) return
    if (usaSerieNueva && !serieNueva.trim()) return
    if (!usaSerieNueva && !serieId) return

    const payload = {
      titulo: titulo.trim(),
      serieId: usaSerieNueva ? slugificar(serieNueva.trim()) : serieId,
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
      reto: reto.trim() || null,
    }

    setGuardando(true)
    try {
      if (existente) {
        await actualizarLeccion(existente.id, payload)
      } else {
        await crearLeccion(payload)
      }
      setMensaje('Guardado.')
      setTimeout(() => navigate('/radgen/education/lider', { state: { tab: 'cursos' } }), 600)
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <div className="re-shell re-shell--ancho" style={{ textAlign: 'center' }}>
        <Sky size={72} pose="estudiando" animado />
      </div>
    )
  }

  return (
    <div className="re-shell re-shell--ancho">
      <button
        className="re-vinculo re-vinculo--volver"
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

        <label className="re-label">Imagen destacada (opcional)</label>
        <input
          type="file"
          accept="image/*"
          className="re-input"
          onChange={subirImagen}
          disabled={subiendoImagen}
        />
        {subiendoImagen && <p style={{ fontWeight: 700, opacity: 0.75 }}>Subiendo imagen…</p>}
        {imagen.trim() && !subiendoImagen && (
          <div style={{ marginBottom: '1rem' }}>
            <img
              src={imagen.trim()}
              alt="Vista previa"
              style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 10, display: 'block', marginBottom: 8 }}
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            <button type="button" className="re-vinculo re-vinculo--peligro" onClick={quitarImagen}>
              Quitar imagen
            </button>
          </div>
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
        <h2 className="re-subtitulo">Reto de la semana</h2>
        <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.75 }}>
          Una acción práctica y corta para llevar la lección a la vida diaria, más allá de ver el video.
        </p>
        <textarea
          className="re-input"
          rows={2}
          placeholder="Ej. Esta semana, cuéntale a alguien lo que aprendiste hoy."
          value={reto}
          onChange={(e) => setReto(e.target.value)}
          style={{ resize: 'vertical', fontFamily: 'inherit' }}
        />
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
        disabled={!titulo.trim() || (usaSerieNueva ? !serieNueva.trim() : !serieId) || guardando || subiendoImagen}
      >
        {guardando ? 'Guardando…' : existente ? 'Guardar cambios' : 'Crear lección'}
      </button>
      {mensaje && <p style={{ textAlign: 'center', marginTop: 10, fontWeight: 700 }}>{mensaje}</p>}
    </div>
  )
}
