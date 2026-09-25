import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  getJovenes,
  getLecciones,
  getLeccionesActivas,
  getSeries,
  alternarArchivoLeccion,
  moverLeccion,
  duplicarLeccion,
  publicarLeccion,
  actualizarSerie,
  renombrarSerie,
  moverSerie,
  asignarSerieCompleta,
  getTablaEstado,
  asignarLeccion,
  getRanking,
  getRequisitos,
  toggleRequisito,
  calcularElegibilidad,
  getMostrarElegibilidadAJovenes,
  setMostrarElegibilidadAJovenes,
  getNotasDe,
  agregarNota,
  eliminarNota,
  getComentariosPendientes,
  responderComentario,
  eliminarComentario,
  asignarTareaPersonal,
  observarAppPausada,
  setAppPausada,
  getMostrarRankingAJovenes,
  setMostrarRankingAJovenes,
  getActividadReciente,
  reaccionarActividad,
  getXpConfig,
  setXpConfig,
  getPausasCalendario,
  alternarPausaCalendario,
  calendarioEnPausa,
  getEquipos,
  guardarEquipos,
  calcularRankingEquipos,
  crearReunion,
  cerrarReunion,
  getReuniones,
  observarAsistenciasDeReunion,
  quitarAsistencia,
  getDuelosDe,
  dueloAbierto,
} from '../store'
import QRCode from 'qrcode'
import Sky from '../components/Sky'
import Avatar from '../components/Avatar'
import { PodioRanking, TablaRanking, RankingEquipos } from '../components/Ranking'
import Toast from '../components/Toast'
import { exportarEstadoCsv } from '../utils/exportCsv'
import { subirImagenSerie } from '../utils/imagenLeccion'
import { useBorrador } from '../hooks/useBorrador'
import useEliminarConDeshacer from '../hooks/useEliminarConDeshacer'

const TABS = [
  ['cursos', 'Cursos'],
  ['asignar', 'Asignar'],
  ['seguimiento', 'Seguimiento'],
  ['elegibilidad', 'Elegibilidad'],
  ['notas', 'Notas y preguntas'],
  ['experiencia', 'Experiencia'],
  ['ajustes', 'Ajustes'],
]

const DIAS_COMO_NUEVO = 14
const DIAS_PARA_INACTIVO = 14
const DIA_MS = 24 * 60 * 60 * 1000

function esNuevo(joven) {
  return joven.creadoEn && Date.now() - new Date(joven.creadoEn).getTime() < DIAS_COMO_NUEVO * 24 * 60 * 60 * 1000
}

const COLORES_SERIE = [
  { valor: null, nombre: 'Sin color' },
  { valor: '#2952E3', nombre: 'Azul' },
  { valor: '#E33434', nombre: 'Rojo' },
  { valor: '#E3A234', nombre: 'Ámbar' },
  { valor: '#34A853', nombre: 'Verde' },
  { valor: '#9333E3', nombre: 'Morado' },
]

