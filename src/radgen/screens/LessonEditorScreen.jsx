import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getSeries, getLeccionPorId, crearLeccion, actualizarLeccion, slugificar, obtenerBloques } from '../store'
import { extraerYoutubeId } from '../utils/youtube'
import { subirImagenLeccion, borrarImagenLeccion } from '../utils/imagenLeccion'
import Sky from '../components/Sky'

const PREGUNTA_VACIA = () => ({ pregunta: '', opciones: ['', '', '', ''], correcta: 0 })

const TIPOS_BLOQUE = [
  ['versiculo', '📖 Versículo'],
  ['texto', '📝 Texto'],
  ['punto', '✅ Punto clave'],
  ['reto', '🎯 Reto'],
]

function bloqueVacio(tipo) {
  const base = { id: `b${Date.now()}${Math.random().toString(36).slice(2, 7)}`, tipo }
  return tipo === 'versiculo' ? { ...base, referencia: '', texto: '' } : { ...base, texto: '' }
}

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
  const [imagen, setImagen] = useState('')
  const [subiendoImagen, setSubiendoImagen] = useState(false)
  const [quiz, setQuiz] = useState([])
  const [bloques, setBloques] = useState([])
  const [comoBorrador, setComoBorrador] = useState(false)
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
      setImagen(d?.imagen || '')
      setQuiz(d?.quiz?.length ? d.quiz : [])
      setBloques(d ? obtenerBloques(d) : [])
      setCargando(false)
    })
  }, [leccionId])

  const usaSerieNueva = modoSerie === 'nueva' || series.length === 0

  function agregarBloque(tipo) {
    setBloques((prev) => [...prev, bloqueVacio(tipo)])
  }
  function quitarBloque(id) {
    setBloques((prev) => prev.filter((b) => b.id !== id))
  }
  function moverBloque(id, direccion) {
    setBloques((prev) => {
      const i = prev.findIndex((b) => b.id === id)
      const j = i + direccion
      if (j < 0 || j >= prev.length) return prev
      const copia = [...prev]
      ;[copia[i], copia[j]] = [copia[j], copia[i]]
      return copia
    })
  }
  function cambiarBloque(id, cambios) {
    setBloques((prev) => prev.map((b) => (b.id === id ? { ...b, ...cambios } : b)))
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
      imagen: imagen.trim() || null,
      quiz: quiz
        .filter((p) => p.pregunta.trim() && p.opciones.every((o) => o.trim()))
        .map((p) => ({ ...p, pregunta: p.pregunta.trim(), opciones: p.opciones.map((o) => o.trim()) })),
      contenido: bloques,
    }
    // El estado solo se decide aquí al crear — al editar una ya existente
    // no lo tocamos, para no reactivar sin querer una archivada o
    // publicar sin querer un borrador (eso se hace desde Cursos).
    if (!existente) payload.estado = comoBorrador ? 'borrador' : 'activa'

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
      {existente?.estado === 'borrador' && (
        <p className="re-eyebrow" style={{ marginBottom: '1rem' }}>📝 Borrador — publícala desde Cursos cuando esté lista</p>
      )}

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
        <h2 className="re-subtitulo">Contenido de la lección</h2>
        <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.75 }}>
          Arma la lección con los bloques que quieras, en el orden que quieras — cuantos versículos, textos, puntos
          o retos necesites.
        </p>

        {bloques.map((b, i) => (
          <div key={b.id} className="re-bloque">
            <div className="re-bloque__barra">
              <span className="re-bloque__tipo">{TIPOS_BLOQUE.find(([t]) => t === b.tipo)?.[1] || b.tipo}</span>
              <div className="re-bloque__acciones">
                <button type="button" className="re-vinculo re-vinculo--icono" disabled={i === 0} onClick={() => moverBloque(b.id, -1)}>↑</button>
                <button type="button" className="re-vinculo re-vinculo--icono" disabled={i === bloques.length - 1} onClick={() => moverBloque(b.id, 1)}>↓</button>
                <button type="button" className="re-vinculo re-vinculo--peligro" onClick={() => quitarBloque(b.id)}>✕</button>
              </div>
            </div>

            {b.tipo === 'versiculo' && (
              <>
                <input
                  className="re-input"
                  placeholder="Referencia (ej. Génesis 1:1)"
                  value={b.referencia}
                  onChange={(e) => cambiarBloque(b.id, { referencia: e.target.value })}
                />
                <textarea
                  className="re-input"
                  rows={2}
                  placeholder="Cita o paráfrasis del versículo…"
                  value={b.texto}
                  onChange={(e) => cambiarBloque(b.id, { texto: e.target.value })}
                  style={{ resize: 'vertical', fontFamily: 'inherit', marginBottom: 0 }}
                />
              </>
            )}
            {b.tipo === 'texto' && (
              <textarea
                className="re-input"
                rows={4}
                placeholder="Texto libre — resumen, contexto, explicación…"
                value={b.texto}
                onChange={(e) => cambiarBloque(b.id, { texto: e.target.value })}
                style={{ resize: 'vertical', fontFamily: 'inherit', marginBottom: 0 }}
              />
            )}
            {b.tipo === 'punto' && (
              <input
                className="re-input"
                style={{ marginBottom: 0 }}
                placeholder="Punto clave…"
                value={b.texto}
                onChange={(e) => cambiarBloque(b.id, { texto: e.target.value })}
              />
            )}
            {b.tipo === 'reto' && (
              <textarea
                className="re-input"
                rows={2}
                placeholder="Ej. Esta semana, cuéntale a alguien lo que aprendiste hoy."
                value={b.texto}
                onChange={(e) => cambiarBloque(b.id, { texto: e.target.value })}
                style={{ resize: 'vertical', fontFamily: 'inherit', marginBottom: 0 }}
              />
            )}
          </div>
        ))}

        {bloques.length === 0 && (
          <p style={{ opacity: 0.6, marginBottom: 16 }}>Todavía no agregas contenido — usa los botones de abajo.</p>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: bloques.length ? 16 : 0 }}>
          {TIPOS_BLOQUE.map(([tipo, etiqueta]) => (
            <button key={tipo} type="button" className="re-btn re-btn--sm" onClick={() => agregarBloque(tipo)}>
              + {etiqueta}
            </button>
          ))}
        </div>
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

      {!existente && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, cursor: 'pointer', marginBottom: '1.2rem' }}>
          <input type="checkbox" checked={comoBorrador} onChange={(e) => setComoBorrador(e.target.checked)} />
          Guardar como borrador (no se podrá asignar todavía)
        </label>
      )}

      <button
        className="re-btn re-btn--lleno re-btn--bloque"
        onClick={guardar}
        disabled={!titulo.trim() || (usaSerieNueva ? !serieNueva.trim() : !serieId) || guardando || subiendoImagen}
      >
        {guardando ? 'Guardando…' : existente ? 'Guardar cambios' : comoBorrador ? 'Guardar borrador' : 'Crear lección'}
      </button>
      {mensaje && <p style={{ textAlign: 'center', marginTop: 10, fontWeight: 700 }}>{mensaje}</p>}
    </div>
  )
}
