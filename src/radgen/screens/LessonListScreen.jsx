import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getAsignacionesDe,
  getTareasDe,
  alternarTareaPersonal,
  getLeccionesActivas,
  obtenerBloques,
  getRachaEnPeligro,
  getLideresRadgen,
} from '../store'
import Sky from '../components/Sky'
import TareaPersonal from '../components/TareaPersonal'
import Avatar from '../components/Avatar'
import { mostrarNotificacion } from '../utils/notificaciones'
import { textoPlano } from '../utils/formatoTexto'

function inicioSemanaLocal(fecha) {
  const d = new Date(fecha)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d.getTime()
}

// Compara cuántas cápsulas llevan completadas esta semana contra su propia
// mejor semana histórica — un mensaje que se siente "vivo" y personal, en
// vez del mismo texto genérico sin importar cómo les esté yendo.
function useMensajeMotivacional(asignaciones) {
  return useMemo(() => {
    const completadas = asignaciones.filter((a) => a.estado === 'completado' && a.fechaCompletado)
    if (completadas.length === 0) return null

    const porSemana = new Map()
    completadas.forEach((a) => {
      const inicio = inicioSemanaLocal(a.fechaCompletado)
      porSemana.set(inicio, (porSemana.get(inicio) || 0) + 1)
    })

    const inicioActual = inicioSemanaLocal(new Date())
    const estaSemana = porSemana.get(inicioActual) || 0
    const mejorAnterior = Math.max(
      0,
      ...[...porSemana.entries()].filter(([inicio]) => inicio !== inicioActual).map(([, cantidad]) => cantidad),
    )

    if (estaSemana > 0 && mejorAnterior > 0 && estaSemana >= mejorAnterior) {
      return `🚀 ¡Vas igual o mejor que tu mejor semana (${estaSemana} cápsula${estaSemana === 1 ? '' : 's'})!`
    }
    return null
  }, [asignaciones])
}

// Desplazamiento horizontal de cada parada del camino — un zigzag suave
// (centro, derecha, centro, izquierda…) como el sendero de lecciones de
// Duolingo. El valor real en píxeles lo decide el CSS con clamp(), así
// que aquí solo se define la dirección.
const PATRON_ZIGZAG = [0, 1, 0, -1]

// Arma, por serie, el camino completo: las cápsulas ya asignadas (hechas o
// pendientes) más las que todavía no se han asignado dentro de esa misma
// serie — esas últimas aparecen bloqueadas, como el resto del mapa que
// todavía no se desbloquea. Solo se muestran series donde el joven ya
// tiene al menos una cápsula asignada; una serie que su líder no le ha
// presentado sigue completamente oculta, igual que antes.
function useCaminoPorSerie(asignaciones, leccionesActivas) {
  return useMemo(() => {
    const seriesIniciadas = new Set(asignaciones.map((a) => a.leccion?.serieId).filter(Boolean))

    const leccionesPorId = new Map()
    leccionesActivas.forEach((l) => leccionesPorId.set(l.id, l))
    asignaciones.forEach((a) => {
      if (a.leccion) leccionesPorId.set(a.leccion.id, a.leccion)
    })

    const asignacionPorLeccionId = new Map(asignaciones.map((a) => [a.leccionId, a]))

    const mapa = new Map()
    leccionesPorId.forEach((leccion) => {
      if (!seriesIniciadas.has(leccion.serieId)) return
      if (!mapa.has(leccion.serieId)) {
        mapa.set(leccion.serieId, { serieId: leccion.serieId, serieTitulo: leccion.serieTitulo, nodos: [] })
      }
      const asignacion = asignacionPorLeccionId.get(leccion.id)
      const estado = !asignacion ? 'bloqueada' : asignacion.estado === 'completado' ? 'completada' : 'disponible'
      mapa.get(leccion.serieId).nodos.push({ leccion, asignacion, estado })
    })

    mapa.forEach((serie) => serie.nodos.sort((a, b) => a.leccion.orden - b.leccion.orden))
    return [...mapa.values()].sort((a, b) => a.nodos[0].leccion.orden - b.nodos[0].leccion.orden)
  }, [asignaciones, leccionesActivas])
}

