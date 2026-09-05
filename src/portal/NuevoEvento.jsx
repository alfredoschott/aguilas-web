import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, updateDoc, getDocs, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { usePortalAuth } from './PortalAuthContext'
import { buscarConflictos } from './conflictos'
import { registrarActividad } from './actividad'
import { crearNotificacion } from './notificaciones'
import { fetchConAuth } from './authFetch'
import './portal.css'

const UBICACIONES = ['Águilas CFC Tizayuca', 'Salón de niños', 'Oficina pastoral', 'Virtual', 'Otro']

function eventoVacio() {
  return {
    id: Math.random().toString(36).slice(2),
    titulo: '',
    descripcion: '',
    fecha: '',
    fechaFin: '',
    horaInicio: '',
    horaFin: '',
    ubicacion: '',
    ubicacionOtro: '',
    responsable: '',
    ministerioOrganizador: '',
    ministeriosRequeridos: [],
    mostrarChecklist: false,
  }
}

function ubicacionFinal(ev) {
  return ev.ubicacion === 'Otro' ? (ev.ubicacionOtro.trim() || 'Otro') : ev.ubicacion
}

function estadosIniciales(ministeriosRequeridos) {
  const mapa = {}
  ministeriosRequeridos.forEach((id) => {
    mapa[id] = 'pendiente'
  })
  return mapa
}

