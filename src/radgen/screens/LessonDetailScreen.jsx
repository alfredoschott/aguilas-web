import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getAsignacionesDe, marcarCompletado, getInsigniasDe, marcarRetoCumplido, obtenerBloques, agruparBloques } from '../store'
import Celebracion from '../components/Celebracion'
import QuizLeccion from '../components/QuizLeccion'
import ComentariosLeccion from '../components/ComentariosLeccion'
import Sky from '../components/Sky'
import { sonidoReto } from '../utils/sonidos'
import { renderTextoFormateado } from '../utils/formatoTexto'

// Subir de rango es un logro distinto a desbloquear la insignia de una
// cápsula cualquiera — se devuelve aparte para que la celebración le dé
// el momento más grande que se merece, en vez de tratarlo igual que el
// resto de las insignias.
function calcularNuevasInsignias(antes, despues) {
  const nuevas = []
  despues.porLeccion.forEach((b, i) => {
    if (b.desbloqueada && !antes.porLeccion[i].desbloqueada) nuevas.push(b)
  })
  despues.porSerie.forEach((b, i) => {
    if (b.desbloqueada && !antes.porSerie[i].desbloqueada) nuevas.push(b)
  })
  const subioDeRango =
    despues.nivelActual && despues.nivelActual.id !== antes.nivelActual?.id ? despues.nivelActual : null
  return { nuevas, subioDeRango }
}

