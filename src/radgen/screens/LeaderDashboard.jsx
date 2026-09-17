import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
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
  getRankingCampamento,
  getRequisitos,
  toggleRequisito,
  getInsigniasDe,
  getMostrarElegibilidadAJovenes,
  setMostrarElegibilidadAJovenes,
  getNotasDe,
  agregarNota,
  eliminarNota,
  getComentariosPendientes,
  responderComentario,
  asignarTareaPersonal,
  observarModoPreRegistro,
  setModoPreRegistro,
  getMostrarRankingAJovenes,
  setMostrarRankingAJovenes,
  getActividadReciente,
  reaccionarActividad,
  getXpConfig,
  setXpConfig,
  getExperienciaRanking,
} from '../store'
import Sky from '../components/Sky'
import Avatar from '../components/Avatar'
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
  ['ranking', 'Ranking'],
  ['experiencia', 'Experiencia'],
]

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

// Puramente presentacional — recibe ya calculados los datos del joven
// (vienen de `ranking` y `tabla`, que el panel padre ya cargó una sola vez).
function TarjetaPersona({ joven, totalCompletadas, totalAsignaciones, nivelActual, racha, pendientes }) {
  return (
    <Link to={`/radgen/education/lider/joven/${joven.uid}`} className="re-persona-card">
      <div className="re-persona-card__cabecera">
        <div className="re-persona-card__identidad">
          <Avatar nombre={joven.nombre} foto={joven.fotoPerfil} uid={joven.uid} size={40} />
          <p className="re-persona-card__nombre">{joven.nombre}</p>
        </div>
        <span className="re-leccion-item__flecha" aria-hidden="true">→</span>
      </div>

      <p className="re-persona-card__resumen">
        {totalCompletadas} de {totalAsignaciones} cápsula{totalAsignaciones === 1 ? '' : 's'} completada{totalCompletadas === 1 ? '' : 's'}
      </p>

      <div className="re-persona-card__chips">
        {nivelActual ? (
          <span className="re-badge re-badge--completado">{nivelActual.icono} {nivelActual.nombre}</span>
        ) : (
          <span className="re-badge re-badge--pendiente">Sin rango aún</span>
        )}
        {racha > 0 && <span className="re-badge re-badge--completado">🔥 {racha}</span>}
        {pendientes > 0 && <span className="re-badge re-badge--pendiente">{pendientes} pendiente{pendientes === 1 ? '' : 's'}</span>}
      </div>
    </Link>
  )
}

function PanelSeguimiento({ jovenes, tabla, ranking }) {
  return (
    <div className="re-card re-card--rojo">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <h2 className="re-subtitulo" style={{ margin: 0 }}>Estado por joven</h2>
        <button className="re-btn re-btn--sm" onClick={() => exportarEstadoCsv(tabla)}>
          ⬇ Exportar CSV
        </button>
      </div>

      <div className="re-personas-grid">
        {jovenes.map((j) => {
          const deEsteJoven = tabla.filter((f) => f.asignadoA === j.uid)
          const filaRanking = ranking.find((r) => r.joven.uid === j.uid)
          const pendientes = deEsteJoven.filter((f) => f.estado !== 'completado').length
          return (
            <TarjetaPersona
              key={j.uid}
              joven={j}
              totalCompletadas={filaRanking?.totalCompletadas || 0}
              totalAsignaciones={deEsteJoven.length}
              nivelActual={filaRanking?.nivelActual || null}
              racha={filaRanking?.racha || 0}
              pendientes={pendientes}
            />
          )
        })}
      </div>

      {jovenes.length === 0 && <p style={{ opacity: 0.6 }}>Todavía no hay jóvenes registrados.</p>}
    </div>
  )
}

