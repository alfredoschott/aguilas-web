import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { usePortalAuth } from './PortalAuthContext'
import './portal.css'

export default function VisitasNuevas() {
  const { userData } = usePortalAuth()
  const [visitas, setVisitas] = useState([])
  const [cargando, setCargando] = useState(true)

  const esLiderRadgen = userData?.rol === 'lider' && userData?.ministerio === 'radgen'
  const tieneAcceso =
    userData?.rol === 'pastor' ||
    userData?.rol === 'administrativo' ||
    (userData?.rol === 'lider' && userData?.ministerio === 'consolidacion') ||
    esLiderRadgen

  useEffect(() => {
    if (!tieneAcceso) return
    const unsubscribe = onSnapshot(collection(db, 'visitasNuevas'), (snapshot) => {
      setVisitas(
        snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((v) => (esLiderRadgen ? v.modo === 'radgen' : true))
      )
      setCargando(false)
    })
    return () => unsubscribe()
  }, [tieneAcceso, esLiderRadgen])

  if (!tieneAcceso) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <Link to="/lideres/dashboard" style={styles.backLink}>← Volver al dashboard</Link>
          <p style={styles.sinAcceso}>Esta sección es solo para Pastor, Administrativo, Consolidación y RadGen MX.</p>
        </div>
      </div>
    )
  }

  const ordenValor = (v) => v.creado?.toMillis ? v.creado.toMillis() : (v.creado?.seconds || 0) * 1000
  const visitasOrdenadas = [...visitas].sort((a, b) => ordenValor(b) - ordenValor(a))

  const alternarAtendido = async (v) => {
    await updateDoc(doc(db, 'visitasNuevas', v.id), { atendido: !v.atendido })
  }

  const borrar = async (v) => {
    if (!confirm(`¿Borrar el registro de "${v.nombre}"?`)) return
    await deleteDoc(doc(db, 'visitasNuevas', v.id))
  }

  const formatearFecha = (v) => {
    if (!v.creado?.toDate) return ''
    return v.creado.toDate().toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <Link to="/lideres/dashboard" style={styles.backLink}>← Volver al dashboard</Link>
        <h1 style={styles.title}>Visitas nuevas</h1>
        <p style={styles.subtitle}>
          {esLiderRadgen ? 'Jóvenes que dejaron sus datos en "Vengo a RadGen".' : 'Personas que dejaron sus datos en "Bienvenida".'}
        </p>

        {cargando && <p style={{ color: 'var(--portal-muted-2)' }}>Cargando...</p>}
        {!cargando && visitasOrdenadas.length === 0 && (
          <p style={{ color: 'var(--portal-muted-2)' }}>No hay visitas registradas todavía.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {visitasOrdenadas.map((v) => (
            <div key={v.id} style={{ ...styles.card, opacity: v.atendido ? 0.55 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <strong style={styles.cardTitle}>{v.nombre}</strong>
                  {!esLiderRadgen && (
                    <span style={{ ...styles.badge, ...(v.modo === 'radgen' ? styles.badgeRadgen : styles.badgeGeneral) }}>
                      {v.modo === 'radgen' ? 'RadGen' : 'Servicio'}
                    </span>
                  )}
                  <p style={styles.cardMeta}>{v.telefono}</p>
                  <p style={styles.cardFecha}>{formatearFecha(v)}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button onClick={() => alternarAtendido(v)} className="portal-button-secondary" style={{ ...styles.botonSecundario, ...(v.atendido ? {} : styles.botonAtender) }}>
                    {v.atendido ? 'Marcar pendiente' : 'Marcar atendido'}
                  </button>
                  <button onClick={() => borrar(v)} className="portal-button-secondary" style={styles.botonBorrar}>Borrar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--portal-bg)', padding: '32px 20px' },
  container: { maxWidth: '640px', margin: '0 auto', fontFamily: 'Inter, sans-serif' },
  backLink: { color: 'var(--portal-muted)', fontSize: '14px', textDecoration: 'none' },
  title: { fontFamily: 'Montserrat, sans-serif', fontWeight: 900, margin: '12px 0 4px', color: 'var(--portal-text)' },
  subtitle: { color: 'var(--portal-muted)', fontSize: '14px', marginBottom: '20px' },
  sinAcceso: { color: 'var(--portal-muted)', marginTop: '20px' },
  card: {
    padding: '14px 16px', borderRadius: '10px',
    border: '1px solid var(--portal-card-border)', background: 'var(--portal-card-bg)',
  },
  cardTitle: { color: 'var(--portal-text)' },
  badge: {
    marginLeft: '8px', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
    verticalAlign: 'middle',
  },
  badgeGeneral: { background: 'rgba(61,220,4,0.15)', color: '#3DDC04' },
  badgeRadgen: { background: 'rgba(58,123,255,0.18)', color: '#8fb4ff' },
  cardMeta: { margin: '4px 0 0', color: 'var(--portal-muted)', fontSize: '14px' },
  cardFecha: { margin: '4px 0 0', color: 'var(--portal-muted-2)', fontSize: '12px' },
  botonSecundario: {
    cursor: 'pointer', background: 'none', border: '1px solid var(--portal-button-secondary-border)',
    color: 'var(--portal-muted)', padding: '7px 14px', borderRadius: '999px', fontSize: '13px',
  },
  botonAtender: { border: '1px solid #3DDC04', color: '#3DDC04' },
  botonBorrar: {
    cursor: 'pointer', background: 'none', border: '1px solid #4A1B0C', color: '#F0997B',
    padding: '7px 14px', borderRadius: '999px', fontSize: '13px',
  },
}
