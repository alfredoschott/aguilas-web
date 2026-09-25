import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getLecciones, getSeries } from '../store'
import Sky from '../components/Sky'
import Esqueleto from '../components/Esqueleto'

// Mismo zigzag suave que usa el camino real del joven en LessonListScreen —
// se repite aquí a propósito para que la vista previa se sienta idéntica a
// lo que él vería, no una versión aparte y más aburrida.
const PATRON_ZIGZAG = [0, 1, 0, -1]

// El "camino" de una serie completa, tal como lo vería un joven que ya
// tiene todo desbloqueado — para que la líder revise el orden y el
// contenido de principio a fin antes de asignarla. Solo cuenta lecciones
// activas: un borrador o algo archivado no es lo que un joven llegaría a
// ver de verdad.
export default function SeriePreviewScreen() {
  const { serieId } = useParams()
  const navigate = useNavigate()
  const [datos, setDatos] = useState(undefined) // undefined = cargando

  useEffect(() => {
    Promise.all([getSeries(), getLecciones()]).then(([series, lecciones]) => {
      const serie = series.find((s) => s.serieId === serieId)
      const deSerie = lecciones
        .filter((l) => l.serieId === serieId && l.estado === 'activa')
        .sort((a, b) => a.orden - b.orden)
      setDatos(serie ? { serie, lecciones: deSerie } : null)
    })
  }, [serieId])

  if (datos === undefined) {
    return (
      <Esqueleto variante="detalle" />
    )
  }

  if (!datos) {
    return (
      <div className="re-shell">
        <div className="re-card">Esta serie ya no existe.</div>
        <button className="re-btn" onClick={() => navigate(-1)}>← Volver</button>
      </div>
    )
  }

  const { serie, lecciones } = datos

  return (
    <div className="re-shell">
      <button className="re-vinculo re-vinculo--volver" style={{ marginBottom: 16 }} onClick={() => navigate(-1)}>
        ← Volver
      </button>

      <div className="re-vista-previa-banner">
        👁 Vista previa — así se ve el camino completo para un joven. Solo cuenta lecciones activas.
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
        {serie.portada ? (
          <img src={serie.portada} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', border: '3px solid var(--rg-ink)' }} />
        ) : (
          <Sky size={64} pose="caminando" animado={false} />
        )}
        <h1 className="re-titulo-pagina" style={{ margin: 0 }}>{serie.serieTitulo}</h1>
      </div>

      {lecciones.length === 0 ? (
        <div className="re-card" style={{ textAlign: 'center' }}>
          <Sky size={56} pose="relajado" animado={false} />
          <p style={{ marginTop: 12, marginBottom: 0 }}>Esta serie todavía no tiene ninguna lección activa.</p>
        </div>
      ) : (
        <div className="re-serie-grupo" style={serie.color ? { '--serie-color': serie.color } : undefined}>
          <div className="re-serie-grupo__header">
            <h2 className="re-serie-grupo__titulo">{lecciones.length} cápsula{lecciones.length === 1 ? '' : 's'} en orden</h2>
          </div>

          <div className="re-camino">
            {lecciones.map((l, i) => {
              const offsetDir = PATRON_ZIGZAG[i % PATRON_ZIGZAG.length]
              return (
                <Link
                  key={l.id}
                  to={`/radgen/education/lider/leccion/${l.id}/preview`}
                  className="re-camino__parada"
                  style={{ '--offset-dir': offsetDir, animationDelay: `${i * 0.05}s` }}
                >
                  <div className="re-nodo re-nodo--disponible">{l.icono}</div>
                  <p className="re-camino__titulo">{l.titulo}</p>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
