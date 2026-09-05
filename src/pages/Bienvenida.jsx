import { useState, useLayoutEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { crearNotificacionVisita } from '../portal/notificaciones'
import { ArrowLeft, ArrowRight, Users, Flame } from 'lucide-react'

const HORARIOS = [
  { dia: 'Domingo', hora: '9:45 AM' },
  { dia: 'Domingo', hora: '11:45 AM' },
  { dia: 'Miércoles', hora: '7:00 PM' },
  { dia: 'Lunes · Tabernáculo', hora: '7:30 PM' },
]

const SVG_INSTAGRAM = 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z'
const SVG_FACEBOOK = 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z'
const SVG_WHATSAPP = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z'

function IconoRedSvg({ path }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d={path} />
    </svg>
  )
}

function RedesMini({ redes, claseCaja }) {
  return (
    <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
      {redes.map((r) => (
        <a key={r.nombre} href={r.href} target="_blank" rel="noopener noreferrer" aria-label={r.nombre} title={r.nombre}
          className={claseCaja} style={r.style}>
          <IconoRedSvg path={r.svg} />
        </a>
      ))}
    </div>
  )
}

function Bienvenida() {
  const [modo, setModo] = useState('elegir')

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="bienvenida-page">
      <style>{`
        .bienvenida-page{ min-height:100vh; }
        .bienvenida-fade{ animation: bienvenidaFade 0.55s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes bienvenidaFade{
          from{ opacity:0; transform: translateY(22px) scale(0.98); }
          to{ opacity:1; transform: translateY(0) scale(1); }
        }
        .bienvenida-stagger > *{ animation: bienvenidaFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .bienvenida-stagger > *:nth-child(1){ animation-delay: 0.02s; }
        .bienvenida-stagger > *:nth-child(2){ animation-delay: 0.08s; }
        .bienvenida-stagger > *:nth-child(3){ animation-delay: 0.14s; }
        .bienvenida-stagger > *:nth-child(4){ animation-delay: 0.20s; }
        .bienvenida-stagger > *:nth-child(5){ animation-delay: 0.26s; }
        .bienvenida-stagger > *:nth-child(6){ animation-delay: 0.32s; }
        .bienvenida-stagger > *:nth-child(7){ animation-delay: 0.38s; }
        .bienvenida-stagger > *:nth-child(8){ animation-delay: 0.44s; }

        .bienvenida-card{ transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease; }
        .bienvenida-card:hover{ transform: translateY(-5px); }
        .bienvenida-card:active{ transform: translateY(-1px) scale(0.97); }
        .bienvenida-card-radgen{ transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .bienvenida-card-radgen:hover{ transform: translate(-3px,-3px); box-shadow: 11px 11px 0 #0F0F12; }
        .bienvenida-card-radgen:active{ transform: translate(2px,2px); box-shadow: 4px 4px 0 #0F0F12; }

        .bienvenida-volver{ transition: opacity 0.15s ease, transform 0.15s ease, border-color 0.15s ease, color 0.15s ease; }
        .bienvenida-volver:hover{ opacity:1 !important; transform: translateX(-3px); }
        .bienvenida-volver--general:hover{ border-color: var(--verde) !important; color: var(--verde) !important; }
        .bienvenida-volver--radgen:hover{ box-shadow: 5px 5px 0 #0F0F12 !important; transform: translate(-3px,-3px) !important; }

        .bienvenida-principal{ transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease; }
        .bienvenida-principal:hover{ transform: translateY(-2px); border-color: var(--verde) !important; color: var(--verde) !important; }

        .bienvenida-btn-verde{ transition: transform 0.15s ease, background-color 0.2s ease; }
        .bienvenida-btn-verde:hover{ transform: translateY(-2px); }
        .bienvenida-btn-verde:active{ transform: translateY(0) scale(0.98); }

        .bienvenida-btn-radgen{ transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .bienvenida-btn-radgen:hover{ transform: translate(-2px,-2px); box-shadow: 6px 6px 0 #0F0F12; }
        .bienvenida-btn-radgen:active{ transform: translate(2px,2px); box-shadow: 1px 1px 0 #0F0F12; }

        .bienvenida-red-box{
          width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center;
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
        }
        .bienvenida-red-box--general{
          background: var(--fondo-glass); border: 1px solid var(--borde-glass); color: var(--texto);
          -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
        }
        .bienvenida-red-box--general:hover{ border-color: var(--verde); color: var(--verde); transform: translateY(-3px); }
        .bienvenida-red-box--radgen{
          background:#F5F3EE; border:2.5px solid #0F0F12; color:#0F0F12; box-shadow:3px 3px 0 #0F0F12;
        }
        .bienvenida-red-box--radgen:hover{ transform: translate(-2px,-2px); box-shadow:5px 5px 0 #0F0F12; }
        .bienvenida-red-box--radgen:active{ transform: translate(1px,1px); box-shadow:1px 1px 0 #0F0F12; }
      `}</style>
      <div key={modo} className="bienvenida-fade">
        {modo === 'elegir' && <Elegir onElegir={setModo} />}
        {modo === 'general' && <ModoGeneral onVolver={() => setModo('elegir')} />}
        {modo === 'radgen' && <ModoRadgen onVolver={() => setModo('elegir')} />}
      </div>
    </div>
  )
}

