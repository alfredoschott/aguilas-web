import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { db, storage } from '../firebase'
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, orderBy, query, serverTimestamp, setDoc
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import imageCompression from 'browser-image-compression'
import { usePortalAuth } from './PortalAuthContext'
import './portal.css'

const CORREO_AUTORIZADO = 'schottalfredo@gmail.com'
const VERDE = 'var(--portal-verde)'
const FONDO = 'var(--portal-bg)'
const CARD = 'var(--portal-card-bg)'
const BORDE = 'var(--portal-card-border)'
const TEXTO = 'var(--portal-text)'
const TEXTO_SUAVE = 'var(--portal-muted)'

const inputStyle = {
  width: '100%',
  padding: '0.75rem 1rem',
  marginTop: '0.4rem',
  backgroundColor: '#1A1F19',
  border: `1px solid ${BORDE}`,
  borderRadius: '10px',
  color: TEXTO,
  fontFamily: 'Inter, sans-serif',
  fontSize: '0.95rem',
  boxSizing: 'border-box',
  outline: 'none',
}

const labelStyle = {
  display: 'block',
  fontFamily: 'Inter, sans-serif',
  fontSize: '0.8rem',
  fontWeight: '600',
  color: TEXTO_SUAVE,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const tabStyle = (activo) => ({
  padding: '0.6rem 1.4rem',
  borderRadius: '999px',
  border: `1px solid ${activo ? VERDE : BORDE}`,
  backgroundColor: activo ? VERDE : 'transparent',
  color: activo ? '#000' : TEXTO_SUAVE,
  fontFamily: 'Montserrat, sans-serif',
  fontWeight: '700',
  fontSize: '0.85rem',
  cursor: 'pointer',
})

async function subirImagenComprimida(archivo, carpeta) {
  const opciones = { maxSizeMB: 0.5, maxWidthOrHeight: 1600, useWebWorker: true }
  const comprimido = await imageCompression(archivo, opciones)
  const nombreArchivo = `${carpeta}/${Date.now()}-${archivo.name}`
  const storageRef = ref(storage, nombreArchivo)
  await uploadBytes(storageRef, comprimido)
  return getDownloadURL(storageRef)
}

function borrarImagenDeStorage(url) {
  if (!url) return
  try {
    const path = decodeURIComponent(url.split('/o/')[1].split('?')[0])
    deleteObject(ref(storage, path)).catch(() => {})
  } catch (e) {}
}

function ordenValor(item) {
  if (typeof item.orden === 'number') return item.orden
  return item.creado?.toMillis ? item.creado.toMillis() : 0
}

export default function PortalAdmin() {
  const { user } = usePortalAuth()
  const [tab, setTab] = useState('anuncios')

  const tieneAcceso = user?.email?.toLowerCase() === CORREO_AUTORIZADO

  if (!tieneAcceso) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: FONDO, fontFamily: 'Inter, sans-serif', padding: '2.5rem 1.5rem' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <Link to="/lideres/dashboard" style={{ color: TEXTO_SUAVE, fontSize: '0.9rem', textDecoration: 'none' }}>← Volver al dashboard</Link>
          <p style={{ color: TEXTO_SUAVE, marginTop: '1.5rem' }}>Esta sección es solo para administración general.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: FONDO, fontFamily: 'Inter, sans-serif', paddingBottom: '4rem' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '2.5rem 1.5rem 0' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <Link to="/lideres/dashboard" style={{ color: TEXTO_SUAVE, fontSize: '0.85rem', textDecoration: 'none' }}>← Volver al dashboard</Link>
            <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: '900', color: TEXTO, fontSize: '1.6rem', margin: '0.5rem 0 0' }}>
              Administración del sitio
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <button style={tabStyle(tab === 'anuncios')} onClick={() => setTab('anuncios')}>Anuncios</button>
          <button style={tabStyle(tab === 'eventos')} onClick={() => setTab('eventos')}>Eventos</button>
          <button style={tabStyle(tab === 'servicios')} onClick={() => setTab('servicios')}>Servicios</button>
          <button style={tabStyle(tab === 'galeria')} onClick={() => setTab('galeria')}>Galería</button>
          <button style={tabStyle(tab === 'radgen')} onClick={() => setTab('radgen')}>Registros RadGen</button>
        </div>

        {tab === 'anuncios' && <PanelAnuncios />}
        {tab === 'eventos' && <PanelEventos />}
        {tab === 'servicios' && <PanelServicios />}
        {tab === 'galeria' && <PanelGaleria />}
        {tab === 'radgen' && <PanelRadgenRegistros />}
      </div>
    </div>
  )
}

