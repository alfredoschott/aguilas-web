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
  getInsigniasManualesDe,
  otorgarInsigniaManual,
  quitarInsigniaManual,
  getExperienciaDe,
} from '../store'
import { useEffect, useState } from 'react'
import Sky from '../components/Sky'
import Avatar from '../components/Avatar'
import RachaBadge from '../components/RachaBadge'
import TareaPersonal from '../components/TareaPersonal'
import Toast from '../components/Toast'
import { useBorrador } from '../hooks/useBorrador'
import useEliminarConDeshacer from '../hooks/useEliminarConDeshacer'
import { generarCertificado, compartirCertificado } from '../utils/certificado'

export default function PerfilJovenScreen({ usuario }) {
  const { uid } = useParams()
  const navigate = useNavigate()

  const [joven, setJoven] = useState(undefined) // undefined = cargando
  const [insignias, setInsignias] = useState(null)
  const [racha, setRacha] = useState(0)
  const [textoNota, setTextoNota, limpiarBorradorNota] = useBorrador(`nota-perfil:${uid}`)
  const [notas, setNotas] = useState([])
  const [tareas, setTareas] = useState([])
  const [asignaciones, setAsignaciones] = useState([])
  const [insigniasManuales, setInsigniasManuales] = useState([])
  const [experiencia, setExperiencia] = useState(null)
  const [otorgando, setOtorgando] = useState('')
  const [motivos, setMotivos] = useState({})

  useEffect(() => {
    Promise.all([
      getJovenPorUid(uid),
      getInsigniasDe(uid),
      getRachaSemanas(uid),
      getNotasDe(uid),
      getTareasDe(uid),
      getAsignacionesDe(uid),
      getInsigniasManualesDe(uid),
      getExperienciaDe(uid),
    ]).then(([j, i, r, n, t, a, im, exp]) => {
      setJoven(j)
      setInsignias(i)
      setRacha(r)
      setNotas(n)
      setTareas(t)
      setAsignaciones(a)
      setInsigniasManuales(im)
      setExperiencia(exp)
    })
  }, [uid])

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

  if (joven === undefined) {
    return (
      <div className="re-shell" style={{ textAlign: 'center' }}>
        <Sky size={72} pose="estudiando" animado />
      </div>
    )
  }

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

  const mensajePendiente = notaPendiente?.mensaje || tareaPendiente?.mensaje || asignacionPendiente?.mensaje
  const deshacerPendiente = notaPendiente
    ? deshacerEliminarNota
    : tareaPendiente
      ? deshacerEliminarTarea
      : deshacerQuitarAsignacion

  async function guardarNota() {
    if (!textoNota.trim()) return
    setNotas(await agregarNota({ jovenUid: uid, texto: textoNota.trim(), liderUid: usuario.uid }))
    limpiarBorradorNota()
  }

  async function toggleTarea(tareaId) {
    setTareas(await alternarTareaPersonal({ jovenUid: uid, tareaId }))
  }

  async function revertir(asignacionId) {
    await revertirCompletado(asignacionId)
    setAsignaciones(await getAsignacionesDe(uid))
    setInsignias(await getInsigniasDe(uid))
  }

  async function otorgar(tipo) {
    setOtorgando(tipo)
    try {
      setInsigniasManuales(
        await otorgarInsigniaManual({ jovenUid: uid, tipo, liderUid: usuario.uid, motivo: motivos[tipo] }),
      )
      setExperiencia(await getExperienciaDe(uid))
      setMotivos((prev) => ({ ...prev, [tipo]: '' }))
    } finally {
      setOtorgando('')
    }
  }

  async function quitarUltima(registroId) {
    setInsigniasManuales(await quitarInsigniaManual({ jovenUid: uid, registroId }))
    setExperiencia(await getExperienciaDe(uid))
  }

  async function descargarCertificadoManual(b) {
    const dataUrl = await generarCertificado({
      nombreJoven: joven.nombre,
      logro: b.nombre,
      motivo: b.ultimoMotivo || undefined,
      imagenUrl: b.imagen,
    })
    await compartirCertificado({
      dataUrl,
      nombreArchivo: `certificado-${b.id}-${joven.nombre.toLowerCase().replace(/\s+/g, '-')}.png`,
      titulo: '¡Insignia especial en RadGen Education!',
      texto: `${joven.nombre} recibió la insignia "${b.nombre}" en RadGen Education 🙌`,
    })
  }

  return (
    <div className="re-shell re-shell--ancho">
      <button className="re-vinculo re-vinculo--volver" style={{ marginBottom: 16 }} onClick={() => navigate('/radgen/education/lider')}>
        ← Volver al panel
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <Avatar nombre={joven.nombre} foto={joven.fotoPerfil} uid={joven.uid} size={56} />
        <h1 className="re-titulo-pagina" style={{ margin: 0, flex: '1 1 200px' }}>{joven.nombre}</h1>
        <Sky size={56} pose={insignias.nivelActual ? 'logrado' : 'relajado'} animado={false} />
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div className="re-racha">
          {insignias.nivelActual ? `${insignias.nivelActual.icono} ${insignias.nivelActual.nombre}` : 'Sin rango aún'}
        </div>
        <RachaBadge semanas={racha} />
        <div className="re-racha">{insignias.totalCompletadas} cápsula{insignias.totalCompletadas === 1 ? '' : 's'} completada{insignias.totalCompletadas === 1 ? '' : 's'}</div>
        {experiencia && <div className="re-racha">Nivel {experiencia.nivel} · {experiencia.xpTotal} XP</div>}
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
        <h2 className="re-subtitulo">Insignias especiales</h2>
        <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.75 }}>
          Estas no se desbloquean solas — se las otorgas tú en persona.
        </p>
        <div className="re-medallas-grid re-medallas-grid--otorgar">
          {insigniasManuales.map((b) => (
            <div key={b.id} className={`re-medalla ${b.desbloqueada ? '' : 're-medalla--bloqueada'}`}>
              <div className="re-medalla__icono">
                {b.desbloqueada ? <img src={b.imagen} alt="" className="re-medalla__imagen" /> : '🔒'}
              </div>
              <p className="re-medalla__nombre">{b.nombre}</p>
              {b.veces > 1 && <p className="re-medalla__progreso">{b.veces} veces</p>}
              {b.ultimoMotivo && <p className="re-medalla__progreso">"{b.ultimoMotivo}"</p>}

              <textarea
                className="re-input"
                rows={2}
                placeholder="¿Por qué se la otorgas? (opcional)"
                value={motivos[b.id] || ''}
                onChange={(e) => setMotivos((prev) => ({ ...prev, [b.id]: e.target.value }))}
                style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '0.75rem', marginTop: 8, marginBottom: 8 }}
              />

              <button
                type="button"
                className="re-medalla__certificado"
                onClick={() => otorgar(b.id)}
                disabled={otorgando === b.id}
              >
                {otorgando === b.id ? 'Otorgando…' : '+ Otorgar'}
              </button>
              {b.desbloqueada && (
                <button
                  type="button"
                  className="re-medalla__certificado"
                  style={{ marginTop: 6 }}
                  onClick={() => descargarCertificadoManual(b)}
                >
                  🎓 Certificado
                </button>
              )}
              {b.registros[0] && (
                <button
                  type="button"
                  className="re-medalla__certificado"
                  style={{ marginTop: 6 }}
                  onClick={() => quitarUltima(b.registros[0].id)}
                >
                  Quitar la última
                </button>
              )}
            </div>
          ))}
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
                <th>Reto</th>
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
                    {a.leccion?.reto ? (
                      <span className={`re-badge ${a.retoCumplido ? 're-badge--completado' : 're-badge--pendiente'}`}>
                        {a.retoCumplido ? '🎯 Cumplido' : 'Sin cumplir'}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                      {a.estado === 'completado' && (
                        <button className="re-vinculo" onClick={() => revertir(a.id)}>
                          ↺ Pendiente
                        </button>
                      )}
                      <button
                        className="re-vinculo re-vinculo--peligro"
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
                  <td colSpan={6}>Todavía no tiene lecciones asignadas.</td>
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

      <Toast mensaje={mensajePendiente} onDeshacer={deshacerPendiente} />
    </div>
  )
}
