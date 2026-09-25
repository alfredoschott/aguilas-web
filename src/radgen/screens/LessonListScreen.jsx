import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getAsignacionesDe,
  getTareasDe,
  alternarTareaPersonal,
  getLeccionesActivas,
  obtenerBloques,
  getRachaEnPeligro,
  getLideresRadgen,
  getLecciones,
  getPausasCalendario,
  calcularValorCapsulas,
  calendarioEnPausa,
  getDuelosDe,
  ganadorDeDuelo,
  getJovenes,
  registrarAsistencia,
} from '../store'
import Sky from '../components/Sky'
import TareaPersonal from '../components/TareaPersonal'
import Avatar from '../components/Avatar'
import { mostrarNotificacion } from '../utils/notificaciones'
import { textoPlano } from '../utils/formatoTexto'
import { HORA_MS, textoTiempoRestante, nivelUrgencia } from '../utils/tiempo'

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

// Chip bajo cada cápsula pendiente: cuánto vale ahora y cuánto le queda a
// ese valor — lo que hace que valga la pena hacerla hoy y no "luego".
function ChipValor({ valor }) {
  if (!valor) return null
  const porcentaje = Math.round(valor.factor * 100)
  if (valor.enPausa) return <span className="re-chip-valor re-chip-valor--pausa">⏸ {porcentaje}%</span>
  if (valor.msParaBajar === null) return <span className="re-chip-valor re-chip-valor--urgente">{porcentaje}%</span>
  return (
    <span className={`re-chip-valor re-chip-valor--${nivelUrgencia(valor.msParaBajar)}`}>
      ⚡ {porcentaje}% · {textoTiempoRestante(valor.msParaBajar)}
    </span>
  )
}