// Un reto vive dentro del contenido de una lección — no depende de que la
// lección ya esté completada, así que se puede cumplir en cualquier momento
// después de asignada. Se junta uno por asignación (aunque tenga varios
// bloques de tipo reto) porque en LessonDetailScreen comparten un solo
// checkbox de "cumplido".
function useRetosPendientes(asignaciones) {
  return useMemo(
    () =>
      asignaciones.filter(
        (a) => !a.retoCumplido && obtenerBloques(a.leccion).some((b) => b.tipo === 'reto'),
      ),
    [asignaciones],
  )
}

function RetoPendiente({ asignacion }) {
  const reto = obtenerBloques(asignacion.leccion).find((b) => b.tipo === 'reto')
  return (
    <Link to={`/radgen/education/leccion/${asignacion.id}`} className="re-reto-pendiente">
      <span className="re-reto-pendiente__icono" aria-hidden="true">🎯</span>
      <div className="re-reto-pendiente__cuerpo">
        <p className="re-reto-pendiente__leccion">{asignacion.leccion?.titulo}</p>
        {reto?.texto && <p className="re-reto-pendiente__texto">{textoPlano(reto.texto)}</p>}
      </div>
      <span className="re-reto-pendiente__flecha" aria-hidden="true">→</span>
    </Link>
  )
}

function NodoCamino({ nodo, offsetDir, esSiguiente, opacado, delay }) {
  const { leccion, asignacion, estado } = nodo
  const claseEstado = `re-nodo--${estado}${esSiguiente ? ' re-nodo--siguiente' : ''}`

  const contenido = (
    <>
      <div className={`re-nodo ${claseEstado}`}>
        {estado === 'bloqueada' ? '🔒' : leccion.icono}
        {estado === 'completada' && <span className="re-nodo__check" aria-hidden="true">✓</span>}
      </div>
      <p className="re-camino__titulo">{leccion.titulo}</p>
      {esSiguiente && <span className="re-camino__etiqueta">EMPEZAR</span>}
    </>
  )

  const estilo = { '--offset-dir': offsetDir, animationDelay: `${delay}s` }
  const clasePara = `re-camino__parada ${estado === 'bloqueada' ? 're-camino__parada--bloqueada' : ''} ${opacado ? 're-camino__parada--opacada' : ''}`

  if (estado === 'bloqueada') {
    return (
      <div className={clasePara} style={estilo} title="Se desbloquea cuando tu líder te la asigne">
        {contenido}
      </div>
    )
  }

  return (
    <Link to={`/radgen/education/leccion/${asignacion.id}`} className={clasePara} style={estilo}>
      {contenido}
    </Link>
  )
}