export default function NuevoEvento() {
  const navigate = useNavigate()
  const { userData, user } = usePortalAuth()

  const [ministerios, setMinisterios] = useState([])
  const [cargandoMinisterios, setCargandoMinisterios] = useState(true)
  const [eventos, setEventos] = useState([eventoVacio()])
  const [guardando, setGuardando] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [error, setError] = useState(null)
  const [conflictosPorEvento, setConflictosPorEvento] = useState({})
  const [ignorarConflictos, setIgnorarConflictos] = useState(false)

  useEffect(() => {
    async function cargarMinisterios() {
      const snap = await getDocs(collection(db, 'ministerios'))
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      lista.sort((a, b) => a.nombre.localeCompare(b.nombre))
      setMinisterios(lista)
      setCargandoMinisterios(false)
    }
    cargarMinisterios()
  }, [])

  function actualizarEvento(id, campo, valor) {
    setEventos((prev) => prev.map((ev) => (ev.id === id ? { ...ev, [campo]: valor } : ev)))
    setConflictosPorEvento({})
    setIgnorarConflictos(false)
  }

  function toggleMinisterioRequerido(id, ministerioId) {
    setEventos((prev) =>
      prev.map((ev) => {
        if (ev.id !== id) return ev
        const yaEsta = ev.ministeriosRequeridos.includes(ministerioId)
        return {
          ...ev,
          ministeriosRequeridos: yaEsta
            ? ev.ministeriosRequeridos.filter((m) => m !== ministerioId)
            : [...ev.ministeriosRequeridos, ministerioId],
        }
      })
    )
  }

  function toggleChecklist(id) {
    setEventos((prev) => prev.map((ev) => (ev.id === id ? { ...ev, mostrarChecklist: !ev.mostrarChecklist } : ev)))
  }

  function agregarEvento() {
    setEventos((prev) => [...prev, eventoVacio()])
  }

  function quitarEvento(id) {
    setEventos((prev) => (prev.length === 1 ? prev : prev.filter((ev) => ev.id !== id)))
  }

  function duplicarEvento(id) {
    setEventos((prev) => {
      const original = prev.find((ev) => ev.id === id)
      if (!original) return prev
      const copia = { ...original, id: Math.random().toString(36).slice(2), fecha: '', fechaFin: '' }
      const idx = prev.findIndex((ev) => ev.id === id)
      const nuevos = [...prev]
      nuevos.splice(idx + 1, 0, copia)
      return nuevos
    })
  }

  async function crearTodos() {
    setGuardando(true)
    setProgreso(0)
    const validos = eventos.filter((ev) => ev.titulo.trim() && ev.fecha && ev.horaInicio && ev.ministerioOrganizador)

    for (let i = 0; i < validos.length; i++) {
      const ev = validos[i]
      const ubicacion = ubicacionFinal(ev)
      const fechaFin = ev.fechaFin || ev.fecha
      try {
        const docRef = await addDoc(collection(db, 'eventos_internos'), {
          titulo: ev.titulo.trim(),
          descripcion: ev.descripcion,
          fecha: ev.fecha,
          fechaFin,
          horaInicio: ev.horaInicio,
          horaFin: ev.horaFin,
          ubicacion,
          responsable: ev.responsable,
          ministerioOrganizador: ev.ministerioOrganizador,
          ministeriosRequeridos: ev.ministeriosRequeridos,
          estadosPorMinisterio: estadosIniciales(ev.ministeriosRequeridos),
          estado: 'pendiente',
          googleEventId: null,
          creadoPor: user.email,
          creadoPorNombre: userData?.nombre || user.email,
          createdAt: serverTimestamp(),
        })

        try {
          const respuesta = await fetchConAuth('/api/crear-evento-calendario', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              titulo: ev.titulo.trim(),
              descripcion: ev.descripcion,
              fecha: ev.fecha,
              fechaFin,
              horaInicio: ev.horaInicio,
              horaFin: ev.horaFin,
              ubicacion,
            }),
          })
          if (respuesta.ok) {
            const data = await respuesta.json()
            await updateDoc(docRef, { googleEventId: data.googleEventId })
          }
        } catch (calendarErr) {
          console.warn('Error de red al sincronizar con Google Calendar:', calendarErr)
        }

        for (const ministerioId of ev.ministeriosRequeridos) {
          await crearNotificacion({
            ministerioId,
            eventoId: docRef.id,
            eventoTitulo: ev.titulo.trim(),
            creadoPor: userData?.nombre || user.email,
          })
        }
      } catch (err) {
        console.error('Error creando evento:', err)
      }
      setProgreso(i + 1)
    }

    await registrarActividad({
      tipo: 'crear',
      descripcion: validos.length === 1
        ? `${userData?.nombre || user.email} creó el evento "${validos[0].titulo}"`
        : `${userData?.nombre || user.email} creó ${validos.length} eventos`,
      usuarioEmail: user.email,
      usuarioNombre: userData?.nombre || user.email,
    })

    navigate('/lideres/dashboard')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const validos = eventos.filter((ev) => ev.titulo.trim() && ev.fecha && ev.horaInicio && ev.ministerioOrganizador)
    if (validos.length === 0) {
      setError('Llena al menos un evento con título, fecha, hora de inicio y ministerio organizador.')
      return
    }

    const fechaFinInvalida = validos.find((ev) => ev.fechaFin && ev.fechaFin < ev.fecha)
    if (fechaFinInvalida) {
      setError(`En "${fechaFinInvalida.titulo}", la fecha de fin no puede ser antes que la fecha de inicio.`)
      return
    }

    if (!ignorarConflictos) {
      setGuardando(true)
      const conflictosEncontrados = {}
      for (const ev of validos) {
        const encontrados = await buscarConflictos({
          fecha: ev.fecha,
          fechaFin: ev.fechaFin || ev.fecha,
          horaInicio: ev.horaInicio,
          horaFin: ev.horaFin,
          ubicacion: ubicacionFinal(ev),
        })
        if (encontrados.length > 0) conflictosEncontrados[ev.id] = encontrados
      }
      setGuardando(false)

      if (Object.keys(conflictosEncontrados).length > 0) {
        setConflictosPorEvento(conflictosEncontrados)
        return
      }
    }

    await crearTodos()
  }

  const totalValidos = eventos.filter((ev) => ev.titulo.trim() && ev.fecha && ev.horaInicio && ev.ministerioOrganizador).length
  const hayConflictos = Object.keys(conflictosPorEvento).length > 0

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>{eventos.length > 1 ? 'Nuevos eventos' : 'Nuevo evento'}</h1>

        {error && <p style={styles.error}>{error}</p>}

        {hayConflictos && (
          <div style={styles.conflictoBox}>
            <p style={styles.conflictoTitulo}>⚠️ Algunos eventos chocan en horario y lugar con otros ya existentes:</p>
            {Object.entries(conflictosPorEvento).map(([evId, lista]) => {
              const evento = eventos.find((e) => e.id === evId)
              return (
                <div key={evId} style={{ marginBottom: '8px' }}>
                  <strong style={{ fontSize: '13px', color: 'var(--portal-text)' }}>{evento?.titulo}</strong>
                  <ul style={styles.conflictoLista}>
                    {lista.map((c) => (
                      <li key={c.id} style={styles.conflictoItem}>
                        {c.titulo} — {c.horaInicio}{c.horaFin ? ` a ${c.horaFin}` : ''} en {c.ubicacion}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => { setIgnorarConflictos(true); setConflictosPorEvento({}); crearTodos() }}
                className="portal-button-secondary"
                style={styles.botonGuardarDeTodosModos}
              >
                Crear de todos modos
              </button>
              <button type="button" onClick={() => setConflictosPorEvento({})} className="portal-button-secondary" style={styles.botonCancelarConflicto}>
                Revisar horarios
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {eventos.map((ev, idx) => (
              <div key={ev.id} className="portal-fade-in" style={styles.eventoCard}>
                {eventos.length > 1 && (
                  <div style={styles.eventoCardHeader}>
                    <span style={styles.eventoNumero}>Evento {idx + 1}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" onClick={() => duplicarEvento(ev.id)} className="portal-button-secondary" style={styles.botonMini}>
                        Duplicar
                      </button>
                      <button type="button" onClick={() => quitarEvento(ev.id)} className="portal-button-secondary" style={styles.botonMiniEliminar}>
                        Quitar
                      </button>
                    </div>
                  </div>
                )}

                <label style={styles.label}>
                  Título *
                  <input
                    value={ev.titulo}
                    onChange={(e) => actualizarEvento(ev.id, 'titulo', e.target.value)}
                    style={styles.input}
                  />
                </label>

                <label style={styles.label}>
                  Descripción
                  <textarea
                    value={ev.descripcion}
                    onChange={(e) => actualizarEvento(ev.id, 'descripcion', e.target.value)}
                    style={{ ...styles.input, minHeight: '60px' }}
                  />
                </label>

                <div style={styles.row}>
                  <label style={styles.label}>
                    Fecha *
                    <input
                      type="date"
                      value={ev.fecha}
                      onChange={(e) => actualizarEvento(ev.id, 'fecha', e.target.value)}
                      style={styles.input}
                    />
                  </label>
                  <label style={styles.label}>
                    Fecha fin
                    <input
                      type="date"
                      value={ev.fechaFin}
                      min={ev.fecha || undefined}
                      onChange={(e) => actualizarEvento(ev.id, 'fechaFin', e.target.value)}
                      style={styles.input}
                      placeholder="Solo si dura varios días"
                    />
                  </label>
                </div>
                {ev.fechaFin && ev.fechaFin !== ev.fecha && (
                  <p style={styles.notaVariosDias}>
                    📅 Este evento durará varios días, del {ev.fecha} al {ev.fechaFin}.
                  </p>
                )}

                <div style={styles.row}>
                  <label style={styles.label}>
                    Hora inicio *
                    <input
                      type="time"
                      value={ev.horaInicio}
                      onChange={(e) => actualizarEvento(ev.id, 'horaInicio', e.target.value)}
                      style={styles.input}
                    />
                  </label>
                  <label style={styles.label}>
                    Hora fin
                    <input
                      type="time"
                      value={ev.horaFin}
                      onChange={(e) => actualizarEvento(ev.id, 'horaFin', e.target.value)}
                      style={styles.input}
                    />
                  </label>
                </div>

                <label style={styles.label}>
                  Ubicación
                  <select
                    value={ev.ubicacion}
                    onChange={(e) => actualizarEvento(ev.id, 'ubicacion', e.target.value)}
                    style={styles.input}
                  >
                    <option value="">Selecciona un lugar</option>
                    {UBICACIONES.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </label>

                {ev.ubicacion === 'Otro' && (
                  <label style={styles.label}>
                    Especifica el lugar
                    <input
                      value={ev.ubicacionOtro}
                      onChange={(e) => actualizarEvento(ev.id, 'ubicacionOtro', e.target.value)}
                      style={styles.input}
                      placeholder="Ej. Casa de la familia Pérez"
                    />
                  </label>
                )}

                <label style={styles.label}>
                  Responsable
                  <input
                    value={ev.responsable}
                    onChange={(e) => actualizarEvento(ev.id, 'responsable', e.target.value)}
                    style={styles.input}
                  />
                </label>

                <label style={styles.label}>
                  Ministerio organizador *
                  <select
                    value={ev.ministerioOrganizador}
                    onChange={(e) => actualizarEvento(ev.id, 'ministerioOrganizador', e.target.value)}
                    style={styles.input}
                  >
                    <option value="">Selecciona uno</option>
                    {ministerios.map((m) => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                  </select>
                </label>

                <button type="button" onClick={() => toggleChecklist(ev.id)} className="portal-button-secondary" style={styles.botonToggleChecklist}>
                  {ev.mostrarChecklist ? '− Ocultar' : '+ Elegir'} ministerios requeridos
                  {ev.ministeriosRequeridos.length > 0 ? ` (${ev.ministeriosRequeridos.length})` : ''}
                </button>

                {ev.mostrarChecklist && !cargandoMinisterios && (
                  <div style={styles.checklist}>
                    {ministerios.map((m) => (
                      <label key={m.id} style={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={ev.ministeriosRequeridos.includes(m.id)}
                          onChange={() => toggleMinisterioRequerido(ev.id, m.id)}
                        />
                        <span style={{ ...styles.colorDot, background: m.color }} />
                        {m.nombre}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button type="button" onClick={agregarEvento} className="portal-button-secondary" style={styles.buttonAgregar}>
            + Agregar otro evento
          </button>

          {guardando ? (
            <p style={styles.progresoTexto}>
              {progreso > 0 ? `Creando ${progreso} de ${totalValidos}...` : 'Revisando horarios...'}
            </p>
          ) : (
            <button type="submit" className="portal-button-primary" style={{ ...styles.button, marginTop: '20px' }}>
              Crear {totalValidos > 1 ? `${totalValidos} eventos` : 'evento'}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--portal-bg)', padding: '32px 20px' },
  container: { maxWidth: '680px', margin: '0 auto', fontFamily: 'Inter, sans-serif' },
  title: { fontFamily: 'Montserrat, sans-serif', fontWeight: 900, marginBottom: '20px', color: 'var(--portal-text)' },
  error: { color: 'var(--portal-error-text)', background: 'var(--portal-error-bg)', padding: '12px', borderRadius: '8px', marginBottom: '16px' },
  conflictoBox: {
    background: 'rgba(217,45,32,0.08)', border: '1px solid #D92D20', borderRadius: '10px',
    padding: '16px', marginBottom: '18px',
  },
  conflictoTitulo: { margin: '0 0 8px', fontWeight: 700, color: 'var(--portal-text)', fontSize: '14px' },
  conflictoLista: { margin: '0 0 4px', paddingLeft: '20px' },
  conflictoItem: { fontSize: '13px', color: 'var(--portal-muted)', marginBottom: '2px' },
  botonGuardarDeTodosModos: {
    padding: '9px 14px', borderRadius: '8px', border: 'none', background: '#D92D20',
    color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
  },
  botonCancelarConflicto: {
    padding: '9px 14px', borderRadius: '8px', border: '1px solid var(--portal-button-secondary-border)',
    background: 'var(--portal-button-secondary-bg)', color: 'var(--portal-text)', fontSize: '13px', cursor: 'pointer',
  },
  eventoCard: {
    padding: '18px', borderRadius: '12px', background: 'var(--portal-card-bg)',
    border: '1px solid var(--portal-card-border)', display: 'flex', flexDirection: 'column', gap: '14px',
  },
  eventoCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  eventoNumero: { fontWeight: 700, fontSize: '13px', color: 'var(--portal-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  botonMini: {
    padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--portal-button-secondary-border)',
    background: 'var(--portal-button-secondary-bg)', color: 'var(--portal-text)', fontSize: '12px', cursor: 'pointer',
  },
  botonMiniEliminar: {
    padding: '5px 10px', borderRadius: '6px', border: '1px solid #D92D20',
    background: 'transparent', color: '#D92D20', fontSize: '12px', cursor: 'pointer',
  },
  label: { display: 'flex', flexDirection: 'column', gap: '6px', fontWeight: 600, fontSize: '14px', color: 'var(--portal-label-text)', flex: 1 },
  input: {
    padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--portal-input-border)', fontSize: '15px',
    fontFamily: 'Inter, sans-serif', background: 'var(--portal-input-bg)', color: 'var(--portal-input-text)',
  },
  row: { display: 'flex', gap: '12px' },
  notaVariosDias: {
    margin: '-8px 0 0', fontSize: '13px', color: 'var(--portal-muted)', fontStyle: 'italic',
  },
  botonToggleChecklist: {
    alignSelf: 'flex-start', padding: '7px 12px', borderRadius: '7px', border: '1px dashed var(--portal-card-border)',
    background: 'transparent', color: 'var(--portal-muted)', fontSize: '13px', cursor: 'pointer',
  },
  checklist: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 400, fontSize: '14px', color: 'var(--portal-text)' },
  colorDot: { width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block' },
  buttonAgregar: {
    width: '100%', padding: '12px', borderRadius: '10px', border: '1px dashed var(--portal-card-border)',
    background: 'transparent', color: 'var(--portal-muted)', fontSize: '14px', cursor: 'pointer', marginTop: '16px',
  },
  button: {
    width: '100%', padding: '14px 24px', borderRadius: '10px', border: 'none', background: '#3DDC04',
    color: '#0F0F12', fontWeight: 700, fontSize: '16px', cursor: 'pointer',
  },
  progresoTexto: { color: 'var(--portal-muted)', marginTop: '16px', fontSize: '14px', textAlign: 'center' },
}