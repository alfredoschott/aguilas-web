import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { doc, getDoc, updateDoc, deleteDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { usePortalAuth } from './PortalAuthContext'
import { buscarConflictos } from './conflictos'
import { registrarActividad } from './actividad'
import ActividadEvento from './ActividadEvento'
import { fetchConAuth } from './authFetch'
import './portal.css'

const UBICACIONES = ['Águilas CFC Tizayuca', 'Salón de niños', 'Oficina pastoral', 'Virtual', 'Otro']

const ESTADOS = [
  { valor: 'pendiente', etiqueta: 'Pendiente' },
  { valor: 'en_proceso', etiqueta: 'En proceso' },
  { valor: 'listo', etiqueta: 'Listo' },
]

function estadosConDefaults(estadosGuardados, ministeriosRequeridos) {
  const mapa = { ...(estadosGuardados || {}) }
  ministeriosRequeridos.forEach((mid) => {
    if (!mapa[mid]) mapa[mid] = 'pendiente'
  })
  return mapa
}

export default function EditarEvento() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { userData, user } = usePortalAuth()

  const [ministerios, setMinisterios] = useState([])
  const [cargandoDatos, setCargandoDatos] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false)
  const [error, setError] = useState(null)
  const [googleEventId, setGoogleEventId] = useState(null)
  const [conflictos, setConflictos] = useState([])
  const [ignorarConflictos, setIgnorarConflictos] = useState(false)

  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    fecha: '',
    horaInicio: '',
    horaFin: '',
    ubicacion: '',
    ubicacionOtro: '',
    responsable: '',
    ministerioOrganizador: '',
    ministeriosRequeridos: [],
    estadosPorMinisterio: {},
  })

  const esPrimeraMesaOPastor = userData?.rol === 'pastor' || userData?.rol === 'primera_mesa' || userData?.rol === 'administrativo'

  function puedeEditarEstadoDe(ministerioId) {
    if (esPrimeraMesaOPastor) return true
    return userData?.rol === 'lider' && userData?.ministerio === ministerioId
  }

  const [creadoPor, setCreadoPor] = useState(null)
  const [sinPermiso, setSinPermiso] = useState(false)

  function tienePermisoSobreEvento(data) {
    if (esPrimeraMesaOPastor) return true
    if (userData?.rol !== 'lider') return false
    if (!user?.email) return false
    if (data.creadoPor === user.email) return true
    if (userData?.ministerio && data.ministerioOrganizador === userData.ministerio) return true
    if (userData?.ministerio && Array.isArray(data.ministeriosRequeridos) && data.ministeriosRequeridos.includes(userData.ministerio)) return true
    return false
  }

  useEffect(() => {
    async function cargar() {
      const [eventoSnap, ministeriosSnap] = await Promise.all([
        getDoc(doc(db, 'eventos_internos', id)),
        getDocs(collection(db, 'ministerios')),
      ])

      const lista = ministeriosSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      lista.sort((a, b) => a.nombre.localeCompare(b.nombre))
      setMinisterios(lista)

      if (eventoSnap.exists()) {
        const data = eventoSnap.data()
        const ubicacionGuardada = data.ubicacion || ''
        const esConocida = UBICACIONES.includes(ubicacionGuardada)
        const ministeriosRequeridos = data.ministeriosRequeridos || []

        setCreadoPor(data.creadoPor || null)
        setSinPermiso(!tienePermisoSobreEvento(data))

        setForm({
          titulo: data.titulo || '',
          descripcion: data.descripcion || '',
          fecha: data.fecha || '',
          horaInicio: data.horaInicio || '',
          horaFin: data.horaFin || '',
          ubicacion: esConocida ? ubicacionGuardada : (ubicacionGuardada ? 'Otro' : ''),
          ubicacionOtro: esConocida ? '' : ubicacionGuardada,
          responsable: data.responsable || '',
          ministerioOrganizador: data.ministerioOrganizador || '',
          ministeriosRequeridos,
          estadosPorMinisterio: estadosConDefaults(data.estadosPorMinisterio, ministeriosRequeridos),
        })
        setGoogleEventId(data.googleEventId || null)
      } else {
        setError('No se encontró el evento.')
      }
      setCargandoDatos(false)
    }
    cargar()
  }, [id])

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
    setConflictos([])
    setIgnorarConflictos(false)
  }

  function toggleMinisterioRequerido(mid) {
    setForm((prev) => {
      const yaEsta = prev.ministeriosRequeridos.includes(mid)
      const nuevosRequeridos = yaEsta
        ? prev.ministeriosRequeridos.filter((m) => m !== mid)
        : [...prev.ministeriosRequeridos, mid]
      const nuevosEstados = { ...prev.estadosPorMinisterio }
      if (!yaEsta && !nuevosEstados[mid]) nuevosEstados[mid] = 'pendiente'
      return {
        ...prev,
        ministeriosRequeridos: nuevosRequeridos,
        estadosPorMinisterio: nuevosEstados,
      }
    })
  }

  function actualizarEstadoMinisterio(mid, nuevoEstado) {
    setForm((prev) => ({
      ...prev,
      estadosPorMinisterio: { ...prev.estadosPorMinisterio, [mid]: nuevoEstado },
    }))
  }

  function ubicacionFinal() {
    return form.ubicacion === 'Otro' ? (form.ubicacionOtro.trim() || 'Otro') : form.ubicacion
  }

  async function guardarCambios() {
    setGuardando(true)
    const ubicacion = ubicacionFinal()
    try {
      await updateDoc(doc(db, 'eventos_internos', id), {
        titulo: form.titulo,
        descripcion: form.descripcion,
        fecha: form.fecha,
        horaInicio: form.horaInicio,
        horaFin: form.horaFin,
        ubicacion,
        responsable: form.responsable,
        ministerioOrganizador: form.ministerioOrganizador,
        ministeriosRequeridos: form.ministeriosRequeridos,
        estadosPorMinisterio: form.estadosPorMinisterio,
      })

      try {
        const respuesta = await fetchConAuth('/api/actualizar-evento-calendario', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            googleEventId,
            titulo: form.titulo,
            descripcion: form.descripcion,
            fecha: form.fecha,
            horaInicio: form.horaInicio,
            horaFin: form.horaFin,
            ubicacion,
          }),
        })
        if (respuesta.ok) {
          const data = await respuesta.json()
          if (data.googleEventId !== googleEventId) {
            await updateDoc(doc(db, 'eventos_internos', id), { googleEventId: data.googleEventId })
          }
        }
      } catch (calendarErr) {
        console.warn('Error de red al sincronizar con Google Calendar:', calendarErr)
      }

      await registrarActividad({
        tipo: 'editar',
        descripcion: `${userData?.nombre || user.email} editó el evento "${form.titulo}"`,
        usuarioEmail: user.email,
        usuarioNombre: userData?.nombre || user.email,
        eventoId: id,
      })

      navigate('/lideres/dashboard')
    } catch (err) {
      console.error(err)
      setError('No se pudo guardar el evento. Intenta de nuevo.')
      setGuardando(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!form.titulo || !form.fecha || !form.horaInicio || !form.ministerioOrganizador) {
      setError('Título, fecha, hora de inicio y ministerio organizador son obligatorios.')
      return
    }

    if (!ignorarConflictos) {
      setGuardando(true)
      const encontrados = await buscarConflictos({
        fecha: form.fecha,
        horaInicio: form.horaInicio,
        horaFin: form.horaFin,
        ubicacion: ubicacionFinal(),
        idEventoActual: id,
      })
      setGuardando(false)

      if (encontrados.length > 0) {
        setConflictos(encontrados)
        return
      }
    }

    await guardarCambios()
  }

  async function handleEliminar() {
    setEliminando(true)
    setError(null)
    try {
      try {
        await fetchConAuth('/api/eliminar-evento-calendario', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ googleEventId }),
        })
      } catch (calendarErr) {
        console.warn('Error de red al eliminar de Google Calendar:', calendarErr)
      }

      await deleteDoc(doc(db, 'eventos_internos', id))

      await registrarActividad({
        tipo: 'eliminar',
        descripcion: `${userData?.nombre || user.email} eliminó el evento "${form.titulo}"`,
        usuarioEmail: user.email,
        usuarioNombre: userData?.nombre || user.email,
        eventoId: id,
      })

      navigate('/lideres/dashboard')
    } catch (err) {
      console.error(err)
      setError('No se pudo eliminar el evento. Intenta de nuevo.')
      setEliminando(false)
      setConfirmandoEliminar(false)
    }
  }

  if (cargandoDatos) {
    return (
      <div style={styles.page}>
        <p style={{ color: 'var(--portal-muted-2)' }}>Cargando...</p>
      </div>
    )
  }

  if (sinPermiso) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <Link to="/lideres/dashboard" style={styles.backLink}>← Volver al dashboard</Link>
          <div style={{ ...styles.confirmacionBox, marginTop: '20px' }}>
            <p style={styles.confirmacionTexto}>
              No tienes permiso para editar este evento — solo quien lo creó, un ministerio involucrado, o Pastor/Administrativo pueden hacerlo.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <Link to="/lideres/dashboard" style={styles.backLink}>← Volver al dashboard</Link>
        <h1 style={styles.title}>Editar evento</h1>

        {error && <p style={styles.error}>{error}</p>}

        {conflictos.length > 0 && (
          <div style={styles.conflictoBox}>
            <p style={styles.conflictoTitulo}>⚠️ Hay otro evento en el mismo lugar y horario:</p>
            <ul style={styles.conflictoLista}>
              {conflictos.map((c) => (
                <li key={c.id} style={styles.conflictoItem}>
                  <strong>{c.titulo}</strong> — {c.horaInicio}{c.horaFin ? ` a ${c.horaFin}` : ''} en {c.ubicacion}
                </li>
              ))}
            </ul>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => { setIgnorarConflictos(true); setConflictos([]); guardarCambios() }}
                className="portal-button-secondary"
                style={styles.botonGuardarDeTodosModos}
              >
                Guardar de todos modos
              </button>
              <button type="button" onClick={() => setConflictos([])} className="portal-button-secondary" style={styles.botonCancelarConflicto}>
                Cambiar horario
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Título *
            <input name="titulo" value={form.titulo} onChange={handleChange} style={styles.input} />
          </label>

          <label style={styles.label}>
            Descripción
            <textarea name="descripcion" value={form.descripcion} onChange={handleChange} style={{ ...styles.input, minHeight: '80px' }} />
          </label>

          <div style={styles.row}>
            <label style={styles.label}>
              Fecha *
              <input type="date" name="fecha" value={form.fecha} onChange={handleChange} style={styles.input} />
            </label>
            <label style={styles.label}>
              Hora inicio *
              <input type="time" name="horaInicio" value={form.horaInicio} onChange={handleChange} style={styles.input} />
            </label>
            <label style={styles.label}>
              Hora fin
              <input type="time" name="horaFin" value={form.horaFin} onChange={handleChange} style={styles.input} />
            </label>
          </div>

          <label style={styles.label}>
            Ubicación
            <select name="ubicacion" value={form.ubicacion} onChange={handleChange} style={styles.input}>
              <option value="">Selecciona un lugar</option>
              {UBICACIONES.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </label>

          {form.ubicacion === 'Otro' && (
            <label style={styles.label}>
              Especifica el lugar
              <input name="ubicacionOtro" value={form.ubicacionOtro} onChange={handleChange} style={styles.input} />
            </label>
          )}

          <label style={styles.label}>
            Responsable
            <input name="responsable" value={form.responsable} onChange={handleChange} style={styles.input} />
          </label>

          <label style={styles.label}>
            Ministerio organizador *
            <select name="ministerioOrganizador" value={form.ministerioOrganizador} onChange={handleChange} style={styles.input}>
              <option value="">Selecciona uno</option>
              {ministerios.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </label>

          <div style={styles.label}>
            Ministerios requeridos
            <div style={styles.checklist}>
              {ministerios.map((m) => (
                <label key={m.id} style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.ministeriosRequeridos.includes(m.id)}
                    onChange={() => toggleMinisterioRequerido(m.id)}
                  />
                  <span style={{ ...styles.colorDot, background: m.color }} />
                  {m.nombre}
                </label>
              ))}
            </div>
          </div>

          {form.ministeriosRequeridos.length > 0 && (
            <div style={styles.label}>
              Estado por ministerio
              <p style={styles.estadoAyuda}>
                Cada líder solo puede actualizar el estado de su propio ministerio. Pastor y Administrativo pueden actualizar cualquiera.
              </p>
              <div style={styles.estadosLista}>
                {form.ministeriosRequeridos.map((mid) => {
                  const m = ministerios.find((min) => min.id === mid)
                  if (!m) return null
                  const puedeEditar = puedeEditarEstadoDe(mid)
                  const estadoActual = form.estadosPorMinisterio[mid] || 'pendiente'
                  return (
                    <div key={mid} style={styles.estadoFila}>
                      <span style={styles.estadoNombre}>
                        <span style={{ ...styles.colorDot, background: m.color }} />
                        {m.nombre}
                      </span>
                      <select
                        value={estadoActual}
                        onChange={(e) => actualizarEstadoMinisterio(mid, e.target.value)}
                        disabled={!puedeEditar}
                        style={{
                          ...styles.estadoSelect,
                          opacity: puedeEditar ? 1 : 0.5,
                          cursor: puedeEditar ? 'pointer' : 'not-allowed',
                        }}
                      >
                        {ESTADOS.map((es) => (
                          <option key={es.valor} value={es.valor}>{es.etiqueta}</option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <button type="submit" disabled={guardando} className="portal-button-primary" style={styles.button}>
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>

        <div style={styles.zonaPeligro}>
          {!confirmandoEliminar ? (
            <button type="button" onClick={() => setConfirmandoEliminar(true)} className="portal-button-secondary" style={styles.botonEliminar}>
              Eliminar evento
            </button>
          ) : (
            <div style={styles.confirmacionBox}>
              <p style={styles.confirmacionTexto}>
                ¿Seguro que quieres eliminar "{form.titulo}"? Esto también lo borra de Google Calendar. No se puede deshacer.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={handleEliminar} disabled={eliminando} className="portal-button-secondary" style={styles.botonConfirmarEliminar}>
                  {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
                <button type="button" onClick={() => setConfirmandoEliminar(false)} disabled={eliminando} className="portal-button-secondary" style={styles.buttonSecondary}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        <ActividadEvento eventoId={id} />
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--portal-bg)', padding: '32px 20px' },
  container: { maxWidth: '640px', margin: '0 auto', fontFamily: 'Inter, sans-serif' },
  backLink: { color: 'var(--portal-muted)', fontSize: '14px', textDecoration: 'none' },
  title: { fontFamily: 'Montserrat, sans-serif', fontWeight: 900, margin: '12px 0 24px', color: 'var(--portal-text)' },
  error: { color: 'var(--portal-error-text)', background: 'var(--portal-error-bg)', padding: '12px', borderRadius: '8px', marginBottom: '16px' },
  conflictoBox: {
    background: 'rgba(217,45,32,0.08)', border: '1px solid #D92D20', borderRadius: '10px',
    padding: '16px', marginBottom: '18px',
  },
  conflictoTitulo: { margin: '0 0 8px', fontWeight: 700, color: 'var(--portal-text)', fontSize: '14px' },
  conflictoLista: { margin: '0 0 4px', paddingLeft: '20px' },
  conflictoItem: { fontSize: '13px', color: 'var(--portal-muted)', marginBottom: '4px' },
  botonGuardarDeTodosModos: {
    padding: '9px 14px', borderRadius: '8px', border: 'none', background: '#D92D20',
    color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
  },
  botonCancelarConflicto: {
    padding: '9px 14px', borderRadius: '8px', border: '1px solid var(--portal-button-secondary-border)',
    background: 'var(--portal-button-secondary-bg)', color: 'var(--portal-text)', fontSize: '13px', cursor: 'pointer',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '18px' },
  label: { display: 'flex', flexDirection: 'column', gap: '6px', fontWeight: 600, fontSize: '14px', color: 'var(--portal-label-text)' },
  input: {
    padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--portal-input-border)', fontSize: '15px',
    fontFamily: 'Inter, sans-serif', background: 'var(--portal-input-bg)', color: 'var(--portal-input-text)',
  },
  row: { display: 'flex', gap: '12px' },
  checklist: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 400, fontSize: '14px', color: 'var(--portal-text)' },
  colorDot: { width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block', flexShrink: 0 },
  estadoAyuda: { fontWeight: 400, fontSize: '12px', color: 'var(--portal-muted)', margin: '0 0 8px' },
  estadosLista: { display: 'flex', flexDirection: 'column', gap: '8px' },
  estadoFila: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
    padding: '10px 12px', borderRadius: '8px', background: 'var(--portal-card-bg)', border: '1px solid var(--portal-card-border)',
  },
  estadoNombre: { display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 400, fontSize: '14px', color: 'var(--portal-text)' },
  estadoSelect: {
    padding: '6px 10px', borderRadius: '7px', border: '1px solid var(--portal-input-border)', fontSize: '13px',
    fontFamily: 'Inter, sans-serif', background: 'var(--portal-input-bg)', color: 'var(--portal-input-text)',
  },
  button: {
    padding: '14px 24px', borderRadius: '10px', border: 'none', background: '#3DDC04',
    color: '#0F0F12', fontWeight: 700, fontSize: '16px', cursor: 'pointer', marginTop: '8px',
  },
  zonaPeligro: { marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--portal-card-border)' },
  botonEliminar: {
    padding: '10px 18px', borderRadius: '8px', border: '1px solid #D92D20', background: 'transparent',
    color: '#D92D20', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
  },
  confirmacionBox: { padding: '16px', borderRadius: '10px', background: 'var(--portal-error-bg)', border: '1px solid #D92D20' },
  confirmacionTexto: { color: 'var(--portal-error-text)', fontSize: '14px', margin: '0 0 12px' },
  botonConfirmarEliminar: {
    padding: '10px 18px', borderRadius: '8px', border: 'none', background: '#D92D20',
    color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
  },
  buttonSecondary: {
    padding: '10px 18px', borderRadius: '8px', border: '1px solid var(--portal-button-secondary-border)',
    background: 'var(--portal-button-secondary-bg)', color: 'var(--portal-text)', cursor: 'pointer', fontSize: '14px',
  },
}