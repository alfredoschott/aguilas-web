import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { usePortalAuth } from './PortalAuthContext'
import './portal.css'

export default function AvisosBanner() {
  const { userData, user } = usePortalAuth()
  const [avisos, setAvisos] = useState([])
  const [ministerios, setMinisterios] = useState({})
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [texto, setTexto] = useState('')
  const [publicando, setPublicando] = useState(false)

  async function cargarAvisos() {
    try {
      const q = query(
        collection(db, 'avisos_portal'),
        where('activo', '==', true),
        orderBy('createdAt', 'desc')
      )
      const snap = await getDocs(q)
      setAvisos(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    } catch (err) {
      console.warn('No se pudieron cargar los avisos:', err)
    }
    setCargando(false)
  }

  useEffect(() => {
    async function cargarMinisterios() {
      try {
        const snap = await getDocs(collection(db, 'ministerios'))
        const mapa = {}
        snap.docs.forEach((d) => { mapa[d.id] = d.data() })
        setMinisterios(mapa)
      } catch (err) {
        console.warn('No se pudieron cargar los ministerios:', err)
      }
    }
    cargarMinisterios()
    cargarAvisos()
  }, [])

  async function handlePublicar(e) {
    e.preventDefault()
    if (!texto.trim()) return
    setPublicando(true)
    try {
      await addDoc(collection(db, 'avisos_portal'), {
        texto: texto.trim(),
        activo: true,
        creadoPor: userData?.nombre || user?.email,
        creadoPorEmail: user?.email || null,
        creadoPorMinisterio: userData?.ministerio || null,
        createdAt: serverTimestamp(),
      })
      setTexto('')
      setMostrarForm(false)
      await cargarAvisos()
    } catch (err) {
      console.error(err)
    }
    setPublicando(false)
  }

  async function handleCerrar(id) {
    try {
      await updateDoc(doc(db, 'avisos_portal', id), { activo: false })
      setAvisos((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  function puedeCerrar(aviso) {
    if (userData?.rol === 'pastor' || userData?.rol === 'administrativo') return true
    return !!user?.email && user.email === aviso.creadoPorEmail
  }

  if (cargando) return null

  return (
    <div style={{ marginBottom: '20px' }}>
      {avisos.map((aviso) => {
        const colorMinisterio = ministerios[aviso.creadoPorMinisterio]?.color || '#3DDC04'
        return (
          <div
            key={aviso.id}
            className="portal-fade-in"
            style={{ ...styles.aviso, borderColor: colorMinisterio, background: `${colorMinisterio}1F` }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
              <p style={styles.avisoTexto}>{aviso.texto}</p>
              {aviso.creadoPor && (
                <span style={{ ...styles.avisoAutor, color: colorMinisterio }}>
                  {aviso.creadoPor}
                  {ministerios[aviso.creadoPorMinisterio]?.nombre ? ` · ${ministerios[aviso.creadoPorMinisterio].nombre}` : ''}
                </span>
              )}
            </div>
            {puedeCerrar(aviso) && (
              <button onClick={() => handleCerrar(aviso.id)} style={styles.avisoCerrar}>×</button>
            )}
          </div>
        )
      })}

      {!mostrarForm ? (
        <button onClick={() => setMostrarForm(true)} className="portal-button-secondary" style={styles.botonNuevoAviso}>
          + Publicar aviso
        </button>
      ) : (
        <form onSubmit={handlePublicar} style={styles.formAviso}>
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ej. La reunión del martes cambia de horario..."
            style={styles.inputAviso}
            autoFocus
          />
          <button type="submit" disabled={publicando} className="portal-button-primary" style={styles.botonPublicar}>
            {publicando ? 'Publicando...' : 'Publicar'}
          </button>
          <button type="button" onClick={() => setMostrarForm(false)} className="portal-button-secondary" style={styles.botonCancelarAviso}>
            Cancelar
          </button>
        </form>
      )}
    </div>
  )
}

const styles = {
  aviso: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
    padding: '12px 16px', borderRadius: '10px', border: '1px solid',
    marginBottom: '8px',
  },
  avisoTexto: { margin: 0, fontSize: '14px', color: 'var(--portal-text)', fontWeight: 500 },
  avisoAutor: { fontSize: '11px', fontWeight: 700 },
  avisoCerrar: {
    background: 'none', border: 'none', fontSize: '18px', color: 'var(--portal-muted)',
    cursor: 'pointer', lineHeight: 1, padding: '0 4px', flexShrink: 0,
  },
  botonNuevoAviso: {
    padding: '8px 14px', borderRadius: '8px', border: '1px dashed var(--portal-card-border)',
    background: 'transparent', color: 'var(--portal-muted)', fontSize: '13px', cursor: 'pointer',
  },
  formAviso: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  inputAviso: {
    flex: '1 1 260px', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--portal-input-border)',
    background: 'var(--portal-input-bg)', color: 'var(--portal-input-text)', fontSize: '14px', fontFamily: 'Inter, sans-serif',
  },
  botonPublicar: {
    padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#3DDC04',
    color: '#0F0F12', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
  },
  botonCancelarAviso: {
    padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--portal-button-secondary-border)',
    background: 'var(--portal-button-secondary-bg)', color: 'var(--portal-text)', fontSize: '14px', cursor: 'pointer',
  },
}