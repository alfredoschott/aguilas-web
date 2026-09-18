import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getLeccionPorId } from '../store'
import Sky from '../components/Sky'
import LeccionContenidoLectura from '../components/LeccionContenidoLectura'

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
        <button className="re-btn" onClick={() => navigate(-1)}>← Volver</button>
      </div>
    )
  }

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

      <LeccionContenidoLectura leccion={leccion} />

      <Link to={`/radgen/education/lider/leccion/${leccion.id}/editar`} className="re-btn re-btn--lleno re-btn--bloque">
        Editar esta lección
      </Link>
    </div>
  )
}