function Elegir({ onElegir }) {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--fondo)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 1.5rem',
      textAlign: 'center',
    }}>
      <div className="bienvenida-stagger" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img src="/ACFC.webp" alt="Águilas CFC" width="56" height="56" style={{ width: '56px', height: '56px', marginBottom: '1.5rem' }} />
        <p style={{ color: 'var(--verde)', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          Bienvenido
        </p>
        <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 900, fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', color: 'var(--texto)', marginBottom: '0.75rem' }}>
          Nos alegra que estés aquí, ¿qué te trae hoy?
        </h1>
        <p style={{ color: 'var(--texto-suave)', fontSize: '0.95rem', marginBottom: '2.5rem', maxWidth: '360px' }}>
          Elige una opción y te mostramos justo lo que buscas.
        </p>

        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '640px' }}>
          <button onClick={() => onElegir('general')} className="bienvenida-card" style={{
            width: '260px', padding: '2rem 1.5rem', borderRadius: '20px', cursor: 'pointer',
            background: 'var(--verde)', border: '1px solid var(--verde)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.9rem',
          }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(0,0,0,0.15)', border: '1.5px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={24} strokeWidth={1.75} color="#fff" />
            </div>
            <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>Vengo al servicio</span>
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.82rem' }}>Horarios, qué esperar y cómo llegar</span>
          </button>

          <button onClick={() => onElegir('radgen')} className="bienvenida-card-radgen" style={{
            width: '260px', padding: '2rem 1.5rem', borderRadius: '20px', cursor: 'pointer',
            background: '#3a7bff', border: '3px solid #F5F3EE', boxShadow: '8px 8px 0 #0F0F12',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.9rem',
          }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#F5F3EE', border: '2.5px solid #0F0F12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Flame size={24} strokeWidth={2} color="#0F0F12" />
            </div>
            <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 900, fontSize: '1.05rem', color: '#F5F3EE', textTransform: 'uppercase' }}>Vengo a RadGen</span>
            <span style={{ color: '#EAF0FF', fontSize: '0.82rem', fontWeight: 600 }}>El espacio para jóvenes y adolescentes</span>
          </button>
        </div>

        <Link to="/" className="bienvenida-principal" style={{
          marginTop: '2.5rem', color: 'var(--texto)', fontSize: '0.85rem', fontWeight: 700,
          textDecoration: 'none', padding: '0.6rem 1.3rem', borderRadius: '999px',
          border: '1.5px solid var(--borde)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        }}>
          ← Ir al sitio principal
        </Link>
      </div>
    </div>
  )
}

function FormularioVisita({ modo, estiloInput, estiloBoton, textoBoton, colorTexto, classNameBoton }) {
  const [form, setForm] = useState({ nombre: '', telefono: '' })
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim() || !form.telefono.trim()) return
    setEnviando(true)
    try {
      await addDoc(collection(db, 'visitasNuevas'), {
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim(),
        modo,
        atendido: false,
        creado: serverTimestamp(),
      })
      crearNotificacionVisita({ nombre: form.nombre.trim(), telefono: form.telefono.trim(), modo })
      setEnviado(true)
    } catch (error) {
      console.error(error)
      alert('Hubo un error al enviar tus datos. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  if (enviado) {
    return (
      <p style={{ color: colorTexto, fontWeight: 700, fontSize: '0.9rem', textAlign: 'center' }}>
        ¡Gracias! Alguien del equipo te va a escribir pronto. 🙌
      </p>
    )
  }

  return (
    <form onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <input type="text" required placeholder="Tu nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} style={estiloInput} />
      <input type="tel" required placeholder="Tu WhatsApp" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} style={estiloInput} />
      <button type="submit" disabled={enviando} className={classNameBoton} style={estiloBoton}>
        {enviando ? 'Enviando...' : textoBoton}
      </button>
    </form>
  )
}

