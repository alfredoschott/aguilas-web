import { obtenerBloques, agruparBloques } from '../store'
import { renderTextoFormateado } from '../utils/formatoTexto'

// Cuerpo de solo lectura de una lección — imagen, video, bloques de
// contenido, reto y quiz. Lo usan tanto la vista previa real (con una
// lección ya guardada) como el propio editor (con el estado en vivo del
// formulario, para no tener que salir de la pantalla a ver cómo va
// quedando). `leccion` solo necesita tener la forma de una lección: no le
// importa si viene de Firestore o de un formulario a medio llenar.
export default function LeccionContenidoLectura({ leccion }) {
  const bloques = obtenerBloques(leccion)
  const bloquesReto = bloques.filter((b) => b.tipo === 'reto')
  const gruposContenido = agruparBloques(bloques.filter((b) => b.tipo !== 'reto'))

  return (
    <>
      {leccion.imagen && <img src={leccion.imagen} alt="" className="re-imagen-leccion" />}

      <div className="re-video-placeholder">
        {leccion.youtubeId ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${leccion.youtubeId}?rel=0`}
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
    </>
  )
}
