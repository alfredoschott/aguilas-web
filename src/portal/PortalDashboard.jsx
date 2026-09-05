import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { CalendarX2, Menu as MenuIcon, Package, CalendarClock, UserPlus, ShieldCheck, LogOut } from 'lucide-react'
import { db } from '../firebase'
import { usePortalAuth } from './PortalAuthContext'
import PortalCalendario from './PortalCalendario'
import AvisosBanner from './AvisosBanner'
import ActividadReciente from './ActividadReciente'
import NotificacionesBell from './NotificacionesBell'
import { IconoMinisterio } from './ministeriosConfig'
import './portal.css'

export default function PortalDashboard() {
  const navigate = useNavigate()
  const { userData, user, logout } = usePortalAuth()
  const [eventos, setEventos] = useState([])
  const [ministerios, setMinisterios] = useState({})
  const [cargando, setCargando] = useState(true)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function clickFuera(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuAbierto(false)
    }
    document.addEventListener('mousedown', clickFuera)
    return () => document.removeEventListener('mousedown', clickFuera)
  }, [])

  useEffect(() => {
    async function cargarDatos() {
      const [eventosSnap, ministeriosSnap] = await Promise.all([
        getDocs(query(collection(db, 'eventos_internos'), orderBy('fecha', 'asc'))),
        getDocs(collection(db, 'ministerios')),
      ])

      const mapaMinisterios = {}
      ministeriosSnap.docs.forEach((d) => {
        mapaMinisterios[d.id] = d.data()
      })
      setMinisterios(mapaMinisterios)

      const todos = eventosSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      setEventos(todos)
      setCargando(false)
    }
    cargarDatos()
  }, [])

  const hoyStr = new Date().toISOString().split('T')[0]
  const primerDiaMes = hoyStr.slice(0, 7)

  const esLiderConMinisterio = userData?.rol === 'lider' && !!userData?.ministerio

  const proximosEventos = useMemo(
    () => eventos.filter((e) => e.fecha >= hoyStr),
    [eventos, hoyStr]
  )

  const misEventos = useMemo(() => {
    if (!esLiderConMinisterio) return []
    return proximosEventos
      .filter(
        (e) =>
          e.ministerioOrganizador === userData.ministerio ||
          (Array.isArray(e.ministeriosRequeridos) && e.ministeriosRequeridos.includes(userData.ministerio))
      )
      .slice(0, 8)
  }, [proximosEventos, esLiderConMinisterio, userData])

  const otrosEventos = useMemo(() => {
    if (!esLiderConMinisterio) return proximosEventos.slice(0, 6)
    const misIds = new Set(misEventos.map((e) => e.id))
    return proximosEventos.filter((e) => !misIds.has(e.id)).slice(0, 6)
  }, [proximosEventos, esLiderConMinisterio, misEventos])

  const eventosEsteMes = useMemo(
    () => eventos.filter((e) => e.fecha && e.fecha.startsWith(primerDiaMes)).length,
    [eventos, primerDiaMes]
  )

  const ADMINS_TEMPORALES = ['schottalfredo@gmail.com']
  const puedeVerAgendaPastoral = userData?.rol === 'pastor' || userData?.rol === 'administrativo' || ADMINS_TEMPORALES.includes(user?.email)
  const puedeVerVisitas = userData?.rol === 'pastor' || userData?.rol === 'administrativo' || (userData?.rol === 'lider' && ['consolidacion', 'radgen'].includes(userData?.ministerio))
  const puedeVerAdmin = user?.email?.toLowerCase() === 'schottalfredo@gmail.com'

  const colorMinisterioPropio = userData?.rol === 'lider' && userData?.ministerio ? ministerios[userData.ministerio]?.color : null
  const esRolDirectivo = userData?.rol === 'pastor' || userData?.rol === 'administrativo' || userData?.rol === 'primera_mesa'
  const accentColor = colorMinisterioPropio || (esRolDirectivo ? '#D4AF37' : '#3DDC04')

  function BadgesMinisterios({ ids }) {
    if (!Array.isArray(ids) || ids.length === 0) return null
    return (
      <div style={styles.badgesRow}>
        {ids.map((id) => {
          const m = ministerios[id]
          if (!m) return null
          return (
            <span key={id} style={{ ...styles.ministerioBadge, background: `${m.color}22`, color: m.color, border: `1px solid ${m.color}55` }}>
              <IconoMinisterio id={id} size={12} />
              {m.nombre}
            </span>
          )
        })}
      </div>
    )
  }

  function ProgresoMinisterios({ ev }) {
    const requeridos = Array.isArray(ev.ministeriosRequeridos) ? ev.ministeriosRequeridos : []
    const total = requeridos.length

    if (total === 0) {
      return <span style={styles.badge}>{ev.estado || 'pendiente'}</span>
    }

    const estados = ev.estadosPorMinisterio || {}
    const listos = requeridos.filter((id) => estados[id] === 'listo').length
    const porcentaje = Math.round((listos / total) * 100)
    const completo = listos === total

    return (
      <div style={styles.progresoContainer}>
        <span style={{ ...styles.progresoTexto, color: completo ? '#3DDC04' : 'var(--portal-muted)' }}>
          {listos}/{total} listos
        </span>
        <div style={styles.progresoBarraFondo}>
          <div
            style={{
              ...styles.progresoBarraRelleno,
              width: `${porcentaje}%`,
              background: completo ? '#3DDC04' : '#D4AF37',
            }}
          />
        </div>
      </div>
    )
  }

  function tienePermisoSobreEvento(ev) {
    if (esRolDirectivo) return true
    if (userData?.rol !== 'lider') return false
    if (!user?.email) return false
    if (ev.creadoPor === user.email) return true
    if (userData?.ministerio && ev.ministerioOrganizador === userData.ministerio) return true
    if (userData?.ministerio && Array.isArray(ev.ministeriosRequeridos) && ev.ministeriosRequeridos.includes(userData.ministerio)) return true
    return false
  }

  function TarjetaEvento({ ev, delay }) {
    const colorMinisterio = ministerios[ev.ministerioOrganizador]?.color || '#999'
    const puedeEditar = tienePermisoSobreEvento(ev)
    return (
      <div
        key={ev.id}
        className={puedeEditar ? 'portal-hover-card portal-fade-in' : 'portal-fade-in'}
        onClick={() => { if (puedeEditar) navigate(`/lideres/eventos/${ev.id}/editar`) }}
        style={{
          ...styles.card,
          borderLeft: `4px solid ${colorMinisterio}`,
          animationDelay: `${delay}s`,
          cursor: puedeEditar ? 'pointer' : 'default',
          opacity: puedeEditar ? 1 : 0.75,
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={styles.cardTitle}>{ev.titulo}</strong>
          <p style={styles.cardMeta}>
            {ev.fecha} · {ev.horaInicio}{ev.horaFin ? ` - ${ev.horaFin}` : ''}
            {ev.ubicacion ? ` · ${ev.ubicacion}` : ''}
            {ministerios[ev.ministerioOrganizador]?.nombre && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginLeft: '4px' }}>
                · <IconoMinisterio id={ev.ministerioOrganizador} size={13} /> {ministerios[ev.ministerioOrganizador].nombre}
              </span>
            )}
          </p>
          <BadgesMinisterios ids={ev.ministeriosRequeridos} />
        </div>
        <ProgresoMinisterios ev={ev} />
      </div>
    )
  }

  function SkeletonCard({ delay }) {
    return (
      <div className="portal-skeleton-card" style={{ ...styles.skeletonCard, animationDelay: `${delay}s` }}>
        <div className="portal-skeleton-shimmer" style={{ ...styles.skeletonLine, width: '55%' }} />
        <div className="portal-skeleton-shimmer" style={{ ...styles.skeletonLine, width: '80%', marginTop: '10px' }} />
      </div>
    )
  }

  function EstadoVacio({ mensaje }) {
    return (
      <div style={styles.estadoVacio}>
        <CalendarX2 size={28} color="var(--portal-muted-2)" strokeWidth={1.5} />
        <p style={{ ...styles.muted, margin: '8px 0 0' }}>{mensaje}</p>
      </div>
    )
  }

  return (
    <div className="portal-dashboard-page" style={styles.page}>
      <div className="portal-fade-in" style={{ ...styles.accentBar, background: accentColor }} />
      <div className="portal-fade-in portal-dashboard-header" style={styles.header}>
        <div style={styles.headerLeft}>
          <img src="/ACFC.png" alt="Águilas Centro Familiar Cristiano" style={styles.logo} />
          <div>
            <h1 style={styles.h1}>
              Hola, {userData?.nombre?.split(' ')[0] || 'líder'}
            </h1>
            <p style={styles.subtitle}>
              {userData?.rol === 'pastor' && 'Pastor'}
              {userData?.rol === 'primera_mesa' && 'Primera Mesa'}
              {userData?.rol === 'administrativo' && 'Administrativo'}
              {userData?.rol === 'lider' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <IconoMinisterio id={userData?.ministerio} size={14} />
                  Líder de {ministerios[userData?.ministerio]?.nombre || userData?.ministerio || 'ministerio'}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="portal-dashboard-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center', position: 'relative', zIndex: 10 }}>
          <NotificacionesBell />
          <Link to="/lideres/eventos/nuevo" className="portal-button-primary" style={styles.buttonPrimary}>
            + Nuevo evento
          </Link>
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuAbierto((v) => !v)}
              style={styles.buttonIcono}
              aria-label="Más opciones"
            >
              <MenuIcon size={18} strokeWidth={2} />
            </button>
            {menuAbierto && (
              <div className="portal-fade-in" style={styles.menuDropdown}>
                <Link to="/lideres/inventario" style={styles.menuItem} onClick={() => setMenuAbierto(false)}>
                  <Package size={16} strokeWidth={2} /> Inventario
                </Link>
                {puedeVerAgendaPastoral && (
                  <Link to="/lideres/agenda-pastoral" style={styles.menuItem} onClick={() => setMenuAbierto(false)}>
                    <CalendarClock size={16} strokeWidth={2} /> Agenda Pastoral
                  </Link>
                )}
                {puedeVerVisitas && (
                  <Link to="/lideres/visitas" style={styles.menuItem} onClick={() => setMenuAbierto(false)}>
                    <UserPlus size={16} strokeWidth={2} /> Visitas
                  </Link>
                )}
                {puedeVerAdmin && (
                  <Link to="/lideres/admin" style={styles.menuItem} onClick={() => setMenuAbierto(false)}>
                    <ShieldCheck size={16} strokeWidth={2} /> Administración
                  </Link>
                )}
                <button onClick={logout} style={{ ...styles.menuItem, ...styles.menuItemBoton }}>
                  <LogOut size={16} strokeWidth={2} /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="portal-fade-in" style={{ animationDelay: '0.04s' }}>
        <AvisosBanner />
      </div>

      <div className="portal-fade-in portal-dashboard-stats" style={{ ...styles.statsRow, animationDelay: '0.06s' }}>
        <div className="portal-stat-card" style={styles.statCard}>
          <span className="portal-stat-number" style={{ ...styles.statNumber, color: accentColor }}>{proximosEventos.length}</span>
          <span className="portal-stat-label" style={styles.statLabel}>Próximos eventos</span>
        </div>
        <div className="portal-stat-card" style={styles.statCard}>
          <span className="portal-stat-number" style={styles.statNumber}>{eventosEsteMes}</span>
          <span className="portal-stat-label" style={styles.statLabel}>Eventos este mes</span>
        </div>
      </div>

      <div className="portal-fade-in" style={{ ...styles.calendarioBox, animationDelay: '0.12s' }}>
        <PortalCalendario embedded />
      </div>

      {cargando && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          <SkeletonCard delay={0} />
          <SkeletonCard delay={0.05} />
          <SkeletonCard delay={0.1} />
        </div>
      )}

      {!cargando && esLiderConMinisterio && (
        <>
          <h2 className="portal-fade-in" style={{ ...styles.h2, color: accentColor, animationDelay: '0.18s' }}>
            Eventos donde te necesitan
          </h2>
          {misEventos.length === 0 && (
            <EstadoVacio mensaje="No hay eventos próximos que requieran tu ministerio." />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {misEventos.map((ev, i) => (
              <TarjetaEvento key={ev.id} ev={ev} delay={0.22 + i * 0.05} />
            ))}
          </div>

          <h2 className="portal-fade-in" style={styles.h2}>
            Otros eventos próximos
          </h2>
          {otrosEventos.length === 0 && (
            <EstadoVacio mensaje="No hay más eventos próximos registrados." />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {otrosEventos.map((ev, i) => (
              <TarjetaEvento key={ev.id} ev={ev} delay={0.3 + i * 0.05} />
            ))}
          </div>
        </>
      )}

      {!cargando && !esLiderConMinisterio && (
        <>
          <h2 className="portal-fade-in" style={{ ...styles.h2, animationDelay: '0.18s' }}>
            Próximos eventos
          </h2>
          {otrosEventos.length === 0 && (
            <EstadoVacio mensaje="No hay eventos próximos registrados." />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {otrosEventos.map((ev, i) => (
              <TarjetaEvento key={ev.id} ev={ev} delay={0.22 + i * 0.05} />
            ))}
          </div>
        </>
      )}

      <ActividadReciente />
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    fontFamily: 'Inter, sans-serif',
    padding: '32px',
    background: 'var(--portal-bg)',
    color: 'var(--portal-text)',
  },
  accentBar: { height: '4px', borderRadius: '4px', marginBottom: '20px', transition: 'background 0.3s ease' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap', position: 'relative', zIndex: 10 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '14px' },
  logo: { width: '48px', height: '48px', flexShrink: 0 },
  h1: { fontFamily: 'Montserrat, sans-serif', fontWeight: 900, margin: 0, color: 'var(--portal-text)' },
  h2: { fontFamily: 'Montserrat, sans-serif', fontWeight: 900, fontSize: '18px', color: 'var(--portal-text)', margin: '0 0 12px' },
  subtitle: { color: 'var(--portal-muted)', margin: '4px 0 0' },
  muted: { color: 'var(--portal-muted-2)' },
  statsRow: { display: 'flex', gap: '10px', marginBottom: '20px' },
statCard: {
  width: 'calc(50% - 5px)', boxSizing: 'border-box',
  padding: '10px 12px', borderRadius: '10px',
  background: 'var(--portal-card-bg)', border: '1px solid var(--portal-card-border)',
  display: 'flex', flexDirection: 'column', gap: '2px',
},
statNumber: { fontFamily: 'Montserrat, sans-serif', fontWeight: 900, fontSize: '20px', color: '#3DDC04' },
statLabel: { fontSize: '11px', color: 'var(--portal-muted)' },
  
  calendarioBox: {
    padding: '20px', borderRadius: '14px', background: 'var(--portal-card-bg)',
    border: '1px solid var(--portal-card-border)', marginBottom: '28px',
  },
  buttonPrimary: {
    padding: '10px 18px', borderRadius: '8px', background: '#3DDC04', color: '#0F0F12',
    fontWeight: 700, textDecoration: 'none', fontSize: '14px', whiteSpace: 'nowrap',
  },
  buttonIcono: {
    width: '38px', height: '38px', borderRadius: '8px',
    border: '1px solid var(--portal-button-secondary-border)', background: 'var(--portal-button-secondary-bg)',
    color: 'var(--portal-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  menuDropdown: {
    position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: '190px',
    background: 'var(--portal-card-bg)', border: '1px solid var(--portal-card-border)',
    borderRadius: '10px', boxShadow: '0 12px 32px rgba(0,0,0,0.22)', zIndex: 9999, overflow: 'hidden',
  },
  menuItem: {
    display: 'flex', alignItems: 'center', gap: '9px', width: '100%', padding: '11px 14px',
    border: 'none', borderBottom: '1px solid var(--portal-card-border)', cursor: 'pointer',
    fontSize: '13.5px', color: 'var(--portal-text)', fontFamily: 'Inter, sans-serif',
    textDecoration: 'none', background: 'none', boxSizing: 'border-box',
  },
  menuItemBoton: { borderBottom: 'none', color: '#F0997B' },
  card: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px',
    padding: '14px 16px', borderRadius: '10px',
    border: '1px solid var(--portal-card-border)', background: 'var(--portal-card-bg)',
  },
  cardTitle: { color: 'var(--portal-text)' },
  cardMeta: { margin: '4px 0 0', color: 'var(--portal-muted)', fontSize: '14px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '2px' },
  badgesRow: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' },
  ministerioBadge: {
    fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px',
    display: 'inline-flex', alignItems: 'center', gap: '4px',
  },
  badge: {
    fontSize: '12px', fontWeight: 600, textTransform: 'capitalize',
    padding: '4px 10px', borderRadius: '20px', background: 'var(--portal-badge-bg)', color: 'var(--portal-badge-text)',
    flexShrink: 0,
  },
  progresoContainer: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px', flexShrink: 0, minWidth: '84px' },
  progresoTexto: { fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' },
  progresoBarraFondo: { width: '80px', height: '5px', borderRadius: '10px', background: 'var(--portal-card-border)', overflow: 'hidden' },
  progresoBarraRelleno: { height: '100%', borderRadius: '10px', transition: 'width 0.3s ease' },
  skeletonCard: {
    padding: '14px 16px', borderRadius: '10px',
    border: '1px solid var(--portal-card-border)', background: 'var(--portal-card-bg)',
  },
  skeletonLine: {
    height: '12px', borderRadius: '6px',
    background: 'var(--portal-card-border)',
  },
  estadoVacio: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '28px 16px', textAlign: 'center',
  },
}