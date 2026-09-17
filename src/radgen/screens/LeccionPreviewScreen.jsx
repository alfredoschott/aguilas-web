import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getLeccionPorId, obtenerBloques, agruparBloques } from '../store'
import Sky from '../components/Sky'
import { renderTextoFormateado } from '../utils/formatoTexto'

// Lo que la líder ve al previsualizar una lección desde Cursos — el mismo
// contenido que vería un joven, pero de solo lectura: sin marcar como
// vista, sin registrar el quiz, sin contar como progreso real de nadie.
export default function LeccionPreviewScreen() {
  const { leccionId } = useParams()
  const navigate = useNavigate()
  const [leccion, setLeccion] = useState(undefined) // undefined = cargando

  useEffect(() => {
    getLeccionPorId(leccionId).then(setLeccion)
  }, [leccionId])

  if (leccion === undefined) {
    return (
      <div className="re-shell" style={{ textAlign: 'center' }}>
        <Sky size={72} pose="estudiando" animado />
      </div>
    )
  }

  if (!leccion) {
    return (
      <div className="re-shell">
        <div className="re-card">Esta lección ya no existe.</div>
        <button className="re-btn" onClick={() => navigate('/radgen/education/lider')}>← Volver a Cursos</button>
      </div>
    )
  }

  const bloques = obtenerBloques(leccion)
  const bloquesReto = bloques.filter((b) => b.tipo === 'reto')
  const gruposContenido = agruparBloques(bloques.filter((b) => b.tipo !== 'reto'))

  return (
    <div className="re-shell">
      <button className="re-vinculo re-vinculo--volver" style={{ marginBottom: 16 }} onClick={() => navigate(-1)}>
        ← Volver
      </button>

      <div className="re-vista-previa-banner">
        👁 Vista previa — así la ve un joven. Nada de esto cuenta como progreso real.
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
        <h1 className="re-titulo-pagina" style={{ margin: 0 }}>{leccion.icono} {leccion.titulo}</h1>
        <Sky size={56} pose="estudiando" animado={false} />
      </div>

      {leccion.imagen && <img src={leccion.imagen} alt="" className="re-imagen-leccion" />}

      <div className="re-video-placeholder">
        {leccion.youtubeId ? (
          <iframe
            src={`https://www.youtube.com/embed/${leccion.youtubeId}?rel=0`}
            title={leccion.titulo}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 900,
              textTransform: 'uppercase',
              textAlign: 'center',
              padding: 20,
            }}
          >
            Video pendiente de subir
          </div>
        )}
      </div>

      {gruposContenido.map((grupo, gi) => {
        if (grupo.tipo === 'versiculo') {
          const v = grupo.items[0]
          return (
            <div key={gi} className="re-versiculo">
              {v.texto && <p className="re-versiculo__texto">"{renderTextoFormateado(v.texto)}"</p>}
              {v.referencia && <p className="re-versiculo__referencia">{v.referencia}</p>}
            </div>
          )
        }
        if (grupo.tipo === 'texto') {
          return (
            <div key={gi} className="re-card">
              {grupo.items.map((b) => (
                <p key={b.id} style={{ marginTop: 0 }}>{renderTextoFormateado(b.texto)}</p>
              ))}
            </div>
          )
        }
        if (grupo.tipo === 'punto') {
          return (
            <div key={gi} className="re-card">
              <ul className="re-puntos-clave">
                {grupo.items.map((b) => (
                  <li key={b.id}>{renderTextoFormateado(b.texto)}</li>
                ))}
              </ul>
            </div>
          )
        }
        return null
      })}

      {bloquesReto.length > 0 && (
        <div className="re-card re-card--rojo">
          <h2 className="re-subtitulo">🎯 Reto de la semana</h2>
          {bloquesReto.map((b) => (
            <p key={b.id} style={{ marginTop: 0, marginBottom: 0 }}>{renderTextoFormateado(b.texto)}</p>
          ))}
        </div>
      )}

      {leccion.quiz?.length > 0 && (
        <div className="re-card">
          <h2 className="re-subtitulo">Quiz ({leccion.quiz.length} pregunta{leccion.quiz.length === 1 ? '' : 's'})</h2>
          {leccion.quiz.map((p, i) => (
            <div key={i} style={{ marginBottom: i === leccion.quiz.length - 1 ? 0 : 18 }}>
              <p style={{ fontWeight: 700, marginBottom: 8 }}>{i + 1}. {p.pregunta}</p>
              <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                {p.opciones?.map((op, oi) => (
                  <li key={oi} style={{ fontWeight: oi === p.correcta ? 800 : 400 }}>
                    {op} {oi === p.correcta ? '✓' : ''}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <Link to={`/radgen/education/lider/leccion/${leccion.id}/editar`} className="re-btn re-btn--lleno re-btn--bloque">
        Editar esta lección
      </Link>
    </div>
  )
}