function ModoGeneral({ onVolver }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--fondo)', padding: '2rem 1.5rem 4rem' }}>
      <div className="bienvenida-stagger" style={{ maxWidth: '560px', margin: '0 auto' }}>
        <button onClick={onVolver} className="bienvenida-volver bienvenida-volver--general" style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          background: 'var(--fondo-glass)', border: '1px solid var(--borde-glass)',
          color: 'var(--texto-suave)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
          padding: '0.5rem 1rem', borderRadius: '999px', marginBottom: '2rem', opacity: 0.9,
        }}>
          <ArrowLeft size={15} /> Elegir de nuevo
        </button>

        <p style={{ color: 'var(--verde)', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          Qué bueno verte
        </p>
        <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 900, fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', color: 'var(--texto)', marginBottom: '1rem' }}>
          ¡Bienvenido a Águilas!
        </h1>
        <p style={{ color: 'var(--texto-suave)', fontSize: '0.95rem', marginBottom: '2.5rem', lineHeight: 1.7 }}>
          Somos una familia que cree en Jesús, la comunidad y que hay un lugar para ti tal como eres. Aquí tienes lo que necesitas saber.
        </p>

        <div className="glass-panel" style={{ borderRadius: '18px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: '0.9rem', color: 'var(--texto)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Horarios</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {HORARIOS.map((h) => (
              <div key={h.dia + h.hora} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--texto-suave)' }}>{h.dia}</span>
                <span style={{ color: 'var(--texto)', fontWeight: 700 }}>{h.hora}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel" style={{ borderRadius: '18px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: '0.9rem', color: 'var(--texto)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Qué esperar</h3>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--texto-suave)', fontSize: '0.88rem', lineHeight: 1.9 }}>
            <li>Llega unos minutos antes para que te ayudemos a encontrar lugar.</li>
            <li>El servicio dura aproximadamente 2 horas.</li>
            <li>Tenemos espacio para niños durante el servicio.</li>
            <li>Alguien del equipo de consolidación te va a recibir en la entrada.</li>
          </ul>
        </div>

        <div className="glass-panel" style={{ borderRadius: '18px', padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: '0.9rem', color: 'var(--texto)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Déjanos tus datos</h3>
          <FormularioVisita
            modo="general"
            textoBoton="Enviar"
            colorTexto="var(--texto)"
            classNameBoton="bienvenida-btn-verde"
            estiloInput={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--borde)', backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--texto)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', boxSizing: 'border-box' }}
            estiloBoton={{ backgroundColor: 'var(--verde)', color: '#000', border: 'none', padding: '0.85rem', borderRadius: '999px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', fontSize: '0.9rem', cursor: 'pointer' }}
          />
        </div>

        <a
          href="https://wa.me/527711107903?text=Hola,%20soy%20nuevo%20y%20quiero%20saber%20m%C3%A1s"
          target="_blank" rel="noopener noreferrer"
          style={{ display: 'block', textAlign: 'center', color: 'var(--verde)', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', marginBottom: '2rem' }}
        >
          O escríbenos directo por WhatsApp →
        </a>

        <RedesMini
          claseCaja="bienvenida-red-box bienvenida-red-box--general"
          redes={[
            { nombre: 'Instagram', href: 'https://www.instagram.com/aguilascfctizayuca', svg: SVG_INSTAGRAM },
            { nombre: 'Facebook', href: 'https://www.facebook.com/share/1DtXzksGaU/?mibextid=wwXIfr', svg: SVG_FACEBOOK },
            { nombre: 'WhatsApp', href: 'https://wa.me/527711107903?text=Hola,%20me%20interesa%20saber%20mas%20sobre%20Aguilas%20CFC', svg: SVG_WHATSAPP },
          ]}
        />
      </div>
    </div>
  )
}

function ModoRadgen({ onVolver }) {
  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#101014', padding: '2rem 1.5rem 4rem',
      backgroundImage: 'radial-gradient(rgba(245,243,238,0.07) 1.5px, transparent 1.5px)',
      backgroundSize: '24px 24px',
    }}>
      <style>{`
        .bienvenida-radgen h1, .bienvenida-radgen h3{ font-family:'Montserrat',sans-serif; font-weight:900; text-transform:uppercase; color:#F5F3EE; }
        .bienvenida-radgen input{
          width:100%; border:2.5px solid #0F0F12; border-radius:12px; padding:12px 14px;
          font-family:'Inter',sans-serif; font-size:14.5px; font-weight:600; color:#0F0F12;
          background:#fff; box-sizing:border-box;
        }
        .bienvenida-radgen input:focus{ outline:2.5px solid #3a7bff; }
      `}</style>
      <div className="bienvenida-radgen bienvenida-stagger" style={{ maxWidth: '560px', margin: '0 auto' }}>
        <button onClick={onVolver} className="bienvenida-volver bienvenida-volver--radgen" style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          background: '#F5F3EE', border: '2px solid #0F0F12', color: '#0F0F12',
          fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          padding: '0.5rem 1rem', borderRadius: '999px', marginBottom: '2rem',
          boxShadow: '3px 3px 0 #0F0F12', opacity: 1,
        }}>
          <ArrowLeft size={15} /> Elegir de nuevo
        </button>

        <span style={{
          display: 'inline-block', background: '#FF3B3B', color: '#F5F3EE', border: '3px solid #0F0F12',
          borderRadius: '999px', padding: '8px 18px', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase',
          letterSpacing: '0.03em', boxShadow: '4px 4px 0 #F5F3EE', marginBottom: '24px', fontFamily: 'Montserrat, sans-serif',
          transform: 'rotate(-2deg)',
        }}>
          🔥 Ministerio de jóvenes
        </span>
        <h1 style={{ fontSize: 'clamp(28px, 6vw, 40px)', marginBottom: '16px', lineHeight: 1.05 }}>
          ¡Bienvenido a <span style={{ color: '#8fb4ff' }}>RadGen</span>!
        </h1>
        <p style={{ color: '#C9C8C4', fontSize: '15px', marginBottom: '28px', fontWeight: 500 }}>
          Este es tu espacio: fe real, amigos de verdad y un propósito que vale la pena. Aquí tienes lo básico para empezar.
        </p>

        <div style={{ background: '#F5F3EE', border: '3px solid #0F0F12', borderRadius: '18px', padding: '22px', marginBottom: '18px', boxShadow: '6px 6px 0 #3a7bff' }}>
          <h3 style={{ color: '#0F0F12', fontSize: '13px', marginBottom: '12px' }}>Reuniones</h3>
          <p style={{ color: '#4c4c4c', fontSize: '14px', fontWeight: 600, margin: 0 }}>3 sábados por mes · pregunta al equipo la próxima fecha</p>
        </div>

        <div style={{ background: '#F5F3EE', border: '3px solid #0F0F12', borderRadius: '18px', padding: '22px', marginBottom: '24px', boxShadow: '6px 6px 0 #FF3B3B' }}>
          <h3 style={{ color: '#0F0F12', fontSize: '13px', marginBottom: '12px' }}>Déjanos tus datos</h3>
          <FormularioVisita
            modo="radgen"
            textoBoton="Enviar"
            colorTexto="#0F0F12"
            classNameBoton="bienvenida-btn-radgen"
            estiloInput={{}}
            estiloBoton={{
              background: '#3a7bff', color: '#F5F3EE', border: '2.5px solid #0F0F12', borderRadius: '999px',
              padding: '12px', fontWeight: 900, fontFamily: 'Montserrat, sans-serif', fontSize: '13px',
              textTransform: 'uppercase', cursor: 'pointer', boxShadow: '4px 4px 0 #0F0F12',
            }}
          />
        </div>

        <Link to="/radgen" className="bienvenida-btn-radgen" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          background: '#0F0F12', color: '#F5F3EE', border: '3px solid #F5F3EE', borderRadius: '999px',
          padding: '14px', fontFamily: 'Montserrat, sans-serif', fontWeight: 900, fontSize: '13px',
          textTransform: 'uppercase', textDecoration: 'none', boxShadow: '5px 5px 0 #3a7bff',
        }}>
          Ver todo sobre RadGen <ArrowRight size={15} strokeWidth={2.5} />
        </Link>

        <div style={{ marginTop: '2rem' }}>
          <RedesMini
            claseCaja="bienvenida-red-box bienvenida-red-box--radgen"
            redes={[
              { nombre: 'Instagram RadGen', href: 'https://www.instagram.com/radgen.mx/', svg: SVG_INSTAGRAM },
              { nombre: 'WhatsApp', href: 'https://wa.me/527711107903?text=Hola,%20soy%20nuevo%20en%20RadGen', svg: SVG_WHATSAPP },
            ]}
          />
        </div>
      </div>
    </div>
  )
}

export default Bienvenida
