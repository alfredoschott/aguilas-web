import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import LinkSitio from './LinkSitio'
import { urlRadgen } from '../dominios'

const SECCIONES_NAV = ['servicios', 'nosotros', 'valores', 'contacto']

function Navbar({ logoVisible }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [seccionActiva, setSeccionActiva] = useState('')

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const secciones = SECCIONES_NAV
      .map(id => document.getElementById(id))
      .filter(Boolean)
    if (secciones.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setSeccionActiva(entry.target.id)
        })
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    )
    secciones.forEach(sec => observer.observe(sec))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuAbierto ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuAbierto])

  const handleNavClick = (href) => {
    setMenuAbierto(false)
    const target = document.querySelector(href)
    if (!target) return
    const reveals = target.querySelectorAll('.reveal')
    reveals.forEach(el => {
      el.classList.remove('visible')
      setTimeout(() => el.classList.add('visible'), 400)
    })
  }

  return (
    <>
      <nav className={scrolled ? 'scrolled' : ''} style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: 'calc(1rem + env(safe-area-inset-top)) 1.5rem 1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: scrolled || menuAbierto ? 'var(--nav-glass-bg)' : 'transparent',
        backdropFilter: scrolled || menuAbierto ? 'blur(20px) saturate(110%)' : 'none',
        WebkitBackdropFilter: scrolled || menuAbierto ? 'blur(20px) saturate(110%)' : 'none',
        willChange: 'backdrop-filter',
        borderBottom: scrolled ? '1px solid var(--borde)' : 'none',
        transition: 'background-color 0.4s ease, backdrop-filter 0.4s ease',
      }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img
            src="/ACFC.webp"
            alt="Águilas CFC"
            width="36"
            height="36"
            style={{
              width: '36px',
              height: '36px',
              opacity: logoVisible ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          />
          <span style={{
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: '700',
            fontSize: '0.95rem',
            color: scrolled ? 'var(--texto)' : '#ffffff',
            letterSpacing: '0.05em',
            whiteSpace: 'nowrap',
          }}>
            ÁGUILAS CFC TIZAYUCA
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} className="nav-desktop">
          <a href="#servicios" onClick={() => handleNavClick('#servicios')} className={`nav-pill${seccionActiva === 'servicios' ? ' active' : ''}`}>Servicios</a>
          <a href="#nosotros" onClick={() => handleNavClick('#nosotros')} className={`nav-pill${seccionActiva === 'nosotros' ? ' active' : ''}`}>Nosotros</a>
          <a href="#valores" onClick={() => handleNavClick('#valores')} className={`nav-pill${seccionActiva === 'valores' ? ' active' : ''}`}>Valores</a>
          <a href="#contacto" onClick={() => handleNavClick('#contacto')} className={`nav-pill${seccionActiva === 'contacto' ? ' active' : ''}`}>Contacto</a>
          <Link to="/lideres" onClick={() => setMenuAbierto(false)} className="nav-pill">Líderes</Link>
          <LinkSitio to={urlRadgen()} onClick={() => setMenuAbierto(false)} className="nav-pill-radgen">
            <span className="nav-pill-radgen__dot" />
            RadGen Mx
          </LinkSitio>
        </div>

        <button
          aria-label={menuAbierto ? 'Cerrar menu' : 'Abrir menu'}
          onClick={() => setMenuAbierto(!menuAbierto)}
          className="nav-hamburger"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.5rem',
            display: 'none',
            flexDirection: 'column',
            gap: '5px',
          }}

        >
          <span style={{ display: 'block', width: '22px', height: '2px', backgroundColor: scrolled || menuAbierto ? 'var(--texto)' : '#ffffff', transition: 'all 0.3s', transform: menuAbierto ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
          <span style={{ display: 'block', width: '22px', height: '2px', backgroundColor: scrolled || menuAbierto ? 'var(--texto)' : '#ffffff', transition: 'all 0.3s', opacity: menuAbierto ? 0 : 1 }} />
          <span style={{ display: 'block', width: '22px', height: '2px', backgroundColor: scrolled || menuAbierto ? 'var(--texto)' : '#ffffff', transition: 'all 0.3s', transform: menuAbierto ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
        </button>

      </nav>

      <div
        onClick={() => setMenuAbierto(false)}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 98,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          opacity: menuAbierto ? 1 : 0,
          pointerEvents: menuAbierto ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />

      <div style={{
        position: 'fixed',
        top: 'calc(64px + env(safe-area-inset-top))',
        left: 0,
        right: 0,
        zIndex: 99,
        backgroundColor: 'var(--nav-glass-bg)',
        backdropFilter: 'blur(24px) saturate(110%)',
        WebkitBackdropFilter: 'blur(24px) saturate(110%)',
        willChange: 'backdrop-filter',
        borderBottom: '1px solid var(--borde)',
        boxShadow: menuAbierto ? '0 16px 32px rgba(0, 0, 0, 0.18)' : 'none',
        padding: menuAbierto ? '1.5rem' : '0 1.5rem',
        maxHeight: menuAbierto ? '300px' : '0',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '0.6rem',
      }}>
        <a href="#servicios" onClick={() => handleNavClick('#servicios')} className={`nav-pill-movil${seccionActiva === 'servicios' ? ' active' : ''}`}>Servicios</a>
        <a href="#nosotros" onClick={() => handleNavClick('#nosotros')} className={`nav-pill-movil${seccionActiva === 'nosotros' ? ' active' : ''}`}>Nosotros</a>
        <a href="#valores" onClick={() => handleNavClick('#valores')} className={`nav-pill-movil${seccionActiva === 'valores' ? ' active' : ''}`}>Valores</a>
        <a href="#contacto" onClick={() => handleNavClick('#contacto')} className={`nav-pill-movil${seccionActiva === 'contacto' ? ' active' : ''}`}>Contacto</a>
        <Link to="/lideres" onClick={() => setMenuAbierto(false)} className="nav-pill-movil">Líderes</Link>
        <LinkSitio to={urlRadgen()} onClick={() => setMenuAbierto(false)} className="nav-pill-radgen-movil">
          <span className="nav-pill-radgen__dot" />
          RadGen Mx
        </LinkSitio>
      </div>
    </>
  )
}

export default Navbar