function NodoCamino({ nodo, offsetDir, esSiguiente, opacado, delay, valor }) {
  const { leccion, asignacion, estado } = nodo
  const claseEstado = `re-nodo--${estado}${esSiguiente ? ' re-nodo--siguiente' : ''}`

  const contenido = (
    <>
      <div className={`re-nodo ${claseEstado}`}>
        {estado === 'bloqueada' ? '🔒' : leccion.icono}
        {estado === 'completada' && <span className="re-nodo__check" aria-hidden="true">✓</span>}
      </div>
      <p className="re-camino__titulo">{leccion.titulo}</p>
      {estado === 'disponible' && <ChipValor valor={valor} />}
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
  const [todasLecciones, setTodasLecciones] = useState([])
  const [pausas, setPausas] = useState([])
  const [duelos, setDuelos] = useState([])
  const [jovenes, setJovenes] = useState([])
  const [codigoAsistencia, setCodigoAsistencia] = useState('')
  const [mensajeAsistencia, setMensajeAsistencia] = useState(null)
  const [cargando, setCargando] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      getTareasDe(usuario.uid),
      getAsignacionesDe(usuario.uid),
      getLeccionesActivas(),
      getRachaEnPeligro(usuario.uid),
      getLideresRadgen(),
      getLecciones(),
      getPausasCalendario(),
      getDuelosDe(usuario.uid),
      getJovenes(),
    ]).then(([t, a, l, rp, lid, tl, pa, du, js]) => {
      setTareas(t)
      setAsignaciones(a)
      setLeccionesActivas(l)
      setRachaPeligro(rp)
      setLideres(lid)
      setTodasLecciones(tl)
      setPausas(pa)
      const ahora = Date.now()
      setDuelos(du.map((d) => ({ ...d, reciente: ahora - new Date(d.fecha).getTime() < 7 * 24 * HORA_MS })))
      setJovenes(js)
      setCargando(false)

      const valores = calcularValorCapsulas(a, tl, pa)
      const porVencer = a.find((x) => {
        const v = valores.get(x.id)
        return x.estado !== 'completado' && v && !v.enPausa && v.msParaBajar !== null && v.msParaBajar < 24 * HORA_MS
      })
      if (porVencer) {
        mostrarNotificacion('capsula-por-bajar', '⚡ Tu cápsula está por bajar de valor', {
          body: `"${porVencer.leccion?.titulo}" vale más si la haces hoy.`,
        })
      }
      const retoRecibido = du.find((d) => d.retadoUid === usuario.uid && !d.respuestas?.[usuario.uid])
      if (retoRecibido) {
        const rival = js.find((j) => j.uid === retoRecibido.retadorUid)
        mostrarNotificacion('duelo-recibido', '⚔️ Te retaron a un duelo', {
          body: `${rival?.apodo || rival?.nombre || 'Un compañero'} te está esperando.`,
        })
      }
      if (rp.enPeligro && a.some((x) => x.estado !== 'completado')) {
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

  const valores = useMemo(() => calcularValorCapsulas(asignaciones, todasLecciones, pausas), [asignaciones, todasLecciones, pausas])
  const enPausa = calendarioEnPausa(pausas)

  const capsulaUrgente = useMemo(() => {
    let mejor = null
    asignaciones.forEach((a) => {
      if (a.estado === 'completado') return
      const v = valores.get(a.id)
      if (!v || v.enPausa || v.msParaBajar === null) return
      if (!mejor || v.msParaBajar < mejor.valor.msParaBajar) mejor = { asignacion: a, valor: v }
    })
    return mejor && mejor.valor.msParaBajar < 2 * 24 * HORA_MS ? mejor : null
  }, [asignaciones, valores])

  const nombrePorUid = useMemo(() => new Map(jovenes.map((j) => [j.uid, j.apodo || j.nombre])), [jovenes])
  const duelosPorJugar = duelos.filter((d) => !d.respuestas?.[usuario.uid])
  const duelosConResultado = duelos.filter((d) => d.reciente && Object.keys(d.respuestas || {}).length === 2).slice(0, 3)

  async function enviarAsistencia(e) {
    e.preventDefault()
    if (!codigoAsistencia.trim()) return
    const r = await registrarAsistencia({ codigo: codigoAsistencia, jovenUid: usuario.uid })
    if (r.ok) navigate(`/radgen/education/asistencia/${codigoAsistencia.trim().toUpperCase()}`)
    else setMensajeAsistencia(r.error)
  }

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
              <Avatar nombre={l.nombre} foto={l.fotoPerfil} uid={l.uid} size={22} colorAcento={l.colorAcento} marco={l.marcoAvatar} />
              Tu líder: {l.apodo || l.nombre}
            </Link>
          ))}
        </div>
      )}

      <p style={{ fontWeight: 600, opacity: 0.85, marginBottom: mensajeMotivacional ? 6 : '1.5rem' }}>{mensajeSky}</p>
      {mensajeMotivacional && (
        <p style={{ fontWeight: 800, color: 'var(--rg-blue-light)', marginBottom: '1.5rem' }}>{mensajeMotivacional}</p>
      )}

      {rachaPeligro.enPeligro && pendientes > 0 && (
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

      {enPausa && (
        <div className="re-aviso re-aviso--pausa">
          ⏸ <span>El calendario está en pausa — ninguna cápsula pierde valor mientras tanto.</span>
        </div>
      )}

      {capsulaUrgente && (
        <Link to={`/radgen/education/leccion/${capsulaUrgente.asignacion.id}`} className="re-aviso re-aviso--urgente">
          <span className="re-aviso__icono">⚡</span>
          <span>
            <strong>{capsulaUrgente.asignacion.leccion?.titulo}</strong> baja al{' '}
            {Math.round(
              (capsulaUrgente.valor.factor === 1 ? 0.75 : capsulaUrgente.valor.factor === 0.75 ? 0.5 : 0.25) * 100,
            )}
            % en {textoTiempoRestante(capsulaUrgente.valor.msParaBajar)}. ¡Hazla hoy y gana todos sus puntos!
          </span>
          <span className="re-aviso__flecha">→</span>
        </Link>
      )}

      {duelosPorJugar.map((d) => {
        const rivalUid = d.retadorUid === usuario.uid ? d.retadoUid : d.retadorUid
        const meRetaron = d.retadoUid === usuario.uid
        return (
          <Link key={d.id} to={`/radgen/education/duelo/${d.id}`} className="re-aviso re-aviso--duelo">
            <span className="re-aviso__icono">⚔️</span>
            <span>
              {meRetaron ? (
                <><strong>{nombrePorUid.get(rivalUid) || 'Alguien'}</strong> te retó a un duelo. ¡Acepta!</>
              ) : (
                <>Tu duelo contra <strong>{nombrePorUid.get(rivalUid) || 'tu rival'}</strong> está listo para jugar.</>
              )}
            </span>
            <span className="re-aviso__flecha">→</span>
          </Link>
        )
      })}

      {duelosConResultado.map((d) => {
        const rivalUid = d.retadorUid === usuario.uid ? d.retadoUid : d.retadorUid
        const ganador = ganadorDeDuelo(d)
        return (
          <Link key={d.id} to={`/radgen/education/duelo/${d.id}`} className="re-aviso re-aviso--resultado">
            <span className="re-aviso__icono">{ganador === usuario.uid ? '🏆' : ganador ? '⚔️' : '🤝'}</span>
            <span>
              Duelo vs <strong>{nombrePorUid.get(rivalUid) || 'rival'}</strong>:{' '}
              {ganador === usuario.uid ? '¡ganaste!' : ganador ? 'perdiste — ¿revancha?' : 'empate'}
            </span>
            <span className="re-aviso__flecha">→</span>
          </Link>
        )
      })}

      {duelosPorJugar.length === 0 && completadas > 0 && (
        <Link to="/radgen/education/companeros" className="re-aviso re-aviso--sutil">
          <span className="re-aviso__icono">⚔️</span>
          <span>
            <strong>Reta a un compañero</strong> a un duelo de repaso
          </span>
          <span className="re-aviso__flecha">→</span>
        </Link>
      )}

      <form className="re-asistencia-codigo" onSubmit={enviarAsistencia}>
        <span className="re-asistencia-codigo__icono">📍</span>
        <input
          className="re-input"
          placeholder="Código de reunión"
          value={codigoAsistencia}
          onChange={(e) => {
            setCodigoAsistencia(e.target.value.toUpperCase())
            setMensajeAsistencia(null)
          }}
          maxLength={8}
        />
        <button type="submit" className="re-btn re-btn--sm re-btn--lleno" disabled={!codigoAsistencia.trim()}>
          Registrar
        </button>
      </form>
      {mensajeAsistencia && <p className="re-duelo-error" style={{ marginTop: -8 }}>{mensajeAsistencia}</p>}

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
                    valor={nodo.asignacion ? valores.get(nodo.asignacion.id) : null}
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
