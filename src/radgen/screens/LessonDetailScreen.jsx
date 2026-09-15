import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getAsignacionesDe, marcarCompletado, getInsigniasDe } from '../store'
import Celebracion from '../components/Celebracion'
import QuizLeccion from '../components/QuizLeccion'
import ComentariosLeccion from '../components/ComentariosLeccion'
import Sky from '../components/Sky'

function calcularNuevasInsignias(antes, despues) {
  const nuevas = []
  despues.porLeccion.forEach((b, i) => {
    if (b.desbloqueada && !antes.porLeccion[i].desbloqueada) nuevas.push(b)
  })
  despues.porSerie.forEach((b, i) => {
    if (b.desbloqueada && !antes.porSerie[i].desbloqueada) nuevas.push(b)
  })
  if (despues.nivelActual && despues.nivelActual.id !== antes.nivelActual?.id) {
    nuevas.push({ nombre: `Rango ${despues.nivelActual.nombre}`, icono: despues.nivelActual.icono })
  }
  return nuevas
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

  async function completarLeccion(quizScore) {
    const antes = await getInsigniasDe(usuario.uid)
    await marcarCompletado(asignacion.id, quizScore)
    const despues = await getInsigniasDe(usuario.uid)
    const nuevas = calcularNuevasInsignias(antes, despues)

    const detalleQuiz = quizScore ? `Acertaste ${quizScore.correctas} de ${quizScore.total} preguntas. ` : ''

    if (nuevas.length > 0) {
      setCelebracion({
        titulo: '¡Insignia desbloqueada!',
        detalle: detalleQuiz + nuevas.map((n) => `${n.icono} ${n.nombre}`).join(' · '),
        textoBoton: 'Ver mis insignias',
        destino: '/radgen/education/insignias',
        insignia: nuevas[0],
      })
    } else {
      setCelebracion({
        titulo: '¡Lección completada!',
        detalle: detalleQuiz + 'Sigue así, cada cápsula suma para tus insignias.',
        textoBoton: 'Continuar',
        destino: '/radgen/education/lecciones',
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

  return (
    <div className="re-shell">
      <button className="re-vinculo" style={{ marginBottom: 16 }} onClick={() => navigate('/radgen/education/lecciones')}>
        ← Volver a mis lecciones
      </button>

      <h1 className="re-titulo-pagina">{asignacion.leccion?.titulo}</h1>

      {paso === 'video' && (
        <>
          {asignacion.leccion?.imagen && (
            <img src={asignacion.leccion.imagen} alt="" className="re-imagen-leccion" />
          )}

          {asignacion.leccion?.versiculo && (
            <div className="re-versiculo">
              {asignacion.leccion.versiculo.texto && <p className="re-versiculo__texto">"{asignacion.leccion.versiculo.texto}"</p>}
              {asignacion.leccion.versiculo.referencia && (
                <p className="re-versiculo__referencia">{asignacion.leccion.versiculo.referencia}</p>
              )}
            </div>
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

          {(asignacion.leccion?.notas || asignacion.leccion?.puntos?.length > 0) && (
            <div className="re-card">
              {asignacion.leccion?.notas && <p style={{ marginTop: 0 }}>{asignacion.leccion.notas}</p>}
              {asignacion.leccion?.puntos?.length > 0 && (
                <ul className="re-puntos-clave">
                  {asignacion.leccion.puntos.map((punto, i) => (
                    <li key={i}>{punto}</li>
                  ))}
                </ul>
              )}
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
          titulo={celebracion.titulo}
          detalle={celebracion.detalle}
          textoBoton={celebracion.textoBoton}
          insignia={celebracion.insignia}
          nombreJoven={usuario.nombre}
          onCerrar={() => navigate(celebracion.destino)}
        />
      )}
    </div>
  )
}
