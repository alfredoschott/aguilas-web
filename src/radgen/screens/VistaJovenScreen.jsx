import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getJovenes, getLeccionesActivas, getSeries } from '../store'
import Sky from '../components/Sky'
import MapaSerie from '../components/MapaSerie'
import LessonListScreen from './LessonListScreen'

const vistaPrevia = (nodo) => `/radgen/education/lider/leccion/${nodo.leccion.id}/preview`

// Todo el currículo publicado como lo recorrería un joven desde cero, con
// cada cápsula abierta en su vista previa de solo lectura.
function MapaGeneral() {
  const [datos, setDatos] = useState(null)

  useEffect(() => {
    Promise.all([getLeccionesActivas(), getSeries()]).then(([lecciones, series]) => {
      const porSerie = new Map()
      lecciones.forEach((leccion) => {
        if (!porSerie.has(leccion.serieId)) {
          porSerie.set(leccion.serieId, { serieId: leccion.serieId, serieTitulo: leccion.serieTitulo, nodos: [] })
        }
        porSerie.get(leccion.serieId).nodos.push({ leccion, asignacion: null, estado: 'disponible' })
      })
      porSerie.forEach((serie) => serie.nodos.sort((a, b) => a.leccion.orden - b.leccion.orden))
      const orden = new Map(series.map((s, i) => [s.serieId, i]))
      setDatos({
        camino: [...porSerie.values()].sort((a, b) => (orden.get(a.serieId) ?? 99) - (orden.get(b.serieId) ?? 99)),
        info: new Map(series.map((s) => [s.serieId, s])),
      })
    })
  }, [])

  if (!datos) {
    return (
      <div style={{ textAlign: 'center' }}>
        <Sky size={72} pose="estudiando" animado />
      </div>
    )
  }

  if (datos.camino.length === 0) {
    return <div className="re-card">Todavía no hay cápsulas publicadas.</div>
  }

  return (
    <div className="re-vista-joven__mapas">
      {datos.camino.map((serie) => (
        <MapaSerie
          key={serie.serieId}
          serie={serie}
          color={datos.info.get(serie.serieId)?.color || '#3a7bff'}
          portada={datos.info.get(serie.serieId)?.portada}
          valores={new Map()}
          terminoBusqueda=""
          enlaceDe={vistaPrevia}
        />
      ))}
    </div>
  )
}

// Para que la líder supervise: el mapa general del currículo o exactamente
// lo que ve un joven en particular, siempre de solo lectura.
export default function VistaJovenScreen() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [jovenes, setJovenes] = useState([])
  const uidElegido = searchParams.get('joven') || ''

  useEffect(() => {
    getJovenes().then((lista) => setJovenes(lista.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))))
  }, [])

  const joven = useMemo(() => jovenes.find((j) => j.uid === uidElegido) || null, [jovenes, uidElegido])

  function elegir(uid) {
    setSearchParams(uid ? { joven: uid } : {}, { replace: true })
  }

  return (
    <div className="re-shell re-shell--lecciones">
      <div className="re-vista-joven__cabecera">
        <div>
          <h1 className="re-titulo-pagina" style={{ margin: 0 }}>
            Vista de joven
          </h1>
          <p className="re-vista-joven__texto">
            Así se ven las lecciones del lado de los jóvenes. Es solo para supervisar: nada de lo que abras cuenta
            como progreso de nadie.
          </p>
        </div>
        <label className="re-vista-joven__selector">
          <span>Ver como</span>
          <select className="re-input" value={uidElegido} onChange={(e) => elegir(e.target.value)}>
            <option value="">Todo el currículo (vista general)</option>
            {jovenes.map((j) => (
              <option key={j.uid} value={j.uid}>
                {j.apodo ? `${j.nombre} (${j.apodo})` : j.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="re-vista-previa-banner">
        👁 {joven ? `Estás viendo exactamente lo que ve ${joven.nombre}.` : 'Vista general: todas las cápsulas publicadas.'}{' '}
        Solo lectura.
      </div>

      {joven ? <LessonListScreen key={joven.uid} usuario={joven} supervision /> : <MapaGeneral />}
    </div>
  )
}