function PanelElegibilidad({ elegibilidadPorJoven, lecciones, requisitos, cambiarRequisito, mostrarElegibilidad, cambiarVisibilidadElegibilidad }) {
  return (
    <>
      <div className="re-card">
        <h2 className="re-subtitulo">Elegibilidad para servir</h2>
        <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.75 }}>
          Quién ya cumple los requisitos para tomarse en cuenta en voluntariado o viajes misioneros.
          Esta tabla siempre la ves tú; el interruptor decide si los jóvenes también la ven en su perfil.
        </p>

        <button
          type="button"
          className={`re-switch ${mostrarElegibilidad ? 'activo' : ''}`}
          onClick={cambiarVisibilidadElegibilidad}
          style={{ marginBottom: 20 }}
        >
          <span className="re-switch__perilla" />
          <span>{mostrarElegibilidad ? 'Los jóvenes SÍ ven su elegibilidad' : 'Los jóvenes NO ven su elegibilidad'}</span>
        </button>

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
            <button
              className="re-btn re-btn--sm"
              onClick={() => responder(asignacionId, comentario.id)}
              disabled={!(respuestas[comentario.id] || '').trim()}
            >
              Responder
            </button>
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

function PanelRanking({ ranking, mostrarRanking, cambiarVisibilidadRanking }) {
  return (
    <div className="re-card re-card--rojo">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <h2 className="re-subtitulo" style={{ margin: 0 }}>Ranking para el campamento</h2>
        <Link to="/radgen/education/proyector" target="_blank" className="re-btn re-btn--sm">
          🖥️ Modo proyector
        </Link>
      </div>

      <button
        type="button"
        className={`re-switch ${mostrarRanking ? 'activo' : ''}`}
        onClick={cambiarVisibilidadRanking}
        style={{ marginBottom: 20 }}
      >
        <span className="re-switch__perilla" />
        <span>{mostrarRanking ? 'Los jóvenes SÍ ven este ranking' : 'Los jóvenes NO ven este ranking'}</span>
      </button>

      <div className="re-tabla-wrap">
        <table className="re-tabla">
          <thead>
            <tr>
              <th>#</th>
              <th>Joven</th>
              <th>Cápsulas completadas</th>
              <th>Racha</th>
              <th>Rango</th>
              <th>Insignias totales</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((fila, i) => (
              <tr key={fila.joven.uid}>
                <td>{i + 1}</td>
                <td>
                  <Link
                    to={`/radgen/education/lider/joven/${fila.joven.uid}`}
                    className="re-vinculo re-vinculo--nombre"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                  >
                    <Avatar nombre={fila.joven.nombre} foto={fila.joven.fotoPerfil} uid={fila.joven.uid} size={26} />
                    {fila.joven.nombre}
                  </Link>
                </td>
                <td>{fila.totalCompletadas}</td>
                <td>{fila.racha > 0 ? `🔥 ${fila.racha}` : '—'}</td>
                <td>{fila.nivelActual ? `${fila.nivelActual.icono} ${fila.nivelActual.nombre}` : '—'}</td>
                <td>{fila.insigniasTotal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const CAMPOS_XP = [
  ['porLeccionCompletada', 'Por cápsula completada'],
  ['porQuizCorrecta', 'Por respuesta correcta del quiz'],
  ['porRachaSemana', 'Por cada semana de racha'],
  ['porInsigniaManual', 'Por cada insignia especial otorgada'],
  ['xpPorNivel', 'XP necesaria para subir de nivel'],
]

function PanelExperiencia({ xpConfig, guardarXpConfig, expRanking }) {
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
    <>
      <div className="re-card">
        <h2 className="re-subtitulo">Cuánto vale cada cosa</h2>
        <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.75 }}>
          Ajusta cuánta experiencia (XP) da cada acción. Se recalcula sola para todos, sin perder historial.
        </p>
        {CAMPOS_XP.map(([campo, etiqueta]) => (
          <div key={campo} style={{ marginBottom: 14 }}>
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
        <button className="re-btn re-btn--lleno" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar valores'}
        </button>
        {mensaje && <span style={{ marginLeft: 12, fontWeight: 700 }}>{mensaje}</span>}
      </div>

      <div className="re-card re-card--rojo">
        <h2 className="re-subtitulo">Ranking por experiencia</h2>
        <div className="re-tabla-wrap">
          <table className="re-tabla">
            <thead>
              <tr>
                <th>#</th>
                <th>Joven</th>
                <th>Nivel</th>
                <th>XP total</th>
              </tr>
            </thead>
            <tbody>
              {expRanking.map((fila, i) => (
                <tr key={fila.joven.uid}>
                  <td>{i + 1}</td>
                  <td>
                    <Link
                      to={`/radgen/education/lider/joven/${fila.joven.uid}`}
                      className="re-vinculo re-vinculo--nombre"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                    >
                      <Avatar nombre={fila.joven.nombre} foto={fila.joven.fotoPerfil} uid={fila.joven.uid} size={26} />
                      {fila.joven.nombre}
                    </Link>
                  </td>
                  <td>{fila.experiencia.nivel}</td>
                  <td>{fila.experiencia.xpTotal}</td>
                </tr>
              ))}
              {expRanking.length === 0 && (
                <tr>
                  <td colSpan={4}>Todavía no hay jóvenes registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
  const location = useLocation()
  const [tab, setTab] = useState(location.state?.tab || 'asignar')
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
  const [elegibilidadPorJoven, setElegibilidadPorJoven] = useState([])
  const [preRegistro, setPreRegistro] = useState(true)
  const [actividad, setActividad] = useState([])
  const [xpConfig, setXpConfigState] = useState(null)
  const [expRanking, setExpRanking] = useState([])

  useEffect(() => {
    const unsub = observarModoPreRegistro(setPreRegistro)
    return unsub
  }, [])

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
      getRankingCampamento(),
      getRequisitos(),
      getMostrarElegibilidadAJovenes(),
      getMostrarRankingAJovenes(),
      getComentariosPendientes(),
      getXpConfig(),
      getExperienciaRanking(),
    ]).then(async ([js, ls, la, se, tb, rk, rq, me, mr, pd, xc, er]) => {
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
      setExpRanking(er)
      const elegibilidad = await Promise.all(js.map(async (j) => ({ joven: j, insignias: await getInsigniasDe(j.uid) })))
      setElegibilidadPorJoven(elegibilidad)
      setCargando(false)
    })
  }, [])

  async function reaccionar(asignacionId, emoji) {
    await reaccionarActividad({ asignacionId, emoji })
    setActividad(await getActividadReciente())
  }

  async function refrescar() {
    const [tb, rk, ac] = await Promise.all([getTablaEstado(), getRankingCampamento(), getActividadReciente()])
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
    setExpRanking(await getExperienciaRanking())
  }

  async function refrescarPendientes() {
    setPendientes(await getComentariosPendientes())
  }

  async function cambiarPreRegistro() {
    await setModoPreRegistro(!preRegistro)
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

      <div className={`re-card re-preregistro-banner ${preRegistro ? 're-card--rojo' : ''}`}>
        <div>
          <p className="re-preregistro-banner__titulo">
            {preRegistro ? '🔒 Modo pre-registro activado' : '✅ Currículo visible para todos'}
          </p>
          <p className="re-preregistro-banner__texto">
            {preRegistro
              ? 'Los jóvenes pueden registrarse y personalizar su perfil, pero todavía no ven lecciones ni asignaciones.'
              : 'Los jóvenes ya ven sus lecciones y asignaciones con normalidad.'}
          </p>
        </div>
        <button className="re-btn re-btn--sm" onClick={cambiarPreRegistro}>
          {preRegistro ? 'Activar lecciones para todos' : 'Volver a modo pre-registro'}
        </button>
      </div>

      <ActividadReciente actividad={actividad} onReaccionar={reaccionar} />

      <div className="re-tabs re-tabs--lider">
        {TABS.map(([valor, etiqueta]) => (
          <button
            key={valor}
            type="button"
            className={`re-tab ${tab === valor ? 'activo' : ''}`}
            onClick={() => setTab(valor)}
          >
            {etiqueta}
            {valor === 'notas' && pendientes.length > 0 && ` (${pendientes.length})`}
          </button>
        ))}
      </div>

      <select
        className="re-input re-tabs-select"
        value={tab}
        onChange={(e) => setTab(e.target.value)}
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
          mostrarElegibilidad={mostrarElegibilidad}
          cambiarVisibilidadElegibilidad={cambiarVisibilidadElegibilidad}
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

      {tab === 'ranking' && (
        <PanelRanking
          ranking={ranking}
          mostrarRanking={mostrarRanking}
          cambiarVisibilidadRanking={cambiarVisibilidadRanking}
        />
      )}

      {tab === 'experiencia' && xpConfig && (
        <PanelExperiencia xpConfig={xpConfig} guardarXpConfig={guardarXpConfig} expRanking={expRanking} />
      )}
    </div>
  )
}