export default function LessonListScreen({ usuario }) {
  const [busqueda, setBusqueda] = useState('')
  const [tareas, setTareas] = useState([])
  const [asignaciones, setAsignaciones] = useState([])
  const [leccionesActivas, setLeccionesActivas] = useState([])
  const [rachaPeligro, setRachaPeligro] = useState({ enPeligro: false, rachaPrevia: 0 })
  const [lideres, setLideres] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    Promise.all([
      getTareasDe(usuario.uid),
      getAsignacionesDe(usuario.uid),
      getLeccionesActivas(),
      getRachaEnPeligro(usuario.uid),
      getLideresRadgen(),
    ]).then(([t, a, l, rp, lid]) => {
      setTareas(t)
      setAsignaciones(a)
      setLeccionesActivas(l)
      setRachaPeligro(rp)
      setLideres(lid)
      setCargando(false)
      if (rp.enPeligro) {
        mostrarNotificacion(
          'racha-peligro',
          '🔥 Tu racha está en riesgo',
          { body: `Llevas ${rp.rachaPrevia} semana${rp.rachaPrevia === 1 ? '' : 's'} seguidas — completa una cápsula hoy para no perderla.` },
        )
      }
    })
  }, [usuario.uid])

  async function toggleTarea(tareaId) {
    setTareas(await alternarTareaPersonal({ jovenUid: usuario.uid, tareaId }))
  }

  const pendientes = asignaciones.filter((a) => a.estado !== 'completado').length
  const completadas = asignaciones.length - pendientes

  const camino = useCaminoPorSerie(asignaciones, leccionesActivas)
  const retosPendientes = useRetosPendientes(asignaciones)
  const mensajeMotivacional = useMensajeMotivacional(asignaciones)

  // Solo la parada disponible más antigua (across todas las series) se
  // marca como "la siguiente" — si hubiera varias pendientes a la vez, no
  // queremos que todas pulsen y le resten fuerza a la que sí importa ahora.
  const siguienteLeccionId = useMemo(() => {
    let candidato = null
    camino.forEach((serie) => {
      serie.nodos.forEach((n) => {
        if (n.estado === 'disponible' && (!candidato || n.leccion.orden < candidato.orden)) {
          candidato = n.leccion
        }
      })
    })
    return candidato?.id
  }, [camino])

  const terminoBusqueda = busqueda.trim().toLowerCase()

  const mensajeSky =
    asignaciones.length === 0
      ? 'Todavía no tienes lecciones. En cuanto tu líder te asigne una, te aviso aquí.'
      : pendientes === 0
        ? '¡Vas al día con todo! Espera tu próxima cápsula.'
        : `Te faltan ${pendientes} cápsula${pendientes === 1 ? '' : 's'} por ver. ¡Tú puedes!`

  // Si el joven eligió un compañero Sky fijo desde su perfil, ese manda
  // sobre la pose automática que normalmente refleja su progreso.
  const poseSky =
    usuario.skyElegido || (asignaciones.length === 0 ? 'saludando' : pendientes === 0 ? 'logrado' : 'caminando')

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

      {lideres.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '1.2rem' }}>
          {lideres.map((l) => (
            <Link
              key={l.uid}
              to={`/radgen/education/joven/${l.uid}`}
              className="re-check-pill"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
            >
              <Avatar nombre={l.nombre} foto={l.fotoPerfil} uid={l.uid} size={22} colorAcento={l.colorAcento} />
              Tu líder: {l.apodo || l.nombre}
            </Link>
          ))}
        </div>
      )}

      <p style={{ fontWeight: 600, opacity: 0.85, marginBottom: mensajeMotivacional ? 6 : '1.5rem' }}>{mensajeSky}</p>
      {mensajeMotivacional && (
        <p style={{ fontWeight: 800, color: 'var(--rg-blue-light)', marginBottom: '1.5rem' }}>{mensajeMotivacional}</p>
      )}

      {rachaPeligro.enPeligro && (
        <div className="re-racha-peligro">
          <span className="re-racha-peligro__icono" aria-hidden="true">🔥</span>
          <div>
            <p className="re-racha-peligro__titulo">
              Tu racha de {rachaPeligro.rachaPrevia} semana{rachaPeligro.rachaPrevia === 1 ? '' : 's'} está en riesgo
            </p>
            <p className="re-racha-peligro__texto">Completa una cápsula esta semana para no perderla.</p>
          </div>
        </div>
      )}

      {retosPendientes.length > 0 && (
        <div className="re-retos-card">
          <div className="re-retos-card__cabecera">
            <h2 className="re-retos-card__titulo">🎯 Retos de la semana</h2>
            <span className="re-retos-card__contador">{retosPendientes.length}</span>
          </div>
          {retosPendientes.map((a) => (
            <RetoPendiente key={a.id} asignacion={a} />
          ))}
        </div>
      )}

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
        <input
          className="re-input"
          placeholder="Buscar lección…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      )}

      {camino.map((serie) => {
        let indiceZigzag = 0
        return (
          <div key={serie.serieId} className="re-serie-grupo">
            <div className="re-serie-grupo__header">
              <h2 className="re-serie-grupo__titulo">{serie.serieTitulo}</h2>
              <span className="re-serie-grupo__contador">
                {serie.nodos.filter((n) => n.estado === 'completada').length}/{serie.nodos.length}
              </span>
            </div>

            <div className="re-camino">
              {serie.nodos.map((nodo, i) => {
                const offsetDir = PATRON_ZIGZAG[indiceZigzag % PATRON_ZIGZAG.length]
                indiceZigzag += 1
                const opacado = terminoBusqueda.length > 0 && !nodo.leccion.titulo.toLowerCase().includes(terminoBusqueda)
                return (
                  <NodoCamino
                    key={nodo.leccion.id}
                    nodo={nodo}
                    offsetDir={offsetDir}
                    esSiguiente={nodo.leccion.id === siguienteLeccionId}
                    opacado={opacado}
                    delay={i * 0.05}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