function PanelCursos({ series, lecciones, refrescarLecciones }) {
  const [filtro, setFiltro] = useState('')
  const [subiendoPortada, setSubiendoPortada] = useState(null)
  const [renombrando, setRenombrando] = useState(null) // serieId en edición, o null
  const [nombreTemp, setNombreTemp] = useState('')
  const [guardandoNombre, setGuardandoNombre] = useState(false)

  async function archivar(leccionId) {
    await alternarArchivoLeccion(leccionId)
    refrescarLecciones()
  }

  async function mover(leccionId, direccion) {
    await moverLeccion(leccionId, direccion)
    refrescarLecciones()
  }

  async function duplicar(leccionId) {
    await duplicarLeccion(leccionId)
    refrescarLecciones()
  }

  async function publicar(leccionId) {
    await publicarLeccion(leccionId)
    refrescarLecciones()
  }

  async function cambiarColorSerie(serieId, color) {
    await actualizarSerie(serieId, { color })
    refrescarLecciones()
  }

  async function subirPortadaSerie(serieId, archivo) {
    if (!archivo) return
    setSubiendoPortada(serieId)
    try {
      const url = await subirImagenSerie(archivo)
      await actualizarSerie(serieId, { portada: url })
      refrescarLecciones()
    } finally {
      setSubiendoPortada(null)
    }
  }

  async function moverSerieDir(serieId, direccion) {
    await moverSerie(serieId, direccion)
    refrescarLecciones()
  }

  function empezarRenombrar(serie) {
    setRenombrando(serie.serieId)
    setNombreTemp(serie.serieTitulo)
  }

  async function guardarNombreSerie() {
    if (!nombreTemp.trim()) return
    setGuardandoNombre(true)
    try {
      await renombrarSerie(renombrando, nombreTemp)
      await refrescarLecciones()
      setRenombrando(null)
    } finally {
      setGuardandoNombre(false)
    }
  }

  const filtroNorm = filtro.trim().toLowerCase()
  const seriesFiltradas = filtroNorm
    ? series.filter(
        (s) =>
          s.serieTitulo.toLowerCase().includes(filtroNorm) ||
          lecciones.some((l) => l.serieId === s.serieId && l.titulo.toLowerCase().includes(filtroNorm))
      )
    : series

  return (
    <div className="re-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h2 className="re-subtitulo" style={{ margin: 0 }}>Cursos y lecciones</h2>
          <p style={{ marginTop: 6, marginBottom: 0, opacity: 0.75 }}>
            Crea, edita y organiza el currículo — sin escribir código.
          </p>
        </div>
        <Link to="/radgen/education/lider/leccion/nueva" className="re-btn re-btn--lleno re-btn--sm">
          + Nueva lección
        </Link>
      </div>

      <input
        className="re-input"
        placeholder="🔎 Buscar serie o lección…"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        style={{ marginBottom: 24 }}
      />

      {seriesFiltradas.length === 0 && (
        <p style={{ opacity: 0.6 }}>
          {series.length === 0 ? 'Todavía no hay ninguna serie creada.' : 'Sin resultados para esa búsqueda.'}
        </p>
      )}

      {seriesFiltradas.map((s, si) => {
        let deSerie = lecciones.filter((l) => l.serieId === s.serieId).sort((a, b) => a.orden - b.orden)
        if (filtroNorm && !s.serieTitulo.toLowerCase().includes(filtroNorm)) {
          deSerie = deSerie.filter((l) => l.titulo.toLowerCase().includes(filtroNorm))
        }
        return (
          <div
            key={s.serieId}
            style={{
              marginBottom: '1.5rem',
              borderLeft: s.color ? `5px solid ${s.color}` : '5px solid transparent',
              paddingLeft: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {s.portada && (
                  <img src={s.portada} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                )}
                {renombrando === s.serieId ? (
                  <>
                    <input
                      className="re-input"
                      style={{ marginBottom: 0, maxWidth: 240 }}
                      value={nombreTemp}
                      onChange={(e) => setNombreTemp(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="re-vinculo"
                      onClick={guardarNombreSerie}
                      disabled={!nombreTemp.trim() || guardandoNombre}
                    >
                      {guardandoNombre ? 'Guardando…' : 'Guardar'}
                    </button>
                    <button type="button" className="re-vinculo" onClick={() => setRenombrando(null)} disabled={guardandoNombre}>
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', margin: 0 }}>
                      {s.serieTitulo}
                    </h3>
                    <button type="button" className="re-vinculo" onClick={() => empezarRenombrar(s)}>
                      ✏️
                    </button>
                  </>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {COLORES_SERIE.map((c) => (
                    <button
                      key={c.nombre}
                      type="button"
                      title={c.nombre}
                      onClick={() => cambiarColorSerie(s.serieId, c.valor)}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        border: s.color === c.valor ? '2px solid var(--rg-ink)' : '1px solid rgba(15, 15, 18, 0.2)',
                        background: c.valor || '#fff',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    />
                  ))}
                </div>
                <label className="re-vinculo" style={{ cursor: 'pointer' }}>
                  {subiendoPortada === s.serieId ? 'Subiendo…' : '📷 Portada'}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={subiendoPortada === s.serieId}
                    onChange={(e) => subirPortadaSerie(s.serieId, e.target.files?.[0])}
                  />
                </label>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button type="button" className="re-vinculo re-vinculo--icono" disabled={si === 0} onClick={() => moverSerieDir(s.serieId, -1)}>
                    ↑
                  </button>
                  <button type="button" className="re-vinculo re-vinculo--icono" disabled={si === seriesFiltradas.length - 1} onClick={() => moverSerieDir(s.serieId, 1)}>
                    ↓
                  </button>
                </div>
                <Link to={`/radgen/education/lider/serie/${s.serieId}/preview`} className="re-vinculo">
                  👁 Vista previa
                </Link>
              </div>
            </div>

            {deSerie.map((l, i) => (
              <div key={l.id} className="re-tarea" style={{ alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <button
                    type="button"
                    className="re-vinculo re-vinculo--icono"
                    disabled={i === 0}
                    onClick={() => mover(l.id, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="re-vinculo re-vinculo--icono"
                    disabled={i === deSerie.length - 1}
                    onClick={() => mover(l.id, 1)}
                  >
                    ↓
                  </button>
                </div>
                <div className="re-tarea__cuerpo">
                  <p className="re-tarea__titulo">
                    {l.icono} {l.titulo}{' '}
                    <span
                      className={`re-badge ${
                        l.estado === 'archivada' ? 're-badge--pendiente' : l.estado === 'borrador' ? 're-badge--borrador' : 're-badge--completado'
                      }`}
                      style={{ marginLeft: 8 }}
                    >
                      {l.estado === 'archivada' ? 'Archivada' : l.estado === 'borrador' ? 'Borrador' : 'Activa'}
                    </span>
                  </p>
                  <p className="re-tarea__descripcion">
                    {l.quiz?.length > 0 ? `${l.quiz.length} pregunta${l.quiz.length === 1 ? '' : 's'} de quiz` : 'Sin quiz'}
                    {l.youtubeId ? ' · Con video' : ' · Sin video'}
                  </p>
                  <div style={{ display: 'flex', gap: 14, marginTop: 6, flexWrap: 'wrap' }}>
                    <Link to={`/radgen/education/lider/leccion/${l.id}/editar`} className="re-vinculo">
                      Editar
                    </Link>
                    <Link to={`/radgen/education/lider/leccion/${l.id}/preview`} className="re-vinculo">
                      👁 Vista previa
                    </Link>
                    <button className="re-vinculo" onClick={() => duplicar(l.id)}>
                      Duplicar
                    </button>
                    {l.estado === 'borrador' ? (
                      <button className="re-vinculo" onClick={() => publicar(l.id)}>
                        Publicar
                      </button>
                    ) : (
                      <button className="re-vinculo" onClick={() => archivar(l.id)}>
                        {l.estado === 'archivada' ? 'Reactivar' : 'Archivar'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function PanelAsignar({ usuario, jovenes, lecciones, series, refrescar }) {
  const [modo, setModo] = useState('leccion') // leccion | serie
  const [leccionId, setLeccionId] = useState(lecciones[0]?.id || '')
  const [serieId, setSerieId] = useState(series[0]?.serieId || '')
  const [seleccionados, setSeleccionados] = useState([])
  const [mensaje, setMensaje] = useState('')
  const [asignando, setAsignando] = useState(false)

  function toggleJoven(uid) {
    setSeleccionados((prev) => (prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]))
  }

  const todosSeleccionados = jovenes.length > 0 && seleccionados.length === jovenes.length

  function toggleTodos() {
    setSeleccionados(todosSeleccionados ? [] : jovenes.map((j) => j.uid))
  }

  async function asignar() {
    if (seleccionados.length === 0) return
    if (modo === 'serie' && !serieId) return
    if (modo === 'leccion' && !leccionId) return
    setAsignando(true)
    try {
      if (modo === 'serie') {
        const cuantas = await asignarSerieCompleta({ serieId, jovenUids: seleccionados, liderUid: usuario.uid })
        setMensaje(`Serie asignada (${cuantas} lecci${cuantas === 1 ? 'ón' : 'ones'}).`)
      } else {
        await asignarLeccion({ leccionId, jovenUids: seleccionados, liderUid: usuario.uid })
        setMensaje('Lección asignada.')
      }
      await refrescar()
      setSeleccionados([])
      setTimeout(() => setMensaje(''), 2500)
    } finally {
      setAsignando(false)
    }
  }

  return (
    <div className="re-card">
      <h2 className="re-subtitulo">Asignar</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          className={`re-btn re-btn--sm ${modo === 'leccion' ? 're-btn--lleno' : ''}`}
          onClick={() => setModo('leccion')}
        >
          Lección individual
        </button>
        <button
          type="button"
          className={`re-btn re-btn--sm ${modo === 'serie' ? 're-btn--lleno' : ''}`}
          onClick={() => setModo('serie')}
        >
          Serie completa
        </button>
      </div>

      {modo === 'leccion' ? (
        <>
          <label className="re-label">Lección</label>
          <select className="re-input" value={leccionId} onChange={(e) => setLeccionId(e.target.value)}>
            {lecciones.map((l) => (
              <option key={l.id} value={l.id}>{l.titulo}</option>
            ))}
          </select>
        </>
      ) : (
        <>
          <label className="re-label">Serie</label>
          <select className="re-input" value={serieId} onChange={(e) => setSerieId(e.target.value)}>
            {series.map((s) => (
              <option key={s.serieId} value={s.serieId}>{s.serieTitulo}</option>
            ))}
          </select>
        </>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <label className="re-label" style={{ marginBottom: 0 }}>Jóvenes</label>
        <button type="button" className="re-vinculo" onClick={toggleTodos} disabled={jovenes.length === 0}>
          {todosSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos'}
        </button>
      </div>
      <div className="re-check-grid" style={{ marginTop: 10 }}>
        {jovenes.map((j) => (
          <button
            key={j.uid}
            type="button"
            className={`re-check-pill ${seleccionados.includes(j.uid) ? 'activo' : ''}`}
            onClick={() => toggleJoven(j.uid)}
          >
            {j.nombre}
          </button>
        ))}
      </div>

      <button
        className="re-btn re-btn--lleno"
        onClick={asignar}
        disabled={(modo === 'leccion' ? !leccionId : !serieId) || seleccionados.length === 0 || asignando}
      >
        {asignando ? 'Asignando…' : 'Asignar'}
      </button>
      {mensaje && <span style={{ marginLeft: 12, fontWeight: 700, color: 'var(--rg-ink)' }}>{mensaje}</span>}
    </div>
  )
}

function PanelAsignacionPersonal({ usuario, jovenes }) {
  const [jovenUid, setJovenUid] = useState(jovenes[0]?.uid || '')
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [asignando, setAsignando] = useState(false)

  async function asignar() {
    if (!titulo.trim() || !jovenUid) return
    setAsignando(true)
    try {
      await asignarTareaPersonal({ jovenUid, titulo: titulo.trim(), descripcion: descripcion.trim(), liderUid: usuario.uid })
      setTitulo('')
      setDescripcion('')
      setMensaje('Tarea asignada.')
      setTimeout(() => setMensaje(''), 2500)
    } finally {
      setAsignando(false)
    }
  }

  return (
    <div className="re-card">
      <h2 className="re-subtitulo">Asignación individual (1:1)</h2>
      <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.75 }}>
        Para lo que le dejas a un joven en particular después de una plática — no necesita ser parte del currículo ni tiene quiz.
      </p>

      <label className="re-label">Joven</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
        <Avatar
          nombre={jovenes.find((j) => j.uid === jovenUid)?.nombre}
          foto={jovenes.find((j) => j.uid === jovenUid)?.fotoPerfil}
          uid={jovenUid}
          size={40}
        />
        <select className="re-input" style={{ marginBottom: 0 }} value={jovenUid} onChange={(e) => setJovenUid(e.target.value)}>
          {jovenes.map((j) => (
            <option key={j.uid} value={j.uid}>{j.nombre}</option>
          ))}
        </select>
      </div>

      <label className="re-label">Título</label>
      <input
        className="re-input"
        placeholder="Ej. Leer Salmo 23 esta semana"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
      />

      <label className="re-label">Detalles (opcional)</label>
      <textarea
        className="re-input"
        rows={3}
        placeholder="Contexto o instrucciones de la plática…"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        style={{ resize: 'vertical', fontFamily: 'inherit' }}
      />

      <button className="re-btn re-btn--lleno" onClick={asignar} disabled={!titulo.trim() || !jovenUid || asignando}>
        {asignando ? 'Asignando…' : 'Asignar'}
      </button>
      {mensaje && <span style={{ marginLeft: 12, fontWeight: 700, color: 'var(--rg-ink)' }}>{mensaje}</span>}
    </div>
  )
}

// Última vez que el joven hizo algo: su cápsula completada más reciente o,
// si nunca ha completado ninguna, cuándo recibió la primera.
function ultimaActividadDe(asignaciones) {
  const completadas = asignaciones.map((a) => a.fechaCompletado).filter(Boolean).sort()
  if (completadas.length) return completadas.at(-1)
  return asignaciones.map((a) => a.fechaAsignada).filter(Boolean).sort()[0] || null
}

function diasDesde(fechaIso) {
  return fechaIso ? Math.floor((Date.now() - new Date(fechaIso).getTime()) / DIA_MS) : 0
}

function haceCuanto(fechaIso) {
  if (!fechaIso) return ''
  const dias = Math.floor((Date.now() - new Date(fechaIso).getTime()) / (24 * 60 * 60 * 1000))
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'ayer'
  if (dias < 7) return `hace ${dias} días`
  const semanas = Math.floor(dias / 7)
  if (semanas < 5) return `hace ${semanas} semana${semanas === 1 ? '' : 's'}`
  return new Date(fechaIso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

// Puramente presentacional — recibe ya calculados los datos del joven
// (vienen de `ranking` y `tabla`, que el panel padre ya cargó una sola vez).
function TarjetaPersona({ joven, totalCompletadas, totalAsignaciones, nivelActual, racha, pendientes, xpTotal, inactivo, diasSinActividad }) {
  return (
    <Link to={`/radgen/education/lider/joven/${joven.uid}`} className={`re-persona-card ${totalAsignaciones === 0 ? 're-persona-card--sin-asignar' : ''}`}>
      <div className="re-persona-card__cabecera">
        <div className="re-persona-card__identidad">
          <Avatar nombre={joven.nombre} foto={joven.fotoPerfil} uid={joven.uid} size={40} colorAcento={joven.colorAcento} />
          <div>
            <p className="re-persona-card__nombre">{joven.nombre}</p>
            {joven.creadoEn && <p className="re-persona-card__unido">Se unió {haceCuanto(joven.creadoEn)}</p>}
          </div>
        </div>
        <span className="re-leccion-item__flecha" aria-hidden="true">→</span>
      </div>

      <p className="re-persona-card__resumen">
        {totalAsignaciones === 0
          ? 'Todavía no tiene cápsulas asignadas'
          : `${totalCompletadas} de ${totalAsignaciones} cápsula${totalAsignaciones === 1 ? '' : 's'} completada${totalCompletadas === 1 ? '' : 's'}`}
      </p>

      {totalAsignaciones > 0 && (
        <div className="re-barra re-barra--mini">
          <div className="re-barra__relleno" style={{ width: `${Math.round((totalCompletadas / totalAsignaciones) * 100)}%` }} />
        </div>
      )}

      <div className="re-persona-card__chips">
        {esNuevo(joven) && <span className="re-badge re-badge--nuevo">🆕 Nuevo</span>}
        {inactivo && <span className="re-badge re-badge--inactivo">😴 {diasSinActividad} días sin actividad</span>}
        {totalAsignaciones === 0 && <span className="re-badge re-badge--alerta">Sin asignar</span>}
        {nivelActual && <span className="re-badge re-badge--completado">{nivelActual.icono} {nivelActual.nombre}</span>}
        {xpTotal > 0 && <span className="re-badge re-badge--completado">⚡ {xpTotal} XP</span>}
        {racha > 0 && <span className="re-badge re-badge--completado">🔥 {racha}</span>}
        {pendientes > 0 && <span className="re-badge re-badge--pendiente">{pendientes} pendiente{pendientes === 1 ? '' : 's'}</span>}
      </div>
    </Link>
  )
}

const FILTROS_SEGUIMIENTO = [
  ['todos', 'Todos'],
  ['nuevos', '🆕 Nuevos'],
  ['inactivos', '😴 Inactivos'],
  ['sin-asignar', 'Sin asignar'],
  ['con-pendientes', 'Con pendientes'],
]

function PanelSeguimiento({ jovenes, tabla, ranking }) {
  const [filtro, setFiltro] = useState('todos')
  const listaRef = useRef(null)

  function filtrarYMostrar(valor) {
    setFiltro(valor)
    listaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const datos = jovenes
    .map((j) => {
      const deEsteJoven = tabla.filter((f) => f.asignadoA === j.uid)
      const filaRanking = ranking.find((r) => r.joven.uid === j.uid)
      const pendientes = deEsteJoven.filter((f) => f.estado !== 'completado').length
      const ultimaActividad = ultimaActividadDe(deEsteJoven)
      const diasSinActividad = diasDesde(ultimaActividad)
      return {
        joven: j,
        totalAsignaciones: deEsteJoven.length,
        pendientes,
        filaRanking,
        ultimaActividad,
        diasSinActividad,
        // Solo cuenta como inactivo si tiene algo pendiente: quien ya
        // terminó todo y espera su próxima cápsula no se ha desconectado.
        inactivo: pendientes > 0 && diasSinActividad >= DIAS_PARA_INACTIVO,
      }
    })
    .sort((a, b) => (b.joven.creadoEn || '').localeCompare(a.joven.creadoEn || ''))

  const nuevos = datos.filter((d) => esNuevo(d.joven))
  const sinAsignar = datos.filter((d) => d.totalAsignaciones === 0)
  const inactivos = datos.filter((d) => d.inactivo).sort((a, b) => b.diasSinActividad - a.diasSinActividad)

  const visibles = datos.filter((d) => {
    if (filtro === 'nuevos') return esNuevo(d.joven)
    if (filtro === 'inactivos') return d.inactivo
    if (filtro === 'sin-asignar') return d.totalAsignaciones === 0
    if (filtro === 'con-pendientes') return d.pendientes > 0
    return true
  })

  return (
    <>
      <div className="re-resumen-grupo">
        <div className="re-resumen-grupo__dato">
          <span className="re-resumen-grupo__numero">{jovenes.length}</span>
          <span className="re-resumen-grupo__etiqueta">jóvenes registrados</span>
        </div>
        <button type="button" className="re-resumen-grupo__dato re-resumen-grupo__dato--nuevo" onClick={() => filtrarYMostrar('nuevos')}>
          <span className="re-resumen-grupo__numero">{nuevos.length}</span>
          <span className="re-resumen-grupo__etiqueta">nuevos (últimos {DIAS_COMO_NUEVO} días)</span>
        </button>
        <button type="button" className="re-resumen-grupo__dato re-resumen-grupo__dato--inactivo" onClick={() => filtrarYMostrar('inactivos')}>
          <span className="re-resumen-grupo__numero">{inactivos.length}</span>
          <span className="re-resumen-grupo__etiqueta">inactivos ({DIAS_PARA_INACTIVO}+ días sin avanzar)</span>
        </button>
        <button type="button" className="re-resumen-grupo__dato re-resumen-grupo__dato--alerta" onClick={() => filtrarYMostrar('sin-asignar')}>
          <span className="re-resumen-grupo__numero">{sinAsignar.length}</span>
          <span className="re-resumen-grupo__etiqueta">sin ninguna cápsula asignada</span>
        </button>
      </div>

      {inactivos.length > 0 && (
        <div className="re-card re-card--inactivos">
          <h2 className="re-subtitulo">😴 Hace rato que no avanzan</h2>
          <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.75 }}>
            Tienen cápsulas pendientes y llevan {DIAS_PARA_INACTIVO} días o más sin completar nada. Un mensaje tuyo
            puede hacer la diferencia.
          </p>
          <div className="re-nuevos-lista">
            {inactivos.map((d) => (
              <Link key={d.joven.uid} to={`/radgen/education/lider/joven/${d.joven.uid}`} className="re-nuevo-item re-nuevo-item--inactivo">
                <Avatar nombre={d.joven.nombre} foto={d.joven.fotoPerfil} uid={d.joven.uid} size={36} colorAcento={d.joven.colorAcento} />
                <span className="re-nuevo-item__texto">
                  <strong>{d.joven.nombre}</strong>
                  <small>Última actividad {haceCuanto(d.ultimaActividad)}</small>
                </span>
                <span className="re-badge re-badge--pendiente" title={`${d.pendientes} cápsulas pendientes`}>
                  {d.pendientes}
                  <span className="re-solo-escritorio"> pendiente{d.pendientes === 1 ? '' : 's'}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {nuevos.length > 0 && (
        <div className="re-card re-card--nuevos">
          <h2 className="re-subtitulo">🆕 Se unieron recientemente</h2>
          <div className="re-nuevos-lista">
            {nuevos.map((d) => (
              <Link key={d.joven.uid} to={`/radgen/education/lider/joven/${d.joven.uid}`} className="re-nuevo-item">
                <Avatar nombre={d.joven.nombre} foto={d.joven.fotoPerfil} uid={d.joven.uid} size={36} colorAcento={d.joven.colorAcento} />
                <span className="re-nuevo-item__texto">
                  <strong>{d.joven.nombre}</strong>
                  <small>Se unió {haceCuanto(d.joven.creadoEn)}</small>
                </span>
                {d.totalAsignaciones === 0 ? (
                  <span className="re-badge re-badge--alerta">Sin asignar</span>
                ) : (
                  <span className="re-badge re-badge--completado" title={`${d.totalAsignaciones} cápsulas asignadas`}>
                    ✓ {d.totalAsignaciones}
                    <span className="re-solo-escritorio"> asignada{d.totalAsignaciones === 1 ? '' : 's'}</span>
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="re-card re-card--rojo" ref={listaRef} style={{ scrollMarginTop: 90 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <h2 className="re-subtitulo" style={{ margin: 0 }}>Estado por joven</h2>
          <button className="re-btn re-btn--sm" onClick={() => exportarEstadoCsv(tabla)}>
            ⬇ Exportar CSV
          </button>
        </div>

        <div className="re-filtros">
          {FILTROS_SEGUIMIENTO.map(([valor, etiqueta]) => (
            <button
              key={valor}
              type="button"
              className={`re-check-pill ${filtro === valor ? 'activo' : ''}`}
              onClick={() => setFiltro(valor)}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        <div className="re-personas-grid">
          {visibles.map((d) => (
            <TarjetaPersona
              key={d.joven.uid}
              joven={d.joven}
              totalCompletadas={d.filaRanking?.totalCompletadas || 0}
              totalAsignaciones={d.totalAsignaciones}
              nivelActual={d.filaRanking?.nivelActual || null}
              racha={d.filaRanking?.racha || 0}
              xpTotal={d.filaRanking?.xpTotal || 0}
              pendientes={d.pendientes}
              inactivo={d.inactivo}
              diasSinActividad={d.diasSinActividad}
            />
          ))}
        </div>

        {jovenes.length === 0 && <p style={{ opacity: 0.6 }}>Todavía no hay jóvenes registrados.</p>}
        {jovenes.length > 0 && visibles.length === 0 && <p style={{ opacity: 0.6 }}>Nadie en este filtro. 🎉</p>}
      </div>
    </>
  )
}

function PanelElegibilidad({ elegibilidadPorJoven, lecciones, requisitos, cambiarRequisito }) {
  return (
    <>
      <div className="re-card">
        <h2 className="re-subtitulo">Elegibilidad para servir</h2>
        <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.75 }}>
          Quién ya cumple los requisitos para tomarse en cuenta en voluntariado o viajes misioneros.
          Esta tabla siempre la ves tú; en <strong>Ajustes</strong> decides si los jóvenes también la ven en su perfil.
        </p>

        <div className="re-tabla-wrap">
          <table className="re-tabla">
            <thead>
              <tr>
                <th>Joven</th>
                <th>Cápsulas completadas</th>
                <th>Voluntariado</th>
                <th>Misiones</th>
              </tr>
            </thead>
            <tbody>
              {elegibilidadPorJoven.map(({ joven, insignias }) => (
                <tr key={joven.uid}>
                  <td>
                    <Link to={`/radgen/education/lider/joven/${joven.uid}`} className="re-vinculo re-vinculo--nombre">
                      {joven.nombre}
                    </Link>
                  </td>
                  <td>{insignias.totalCompletadas}</td>
                  <td>
                    <span className={`re-badge ${insignias.elegibilidad.voluntariado.apto ? 're-badge--completado' : 're-badge--pendiente'}`}>
                      {insignias.elegibilidad.voluntariado.apto ? 'Apto' : 'No apto'}
                    </span>
                  </td>
                  <td>
                    <span className={`re-badge ${insignias.elegibilidad.misiones.apto ? 're-badge--completado' : 're-badge--pendiente'}`}>
                      {insignias.elegibilidad.misiones.apto ? 'Apto' : 'No apto'}
                    </span>
                  </td>
                </tr>
              ))}
              {elegibilidadPorJoven.length === 0 && (
                <tr>
                  <td colSpan={4}>Todavía no hay jóvenes registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="re-card">
        <h2 className="re-subtitulo">Requisitos por actividad</h2>
        <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.75 }}>
          Marca qué lecciones debe tener completadas un joven para ser considerado apto.
        </p>

        <label className="re-label">Voluntariado en la iglesia</label>
        <div className="re-check-grid">
          {lecciones.map((l) => (
            <button
              key={l.id}
              type="button"
              className={`re-check-pill ${requisitos.voluntariado?.includes(l.id) ? 'activo' : ''}`}
              onClick={() => cambiarRequisito('voluntariado', l.id)}
            >
              {l.titulo}
            </button>
          ))}
        </div>

        <label className="re-label">Viajes misioneros</label>
        <div className="re-check-grid">
          {lecciones.map((l) => (
            <button
              key={l.id}
              type="button"
              className={`re-check-pill ${requisitos.misiones?.includes(l.id) ? 'activo' : ''}`}
              onClick={() => cambiarRequisito('misiones', l.id)}
            >
              {l.titulo}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

function PanelNotasYPreguntas({ usuario, jovenes, pendientes, refrescarPendientes }) {
  const [jovenNotaId, setJovenNotaId] = useState(jovenes[0]?.uid || '')
  const [textoNota, setTextoNota, limpiarBorradorNota] = useBorrador(`nota:${jovenNotaId}`)
  const [notas, setNotas] = useState([])
  const [respuestas, setRespuestas] = useState({})

  useEffect(() => {
    if (!jovenNotaId) return
    getNotasDe(jovenNotaId).then(setNotas)
  }, [jovenNotaId])

  const { pendiente: notaPendiente, solicitar: solicitarEliminarNota, deshacer: deshacerEliminarNota } =
    useEliminarConDeshacer({
      lista: notas,
      setLista: setNotas,
      eliminar: (notaId) => eliminarNota({ jovenUid: jovenNotaId, notaId }),
    })

  async function guardarNota() {
    if (!textoNota.trim() || !jovenNotaId) return
    setNotas(await agregarNota({ jovenUid: jovenNotaId, texto: textoNota.trim(), liderUid: usuario.uid }))
    limpiarBorradorNota()
  }

  async function responder(asignacionId, comentarioId) {
    const respuesta = (respuestas[comentarioId] || '').trim()
    if (!respuesta) return
    await responderComentario({ asignacionId, comentarioId, respuesta })
    refrescarPendientes()
    setRespuestas((prev) => ({ ...prev, [comentarioId]: '' }))
  }

  async function eliminar(comentarioId) {
    await eliminarComentario(comentarioId)
    refrescarPendientes()
  }

  return (
    <>
      <div className="re-card">
        <h2 className="re-subtitulo">Preguntas de los jóvenes</h2>
        <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.75 }}>
          Lo que van dejando al terminar sus lecciones, sin responder todavía.
        </p>
        {pendientes.length === 0 && <p style={{ opacity: 0.6 }}>No hay preguntas pendientes. 🎉</p>}
        {pendientes.map(({ asignacionId, comentario, leccion, joven }) => (
          <div key={comentario.id} className="re-nota" style={{ marginBottom: 12 }}>
            <div className="re-nota__fecha">
              {joven?.nombre} — {leccion?.titulo} — {new Date(comentario.fecha).toLocaleDateString('es-MX')}
            </div>
            <p style={{ margin: '0 0 10px' }}>{comentario.texto}</p>
            <textarea
              className="re-input"
              rows={2}
              placeholder="Escribe tu respuesta…"
              value={respuestas[comentario.id] || ''}
              onChange={(e) => setRespuestas((prev) => ({ ...prev, [comentario.id]: e.target.value }))}
              style={{ resize: 'vertical', fontFamily: 'inherit', marginBottom: 8 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                className="re-btn re-btn--sm"
                onClick={() => responder(asignacionId, comentario.id)}
                disabled={!(respuestas[comentario.id] || '').trim()}
              >
                Responder
              </button>
              <button type="button" className="re-vinculo re-vinculo--peligro" onClick={() => eliminar(comentario.id)}>
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="re-card">
        <h2 className="re-subtitulo">Notas por joven</h2>
        <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.75 }}>
          Apuntes privados para ti — conversaciones, señales de madurez, lo que quieras recordar antes de considerar a alguien para servir.
        </p>

        <label className="re-label">Joven</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
          <Avatar
            nombre={jovenes.find((j) => j.uid === jovenNotaId)?.nombre}
            foto={jovenes.find((j) => j.uid === jovenNotaId)?.fotoPerfil}
            uid={jovenNotaId}
            size={40}
          />
          <select
            className="re-input"
            style={{ marginBottom: 0 }}
            value={jovenNotaId}
            onChange={(e) => setJovenNotaId(e.target.value)}
          >
            {jovenes.map((j) => (
              <option key={j.uid} value={j.uid}>{j.nombre}</option>
            ))}
          </select>
        </div>

        <textarea
          className="re-input"
          rows={3}
          placeholder="Escribe una nota…"
          value={textoNota}
          onChange={(e) => setTextoNota(e.target.value)}
          style={{ resize: 'vertical', fontFamily: 'inherit' }}
        />
        <button className="re-btn re-btn--lleno" onClick={guardarNota} disabled={!textoNota.trim()}>
          Guardar nota
        </button>

        <div style={{ marginTop: 20 }}>
          {notas.length === 0 && <p style={{ opacity: 0.6 }}>Todavía no hay notas para este joven.</p>}
          {notas.map((n) => (
            <div key={n.id} className="re-nota">
              <div className="re-nota__fecha">{new Date(n.fecha).toLocaleDateString('es-MX')}</div>
              <p style={{ margin: 0 }}>{n.texto}</p>
              <button
                className="re-vinculo re-vinculo--peligro"
                style={{ marginTop: 6 }}
                onClick={() => solicitarEliminarNota(n, 'Nota eliminada.')}
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      </div>

      <Toast mensaje={notaPendiente?.mensaje} onDeshacer={deshacerEliminarNota} />
    </>
  )
}

const rutaPerfilLider = (uid) => `/radgen/education/lider/joven/${uid}`

function SeccionRanking({ ranking }) {
  return (
    <div className="re-card re-card--ranking">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
        <h2 className="re-subtitulo" style={{ margin: 0 }}>Ranking del grupo</h2>
        <Link to="/radgen/education/proyector" target="_blank" className="re-btn re-btn--sm">
          🖥️ Modo proyector
        </Link>
      </div>
      <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.75 }}>
        Un solo ranking: ordenado por experiencia (XP) y, si empatan, por insignias totales.
      </p>

      {ranking.length === 0 ? (
        <p style={{ opacity: 0.6 }}>Todavía no hay jóvenes registrados.</p>
      ) : (
        <>
          <PodioRanking ranking={ranking} rutaPerfil={rutaPerfilLider} />
          <TablaRanking ranking={ranking} rutaPerfil={rutaPerfilLider} detallado />
        </>
      )}
    </div>
  )
}

const COLORES_EQUIPO = ['#3a7bff', '#FF3B3B', '#e3a234', '#34a853', '#9333e3', '#14b8a6']

function SeccionEquipos({ jovenes, ranking, equipos, setEquipos }) {
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function guardar(lista) {
    setGuardando(true)
    try {
      setEquipos(await guardarEquipos(lista))
    } finally {
      setGuardando(false)
    }
  }

  function crear() {
    if (!nombreNuevo.trim()) return
    const nuevo = {
      id: `equipo-${Date.now()}`,
      nombre: nombreNuevo.trim(),
      color: COLORES_EQUIPO[equipos.length % COLORES_EQUIPO.length],
      miembros: [],
    }
    setNombreNuevo('')
    guardar([...equipos, nuevo])
  }

  // Un joven solo puede estar en un equipo — moverlo lo saca del anterior.
  function moverJoven(uid, equipoId) {
    guardar(
      equipos.map((e) => {
        const sinEl = (e.miembros || []).filter((m) => m !== uid)
        return e.id === equipoId ? { ...e, miembros: [...sinEl, uid] } : { ...e, miembros: sinEl }
      }),
    )
  }

  function eliminar(equipoId) {
    guardar(equipos.filter((e) => e.id !== equipoId))
  }

  const equipoDe = (uid) => equipos.find((e) => e.miembros?.includes(uid))?.id || ''
  const rankingEquipos = calcularRankingEquipos(equipos, ranking)

  return (
    <>
      {equipos.length > 0 && (
        <div className="re-card re-card--ranking">
          <h2 className="re-subtitulo">Competencia por equipos</h2>
          <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.75 }}>
            Se ordena por XP promedio por integrante, para que un equipo más grande no gane solo por tener más gente.
          </p>
          <RankingEquipos equipos={rankingEquipos} />
        </div>
      )}

      <div className="re-card">
        <h2 className="re-subtitulo">Armar equipos</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
          <input
            className="re-input"
            style={{ marginBottom: 0, maxWidth: 280 }}
            placeholder="Nombre del equipo (ej. Leones)"
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && crear()}
          />
          <button className="re-btn re-btn--lleno" onClick={crear} disabled={!nombreNuevo.trim() || guardando}>
            + Crear equipo
          </button>
        </div>

        {equipos.length > 0 && (
          <div className="re-equipos-chips">
            {equipos.map((e) => (
              <span key={e.id} className="re-equipo-chip" style={{ '--equipo-color': e.color }}>
                {e.nombre} · {e.miembros?.length || 0}
                <button type="button" onClick={() => eliminar(e.id)} title="Eliminar equipo" disabled={guardando}>✕</button>
              </span>
            ))}
          </div>
        )}

        {equipos.length === 0 ? (
          <p style={{ opacity: 0.6 }}>Crea al menos un equipo para empezar a repartir jóvenes.</p>
        ) : (
          <div className="re-equipos-asignacion">
            {jovenes.map((j) => (
              <div key={j.uid} className="re-equipos-asignacion__fila">
                <Avatar nombre={j.nombre} foto={j.fotoPerfil} uid={j.uid} size={30} colorAcento={j.colorAcento} />
                <span className="re-equipos-asignacion__nombre">{j.nombre}</span>
                <select
                  className="re-input"
                  style={{ marginBottom: 0, maxWidth: 200 }}
                  value={equipoDe(j.uid)}
                  onChange={(e) => moverJoven(j.uid, e.target.value)}
                  disabled={guardando}
                >
                  <option value="">Sin equipo</option>
                  {equipos.map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function QrReunion({ codigo, grande }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    const url = `${window.location.origin}/radgen/education/asistencia/${codigo}`
    QRCode.toDataURL(url, { width: grande ? 720 : 320, margin: 1, color: { dark: '#0F0F12', light: '#FFFFFF' } }).then(setSrc)
  }, [codigo, grande])
  return src ? <img src={src} alt={`Código QR de asistencia ${codigo}`} className={grande ? 're-qr re-qr--grande' : 're-qr'} /> : null
}

function SeccionAsistencia({ usuario, jovenes }) {
  const [reuniones, setReuniones] = useState([])
  const [titulo, setTitulo] = useState('')
  const [creando, setCreando] = useState(false)
  const [asistentes, setAsistentes] = useState([])
  const [proyectando, setProyectando] = useState(false)
  const [errorReunion, setErrorReunion] = useState('')

  const activa = reuniones.find((r) => r.activa)

  useEffect(() => {
    getReuniones().then(setReuniones)
  }, [])

  useEffect(() => {
    if (!activa) return undefined
    return observarAsistenciasDeReunion(activa.codigo, setAsistentes)
  }, [activa])

  async function crear() {
    setCreando(true)
    setErrorReunion('')
    try {
      await crearReunion({ titulo, liderUid: usuario.uid })
      setTitulo('')
      setReuniones(await getReuniones())
    } catch {
      setErrorReunion('No se pudo abrir la asistencia. Revisa que las reglas de Firestore estén actualizadas.')
    } finally {
      setCreando(false)
    }
  }

  async function cerrar() {
    await cerrarReunion(activa.codigo)
    setProyectando(false)
    setReuniones(await getReuniones())
  }

  const jovenPorUid = new Map(jovenes.map((j) => [j.uid, j]))

  return (
    <>
      {!activa ? (
        <div className="re-card">
          <h2 className="re-subtitulo">📍 Tomar asistencia</h2>
          <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.75 }}>
            Opcional: abre la asistencia al empezar la reunión y aparece un código QR que los jóvenes pueden escanear con
            la cámara de su celular (o escribir el código en su pantalla de lecciones). No es obligatorio — solo les da
            un poquito de XP extra por venir.
          </p>
          <input
            className="re-input"
            placeholder="Nombre de la reunión (opcional)"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
          <button className="re-btn re-btn--lleno" onClick={crear} disabled={creando}>
            {creando ? 'Abriendo…' : 'Abrir asistencia de hoy'}
          </button>
          {errorReunion && <p className="re-duelo-error">{errorReunion}</p>}
        </div>
      ) : (
        <div className="re-card re-card--asistencia">
          <div className="re-asistencia">
            <div className="re-asistencia__qr">
              <QrReunion codigo={activa.codigo} />
              <p className="re-asistencia__codigo">{activa.codigo}</p>
            </div>
            <div className="re-asistencia__info">
              <p className="re-asistencia__etiqueta">🟢 Asistencia abierta</p>
              <h2 className="re-subtitulo" style={{ marginTop: 4 }}>{activa.titulo}</h2>
              <p className="re-asistencia__contador">
                <strong>{asistentes.length}</strong> de {jovenes.length} ya registraron su asistencia
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="re-btn re-btn--lleno re-btn--sm" onClick={() => setProyectando(true)}>🖥️ Mostrar en grande</button>
                <button className="re-btn re-btn--sm" onClick={cerrar}>Cerrar asistencia</button>
              </div>
            </div>
          </div>

          <div className="re-asistentes">
            {asistentes
              .slice()
              .sort((a, b) => a.fecha.localeCompare(b.fecha))
              .map((a) => {
                const j = jovenPorUid.get(a.jovenUid)
                return (
                  <div key={a.id} className="re-asistentes__item">
                    <Avatar nombre={j?.nombre} foto={j?.fotoPerfil} uid={a.jovenUid} size={28} colorAcento={j?.colorAcento} />
                    <span>{j?.nombre || 'Joven'}</span>
                    <button type="button" className="re-vinculo re-vinculo--peligro" onClick={() => quitarAsistencia(a.id)} title="Quitar">✕</button>
                  </div>
                )
              })}
            {asistentes.length === 0 && <p style={{ opacity: 0.6, margin: 0 }}>Esperando al primero… 👀</p>}
          </div>
        </div>
      )}

      {proyectando && activa && (
        <div className="re-qr-proyeccion" role="dialog" aria-modal="true" onClick={() => setProyectando(false)}>
          <p className="re-qr-proyeccion__titulo">Escanea para registrar tu asistencia</p>
          <QrReunion codigo={activa.codigo} grande />
          <p className="re-qr-proyeccion__codigo">{activa.codigo}</p>
          <p className="re-qr-proyeccion__contador">{asistentes.length} registrado{asistentes.length === 1 ? '' : 's'}</p>
        </div>
      )}

      {reuniones.filter((r) => !r.activa).length > 0 && (
        <div className="re-card">
          <h2 className="re-subtitulo">Reuniones anteriores</h2>
          {reuniones
            .filter((r) => !r.activa)
            .slice(0, 10)
            .map((r) => (
              <div key={r.codigo} className="re-reunion-pasada">
                <span>{r.titulo}</span>
                <span style={{ opacity: 0.6 }}>{new Date(r.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            ))}
        </div>
      )}
    </>
  )
}

const CAMPOS_XP = [
  ['porLeccionCompletada', 'Por cápsula completada (a tiempo)'],
  ['porQuizCorrecta', 'Por respuesta correcta del quiz (a tiempo)'],
  ['porRachaSemana', 'Por cada semana con al menos una cápsula'],
  ['porInsigniaManual', 'Por cada insignia especial otorgada'],
  ['porAsistencia', 'Extra por registrar asistencia con QR (opcional)'],
  ['porVersiculoMemorizado', 'Por memorizar el versículo de una cápsula'],
  ['porDueloGanado', 'Por duelo ganado (máx. 3 por semana)'],
  ['xpPorNivel', 'XP para subir del nivel 1 al 2'],
  ['xpIncrementoPorNivel', 'Cuánto XP más cuesta cada nivel siguiente'],
]

function SeccionValoresXp({ xpConfig, guardarXpConfig }) {
  const [valores, setValores] = useState(xpConfig)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  function cambiarValor(campo, valor) {
    setValores((prev) => ({ ...prev, [campo]: Math.max(0, Number(valor) || 0) }))
  }

  async function guardar() {
    setGuardando(true)
    try {
      await guardarXpConfig(valores)
      setMensaje('Guardado.')
      setTimeout(() => setMensaje(''), 2000)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="re-card">
      <h2 className="re-subtitulo">Cuánto vale cada cosa</h2>
      <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.75 }}>
        Ajusta cuánta experiencia (XP) da cada acción. Se recalcula sola para todos, sin perder historial.
      </p>
      <div className="re-xp-campos">
        {CAMPOS_XP.map(([campo, etiqueta]) => (
          <div key={campo}>
            <label className="re-label">{etiqueta}</label>
            <input
              type="number"
              min="0"
              className="re-input"
              style={{ maxWidth: 160, marginBottom: 0 }}
              value={valores[campo]}
              onChange={(e) => cambiarValor(campo, e.target.value)}
            />
          </div>
        ))}
      </div>
      <button className="re-btn re-btn--lleno" onClick={guardar} disabled={guardando} style={{ marginTop: 18 }}>
        {guardando ? 'Guardando…' : 'Guardar valores'}
      </button>
      {mensaje && <span style={{ marginLeft: 12, fontWeight: 700 }}>{mensaje}</span>}
    </div>
  )
}

// Todo lo relacionado a "quién va ganando y por qué" vive en una sola
// pestaña: el ranking en sí, los equipos (otra vista del mismo ranking),
// la asistencia (una forma más de ganar XP) y los valores que definen esos
// números — así se entiende de un vistazo en vez de saltar entre pestañas.
function PanelExperiencia({ usuario, jovenes, ranking, equipos, setEquipos, xpConfig, guardarXpConfig }) {
  return (
    <>
      <SeccionRanking ranking={ranking} />
      <SeccionEquipos jovenes={jovenes} ranking={ranking} equipos={equipos} setEquipos={setEquipos} />
      <SeccionAsistencia usuario={usuario} jovenes={jovenes} />
      <SeccionValoresXp xpConfig={xpConfig} guardarXpConfig={guardarXpConfig} />
    </>
  )
}

// Todos los interruptores generales ("¿esto lo ven/aplica a todos ahora
// mismo?") juntos en un solo lugar, en vez de repartidos dentro de cada
// pestaña que afectan.
function PanelAjustes({
  pausado,
  cambiarPausado,
  mostrarRanking,
  cambiarVisibilidadRanking,
  mostrarElegibilidad,
  cambiarVisibilidadElegibilidad,
  pausas,
  cambiarPausa,
}) {
  const enPausa = calendarioEnPausa(pausas)
  return (
    <>
      <div className={`re-card re-pausa-banner ${pausado ? 're-card--rojo' : ''}`}>
        <div>
          <p className="re-pausa-banner__titulo">
            {pausado ? '⏸ Currículo pausado para todos' : '✅ Currículo activo'}
          </p>
          <p className="re-pausa-banner__texto">
            {pausado
              ? 'Los jóvenes solo pueden ver y editar su perfil — nada de lecciones, insignias ni ranking. Úsalo para el lanzamiento, o para pausar todo mientras haces ajustes.'
              : 'Los jóvenes ven sus lecciones, insignias y todo con normalidad.'}
          </p>
        </div>
        <button className="re-btn re-btn--sm" onClick={cambiarPausado}>
          {pausado ? 'Reactivar para todos' : 'Pausar para todos'}
        </button>
      </div>

      <div className="re-card">
        <h2 className="re-subtitulo">Visibilidad para los jóvenes</h2>
        <p style={{ marginTop: 0, marginBottom: 20, opacity: 0.75 }}>
          Tú siempre ves todo — estos interruptores solo deciden qué comparte la app con ellos.
        </p>

        <button
          type="button"
          className={`re-switch ${mostrarRanking ? 'activo' : ''}`}
          onClick={cambiarVisibilidadRanking}
          style={{ marginBottom: 14 }}
        >
          <span className="re-switch__perilla" />
          <span>{mostrarRanking ? 'Los jóvenes SÍ ven el ranking' : 'Los jóvenes NO ven el ranking'}</span>
        </button>

        <button
          type="button"
          className={`re-switch ${mostrarElegibilidad ? 'activo' : ''}`}
          onClick={cambiarVisibilidadElegibilidad}
        >
          <span className="re-switch__perilla" />
          <span>{mostrarElegibilidad ? 'Los jóvenes SÍ ven su elegibilidad' : 'Los jóvenes NO ven su elegibilidad'}</span>
        </button>
      </div>

      <div className={`re-card ${enPausa ? 're-card--pausa' : ''}`}>
        <h2 className="re-subtitulo">{enPausa ? '⏸ Calendario en pausa' : '📅 Calendario de cápsulas'}</h2>
        <p style={{ marginTop: 0, marginBottom: 12, opacity: 0.8 }}>
          Cada cápsula tiene su semana. Si se hace tarde vale menos: <strong>100%</strong> en su semana,{' '}
          <strong>75%</strong> una semana tarde, <strong>50%</strong> dos semanas tarde y <strong>25%</strong> después.
          Aplica a los puntos de la cápsula y del quiz.
        </p>
        <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.8 }}>
          {enPausa
            ? 'Mientras esté en pausa, el tiempo no corre para nadie: ninguna cápsula pierde valor.'
            : '¿Semana sin reunión, vacaciones o campamento? Pausa el calendario y nadie pierde puntos por esos días.'}
        </p>
        <button className={`re-btn ${enPausa ? 're-btn--lleno' : ''}`} onClick={cambiarPausa}>
          {enPausa ? '▶ Reanudar calendario' : '⏸ Pausar calendario'}
        </button>
      </div>
    </>
  )
}

function tiempoRelativo(fechaIso) {
  const minutos = Math.floor((Date.now() - new Date(fechaIso).getTime()) / 60000)
  if (minutos < 1) return 'justo ahora'
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `hace ${horas} h`
  const dias = Math.floor(horas / 24)
  return `hace ${dias} d`
}

// El "pulso" del panel — quién completó qué y hace cuánto, siempre visible
// arriba de las pestañas y refrescándose sola, para que abrir el panel se
// sienta vivo en vez de una tabla estática que hay que ir a buscar.
const EMOJIS_REACCION = ['🔥', '👏']

function ActividadReciente({ actividad, onReaccionar }) {
  if (actividad.length === 0) return null

  return (
    <div className="re-actividad">
      <p className="re-actividad__titulo">🟢 Actividad reciente</p>
      <div className="re-actividad__lista">
        {actividad.map((fila) => (
          <div key={fila.id} className="re-actividad__fila">
            <Link to={`/radgen/education/lider/joven/${fila.joven?.uid}`} className="re-actividad__enlace">
              <Avatar nombre={fila.joven?.nombre} foto={fila.joven?.fotoPerfil} uid={fila.joven?.uid} size={30} />
              <span className="re-actividad__texto">
                <strong>{fila.joven?.nombre}</strong> completó <strong>{fila.leccion?.titulo}</strong>
              </span>
              <span className="re-actividad__tiempo">{tiempoRelativo(fila.fechaCompletado)}</span>
            </Link>
            <div className="re-actividad__reacciones">
              {EMOJIS_REACCION.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`re-actividad__reaccion ${fila.reaccionLider?.emoji === emoji ? 'activo' : ''}`}
                  onClick={() => onReaccionar(fila.id, emoji)}
                  title={fila.reaccionLider?.emoji === emoji ? 'Quitar reacción' : `Reaccionar con ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LeaderDashboard({ usuario }) {
  // La pestaña activa vive en la URL (?tab=…), no solo en memoria — así
  // "regresar" desde el perfil de un joven (o de cualquier otra pantalla)
  // te devuelve exactamente a la pestaña donde estabas, en vez de
  // reiniciar siempre a la primera. `replace: true` para que cambiar de
  // pestaña no llene el historial con una entrada por cada clic.
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'asignar'
  function cambiarTab(valor) {
    setSearchParams({ tab: valor }, { replace: true })
  }
  const [cargando, setCargando] = useState(true)
  const [jovenes, setJovenes] = useState([])
  const [lecciones, setLecciones] = useState([])
  const [leccionesActivas, setLeccionesActivas] = useState([])
  const [series, setSeries] = useState([])
  const [tabla, setTabla] = useState([])
  const [ranking, setRanking] = useState([])
  const [requisitos, setRequisitos] = useState({ voluntariado: [], misiones: [] })
  const [mostrarElegibilidad, setMostrarElegibilidad] = useState(false)
  const [mostrarRanking, setMostrarRanking] = useState(false)
  const [pendientes, setPendientes] = useState([])
  const [pausado, setPausado] = useState(false)
  const [duelosPorJugar, setDuelosPorJugar] = useState([])
  const [actividad, setActividad] = useState([])
  const [xpConfig, setXpConfigState] = useState(null)
  const [pausas, setPausas] = useState([])
  const [equipos, setEquipos] = useState([])

  // Se calcula con lo que el panel ya cargó (todas las asignaciones y
  // lecciones), en vez de volver a leer la base de datos por cada joven — y
  // se actualiza al instante cuando cambias un requisito.
  const elegibilidadPorJoven = useMemo(
    () =>
      jovenes.map((joven) => {
        const completadasIds = new Set(
          tabla.filter((f) => f.asignadoA === joven.uid && f.estado === 'completado').map((f) => f.leccionId),
        )
        return {
          joven,
          insignias: {
            totalCompletadas: completadasIds.size,
            elegibilidad: calcularElegibilidad(completadasIds, requisitos, lecciones),
          },
        }
      }),
    [jovenes, tabla, requisitos, lecciones],
  )

  useEffect(() => {
    const unsub = observarAppPausada(setPausado)
    return unsub
  }, [])

  // Los jóvenes también pueden retar a la líder: si alguien la está
  // esperando, se le avisa arriba del panel.
  useEffect(() => {
    getDuelosDe(usuario.uid).then((duelos) =>
      setDuelosPorJugar(duelos.filter((d) => !d.respuestas?.[usuario.uid] && dueloAbierto(d))),
    )
  }, [usuario.uid])

  // Se refresca sola cada 20s mientras la líder tiene el panel abierto —
  // así el "recién completó" no se queda viejo si se deja abierto un rato.
  useEffect(() => {
    getActividadReciente().then(setActividad)
    const intervalo = setInterval(() => {
      getActividadReciente().then(setActividad)
    }, 20000)
    return () => clearInterval(intervalo)
  }, [])

  useEffect(() => {
    Promise.all([
      getJovenes(),
      getLecciones(),
      getLeccionesActivas(),
      getSeries(),
      getTablaEstado(),
      getRanking(),
      getRequisitos(),
      getMostrarElegibilidadAJovenes(),
      getMostrarRankingAJovenes(),
      getComentariosPendientes(),
      getXpConfig(),
      getPausasCalendario(),
      getEquipos(),
    ]).then(([js, ls, la, se, tb, rk, rq, me, mr, pd, xc, pa, eq]) => {
      setJovenes(js)
      setLecciones(ls)
      setLeccionesActivas(la)
      setSeries(se)
      setTabla(tb)
      setRanking(rk)
      setRequisitos(rq)
      setMostrarElegibilidad(me)
      setMostrarRanking(mr)
      setPendientes(pd)
      setXpConfigState(xc)
      setPausas(pa)
      setEquipos(eq)
      setCargando(false)
    })
  }, [])

  async function reaccionar(asignacionId, emoji) {
    await reaccionarActividad({ asignacionId, emoji })
    setActividad(await getActividadReciente())
  }

  async function refrescar() {
    const [tb, rk, ac] = await Promise.all([getTablaEstado(), getRanking(), getActividadReciente()])
    setTabla(tb)
    setRanking(rk)
    setActividad(ac)
  }

  async function refrescarLecciones() {
    const [ls, la, se] = await Promise.all([getLecciones(), getLeccionesActivas(), getSeries()])
    setLecciones(ls)
    setLeccionesActivas(la)
    setSeries(se)
  }

  async function cambiarRequisito(track, id) {
    setRequisitos(await toggleRequisito({ track, leccionId: id }))
  }

  async function cambiarVisibilidadElegibilidad() {
    setMostrarElegibilidad(await setMostrarElegibilidadAJovenes(!mostrarElegibilidad))
  }

  async function cambiarVisibilidadRanking() {
    setMostrarRanking(await setMostrarRankingAJovenes(!mostrarRanking))
  }

  async function guardarXpConfig(nuevoConfig) {
    setXpConfigState(await setXpConfig(nuevoConfig))
    setRanking(await getRanking())
  }

  async function cambiarPausa() {
    setPausas(await alternarPausaCalendario())
    setRanking(await getRanking())
  }

  async function refrescarPendientes() {
    setPendientes(await getComentariosPendientes())
  }

  async function cambiarPausado() {
    await setAppPausada(!pausado)
  }

  if (cargando) {
    return (
      <div className="re-shell re-shell--ancho" style={{ textAlign: 'center' }}>
        <Sky size={72} pose="estudiando" animado />
      </div>
    )
  }

  return (
    <div className="re-shell re-shell--ancho">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1.5rem' }}>
        <h1 className="re-titulo-pagina" style={{ margin: 0 }}>Panel de líder</h1>
        <Sky size={56} pose="relajado" animado={false} />
      </div>

      {pausado && (
        <div className="re-card re-pausa-banner re-card--rojo">
          <div>
            <p className="re-pausa-banner__titulo">⏸ Currículo pausado para todos</p>
            <p className="re-pausa-banner__texto">
              Los jóvenes solo pueden ver y editar su perfil. Reactívalo desde Ajustes cuando termines.
            </p>
          </div>
          <button className="re-btn re-btn--sm" onClick={cambiarPausado}>Reactivar para todos</button>
        </div>
      )}

      {duelosPorJugar.map((d) => {
        const rivalUid = d.retadorUid === usuario.uid ? d.retadoUid : d.retadorUid
        const rival = jovenes.find((j) => j.uid === rivalUid)
        return (
          <Link key={d.id} to={`/radgen/education/duelo/${d.id}`} className="re-aviso re-aviso--duelo">
            <span className="re-aviso__icono">⚔️</span>
            <span>
              {d.retadoUid === usuario.uid ? (
                <>
                  <strong>{rival?.apodo || rival?.nombre || 'Un joven'}</strong> te retó a un duelo. ¡Demuéstrale quién
                  manda!
                </>
              ) : (
                <>
                  Tu duelo contra <strong>{rival?.apodo || rival?.nombre || 'un joven'}</strong> está listo para jugar.
                </>
              )}
            </span>
            <span className="re-aviso__flecha">→</span>
          </Link>
        )
      })}

      <ActividadReciente actividad={actividad} onReaccionar={reaccionar} />

      <div className="re-tabs re-tabs--lider">
        {TABS.map(([valor, etiqueta]) => (
          <button
            key={valor}
            type="button"
            className={`re-tab ${tab === valor ? 'activo' : ''}`}
            onClick={() => cambiarTab(valor)}
          >
            {etiqueta}
            {valor === 'notas' && pendientes.length > 0 && ` (${pendientes.length})`}
          </button>
        ))}
      </div>

      <select
        className="re-input re-tabs-select"
        value={tab}
        onChange={(e) => cambiarTab(e.target.value)}
      >
        {TABS.map(([valor, etiqueta]) => (
          <option key={valor} value={valor}>
            {etiqueta}{valor === 'notas' && pendientes.length > 0 ? ` (${pendientes.length})` : ''}
          </option>
        ))}
      </select>

      {tab === 'cursos' && <PanelCursos series={series} lecciones={lecciones} refrescarLecciones={refrescarLecciones} />}

      {tab === 'asignar' && (
        <>
          <PanelAsignar usuario={usuario} jovenes={jovenes} lecciones={leccionesActivas} series={series} refrescar={refrescar} />
          <PanelAsignacionPersonal usuario={usuario} jovenes={jovenes} />
        </>
      )}

      {tab === 'seguimiento' && <PanelSeguimiento jovenes={jovenes} tabla={tabla} ranking={ranking} />}

      {tab === 'elegibilidad' && (
        <PanelElegibilidad
          elegibilidadPorJoven={elegibilidadPorJoven}
          lecciones={leccionesActivas}
          requisitos={requisitos}
          cambiarRequisito={cambiarRequisito}
        />
      )}

      {tab === 'notas' && (
        <PanelNotasYPreguntas
          usuario={usuario}
          jovenes={jovenes}
          pendientes={pendientes}
          refrescarPendientes={refrescarPendientes}
        />
      )}

      {tab === 'experiencia' && xpConfig && (
        <PanelExperiencia
          usuario={usuario}
          jovenes={jovenes}
          ranking={ranking}
          equipos={equipos}
          setEquipos={setEquipos}
          xpConfig={xpConfig}
          guardarXpConfig={guardarXpConfig}
        />
      )}

      {tab === 'ajustes' && (
        <PanelAjustes
          pausado={pausado}
          cambiarPausado={cambiarPausado}
          mostrarRanking={mostrarRanking}
          cambiarVisibilidadRanking={cambiarVisibilidadRanking}
          mostrarElegibilidad={mostrarElegibilidad}
          cambiarVisibilidadElegibilidad={cambiarVisibilidadElegibilidad}
          pausas={pausas}
          cambiarPausa={cambiarPausa}
        />
      )}
    </div>
  )
}
