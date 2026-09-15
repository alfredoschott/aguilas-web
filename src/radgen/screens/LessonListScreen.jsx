import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAsignacionesDe, getTareasDe, alternarTareaPersonal } from '../store'
import Sky from '../components/Sky'
import TareaPersonal from '../components/TareaPersonal'

export default function LessonListScreen({ usuario }) {
  const [filtro, setFiltro] = useState('todas') // todas | pendientes | completadas
  const [busqueda, setBusqueda] = useState('')
  const [tareas, setTareas] = useState([])
  const [asignaciones, setAsignaciones] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    Promise.all([getTareasDe(usuario.uid), getAsignacionesDe(usuario.uid)]).then(([t, a]) => {
      setTareas(t)
      setAsignaciones(a)
      setCargando(false)
    })
  }, [usuario.uid])

  async function toggleTarea(tareaId) {
    setTareas(await alternarTareaPersonal({ jovenUid: usuario.uid, tareaId }))
  }

  const pendientes = asignaciones.filter((a) => a.estado !== 'completado').length
  const completadas = asignaciones.length - pendientes

  const visibles = asignaciones
    .filter((a) => {
      if (filtro === 'pendientes') return a.estado !== 'completado'
      if (filtro === 'completadas') return a.estado === 'completado'
      return true
    })
    .filter((a) => (a.leccion?.titulo || '').toLowerCase().includes(busqueda.trim().toLowerCase()))

  const mensajeSky =
    asignaciones.length === 0
      ? 'Todavía no tienes lecciones. En cuanto tu líder te asigne una, te aviso aquí.'
      : pendientes === 0
        ? '¡Vas al día con todo! Espera tu próxima cápsula.'
        : `Te faltan ${pendientes} cápsula${pendientes === 1 ? '' : 's'} por ver. ¡Tú puedes!`

  const poseSky = asignaciones.length === 0 ? 'saludando' : pendientes === 0 ? 'logrado' : 'caminando'

  if (cargando) {
    return (
      <div className="re-shell" style={{ textAlign: 'center' }}>
        <Sky size={72} pose="estudiando" animado />
      </div>
    )
  }

  return (
    <div className="re-shell">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
        <h1 className="re-titulo-pagina" style={{ margin: 0 }}>Tus lecciones</h1>
        <Sky size={72} pose={poseSky} animado={false} />
      </div>
      <p style={{ fontWeight: 600, opacity: 0.85, marginBottom: '1.5rem' }}>{mensajeSky}</p>

      {tareas.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 className="re-subtitulo" style={{ color: 'var(--rg-paper)', marginBottom: '0.8rem' }}>
            Tareas de tu líder
          </h2>
          {tareas.map((t) => (
            <TareaPersonal key={t.id} tarea={t} onToggle={toggleTarea} />
          ))}
        </div>
      )}

      {completadas > 0 && (
        <p style={{ textAlign: 'center', fontWeight: 700, marginBottom: '1.2rem', opacity: 0.8 }}>
          {completadas} de {asignaciones.length} cápsulas completadas
        </p>
      )}

      {asignaciones.length === 0 && (
        <div className="re-card" style={{ textAlign: 'center' }}>
          Todavía no tienes lecciones asignadas. Cuando tu líder te asigne una, aparecerá aquí.
        </div>
      )}

      {asignaciones.length > 0 && (
        <>
          <input
            className="re-input"
            placeholder="Buscar lección…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <div className="re-tabs" style={{ display: 'flex', width: '100%' }}>
            {[
              ['todas', 'Todas'],
              ['pendientes', 'Pendientes'],
              ['completadas', 'Completadas'],
            ].map(([valor, etiqueta]) => (
              <button
                key={valor}
                type="button"
                className={`re-tab ${filtro === valor ? 'activo' : ''}`}
                style={{ flex: 1 }}
                onClick={() => setFiltro(valor)}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        </>
      )}

      {asignaciones.length > 0 && visibles.length === 0 && (
        <div className="re-card" style={{ textAlign: 'center' }}>
          No hay lecciones que coincidan con tu búsqueda.
        </div>
      )}

      {visibles.map((a, i) => (
        <Link
          key={a.id}
          to={`/radgen/education/leccion/${a.id}`}
          className="re-leccion-item"
          style={{ animationDelay: `${i * 0.05}s` }}
        >
          <div>
            <p className="re-leccion-item__titulo">{a.leccion?.titulo}</p>
            <span className={`re-badge ${a.estado === 'completado' ? 're-badge--completado' : 're-badge--pendiente'}`}>
              {a.estado === 'completado' ? 'Completado' : 'Pendiente'}
            </span>
          </div>
          <span className="re-leccion-item__flecha" aria-hidden="true">→</span>
        </Link>
      ))}
    </div>
  )
}