function PanelAnuncios() {
  const [anuncios, setAnuncios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [form, setForm] = useState({ titulo: '', texto: '', link: '', fechaPublicacion: '', fechaExpiracion: '', imagenFile: null, imagenUrlActual: '' })

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'anuncios'), (snapshot) => {
      setAnuncios(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
      setCargando(false)
    })
    return () => unsubscribe()
  }, [])

  const anunciosOrdenados = [...anuncios].sort((a, b) => ordenValor(b) - ordenValor(a))

  const resetForm = () => {
    setForm({ titulo: '', texto: '', link: '', fechaPublicacion: '', fechaExpiracion: '', imagenFile: null, imagenUrlActual: '' })
    setEditando(null)
  }

  const guardar = async (e) => {
    e.preventDefault()
    if (!form.titulo.trim()) return
    setSubiendo(true)
    try {
      let imagenUrl = form.imagenUrlActual || ''
      if (form.imagenFile) {
        imagenUrl = await subirImagenComprimida(form.imagenFile, 'anuncios')
      }
      const datos = { titulo: form.titulo, texto: form.texto, link: form.link || null, fechaPublicacion: form.fechaPublicacion || null, fechaExpiracion: form.fechaExpiracion || null, imagenUrl }
      if (editando) {
        await updateDoc(doc(db, 'anuncios', editando), datos)
      } else {
        await addDoc(collection(db, 'anuncios'), { ...datos, orden: Date.now(), creado: serverTimestamp() })
      }
      resetForm()
    } catch (error) {
      console.error(error)
      alert('Hubo un error al guardar.')
    } finally {
      setSubiendo(false)
    }
  }

  const editar = (a) => {
    setForm({ titulo: a.titulo || '', texto: a.texto || '', link: a.link || '', fechaPublicacion: a.fechaPublicacion || '', fechaExpiracion: a.fechaExpiracion || '', imagenFile: null, imagenUrlActual: a.imagenUrl || '' })
    setEditando(a.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const borrar = async (a) => {
    if (!confirm(`¿Borrar "${a.titulo}"?`)) return
    borrarImagenDeStorage(a.imagenUrl)
    await deleteDoc(doc(db, 'anuncios', a.id))
  }

  const mover = async (id, direccion) => {
    const idx = anunciosOrdenados.findIndex(a => a.id === id)
    const otroIdx = idx + direccion
    if (otroIdx < 0 || otroIdx >= anunciosOrdenados.length) return
    const a = anunciosOrdenados[idx]
    const b = anunciosOrdenados[otroIdx]
    const ordenA = ordenValor(a)
    const ordenB = ordenValor(b)
    await updateDoc(doc(db, 'anuncios', a.id), { orden: ordenB })
    await updateDoc(doc(db, 'anuncios', b.id), { orden: ordenA })
  }

  return (
    <>
      <h2 style={{ fontFamily: 'Montserrat, sans-serif', color: TEXTO, fontSize: '1.1rem', marginBottom: '1rem' }}>Anuncios</h2>

      <form onSubmit={guardar} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', backgroundColor: CARD, border: `1px solid ${BORDE}`, borderRadius: '16px', padding: '1.75rem', marginBottom: '2.5rem' }}>
        <label style={labelStyle}>
          Título
          <input type="text" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} style={inputStyle} placeholder="Ej. Servicio especial de oración" />
        </label>
        <label style={labelStyle}>
          Texto
          <textarea value={form.texto} onChange={e => setForm({ ...form, texto: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Detalles del anuncio..." />
        </label>
        <label style={labelStyle}>
          Imagen (opcional)
          <input type="file" accept="image/*" onChange={e => setForm({ ...form, imagenFile: e.target.files[0] })} style={{ display: 'block', marginTop: '0.5rem', color: TEXTO_SUAVE, fontSize: '0.85rem' }} />
        </label>
        {form.imagenUrlActual && !form.imagenFile && (
          <img src={form.imagenUrlActual} alt="actual" style={{ maxWidth: '140px', borderRadius: '10px', border: `1px solid ${BORDE}` }} />
        )}
        <label style={labelStyle}>
          Link (opcional)
          <input type="url" value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} style={inputStyle} placeholder="https://..." />
          <span style={{ display: 'block', fontSize: '0.75rem', color: TEXTO_SUAVE, textTransform: 'none', letterSpacing: 'normal', marginTop: '0.35rem', fontWeight: '400' }}>
            Si lo agregas, la tarjeta del anuncio será clickeable y llevará a esta dirección
          </span>
        </label>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <label style={{ ...labelStyle, flex: 1, minWidth: '160px' }}>
            Publicar a partir de (opcional)
            <input type="date" value={form.fechaPublicacion} onChange={e => setForm({ ...form, fechaPublicacion: e.target.value })} style={{ ...inputStyle, colorScheme: 'dark' }} />
            <span style={{ display: 'block', fontSize: '0.75rem', color: TEXTO_SUAVE, textTransform: 'none', letterSpacing: 'normal', marginTop: '0.35rem', fontWeight: '400' }}>
              No se muestra en el sitio antes de esta fecha
            </span>
          </label>
          <label style={{ ...labelStyle, flex: 1, minWidth: '160px' }}>
            Fecha de expiración (opcional)
            <input type="date" value={form.fechaExpiracion} onChange={e => setForm({ ...form, fechaExpiracion: e.target.value })} style={{ ...inputStyle, colorScheme: 'dark' }} />
            <span style={{ display: 'block', fontSize: '0.75rem', color: TEXTO_SUAVE, textTransform: 'none', letterSpacing: 'normal', marginTop: '0.35rem', fontWeight: '400' }}>
              Se oculta solo del sitio después de esta fecha
            </span>
          </label>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="submit" disabled={subiendo} style={{ backgroundColor: subiendo ? BORDE : VERDE, color: subiendo ? TEXTO_SUAVE : '#000', border: 'none', padding: '0.85rem 1.75rem', borderRadius: '999px', cursor: subiendo ? 'default' : 'pointer', fontWeight: '700', fontFamily: 'Montserrat, sans-serif', fontSize: '0.9rem' }}>
            {subiendo ? 'Guardando...' : editando ? 'Actualizar anuncio' : 'Crear anuncio'}
          </button>
          {editando && (
            <button type="button" onClick={resetForm} style={{ background: 'none', border: `1px solid ${BORDE}`, color: TEXTO_SUAVE, padding: '0.85rem 1.5rem', borderRadius: '999px', cursor: 'pointer' }}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {cargando && <p style={{ color: TEXTO_SUAVE, fontSize: '0.9rem' }}>Cargando anuncios...</p>}
        {!cargando && anunciosOrdenados.map((a, i) => (
          <div key={a.id} style={{ border: `1px solid ${BORDE}`, backgroundColor: CARD, borderRadius: '14px', padding: '1rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {a.imagenUrl && <img src={a.imagenUrl} alt={a.titulo} style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ color: TEXTO, fontFamily: 'Montserrat, sans-serif', fontSize: '0.95rem' }}>{a.titulo}</strong>
              <p style={{ margin: '0.3rem 0', fontSize: '0.85rem', color: TEXTO_SUAVE }}>{a.texto}</p>
              {a.link && <span style={{ display: 'block', fontSize: '0.75rem', color: '#8fb4ff', wordBreak: 'break-all' }}>🔗 {a.link}</span>}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {a.fechaPublicacion && new Date(a.fechaPublicacion + 'T00:00:00') > new Date() && (
                  <span style={{ fontSize: '0.75rem', color: '#8fb4ff' }}>Programado: {a.fechaPublicacion}</span>
                )}
                {a.fechaExpiracion && <span style={{ fontSize: '0.75rem', color: VERDE }}>Expira: {a.fechaExpiracion}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flexShrink: 0 }}>
              <button onClick={() => mover(a.id, -1)} disabled={i === 0} style={{ cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.3 : 1, background: 'none', border: `1px solid ${BORDE}`, color: TEXTO, width: '28px', height: '28px', borderRadius: '8px', fontSize: '0.75rem' }}>▲</button>
              <button onClick={() => mover(a.id, 1)} disabled={i === anunciosOrdenados.length - 1} style={{ cursor: i === anunciosOrdenados.length - 1 ? 'default' : 'pointer', opacity: i === anunciosOrdenados.length - 1 ? 0.3 : 1, background: 'none', border: `1px solid ${BORDE}`, color: TEXTO, width: '28px', height: '28px', borderRadius: '8px', fontSize: '0.75rem' }}>▼</button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <button onClick={() => editar(a)} style={{ cursor: 'pointer', background: 'none', border: `1px solid ${BORDE}`, color: TEXTO, padding: '0.45rem 0.9rem', borderRadius: '999px', fontSize: '0.8rem' }}>Editar</button>
              <button onClick={() => borrar(a)} style={{ cursor: 'pointer', background: 'none', border: '1px solid #4A1B0C', color: '#F0997B', padding: '0.45rem 0.9rem', borderRadius: '999px', fontSize: '0.8rem' }}>Borrar</button>
            </div>
          </div>
        ))}
        {!cargando && anuncios.length === 0 && <p style={{ color: TEXTO_SUAVE, fontSize: '0.9rem' }}>Aún no hay anuncios.</p>}
      </div>
    </>
  )
}

const formEventoVacio = {
  titulo: '', descripcion: '', fecha: '', hora: '', ubicacion: '', link: '', fechaPublicacion: '',
  whatsappMensaje: '', mostrarContador: false, imagenFile: null, imagenUrlActual: '',
}

function eventoPaso(ev) {
  if (!ev.fecha) return false
  return new Date(ev.fecha + 'T23:59:59') < new Date()
}

function PanelEventos() {
  const [eventos, setEventos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [form, setForm] = useState(formEventoVacio)

  useEffect(() => {
    const q = query(collection(db, 'eventos'), orderBy('creado', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEventos(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
      setCargando(false)
    })
    return () => unsubscribe()
  }, [])

  const eventosOrdenados = [...eventos].sort((a, b) => {
    const aPaso = eventoPaso(a)
    const bPaso = eventoPaso(b)
    if (aPaso !== bPaso) return aPaso ? 1 : -1
    if (!a.fecha && !b.fecha) return 0
    if (!a.fecha) return 1
    if (!b.fecha) return -1
    return new Date(a.fecha + 'T' + (a.hora || '00:00')) - new Date(b.fecha + 'T' + (b.hora || '00:00'))
  })
  const eventosPasados = eventos.filter(eventoPaso)

  const limpiarPasados = async () => {
    if (eventosPasados.length === 0) return
    if (!confirm(`¿Borrar ${eventosPasados.length} evento(s) que ya pasaron? Esto no se puede deshacer.`)) return
    for (const ev of eventosPasados) {
      borrarImagenDeStorage(ev.imagenUrl)
      await deleteDoc(doc(db, 'eventos', ev.id))
    }
  }

  const resetForm = () => {
    setForm(formEventoVacio)
    setEditando(null)
  }

  const guardar = async (e) => {
    e.preventDefault()
    if (!form.titulo.trim()) return
    setSubiendo(true)
    try {
      let imagenUrl = form.imagenUrlActual || ''
      if (form.imagenFile) {
        imagenUrl = await subirImagenComprimida(form.imagenFile, 'eventos')
      }
      const datos = {
        titulo: form.titulo,
        descripcion: form.descripcion,
        fecha: form.fecha || null,
        hora: form.hora || null,
        ubicacion: form.ubicacion || null,
        link: form.link || null,
        fechaPublicacion: form.fechaPublicacion || null,
        whatsappMensaje: form.whatsappMensaje || ('Quisiera información sobre el evento: ' + form.titulo),
        mostrarContador: !!form.mostrarContador,
        imagenUrl,
      }
      if (editando) {
        await updateDoc(doc(db, 'eventos', editando), datos)
      } else {
        await addDoc(collection(db, 'eventos'), { ...datos, creado: serverTimestamp() })
      }
      resetForm()
    } catch (error) {
      console.error(error)
      alert('Hubo un error al guardar.')
    } finally {
      setSubiendo(false)
    }
  }

  const editar = (ev) => {
    setForm({
      titulo: ev.titulo || '',
      descripcion: ev.descripcion || '',
      fecha: ev.fecha || '',
      hora: ev.hora || '',
      ubicacion: ev.ubicacion || '',
      link: ev.link || '',
      fechaPublicacion: ev.fechaPublicacion || '',
      whatsappMensaje: ev.whatsappMensaje || '',
      mostrarContador: !!ev.mostrarContador,
      imagenFile: null,
      imagenUrlActual: ev.imagenUrl || '',
    })
    setEditando(ev.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const borrar = async (ev) => {
    if (!confirm(`¿Borrar el evento "${ev.titulo}"?`)) return
    borrarImagenDeStorage(ev.imagenUrl)
    await deleteDoc(doc(db, 'eventos', ev.id))
  }

  return (
    <>
      <h2 style={{ fontFamily: 'Montserrat, sans-serif', color: TEXTO, fontSize: '1.1rem', marginBottom: '1rem' }}>Eventos</h2>

      <form onSubmit={guardar} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', backgroundColor: CARD, border: `1px solid ${BORDE}`, borderRadius: '16px', padding: '1.75rem', marginBottom: '2.5rem' }}>
        <label style={labelStyle}>
          Título
          <input type="text" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} style={inputStyle} placeholder="Ej. Aún hay más" />
        </label>
        <label style={labelStyle}>
          Descripción
          <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Detalles del evento..." />
        </label>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <label style={{ ...labelStyle, flex: 1, minWidth: '140px' }}>
            Fecha (opcional)
            <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} style={{ ...inputStyle, colorScheme: 'dark' }} />
            <span style={{ display: 'block', fontSize: '0.75rem', color: TEXTO_SUAVE, textTransform: 'none', letterSpacing: 'normal', marginTop: '0.35rem', fontWeight: '400' }}>
              El evento se oculta solo del sitio al terminar este día
            </span>
          </label>
          <label style={{ ...labelStyle, flex: 1, minWidth: '140px' }}>
            Hora (opcional)
            <input type="time" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} style={{ ...inputStyle, colorScheme: 'dark' }} />
          </label>
        </div>

        <label style={labelStyle}>
          Ubicación (opcional)
          <input type="text" value={form.ubicacion} onChange={e => setForm({ ...form, ubicacion: e.target.value })} style={inputStyle} placeholder="Ej. Jardín las Flores, Tizayuca" />
        </label>

        <label style={labelStyle}>
          Link (opcional)
          <input type="url" value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} style={inputStyle} placeholder="https://..." />
          <span style={{ display: 'block', fontSize: '0.75rem', color: TEXTO_SUAVE, textTransform: 'none', letterSpacing: 'normal', marginTop: '0.35rem', fontWeight: '400' }}>
            Si lo agregas, la tarjeta del evento será clickeable y llevará a esta dirección
          </span>
        </label>

        <label style={labelStyle}>
          Publicar a partir de (opcional)
          <input type="date" value={form.fechaPublicacion} onChange={e => setForm({ ...form, fechaPublicacion: e.target.value })} style={{ ...inputStyle, colorScheme: 'dark', maxWidth: '200px' }} />
          <span style={{ display: 'block', fontSize: '0.75rem', color: TEXTO_SUAVE, textTransform: 'none', letterSpacing: 'normal', marginTop: '0.35rem', fontWeight: '400' }}>
            No se muestra en el sitio antes de esta fecha
          </span>
        </label>

        <label style={labelStyle}>
          Imagen / flyer (opcional)
          <input type="file" accept="image/*" onChange={e => setForm({ ...form, imagenFile: e.target.files[0] })} style={{ display: 'block', marginTop: '0.5rem', color: TEXTO_SUAVE, fontSize: '0.85rem' }} />
        </label>
        {form.imagenUrlActual && !form.imagenFile && (
          <img src={form.imagenUrlActual} alt="actual" style={{ maxWidth: '140px', borderRadius: '10px', border: `1px solid ${BORDE}` }} />
        )}

        <label style={labelStyle}>
          Mensaje de WhatsApp (opcional)
          <input type="text" value={form.whatsappMensaje} onChange={e => setForm({ ...form, whatsappMensaje: e.target.value })} style={inputStyle} placeholder="Ej. Quisiera info del evento X" />
          <span style={{ display: 'block', fontSize: '0.75rem', color: TEXTO_SUAVE, textTransform: 'none', letterSpacing: 'normal', marginTop: '0.35rem', fontWeight: '400' }}>
            Si lo dejas vacío, no se muestra botón de WhatsApp en este evento
          </span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.mostrarContador} onChange={e => setForm({ ...form, mostrarContador: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: VERDE }} />
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: TEXTO }}>Mostrar contador regresivo para este evento</span>
        </label>
        {form.mostrarContador && !form.fecha && (
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#F0997B' }}>
            Agrega una fecha arriba — sin fecha el contador no se muestra.
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="submit" disabled={subiendo} style={{ backgroundColor: subiendo ? BORDE : VERDE, color: subiendo ? TEXTO_SUAVE : '#000', border: 'none', padding: '0.85rem 1.75rem', borderRadius: '999px', cursor: subiendo ? 'default' : 'pointer', fontWeight: '700', fontFamily: 'Montserrat, sans-serif', fontSize: '0.9rem' }}>
            {subiendo ? 'Guardando...' : editando ? 'Actualizar evento' : 'Crear evento'}
          </button>
          {editando && (
            <button type="button" onClick={resetForm} style={{ background: 'none', border: `1px solid ${BORDE}`, color: TEXTO_SUAVE, padding: '0.85rem 1.5rem', borderRadius: '999px', cursor: 'pointer' }}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      {eventosPasados.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem', padding: '0.9rem 1.1rem', backgroundColor: 'rgba(240,153,123,0.08)', border: '1px solid #4A1B0C', borderRadius: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', color: '#F0997B' }}>
            {eventosPasados.length} evento(s) ya pasaron y siguen guardados aquí (ya no se muestran en el sitio).
          </span>
          <button onClick={limpiarPasados} style={{ cursor: 'pointer', background: 'none', border: '1px solid #4A1B0C', color: '#F0997B', padding: '0.5rem 1rem', borderRadius: '999px', fontSize: '0.8rem', flexShrink: 0 }}>
            Borrar pasados
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {cargando && <p style={{ color: TEXTO_SUAVE, fontSize: '0.9rem' }}>Cargando eventos...</p>}
        {!cargando && eventosOrdenados.map(ev => {
          const pasado = eventoPaso(ev)
          return (
            <div key={ev.id} style={{ border: `1px solid ${BORDE}`, backgroundColor: CARD, borderRadius: '14px', padding: '1rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'center', opacity: pasado ? 0.55 : 1 }}>
              {ev.imagenUrl && <img src={ev.imagenUrl} alt={ev.titulo} style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <strong style={{ color: TEXTO, fontFamily: 'Montserrat, sans-serif', fontSize: '0.95rem' }}>{ev.titulo}</strong>
                  {pasado && (
                    <span style={{ fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#F0997B', border: '1px solid #4A1B0C', borderRadius: '999px', padding: '0.15rem 0.55rem' }}>
                      Pasado
                    </span>
                  )}
                </div>
                <p style={{ margin: '0.3rem 0', fontSize: '0.85rem', color: TEXTO_SUAVE }}>{ev.descripcion}</p>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {ev.fecha && <span style={{ fontSize: '0.75rem', color: pasado ? TEXTO_SUAVE : VERDE }}>{ev.fecha}{ev.hora ? ` · ${ev.hora}` : ''}</span>}
                  {ev.ubicacion && <span style={{ fontSize: '0.75rem', color: TEXTO_SUAVE }}>{ev.ubicacion}</span>}
                  {ev.mostrarContador && <span style={{ fontSize: '0.75rem', color: pasado ? TEXTO_SUAVE : VERDE }}>Contador activo</span>}
                  {ev.fechaPublicacion && new Date(ev.fechaPublicacion + 'T00:00:00') > new Date() && (
                    <span style={{ fontSize: '0.75rem', color: '#8fb4ff' }}>Programado: {ev.fechaPublicacion}</span>
                  )}
                </div>
                {ev.link && <span style={{ display: 'block', marginTop: '0.3rem', fontSize: '0.75rem', color: '#8fb4ff', wordBreak: 'break-all' }}>🔗 {ev.link}</span>}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <button onClick={() => editar(ev)} style={{ cursor: 'pointer', background: 'none', border: `1px solid ${BORDE}`, color: TEXTO, padding: '0.45rem 0.9rem', borderRadius: '999px', fontSize: '0.8rem' }}>Editar</button>
                <button onClick={() => borrar(ev)} style={{ cursor: 'pointer', background: 'none', border: '1px solid #4A1B0C', color: '#F0997B', padding: '0.45rem 0.9rem', borderRadius: '999px', fontSize: '0.8rem' }}>Borrar</button>
              </div>
            </div>
          )
        })}
        {!cargando && eventos.length === 0 && <p style={{ color: TEXTO_SUAVE, fontSize: '0.9rem' }}>Aún no hay eventos.</p>}
      </div>
    </>
  )
}

const DIAS = [
  { nombre: 'Domingo', diaSemana: 0 },
  { nombre: 'Lunes', diaSemana: 1 },
  { nombre: 'Martes', diaSemana: 2 },
  { nombre: 'Miércoles', diaSemana: 3 },
  { nombre: 'Jueves', diaSemana: 4 },
  { nombre: 'Viernes', diaSemana: 5 },
  { nombre: 'Sábado', diaSemana: 6 },
]

const formHorarioVacio = { dia: 'Domingo', hora: '09:45', subtitulo: '' }

function formatearHoraAdmin(hora, minuto) {
  const ampm = hora >= 12 ? 'PM' : 'AM'
  let h12 = hora % 12
  if (h12 === 0) h12 = 12
  return `${h12}:${String(minuto).padStart(2, '0')} ${ampm}`
}

function PanelServicios() {
  const [horarios, setHorarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState(formHorarioVacio)

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'horarios'), (snapshot) => {
      setHorarios(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
      setCargando(false)
    })
    return () => unsubscribe()
  }, [])

  const horariosOrdenados = [...horarios].sort((a, b) => ordenValor(a) - ordenValor(b))

  const resetForm = () => {
    setForm(formHorarioVacio)
    setEditando(null)
  }

  const guardar = async (e) => {
    e.preventDefault()
    if (!form.hora) return
    setGuardando(true)
    try {
      const [horaStr, minutoStr] = form.hora.split(':')
      const diaInfo = DIAS.find(d => d.nombre === form.dia)
      const datos = {
        dia: form.dia,
        diaSemana: diaInfo.diaSemana,
        hora: parseInt(horaStr, 10),
        minuto: parseInt(minutoStr, 10),
        subtitulo: form.subtitulo || null,
      }
      if (editando) {
        await updateDoc(doc(db, 'horarios', editando), datos)
      } else {
        await addDoc(collection(db, 'horarios'), { ...datos, orden: Date.now(), creado: serverTimestamp() })
      }
      resetForm()
    } catch (error) {
      console.error(error)
      alert('Hubo un error al guardar.')
    } finally {
      setGuardando(false)
    }
  }

  const editar = (h) => {
    setForm({
      dia: h.dia,
      hora: `${String(h.hora).padStart(2, '0')}:${String(h.minuto).padStart(2, '0')}`,
      subtitulo: h.subtitulo || '',
    })
    setEditando(h.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const borrar = async (h) => {
    if (!confirm(`¿Borrar el horario "${h.dia} ${formatearHoraAdmin(h.hora, h.minuto)}"?`)) return
    await deleteDoc(doc(db, 'horarios', h.id))
  }

  const mover = async (id, direccion) => {
    const idx = horariosOrdenados.findIndex(h => h.id === id)
    const otroIdx = idx + direccion
    if (otroIdx < 0 || otroIdx >= horariosOrdenados.length) return
    const a = horariosOrdenados[idx]
    const b = horariosOrdenados[otroIdx]
    const ordenA = ordenValor(a)
    const ordenB = ordenValor(b)
    await updateDoc(doc(db, 'horarios', a.id), { orden: ordenB })
    await updateDoc(doc(db, 'horarios', b.id), { orden: ordenA })
  }

  return (
    <>
      <h2 style={{ fontFamily: 'Montserrat, sans-serif', color: TEXTO, fontSize: '1.1rem', marginBottom: '1rem' }}>Servicios</h2>
      <p style={{ color: TEXTO_SUAVE, fontSize: '0.85rem', marginTop: '-0.5rem', marginBottom: '1.5rem' }}>
        Cada horario es un renglón. Los que comparten día y subtítulo se agrupan solos en una misma tarjeta en el sitio.
      </p>

      <form onSubmit={guardar} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', backgroundColor: CARD, border: `1px solid ${BORDE}`, borderRadius: '16px', padding: '1.75rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <label style={{ ...labelStyle, flex: 1, minWidth: '160px' }}>
            Día
            <select value={form.dia} onChange={e => setForm({ ...form, dia: e.target.value })} style={{ ...inputStyle, colorScheme: 'dark' }}>
              {DIAS.map(d => <option key={d.nombre} value={d.nombre}>{d.nombre}</option>)}
            </select>
          </label>
          <label style={{ ...labelStyle, flex: 1, minWidth: '140px' }}>
            Hora
            <input type="time" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} style={{ ...inputStyle, colorScheme: 'dark' }} />
          </label>
        </div>
        <label style={labelStyle}>
          Subtítulo (opcional)
          <input type="text" value={form.subtitulo} onChange={e => setForm({ ...form, subtitulo: e.target.value })} style={inputStyle} placeholder='Ej. "Tabernáculo"' />
          <span style={{ display: 'block', fontSize: '0.75rem', color: TEXTO_SUAVE, textTransform: 'none', letterSpacing: 'normal', marginTop: '0.35rem', fontWeight: '400' }}>
            Úsalo para diferenciar un servicio especial dentro del mismo día
          </span>
        </label>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="submit" disabled={guardando} style={{ backgroundColor: guardando ? BORDE : VERDE, color: guardando ? TEXTO_SUAVE : '#000', border: 'none', padding: '0.85rem 1.75rem', borderRadius: '999px', cursor: guardando ? 'default' : 'pointer', fontWeight: '700', fontFamily: 'Montserrat, sans-serif', fontSize: '0.9rem' }}>
            {guardando ? 'Guardando...' : editando ? 'Actualizar horario' : 'Agregar horario'}
          </button>
          {editando && (
            <button type="button" onClick={resetForm} style={{ background: 'none', border: `1px solid ${BORDE}`, color: TEXTO_SUAVE, padding: '0.85rem 1.5rem', borderRadius: '999px', cursor: 'pointer' }}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {cargando && <p style={{ color: TEXTO_SUAVE, fontSize: '0.9rem' }}>Cargando horarios...</p>}
        {!cargando && horariosOrdenados.map((h, i) => (
          <div key={h.id} style={{ border: `1px solid ${BORDE}`, backgroundColor: CARD, borderRadius: '14px', padding: '1rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ color: TEXTO, fontFamily: 'Montserrat, sans-serif', fontSize: '0.95rem' }}>
                {h.dia} {formatearHoraAdmin(h.hora, h.minuto)}
              </strong>
              {h.subtitulo && <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', color: TEXTO_SUAVE }}>{h.subtitulo}</p>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flexShrink: 0 }}>
              <button onClick={() => mover(h.id, -1)} disabled={i === 0} style={{ cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.3 : 1, background: 'none', border: `1px solid ${BORDE}`, color: TEXTO, width: '28px', height: '28px', borderRadius: '8px', fontSize: '0.75rem' }}>▲</button>
              <button onClick={() => mover(h.id, 1)} disabled={i === horariosOrdenados.length - 1} style={{ cursor: i === horariosOrdenados.length - 1 ? 'default' : 'pointer', opacity: i === horariosOrdenados.length - 1 ? 0.3 : 1, background: 'none', border: `1px solid ${BORDE}`, color: TEXTO, width: '28px', height: '28px', borderRadius: '8px', fontSize: '0.75rem' }}>▼</button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <button onClick={() => editar(h)} style={{ cursor: 'pointer', background: 'none', border: `1px solid ${BORDE}`, color: TEXTO, padding: '0.45rem 0.9rem', borderRadius: '999px', fontSize: '0.8rem' }}>Editar</button>
              <button onClick={() => borrar(h)} style={{ cursor: 'pointer', background: 'none', border: '1px solid #4A1B0C', color: '#F0997B', padding: '0.45rem 0.9rem', borderRadius: '999px', fontSize: '0.8rem' }}>Borrar</button>
            </div>
          </div>
        ))}
        {!cargando && horarios.length === 0 && (
          <p style={{ color: TEXTO_SUAVE, fontSize: '0.9rem' }}>
            Aún no hay horarios aquí — el sitio está mostrando los horarios por defecto. Agrega uno para reemplazarlos.
          </p>
        )}
      </div>
    </>
  )
}

function PanelGaleria() {
  const [fotos, setFotos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [archivo, setArchivo] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [seccion, setSeccion] = useState('principal')

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'galeria'), (snapshot) => {
      setFotos(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
      setCargando(false)
    })
    return () => unsubscribe()
  }, [])

  const fotosSeccion = fotos.filter(f => (f.seccion || 'principal') === seccion)
  const fotosOrdenadas = [...fotosSeccion].sort((a, b) => ordenValor(a) - ordenValor(b))

  const subir = async (e) => {
    e.preventDefault()
    if (!archivo) return
    setSubiendo(true)
    try {
      const imagenUrl = await subirImagenComprimida(archivo, 'galeria')
      await addDoc(collection(db, 'galeria'), { imagenUrl, seccion, orden: Date.now(), creado: serverTimestamp() })
      setArchivo(null)
      document.getElementById('input-foto-galeria').value = ''
    } catch (error) {
      console.error(error)
      alert('Hubo un error al subir la foto.')
    } finally {
      setSubiendo(false)
    }
  }

  const borrar = async (f) => {
    if (!confirm('¿Borrar esta foto de la galería?')) return
    borrarImagenDeStorage(f.imagenUrl)
    await deleteDoc(doc(db, 'galeria', f.id))
  }

  const mover = async (id, direccion) => {
    const idx = fotosOrdenadas.findIndex(f => f.id === id)
    const otroIdx = idx + direccion
    if (otroIdx < 0 || otroIdx >= fotosOrdenadas.length) return
    const a = fotosOrdenadas[idx]
    const b = fotosOrdenadas[otroIdx]
    const ordenA = ordenValor(a)
    const ordenB = ordenValor(b)
    await updateDoc(doc(db, 'galeria', a.id), { orden: ordenB })
    await updateDoc(doc(db, 'galeria', b.id), { orden: ordenA })
  }

  return (
    <>
      <h2 style={{ fontFamily: 'Montserrat, sans-serif', color: TEXTO, fontSize: '1.1rem', marginBottom: '1rem' }}>Galería</h2>
      <p style={{ color: TEXTO_SUAVE, fontSize: '0.85rem', marginTop: '-0.5rem', marginBottom: '1.5rem' }}>
        {seccion === 'principal'
          ? 'Mientras no subas fotos aquí, el sitio muestra las fotos por defecto.'
          : 'Estas fotos aparecen en la sección de galería de la página de RadGen.'}
      </p>

      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem' }}>
        <button style={tabStyle(seccion === 'principal')} onClick={() => setSeccion('principal')}>Principal</button>
        <button style={tabStyle(seccion === 'radgen')} onClick={() => setSeccion('radgen')}>RadGen</button>
      </div>

      <form onSubmit={subir} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', backgroundColor: CARD, border: `1px solid ${BORDE}`, borderRadius: '16px', padding: '1.75rem', marginBottom: '2.5rem' }}>
        <label style={labelStyle}>
          Nueva foto
          <input id="input-foto-galeria" type="file" accept="image/*" onChange={e => setArchivo(e.target.files[0])} style={{ display: 'block', marginTop: '0.5rem', color: TEXTO_SUAVE, fontSize: '0.85rem' }} />
        </label>
        <div>
          <button type="submit" disabled={subiendo || !archivo} style={{ backgroundColor: (subiendo || !archivo) ? BORDE : VERDE, color: (subiendo || !archivo) ? TEXTO_SUAVE : '#000', border: 'none', padding: '0.85rem 1.75rem', borderRadius: '999px', cursor: (subiendo || !archivo) ? 'default' : 'pointer', fontWeight: '700', fontFamily: 'Montserrat, sans-serif', fontSize: '0.9rem' }}>
            {subiendo ? 'Subiendo...' : 'Agregar foto'}
          </button>
        </div>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {cargando && <p style={{ color: TEXTO_SUAVE, fontSize: '0.9rem' }}>Cargando galería...</p>}
        {!cargando && fotosOrdenadas.map((f, i) => (
          <div key={f.id} style={{ border: `1px solid ${BORDE}`, backgroundColor: CARD, borderRadius: '14px', padding: '1rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <img src={f.imagenUrl} alt={`Foto ${i + 1}`} style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flexShrink: 0 }}>
              <button onClick={() => mover(f.id, -1)} disabled={i === 0} style={{ cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.3 : 1, background: 'none', border: `1px solid ${BORDE}`, color: TEXTO, width: '28px', height: '28px', borderRadius: '8px', fontSize: '0.75rem' }}>▲</button>
              <button onClick={() => mover(f.id, 1)} disabled={i === fotosOrdenadas.length - 1} style={{ cursor: i === fotosOrdenadas.length - 1 ? 'default' : 'pointer', opacity: i === fotosOrdenadas.length - 1 ? 0.3 : 1, background: 'none', border: `1px solid ${BORDE}`, color: TEXTO, width: '28px', height: '28px', borderRadius: '8px', fontSize: '0.75rem' }}>▼</button>
            </div>
            <button onClick={() => borrar(f)} style={{ cursor: 'pointer', background: 'none', border: '1px solid #4A1B0C', color: '#F0997B', padding: '0.45rem 0.9rem', borderRadius: '999px', fontSize: '0.8rem', flexShrink: 0 }}>Borrar</button>
          </div>
        ))}
        {!cargando && fotosSeccion.length === 0 && (
          <p style={{ color: TEXTO_SUAVE, fontSize: '0.9rem' }}>
            {seccion === 'principal'
              ? 'Aún no hay fotos aquí — el sitio está mostrando la galería por defecto.'
              : 'Aún no hay fotos aquí — la sección de galería de RadGen se ve vacía.'}
          </p>
        )}
      </div>
    </>
  )
}

function PanelProximaReunionRadgen() {
  const [form, setForm] = useState({ fecha: '', hora: '', lugar: '' })
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'radgenConfig', 'proximaReunion'), (snap) => {
      if (snap.exists()) {
        const d = snap.data()
        setForm({ fecha: d.fecha || '', hora: d.hora || '', lugar: d.lugar || '' })
      }
      setCargando(false)
    })
    return () => unsubscribe()
  }, [])

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      await setDoc(doc(db, 'radgenConfig', 'proximaReunion'), {
        fecha: form.fecha || null,
        hora: form.hora || null,
        lugar: form.lugar || null,
      })
    } catch (error) {
      console.error(error)
      alert('Hubo un error al guardar.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <h2 style={{ fontFamily: 'Montserrat, sans-serif', color: TEXTO, fontSize: '1.1rem', marginBottom: '1rem' }}>Próxima reunión de RadGen</h2>
      <p style={{ color: TEXTO_SUAVE, fontSize: '0.85rem', marginTop: '-0.5rem', marginBottom: '1.5rem' }}>
        Alimenta el contador regresivo que se ve en la página de RadGen.
      </p>
      <form onSubmit={guardar} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', backgroundColor: CARD, border: `1px solid ${BORDE}`, borderRadius: '16px', padding: '1.75rem' }}>
        {cargando ? (
          <p style={{ color: TEXTO_SUAVE, fontSize: '0.9rem' }}>Cargando...</p>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <label style={{ ...labelStyle, flex: '1 1 160px' }}>
                Fecha
                <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} style={{ ...inputStyle, colorScheme: 'dark' }} />
              </label>
              <label style={{ ...labelStyle, flex: '1 1 140px' }}>
                Hora
                <input type="time" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} style={{ ...inputStyle, colorScheme: 'dark' }} />
              </label>
            </div>
            <label style={labelStyle}>
              Lugar (opcional)
              <input type="text" value={form.lugar} onChange={e => setForm({ ...form, lugar: e.target.value })} style={inputStyle} placeholder="Ej. Templo Águilas CFC" />
            </label>
            <div>
              <button type="submit" disabled={guardando} style={{ backgroundColor: guardando ? BORDE : VERDE, color: guardando ? TEXTO_SUAVE : '#000', border: 'none', padding: '0.85rem 1.75rem', borderRadius: '999px', cursor: guardando ? 'default' : 'pointer', fontWeight: '700', fontFamily: 'Montserrat, sans-serif', fontSize: '0.9rem' }}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}

function PanelRadgenRegistros() {
  const [registros, setRegistros] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'radgenRegistros'), (snapshot) => {
      setRegistros(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
      setCargando(false)
    })
    return () => unsubscribe()
  }, [])

  const registrosOrdenados = [...registros].sort((a, b) => ordenValor(b) - ordenValor(a))

  const alternarAtendido = async (r) => {
    await updateDoc(doc(db, 'radgenRegistros', r.id), { atendido: !r.atendido })
  }

  const borrar = async (r) => {
    if (!confirm(`¿Borrar el registro de "${r.nombre}"?`)) return
    await deleteDoc(doc(db, 'radgenRegistros', r.id))
  }

  const formatearFecha = (r) => {
    if (!r.creado?.toDate) return ''
    return r.creado.toDate().toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
  }

  return (
    <>
      <PanelProximaReunionRadgen />

      <h2 style={{ fontFamily: 'Montserrat, sans-serif', color: TEXTO, fontSize: '1.1rem', marginBottom: '1rem' }}>Registros RadGen</h2>
      <p style={{ color: TEXTO_SUAVE, fontSize: '0.85rem', marginTop: '-0.5rem', marginBottom: '1.5rem' }}>
        Jóvenes que dejaron sus datos desde la página de RadGen.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {cargando && <p style={{ color: TEXTO_SUAVE, fontSize: '0.9rem' }}>Cargando registros...</p>}
        {!cargando && registrosOrdenados.map((r) => (
          <div key={r.id} style={{ border: `1px solid ${BORDE}`, backgroundColor: CARD, borderRadius: '14px', padding: '1.1rem 1.25rem', opacity: r.atendido ? 0.55 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <p style={{ color: TEXTO, fontWeight: '700', fontSize: '0.95rem', margin: 0 }}>{r.nombre}</p>
                <p style={{ color: TEXTO_SUAVE, fontSize: '0.85rem', margin: '0.2rem 0 0' }}>{r.telefono}{r.edad ? ` · ${r.edad} años` : ''}</p>
                {r.mensaje && <p style={{ color: TEXTO_SUAVE, fontSize: '0.85rem', margin: '0.5rem 0 0', lineHeight: 1.5 }}>{r.mensaje}</p>}
                <p style={{ color: TEXTO_SUAVE, fontSize: '0.75rem', margin: '0.5rem 0 0', opacity: 0.7 }}>{formatearFecha(r)}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <button onClick={() => alternarAtendido(r)} style={{ cursor: 'pointer', background: 'none', border: `1px solid ${r.atendido ? BORDE : VERDE}`, color: r.atendido ? TEXTO_SUAVE : VERDE, padding: '0.45rem 0.9rem', borderRadius: '999px', fontSize: '0.8rem' }}>
                  {r.atendido ? 'Marcar pendiente' : 'Marcar atendido'}
                </button>
                <button onClick={() => borrar(r)} style={{ cursor: 'pointer', background: 'none', border: '1px solid #4A1B0C', color: '#F0997B', padding: '0.45rem 0.9rem', borderRadius: '999px', fontSize: '0.8rem' }}>Borrar</button>
              </div>
            </div>
          </div>
        ))}
        {!cargando && registros.length === 0 && (
          <p style={{ color: TEXTO_SUAVE, fontSize: '0.9rem' }}>Aún no hay registros.</p>
        )}
      </div>
    </>
  )
}