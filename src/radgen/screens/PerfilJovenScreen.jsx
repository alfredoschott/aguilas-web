import { useNavigate, useParams } from 'react-router-dom'
import {
  getJovenPorUid,
  getAsignacionesDe,
  getInsigniasDe,
  getRachaSemanas,
  getNotasDe,
  agregarNota,
  eliminarNota,
  getTareasDe,
  alternarTareaPersonal,
  eliminarTareaPersonal,
  eliminarAsignacion,
  revertirCompletado,
} from '../store'
import { useState } from 'react'
import Sky from '../components/Sky'
import Avatar from '../components/Avatar'
import TareaPersonal from '../components/TareaPersonal'
import Toast from '../components/Toast'
import { useBorrador } from '../hooks/useBorrador'
import useEliminarConDeshacer from '../hooks/useEliminarConDeshacer'

export default function PerfilJovenScreen({ usuario }) {
  const { uid } = useParams()
  const navigate = useNavigate()
  const joven = getJovenPorUid(uid)

  const [textoNota, setTextoNota, limpiarBorradorNota] = useBorrador(`nota-perfil:${uid}`)
  const [notas, setNotas] = useState(() => getNotasDe(uid))
  const [tareas, setTareas] = useState(() => getTareasDe(uid))
  const [asignaciones, setAsignaciones] = useState(() => getAsignacionesDe(uid))

  const { pendiente: notaPendiente, solicitar: solicitarEliminarNota, deshacer: deshacerEliminarNota } =
    useEliminarConDeshacer({
      lista: notas,
      setLista: setNotas,
      eliminar: (notaId) => eliminarNota({ jovenUid: uid, notaId }),
    })

  const { pendiente: tareaPendiente, solicitar: solicitarEliminarTarea, deshacer: deshacerEliminarTarea } =
    useEliminarConDeshacer({
      lista: tareas,
      setLista: setTareas,
      eliminar: (tareaId) => eliminarTareaPersonal({ jovenUid: uid, tareaId }),
    })

  const { pendiente: asignacionPendiente, solicitar: solicitarQuitarAsignacion, deshacer: deshacerQuitarAsignacion } =
    useEliminarConDeshacer({
      lista: asignaciones,
      setLista: setAsignaciones,
      eliminar: (asignacionId) => eliminarAsignacion(asignacionId),
    })

  if (!joven) {
    return (
      <div className="re-shell">
        <div className="re-card">Este joven no existe.</div>
        <button className="re-btn" onClick={() => navigate('/radgen/education/lider')}>
          ← Volver al panel
        </button>
      </div>
    )
  }

  const insignias = getInsigniasDe(uid)
  const racha = getRachaSemanas(uid)
  const mensajePendiente = notaPendiente?.mensaje || tareaPendiente?.mensaje || asignacionPendiente?.mensaje
  const deshacerPendiente = notaPendiente
    ? deshacerEliminarNota
    : tareaPendiente
      ? deshacerEliminarTarea
      : deshacerQuitarAsignacion

  function guardarNota() {
    if (!textoNota.trim()) return
    setNotas(agregarNota({ jovenUid: uid, texto: textoNota.trim(), liderUid: usuario.uid }))
    limpiarBorradorNota()
  }

  function toggleTarea(tareaId) {
    setTareas(alternarTareaPersonal({ jovenUid: uid, tareaId }))
  }

  function revertir(asignacionId) {
    revertirCompletado(asignacionId)
    setAsignaciones(getAsignacionesDe(uid))
  }

  return (
    <div className="re-shell re-shell--ancho">
      <button className="re-vinculo" style={{ marginBottom: 16 }} onClick={() => navigate('/radgen/education/lider')}>
        ← Volver al panel
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <Avatar nombre={joven.nombre} uid={joven.uid} size={56} />
        <h1 className="re-titulo-pagina" style={{ margin: 0, flex: '1 1 200px' }}>{joven.nombre}</h1>
        <Sky size={56} pose={insignias.nivelActual ? 'logrado' : 'relajado'} animado={false} />
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div className="re-racha">
          {insignias.nivelActual ? `${insignias.nivelActual.icono} ${insignias.nivelActual.nombre}` : 'Sin rango aún'}
        </div>
        {racha > 0 && (
          <div className="re-racha">🔥 {racha} semana{racha === 1 ? '' : 's'} seguida{racha === 1 ? '' : 's'}</div>
        )}
        <div className="re-racha">{insignias.totalCompletadas} cápsula{insignias.totalCompletadas === 1 ? '' : 's'} completada{insignias.totalCompletadas === 1 ? '' : 's'}</div>
      </div>

      <div className="re-card">
        <h2 className="re-subtitulo">Elegibilidad</h2>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <p style={{ margin: 0 }}>
            Voluntariado:{' '}
            <span className={`re-badge ${insignias.elegibilidad.voluntariado.apto ? 're-badge--completado' : 're-badge--pendiente'}`}>
              {insignias.elegibilidad.voluntariado.apto ? 'Apto' : 'No apto'}
            </span>
          </p>
          <p style={{ margin: 0 }}>
            Misiones:{' '}
            <span className={`re-badge ${insignias.elegibilidad.misiones.apto ? 're-badge--completado' : 're-badge--pendiente'}`}>
              {insignias.elegibilidad.misiones.apto ? 'Apto' : 'No apto'}
            </span>
          </p>
        </div>
      </div>

      <div className="re-card">
        <h2 className="re-subtitulo">Historial de lecciones</h2>
        <div className="re-tabla-wrap">
          <table className="re-tabla">
            <thead>
              <tr>
                <th>Lección</th>
                <th>Estado</th>
                <th>Completada</th>
                <th>Quiz</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {asignaciones.map((a) => (
                <tr key={a.id}>
                  <td>{a.leccion?.titulo}</td>
                  <td>
                    <span className={`re-badge ${a.estado === 'completado' ? 're-badge--completado' : 're-badge--pendiente'}`}>
                      {a.estado === 'completado' ? 'Completado' : 'Pendiente'}
                    </span>
                  </td>
                  <td>{a.fechaCompletado ? new Date(a.fechaCompletado).toLocaleDateString('es-MX') : '—'}</td>
                  <td>{a.quizScore ? `${a.quizScore.correctas}/${a.quizScore.total}` : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {a.estado === 'completado' && (
                        <button className="re-vinculo" style={{ fontSize: '0.75rem' }} onClick={() => revertir(a.id)}>
                          ↺ Marcar pendiente
                        </button>
                      )}
                      <button
                        className="re-vinculo"
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => solicitarQuitarAsignacion(a, 'Asignación quitada.')}
                      >
                        Quitar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {asignaciones.length === 0 && (
                <tr>
                  <td colSpan={5}>Todavía no tiene lecciones asignadas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="re-card">
        <h2 className="re-subtitulo">Tareas individuales (1:1)</h2>
        <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.75 }}>
          Lo que le has dejado fuera del currículo. Se asignan desde la pestaña "Asignar".
        </p>
        {tareas.length === 0 && <p style={{ opacity: 0.6 }}>Todavía no tiene tareas individuales.</p>}
        {tareas.map((t) => (
          <TareaPersonal
            key={t.id}
            tarea={t}
            onToggle={toggleTarea}
            onEliminar={() => solicitarEliminarTarea(t, 'Tarea eliminada.')}
          />
        ))}
      </div>

      <div className="re-card">
        <h2 className="re-subtitulo">Notas privadas</h2>
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
          {notas.length === 0 && <p style={{ opacity: 0.6 }}>Todavía no hay notas.</p>}
          {notas.map((n) => (
            <div key={n.id} className="re-nota">
              <div className="re-nota__fecha">{new Date(n.fecha).toLocaleDateString('es-MX')}</div>
              <p style={{ margin: 0 }}>{n.texto}</p>
              <button
                className="re-vinculo"
                style={{ marginTop: 6, fontSize: '0.75rem' }}
                onClick={() => solicitarEliminarNota(n, 'Nota eliminada.')}
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      </div>

      <Toast mensaje={mensajePendiente} onDeshacer={deshacerPendiente} />
    </div>
  )
}