export default function LessonDetailScreen({ usuario }) {
  const { asignacionId } = useParams()
  const navigate = useNavigate()
  const [asignacion, setAsignacion] = useState(undefined) // undefined = cargando
  const [paso, setPaso] = useState('video') // video | quiz
  const [celebracion, setCelebracion] = useState(null)

  useEffect(() => {
    getAsignacionesDe(usuario.uid).then((lista) => {
      setAsignacion(lista.find((a) => a.id === asignacionId) || null)
    })
  }, [usuario.uid, asignacionId])

  if (asignacion === undefined) {
    return (
      <div className="re-shell" style={{ textAlign: 'center' }}>
        <Sky size={72} pose="estudiando" animado />
      </div>
    )
  }

  if (!asignacion) {
    return (
      <div className="re-shell">
        <div className="re-card">Esta lección no existe o no está asignada a ti.</div>
        <button className="re-btn" onClick={() => navigate('/radgen/education/lecciones')}>
          ← Volver a mis lecciones
        </button>
      </div>
    )
  }

  const completado = asignacion.estado === 'completado'
  const tieneQuiz = asignacion.leccion?.quiz?.length > 0
  const bloques = obtenerBloques(asignacion.leccion)
  const bloquesReto = bloques.filter((b) => b.tipo === 'reto')
  const gruposContenido = agruparBloques(bloques.filter((b) => b.tipo !== 'reto'))

  async function completarLeccion(quizScore) {
    const antes = await getInsigniasDe(usuario.uid)
    const { bonoXp } = await marcarCompletado(asignacion.id, quizScore)
    const despues = await getInsigniasDe(usuario.uid)
    const { nuevas, subioDeRango } = calcularNuevasInsignias(antes, despues)

    const detalleQuiz = quizScore ? `Acertaste ${quizScore.correctas} de ${quizScore.total} preguntas. ` : ''

    if (subioDeRango) {
      setCelebracion({
        tipo: 'rango',
        titulo: '¡Subiste de rango!',
        detalle: detalleQuiz + `Ya eres ${subioDeRango.nombre} — sigue así.`,
        textoBoton: 'Ver mis insignias',
        destino: '/radgen/education/insignias',
        insignia: { nombre: subioDeRango.nombre, icono: subioDeRango.icono },
        bono: bonoXp,
      })
    } else if (nuevas.length > 0) {
      setCelebracion({
        titulo: '¡Insignia desbloqueada!',
        detalle: detalleQuiz + nuevas.map((n) => `${n.icono} ${n.nombre}`).join(' · '),
        textoBoton: 'Ver mis insignias',
        destino: '/radgen/education/insignias',
        insignia: nuevas[0],
        bono: bonoXp,
      })
    } else {
      setCelebracion({
        titulo: '¡Lección completada!',
        detalle: detalleQuiz + 'Sigue así, cada cápsula suma para tus insignias.',
        textoBoton: 'Continuar',
        destino: '/radgen/education/lecciones',
        bono: bonoXp,
      })
    }
  }

  function marcarVista() {
    if (tieneQuiz) {
      setPaso('quiz')
      return
    }
    completarLeccion(null)
  }

  async function toggleReto() {
    const nuevoValor = !asignacion.retoCumplido
    await marcarRetoCumplido(asignacion.id, nuevoValor)
    setAsignacion((prev) => ({ ...prev, retoCumplido: nuevoValor }))
    if (nuevoValor) sonidoReto()
  }

  return (
    <div className="re-shell">
      <button className="re-vinculo re-vinculo--volver" style={{ marginBottom: 16 }} onClick={() => navigate('/radgen/education/lecciones')}>
        ← Volver a mis lecciones
      </button>

      <h1 className="re-titulo-pagina">{asignacion.leccion?.titulo}</h1>

      {paso === 'video' && (
        <>
          {asignacion.leccion?.imagen && (
            <img src={asignacion.leccion.imagen} alt="" className="re-imagen-leccion" />
          )}

          <div className="re-video-placeholder">
            {asignacion.leccion?.youtubeId ? (
              <iframe
                src={`https://www.youtube.com/embed/${asignacion.leccion.youtubeId}?rel=0`}
                title={asignacion.leccion?.titulo}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div style={{
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
              }}>
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
                <p key={b.id} style={{ marginTop: 0, marginBottom: 14 }}>{renderTextoFormateado(b.texto)}</p>
              ))}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, cursor: 'pointer' }}>
                <input type="checkbox" checked={!!asignacion.retoCumplido} onChange={toggleReto} />
                {asignacion.retoCumplido ? 'Reto cumplido' : 'Marcar como cumplido'}
              </label>
            </div>
          )}

          {completado ? (
            <div className="re-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Sky size={56} pose="relajado" />
              <div>
                <p style={{ fontWeight: 700, margin: 0 }}>Ya marcaste esta lección como vista.</p>
                {asignacion.quizScore && (
                  <p style={{ margin: '4px 0 0', opacity: 0.7, fontSize: '0.85rem' }}>
                    Quiz: {asignacion.quizScore.correctas}/{asignacion.quizScore.total} correctas
                  </p>
                )}
                {asignacion.reaccionLider && (
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', fontWeight: 700 }}>
                    Tu líder reaccionó {asignacion.reaccionLider.emoji} a esta cápsula
                  </p>
                )}
              </div>
            </div>
          ) : (
            <button className="re-btn re-btn--lleno re-btn--bloque" onClick={marcarVista}>
              {tieneQuiz ? 'Ya vi la lección — hacer el quiz' : 'Ya vi la lección'}
            </button>
          )}
        </>
      )}

      {paso === 'quiz' && (
        <QuizLeccion preguntas={asignacion.leccion.quiz} onTerminar={completarLeccion} />
      )}

      {paso === 'video' && completado && (
        <ComentariosLeccion asignacionId={asignacion.id} jovenUid={usuario.uid} />
      )}

      {celebracion && (
        <Celebracion
          tipo={celebracion.tipo}
          titulo={celebracion.titulo}
          detalle={celebracion.detalle}
          textoBoton={celebracion.textoBoton}
          insignia={celebracion.insignia}
          nombreJoven={usuario.nombre}
          bono={celebracion.bono}
          onCerrar={() => navigate(celebracion.destino)}
        />
      )}
    </div>
  )
}
