import { useEffect, useState, useRef, useLayoutEffect } from 'react'
import { Bell, BellOff, Calendar, Package, UserPlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { usePortalAuth } from './PortalAuthContext'
import { escucharNotificaciones, marcarComoLeida } from './notificaciones'
import './portal.css'

export default function NotificacionesBell() {
  const { userData, user } = usePortalAuth()
  const navigate = useNavigate()
  const [notificaciones, setNotificaciones] = useState([])
  const [abierto, setAbierto] = useState(false)
  const [posicion, setPosicion] = useState({ top: 0, left: 0 })
  const cajaRef = useRef(null)
  const botonRef = useRef(null)

  const ministerioId = userData?.rol === 'lider' ? userData?.ministerio
    : userData?.rol === 'pastor' ? 'pastor'
    : userData?.rol === 'administrativo' ? 'administrativo'
    : null

  useEffect(() => {
    if (!ministerioId) return
    const unsub = escucharNotificaciones(ministerioId, setNotificaciones)
    return unsub
  }, [ministerioId])

  useEffect(() => {
    function clickFuera(e) {
      if (cajaRef.current && !cajaRef.current.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', clickFuera)
    return () => document.removeEventListener('mousedown', clickFuera)
  }, [])

  useLayoutEffect(() => {
    if (!abierto || !botonRef.current) return

    function calcularPosicion() {
      const rect = botonRef.current.getBoundingClientRect()
      const margen = 12
      const anchoDropdown = Math.min(300, window.innerWidth - margen * 2)

      let left = rect.right - anchoDropdown
      if (left < margen) left = margen
      if (left + anchoDropdown > window.innerWidth - margen) {
        left = window.innerWidth - margen - anchoDropdown
      }

      setPosicion({ top: rect.bottom + 8, left, width: anchoDropdown })
    }

    calcularPosicion()
    window.addEventListener('resize', calcularPosicion)
    return () => window.removeEventListener('resize', calcularPosicion)
  }, [abierto])

  if (!ministerioId) return null

  const noLeidas = notificaciones.filter((n) => !n.leidoPor?.includes(user?.email))

  function abrirNotificacion(n) {
    if (!n.leidoPor?.includes(user?.email)) marcarComoLeida(n.id, user?.email)
    setAbierto(false)
    if (n.eventoId) navigate(`/lideres/eventos/${n.eventoId}/editar`)
    else if (n.itemId) navigate('/lideres/inventario')
    else if (n.tipo === 'visita') navigate('/lideres/visitas')
  }

  function iconoNotificacion(n) {
    if (n.eventoId) return <Calendar size={15} strokeWidth={2} />
    if (n.itemId) return <Package size={15} strokeWidth={2} />
    if (n.tipo === 'visita') return <UserPlus size={15} strokeWidth={2} />
    return <Bell size={15} strokeWidth={2} />
  }

  function formatearFecha(n) {
    if (!n.createdAt?.toDate) return ''
    return n.createdAt.toDate().toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div ref={cajaRef} style={{ position: 'relative' }}>
      <button
        ref={botonRef}
        onClick={() => setAbierto((v) => !v)}
        style={styles.botonCampana}
        aria-label="Notificaciones"
      >
        <Bell size={19} strokeWidth={2.1} />
        {noLeidas.length > 0 && <span style={styles.badgeContador}>{noLeidas.length > 9 ? '9+' : noLeidas.length}</span>}
      </button>

      {abierto && (
        <div
          className="portal-fade-in"
          style={{
            ...styles.dropdown, top: posicion.top, left: posicion.left, width: posicion.width,
            maxHeight: `min(420px, calc(100vh - ${posicion.top}px - 16px))`,
          }}
        >
          <div style={styles.dropdownHeader}>
            <span>Notificaciones</span>
            {noLeidas.length > 0 && <span style={styles.headerBadge}>{noLeidas.length} nueva{noLeidas.length === 1 ? '' : 's'}</span>}
          </div>
          {notificaciones.length === 0 && (
            <div style={styles.vacio}>
              <BellOff size={22} strokeWidth={1.5} color="var(--portal-muted-2)" />
              <p style={{ margin: '8px 0 0', fontSize: '13px' }}>No tienes notificaciones todavía.</p>
            </div>
          )}
          <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {notificaciones.slice(0, 15).map((n) => {
              const noLeida = !n.leidoPor?.includes(user?.email)
              return (
                <button
                  key={n.id}
                  onClick={() => abrirNotificacion(n)}
                  style={{ ...styles.item, background: noLeida ? 'var(--portal-badge-bg)' : 'transparent' }}
                >
                  <span style={{ ...styles.iconoBox, color: noLeida ? '#3DDC04' : 'var(--portal-muted-2)' }}>
                    {iconoNotificacion(n)}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ ...styles.itemTexto, fontWeight: noLeida ? 700 : 400 }}>{n.texto}</span>
                    <span style={styles.itemFecha}>{formatearFecha(n)}</span>
                  </span>
                  {noLeida && <span style={styles.puntoNoLeido} />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  botonCampana: {
    position: 'relative', width: '38px', height: '38px', borderRadius: '8px',
    border: '1px solid var(--portal-button-secondary-border)', background: 'var(--portal-button-secondary-bg)',
    color: 'var(--portal-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  badgeContador: {
    position: 'absolute', top: '-5px', right: '-5px', background: '#FF3B3B', color: '#fff',
    fontSize: '10px', fontWeight: 700, borderRadius: '10px', minWidth: '16px', height: '16px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
  },
  dropdown: {
    position: 'fixed', background: 'var(--portal-card-bg)', border: '1px solid var(--portal-card-border)',
    borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.22)', zIndex: 9999,
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  dropdownHeader: {
    padding: '13px 14px', fontWeight: 700, fontSize: '13px', color: 'var(--portal-text)',
    borderBottom: '1px solid var(--portal-card-border)', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', flexShrink: 0,
  },
  headerBadge: {
    fontSize: '11px', fontWeight: 700, color: '#3DDC04', background: 'rgba(61,220,4,0.15)',
    padding: '2px 8px', borderRadius: '20px',
  },
  vacio: {
    padding: '28px 14px', fontSize: '13px', color: 'var(--portal-muted-2)', margin: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
  },
  item: {
    display: 'flex', alignItems: 'flex-start', gap: '10px', width: '100%', padding: '11px 14px',
    border: 'none', borderBottom: '1px solid var(--portal-card-border)', cursor: 'pointer',
    fontSize: '13px', color: 'var(--portal-text)', fontFamily: 'Inter, sans-serif', textAlign: 'left',
    transition: 'background 0.15s ease',
  },
  iconoBox: {
    width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--portal-button-secondary-bg)', border: '1px solid var(--portal-card-border)',
  },
  itemTexto: { display: 'block', lineHeight: 1.4, wordBreak: 'break-word' },
  itemFecha: { display: 'block', marginTop: '3px', fontSize: '11px', color: 'var(--portal-muted-2)' },
  puntoNoLeido: { width: '7px', height: '7px', borderRadius: '50%', background: '#3DDC04', flexShrink: 0, marginTop: '5px' },
}