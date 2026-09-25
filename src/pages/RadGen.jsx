import { useState, useEffect, useLayoutEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, doc, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { VERSION_AVISO } from '../legal/datosResponsable'
import {
  ArrowLeft,
  Crown,
  HeartPulse,
  Sparkles,
  Flame,
  BookOpen,
  ShieldCheck,
  Users,
  HandHeart,
  Megaphone,
  ChevronDown,
  ChevronRight,
  ImageOff,
  Check,
  Clock,
  Trophy,
  X,
} from 'lucide-react'
import RadGenSplash from '../components/RadGenSplash'

const SKY_POSES = ['/sky-mascota.png', '/sky-mascota-2.png', '/sky-mascota-3.png']
const SKY_FRASES = [
  '¡Soy Sky! 🦅',
  '¿Ya te apuntaste? 👀',
  '¡Qué onda! 🤙',
  'Vamos que se puede 🔥',
  'Toca de nuevo 😎',
]

const QUIZ = [
  {
    q: '¿Qué tanto conoces la Biblia?',
    opciones: [
      { texto: 'Casi nada, apenas empiezo', pts: 1 },
      { texto: 'Lo básico, voy aprendiendo', pts: 2 },
      { texto: 'Bastante, la leo seguido', pts: 3 },
    ],
  },
  {
    q: '¿Invitarías a un amigo a RadGen?',
    opciones: [
      { texto: 'Tal vez, lo pensaría', pts: 1 },
      { texto: 'Sí, a uno o dos', pts: 2 },
      { texto: 'Ya invité a varios 😄', pts: 3 },
    ],
  },
  {
    q: '¿Qué tan seguido oras o buscas a Dios?',
    opciones: [
      { texto: 'Casi no', pts: 1 },
      { texto: 'De vez en cuando', pts: 2 },
      { texto: 'Todos los días', pts: 3 },
    ],
  },
]

const QUIZ_RESULTADOS = [
  { min: 3, max: 4, titulo: 'Vas empezando 🌱', desc: 'Y está perfecto — todos empezamos así. RadGen es justo para crecer desde aquí.' },
  { min: 5, max: 7, titulo: 'Ya la traes 🔥', desc: 'Vas en buen camino. En RadGen le seguimos dando juntos.' },
  { min: 8, max: 9, titulo: 'Full RadGen 🦅', desc: '¡Eres pura generación radical! Ven y sé ejemplo para los demás.' },
]

function resultadoQuiz(pts) {
  return QUIZ_RESULTADOS.find((r) => pts >= r.min && pts <= r.max) || QUIZ_RESULTADOS[0]
}

function lanzarConfeti() {
  const colores = ['#3a7bff', '#FF3B3B', '#F5F3EE', '#8fb4ff']
  const contenedor = document.createElement('div')
  contenedor.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:999;overflow:hidden;'
  document.body.appendChild(contenedor)

  for (let i = 0; i < 44; i++) {
    const pieza = document.createElement('span')
    const izquierda = Math.random() * 100
    const retraso = Math.random() * 0.3
    const duracion = 1.6 + Math.random() * 1.2
    const rotacion = Math.random() * 360
    pieza.style.cssText = `
      position:absolute; top:-20px; left:${izquierda}vw; width:9px; height:9px;
      background:${colores[i % colores.length]}; border:1.5px solid #0F0F12;
      transform: rotate(${rotacion}deg);
      animation: radgenConfeti ${duracion}s ease-in ${retraso}s forwards;
    `
    contenedor.appendChild(pieza)
  }

  setTimeout(() => contenedor.remove(), 3200)
}

function vibrar(patron) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(patron)
}

function IconoInstagram(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18" {...props}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}

const FAQS = [
  { q: '¿Necesito ser parte de Águilas CFC para venir?', a: 'No. Cualquier adolescente o joven es bienvenido, seas parte de la iglesia o sea tu primera vez.' },
  { q: '¿Puedo invitar a un amigo?', a: 'Claro, entre más mejor. Solo tráelo cualquier sábado de reunión.' },
  { q: '¿Tiene algún costo?', a: 'No, las reuniones son completamente gratuitas.' },
  { q: '¿Qué debo llevar?', a: 'Solo tus ganas de conocer a Dios. Si tienes biblia, tráela; si no, en la reunión te apoyamos.' },
]

const PROPOSITO = [
  { icon: Crown, titulo: 'Identidad del reino', color: 'b' },
  { icon: HeartPulse, titulo: 'Carácter saludable', color: 'r' },
  { icon: Sparkles, titulo: 'Dones y ministerio', color: 'p' },
  { icon: Flame, titulo: 'Pasión por las almas', color: 'b' },
]

const VISION = [
  'Que amen a Dios por sobretodo',
  'Sirvan apasionadamente',
  'Influyan en su entorno',
  'Hagan discípulos',
]

const COMO = [
  'Dirección de Dios',
  'Reuniones relevantes (3 sábados por mes)',
  'Discipulado',
  'Fraternidad genuina',
  'Servicio dentro y fuera de la iglesia',
  'Seguimiento puntual con cada uno',
]

const PILARES = [
  { icon: BookOpen, titulo: 'Conocer a Dios', desc: 'Oración, biblia y adoración', color: 'g' },
  { icon: ShieldCheck, titulo: 'Identidad', desc: 'Sanidad del alma, pureza y propósito', color: 'b' },
  { icon: Users, titulo: 'Comunidad', desc: 'Amistad, integración y relaciones sanas', color: 'gray' },
  { icon: HandHeart, titulo: 'Servicio', desc: 'Aplicación de los dones e involucrar en actividades de la iglesia', color: 'g' },
  { icon: Megaphone, titulo: 'Multiplicación', desc: 'Evangelismo, invita a un amigo y ayuda a un hermano', color: 'r' },
]

function RadGen() {
  const [visionCompleta, setVisionCompleta] = useState(false)
  const [quizCompleto, setQuizCompleto] = useState(false)
  const [logroVisto, setLogroVisto] = useState(false)
  const logroDesbloqueado = visionCompleta && quizCompleto

  const celebrarSiListo = (otroYaCompleto) => {
    if (otroYaCompleto && !logroVisto) {
      setLogroVisto(true)
      lanzarConfeti()
      vibrar([15, 40, 15, 40, 15])
    }
  }

  // Al entrar desde un link de otra página (ej. la promo en el sitio
  // principal), React Router no resetea el scroll — se quedaba en la
  // posición de la página anterior en vez de abrir arriba.
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="radgen-nb">
      <RadGenSplash />
      <LogroToast visible={logroDesbloqueado} />

      <style>{`
        .radgen-nb{
          --ink: #0F0F12;
          --paper: #F5F3EE;
          --blue: #3a7bff;
          --blue-light: #8fb4ff;
          --red: #FF3B3B;
          --bg: #101014;
          --bw: 3px;
          background-color: var(--bg);
          background-image: radial-gradient(rgba(245,243,238,0.07) 1.5px, transparent 1.5px);
          background-size: 24px 24px;
          color: var(--ink);
          font-family: 'Inter', sans-serif;
          line-height: 1.55;
          min-height: 100vh;
        }
        .radgen-nb h1, .radgen-nb h2, .radgen-nb h3{
          font-family: 'Montserrat', sans-serif;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: -0.01em;
          color: var(--paper);
        }
        .radgen-nb .wrap{ max-width: 1180px; margin: 0 auto; padding: 0 5%; }

        .radgen-nb nav{
          display:flex; align-items:center; justify-content:space-between;
          padding: 20px 5%; border-bottom: var(--bw) solid var(--paper);
          position: relative; z-index: 2;
        }
        .radgen-nb .logo{ display:flex; align-items:center; gap:12px; }
        .radgen-nb .logo img{ height:52px; width:auto; display:block; }
        .radgen-nb .nav-links{ display:flex; gap:24px; }
        .radgen-nb .nav-links a{ color:var(--paper); text-decoration:none; font-weight:700; font-size:13px; text-transform:uppercase; letter-spacing:0.02em; opacity:0.85; }
        .radgen-nb .nav-links a:hover{ opacity:1; }
        .radgen-nb .nav-actions{ display:flex; align-items:center; gap:10px; }

        .radgen-nb .btn{
          display:inline-flex; align-items:center; gap:8px;
          font-family:'Montserrat',sans-serif; font-weight:900; text-transform:uppercase;
          border: var(--bw) solid var(--ink); border-radius:12px; cursor:pointer;
          font-size:13px; padding:11px 20px; text-decoration:none; transition: transform 0.12s ease, box-shadow 0.12s ease;
        }
        .radgen-nb .btn-blue{ background: var(--blue); color:var(--paper); border-color: var(--paper); box-shadow: 5px 5px 0 var(--paper); }
        .radgen-nb .btn-blue:hover, .radgen-nb .btn-blue:active{ transform:translate(3px,3px); box-shadow:2px 2px 0 var(--paper); }
        .radgen-nb .btn-outline{ background: var(--ink); color:var(--paper); border-color: var(--paper); box-shadow: 5px 5px 0 var(--blue); }
        .radgen-nb .btn-outline:hover, .radgen-nb .btn-outline:active{ transform:translate(3px,3px); box-shadow:2px 2px 0 var(--blue); }
        .radgen-nb .btn-insta{
          background: linear-gradient(135deg, #f58529, #dd2a7b, #8134af, #515bd4);
          color:#fff; border-color: var(--ink); box-shadow: 5px 5px 0 var(--red);
        }
        .radgen-nb .btn-insta:hover, .radgen-nb .btn-insta:active{ transform:translate(3px,3px); box-shadow:2px 2px 0 var(--red); }

        .radgen-nb .hero{
          display:flex; align-items:center; gap:56px; flex-wrap:wrap;
          padding: 64px 5% 80px; position: relative; z-index: 1;
        }
        .radgen-nb .hero-copy{ flex:1 1 440px; min-width:300px; }
        .radgen-nb .tag-pill{
          display:inline-block; background:var(--red); color:var(--paper);
          border: var(--bw) solid var(--ink); border-radius:999px; padding:8px 18px;
          font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:0.03em;
          box-shadow:4px 4px 0 var(--paper); margin-bottom:24px; font-family:'Montserrat',sans-serif;
          transform: rotate(-2deg);
        }
        .radgen-nb .hero-copy h1{ font-size: clamp(32px,4.4vw,54px); margin-bottom:20px; line-height: 1.05; }
        .radgen-nb .hero-copy h1 span{ color: var(--blue-light); }
        .radgen-nb .hero-copy p{ color:#C9C8C4; font-size:16px; max-width:440px; font-weight:500; margin-bottom:30px; }
        .radgen-nb .hero-actions{ display:flex; gap:14px; flex-wrap:wrap; }

        .radgen-nb .hero-visual{ flex:1 1 340px; min-width:280px; position:relative; display:flex; justify-content:center; }
        .radgen-nb .mascot-card{
          background: var(--paper); border: var(--bw) solid var(--ink); border-radius:26px;
          box-shadow: 14px 14px 0 var(--blue);
          padding: 18px 24px 0; width:100%; max-width:320px; position:relative;
          display:flex; align-items:flex-end; justify-content:center; overflow:visible;
          cursor: pointer; user-select:none; transition: transform 0.1s ease;
        }
        .radgen-nb .mascot-card:active{ transform: scale(0.97); }
        .radgen-nb .mascot-card img{ width:100%; max-width: 250px; display:block; pointer-events:none; }
        .radgen-nb .mascot-hint{
          position:absolute; bottom:-30px; left:50%; transform:translateX(-50%);
          font-size:11px; font-weight:700; color:#8a8a90; white-space:nowrap;
          font-family:'Inter',sans-serif;
        }
        .radgen-nb .float-badge{
          position:absolute; background: var(--paper); border: var(--bw) solid var(--ink);
          border-radius:12px; padding:10px 14px; font-weight:800; font-size:13px;
          box-shadow: 5px 5px 0 var(--ink); font-family:'Montserrat',sans-serif; white-space: nowrap;
        }
        .radgen-nb .badge-1{ top:-20px; left:-24px; background: var(--red); color: var(--paper); transform: rotate(-4deg); }
        .radgen-nb .badge-2{ top:26px; right:-22px; background: var(--blue); color: var(--paper); transform: rotate(4deg); }

        .radgen-nb section{ padding: 60px 5%; position: relative; z-index: 1; }
        .radgen-nb .section-head{ max-width:640px; margin:0 auto 40px; }
        .radgen-nb .section-head h2{ font-size: clamp(24px,3.2vw,34px); margin-bottom:10px; }
        .radgen-nb .section-head p{ color:#C9C8C4; font-size:15px; font-weight:500; }
        .radgen-nb .eyebrow{
          display:inline-block; font-family:'Montserrat',sans-serif; font-weight:800; font-size:12px;
          text-transform:uppercase; letter-spacing:0.08em; color: var(--blue-light); margin-bottom:10px;
        }

        .radgen-nb .chip-row{ display:flex; flex-wrap:wrap; gap:14px; justify-content:center; }
        .radgen-nb .chip{
          display:inline-flex; align-items:center; gap:10px;
          border: var(--bw) solid var(--ink); border-radius:999px; padding:10px 20px 10px 10px;
          box-shadow: 5px 5px 0 var(--paper);
          font-family:'Montserrat',sans-serif; font-weight:800; font-size:13.5px; text-transform:uppercase;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .radgen-nb .chip:hover{ transform: translate(-2px,-2px); box-shadow: 7px 7px 0 var(--paper); }
        .radgen-nb .chip.b{ background: var(--blue); color: var(--paper); }
        .radgen-nb .chip.r{ background: var(--red); color: var(--paper); }
        .radgen-nb .chip.p{ background: var(--paper); color: var(--ink); }
        .radgen-nb .chip-icon{
          width:32px; height:32px; border-radius:999px; background:var(--paper);
          border: 2px solid var(--ink); display:flex; align-items:center; justify-content:center;
          color: var(--ink); flex-shrink:0;
        }
        .radgen-nb .chip.p .chip-icon{ background: var(--blue); color: var(--paper); }

        .radgen-nb .vision-grid{ display:grid; grid-template-columns:1fr 1fr; gap:40px; max-width:920px; margin:0 auto; align-items:start; }
        .radgen-nb .mini-label{
          display:block; font-family:'Montserrat',sans-serif; font-weight:800; font-size:12px;
          text-transform:uppercase; letter-spacing:0.05em; color: var(--paper); opacity:0.6; margin-bottom:12px;
        }
        .radgen-nb .check-list{ display:flex; flex-direction:column; gap:14px; list-style:none; }
        .radgen-nb .check-list li{ display:flex; gap:12px; align-items:center; }
        .radgen-nb .check-list b{
          width:26px; height:26px; border-radius:7px; background:var(--blue);
          border: 2.5px solid var(--paper); display:flex; align-items:center; justify-content:center;
          font-size:13px; flex-shrink:0; color: var(--paper);
        }
        .radgen-nb .check-list span{ color: var(--paper); font-size:14.5px; font-weight:600; }

        .radgen-nb .path-card{
          flex:1 1 340px; min-width:280px; max-width:400px; margin:0 auto;
          background: var(--paper); border: var(--bw) solid var(--ink); border-radius:22px;
          padding: 20px; box-shadow: 10px 10px 0 var(--blue);
        }
        .radgen-nb .row-item{
          width:100%; display:flex; align-items:center; gap:12px; border: 2.5px solid var(--ink);
          border-radius:12px; padding:12px; margin-bottom:12px; background:var(--paper);
          cursor:pointer; font-family:'Inter',sans-serif; text-align:left;
          transition: background-color 0.2s ease, transform 0.12s ease, box-shadow 0.15s ease;
        }
        .radgen-nb .row-item:last-child{ margin-bottom:0; }
        .radgen-nb .row-item:hover{ transform: translate(-2px,-2px); box-shadow: 3px 3px 0 var(--blue); }
        .radgen-nb .row-item.marcado{ background:#EAF0FF; box-shadow: 3px 3px 0 var(--red); }
        .radgen-nb .row-num{
          width:32px; height:32px; border-radius:9px; border:2.5px solid var(--ink);
          display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0;
          background: var(--blue); color: var(--paper); font-family:'Montserrat',sans-serif; font-weight:900;
          transition: background-color 0.2s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .radgen-nb .row-item.marcado .row-num{ background: var(--red); transform: scale(1.12) rotate(-6deg); }
        .radgen-nb .row-item span{ font-size:13.5px; font-weight:700; color: var(--ink); }
        .radgen-nb .vision-hint{ font-size:11.5px; font-weight:600; color:#7c7a76; text-align:center; margin-top:10px; }

        .radgen-nb .pilares-head{ text-align:center; max-width:520px; margin:0 auto 44px; }
        .radgen-nb .pilar-tag{
          display:inline-block; background: var(--red); color: var(--paper); border: 2.5px solid var(--ink);
          border-radius:999px; padding:6px 16px; font-weight:800; font-size:12px; text-transform:uppercase;
          font-family:'Montserrat',sans-serif; margin-bottom:16px;
        }
        .radgen-nb .pilar-list{ display:grid; grid-template-columns:1fr 1fr; gap:12px; max-width:760px; margin:0 auto; }
        .radgen-nb .pilar-row{
          display:flex; align-items:center; gap:12px; border: 2.5px solid var(--ink); border-radius:14px;
          padding: 12px 14px; background: var(--paper);
          transition: transform 0.15s ease, box-shadow 0.15s ease; box-shadow: 0 0 0 var(--blue);
        }
        .radgen-nb .pilar-row:hover{ transform: translate(-2px,-2px); box-shadow: 4px 4px 0 var(--blue); }
        .radgen-nb .pilar-icon{
          width:38px; height:38px; border-radius:10px; border: 2px solid var(--ink);
          display:flex; align-items:center; justify-content:center; flex-shrink:0;
        }
        .radgen-nb .pilar-icon.g{ background:#DCE8FF; color: var(--ink); }
        .radgen-nb .pilar-icon.b{ background:var(--blue); color:var(--paper); }
        .radgen-nb .pilar-icon.r{ background:var(--red); color:var(--paper); }
        .radgen-nb .pilar-icon.gray{ background:#DAD9D2; color: var(--ink); }
        .radgen-nb .pilar-row b{ display:block; font-size:13px; color: var(--ink); font-family:'Montserrat',sans-serif; text-transform:uppercase; }
        .radgen-nb .pilar-row span{ font-size:11.5px; font-weight:600; color:#4c4c4c; line-height:1.3; }

        .radgen-nb .edu-card{
          max-width: 980px; margin: 0 auto; position: relative;
          background: var(--blue); border: var(--bw) solid var(--paper); border-radius: 28px;
          box-shadow: 12px 12px 0 var(--red);
          padding: 40px 6%; overflow: hidden;
          display:flex; align-items:center; justify-content:center; gap:44px;
        }
        .radgen-nb .edu-card::before{
          content:''; position:absolute; inset:0;
          background-image: radial-gradient(rgba(245,243,238,0.14) 1.5px, transparent 1.5px);
          background-size: 18px 18px; pointer-events:none;
        }
        .radgen-nb .edu-texto{ position:relative; text-align:left; }
        .radgen-nb .edu-badge{
          position: relative; display:inline-flex; align-items:center; gap:8px;
          background: var(--red); color:var(--paper); border: 2.5px solid var(--paper);
          border-radius:999px; padding:7px 16px; font-weight:800; font-size:12px;
          text-transform:uppercase; letter-spacing:0.04em; font-family:'Montserrat',sans-serif;
          margin-bottom:18px; transform: rotate(-2deg);
        }
        .radgen-nb .edu-logo{
          position:relative; display:block; height:130px; width:auto; margin-bottom:20px;
          filter: drop-shadow(4px 5px 0 rgba(0,0,0,0.25));
        }
        .radgen-nb .edu-card h2{ position: relative; font-size: clamp(26px,3.4vw,38px); margin-bottom:14px; }
        .radgen-nb .edu-card p{ position: relative; color:#EAF0FF; max-width:420px; margin:0 0 6px; font-size:15px; font-weight:600; }

        .radgen-nb .edu-badge-glow{ animation: eduBadgePulso 2s ease-in-out infinite; }
        @keyframes eduBadgePulso{
          0%,100%{ box-shadow: 0 0 0 0 rgba(245,243,238,0.55); }
          50%{ box-shadow: 0 0 0 8px rgba(245,243,238,0); }
        }

        .radgen-nb .edu-features{
          position:relative; display:flex; flex-wrap:wrap; gap:10px; margin:16px 0 6px;
        }
        .radgen-nb .edu-feature{
          display:inline-flex; align-items:center; gap:6px;
          background: rgba(245,243,238,0.14); border: 2px solid var(--paper); color:var(--paper);
          border-radius:999px; padding:6px 14px; font-weight:800; font-size:12.5px;
          font-family:'Montserrat',sans-serif; text-transform:uppercase; letter-spacing:0.02em;
          transition: transform 0.15s ease, background-color 0.15s ease;
        }
        .radgen-nb .edu-feature:hover{ transform:translateY(-2px); background: rgba(245,243,238,0.26); }

        .radgen-nb .edu-cta{ margin-top:16px; }
        .radgen-nb .edu-cta-flecha{ display:inline-block; transition: transform 0.15s ease; }
        .radgen-nb .edu-cta:hover .edu-cta-flecha{ transform: translateX(4px); }

        .radgen-nb .edu-sky-wrap{ position:relative; flex-shrink:0; }
        .radgen-nb .edu-sky{
          position: relative; height:220px; width:auto;
          filter: drop-shadow(6px 8px 0 rgba(0,0,0,0.28));
          animation: eduSkyFlotar 3.4s ease-in-out infinite;
        }
        @keyframes eduSkyFlotar{
          0%,100%{ transform: translateY(0) rotate(-1.5deg); }
          50%{ transform: translateY(-12px) rotate(1.5deg); }
        }
        .radgen-nb .edu-float-badge{
          top:-14px; right:-18px; transform: rotate(5deg);
          background: var(--red); color: var(--paper); font-size:12px;
          animation: eduSkyFlotar 3.4s ease-in-out infinite reverse;
        }

        .radgen-nb .galeria-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
        .radgen-nb .galeria-frame{
          background: var(--paper); border: var(--bw) solid var(--ink); border-radius:14px;
          padding: 8px 8px 22px; box-shadow: 6px 6px 0 var(--blue);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .radgen-nb .galeria-frame:nth-child(3n+1){ transform: rotate(-2deg); }
        .radgen-nb .galeria-frame:nth-child(3n+2){ transform: rotate(1.5deg); }
        .radgen-nb .galeria-frame:nth-child(3n){ transform: rotate(-1deg); }
        .radgen-nb .galeria-frame:hover{ transform: rotate(0deg) translateY(-4px); box-shadow: 9px 9px 0 var(--blue); }
        .radgen-nb .galeria-frame img{ width:100%; aspect-ratio: 1/1; object-fit:cover; border-radius:6px; display:block; }
        .radgen-nb .galeria-empty{
          max-width:520px; margin:0 auto; text-align:center; border: var(--bw) dashed var(--paper);
          border-radius:20px; padding:40px 24px; color:#C9C8C4;
        }
        .radgen-nb .galeria-empty svg{ color: var(--blue-light); margin-bottom:14px; }
        .radgen-nb .galeria-empty p{ font-size:14.5px; font-weight:600; }

        .radgen-nb .faq-list{ display:flex; flex-direction:column; gap:14px; max-width:720px; margin:0 auto; }
        .radgen-nb .faq-item{
          border: var(--bw) solid var(--ink); border-radius:16px; background: var(--paper); overflow:hidden;
        }
        .radgen-nb .faq-question{
          width:100%; display:flex; align-items:center; justify-content:space-between; gap:12px;
          background:none; border:none; cursor:pointer; padding:18px 22px; text-align:left;
          font-family:'Montserrat',sans-serif; font-weight:800; font-size:14.5px; color:var(--ink);
          text-transform: uppercase;
        }
        .radgen-nb .faq-question svg{ flex-shrink:0; transition: transform 0.2s ease; color: var(--blue); }
        .radgen-nb .faq-item.open .faq-question svg{ transform: rotate(180deg); }
        .radgen-nb .faq-answer{ max-height:0; overflow:hidden; transition: max-height 0.25s ease; }
        .radgen-nb .faq-item.open .faq-answer{ max-height:200px; }
        .radgen-nb .faq-answer p{ padding: 0 22px 20px; font-size:14px; font-weight:500; color:#4c4c4c; }

        .radgen-nb .insta-strip{
          max-width:520px; margin:32px auto 0;
          background: var(--paper); border: 2.5px solid var(--ink); border-radius:20px;
          padding: 16px 16px 16px 20px; box-shadow: 5px 5px 0 var(--red);
        }
        .radgen-nb .insta-strip-top{ display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:12px; }
        .radgen-nb .insta-strip-top span{
          display:inline-flex; align-items:center; gap:8px; color: var(--ink);
          font-family:'Montserrat',sans-serif; font-weight:800; font-size:13.5px;
        }
        .radgen-nb .insta-strip .btn{ padding:9px 18px; font-size:12px; }
        .radgen-nb .insta-tags{ display:flex; gap:8px; flex-wrap:wrap; }
        .radgen-nb .insta-tag{
          border: 2px solid var(--ink); border-radius:999px; padding:5px 12px; font-size:11px;
          font-weight:800; font-family:'Montserrat',sans-serif; text-transform:uppercase; color: var(--ink); background: #fff;
        }

        .radgen-nb .registro-card{
          max-width: 560px; margin:0 auto;
          background: var(--paper); border: var(--bw) solid var(--ink); border-radius:24px;
          padding: 36px 5%; box-shadow: 10px 10px 0 var(--blue);
        }
        .radgen-nb .registro-card h2{ color: var(--ink); text-align:center; font-size: clamp(22px,3vw,28px); margin-bottom:8px; }
        .radgen-nb .registro-card > p{ color:#4c4c4c; text-align:center; font-size:14px; font-weight:600; margin-bottom:26px; }
        .radgen-nb .registro-form{ display:flex; flex-direction:column; gap:16px; }
        .radgen-nb .registro-form label{
          display:block; font-family:'Montserrat',sans-serif; font-weight:800; font-size:11.5px;
          text-transform:uppercase; letter-spacing:0.04em; color: var(--ink); margin-bottom:6px;
        }
        .radgen-nb .registro-form input, .radgen-nb .registro-form textarea{
          width:100%; border: 2.5px solid var(--ink); border-radius:12px; padding:12px 14px;
          font-family:'Inter',sans-serif; font-size:14.5px; font-weight:600; color:var(--ink);
          background:#fff; box-sizing:border-box; resize:vertical;
        }
        .radgen-nb .registro-form input:focus, .radgen-nb .registro-form textarea:focus{ outline:2.5px solid var(--blue); }
        .radgen-nb .registro-submit{ width:100%; justify-content:center; margin-top:4px; }
        .radgen-nb .registro-submit:disabled{ opacity:0.6; cursor:default; }
        .radgen-nb .registro-ok{ text-align:center; padding: 20px 0; }
        .radgen-nb .registro-ok b{ display:block; font-family:'Montserrat',sans-serif; font-weight:900; font-size:18px; color:var(--ink); margin-bottom:6px; text-transform:uppercase; }
        .radgen-nb .registro-ok span{ color:#4c4c4c; font-size:14px; font-weight:600; }

        .radgen-nb .cuenta-wrap{ padding: 0 5% 60px; position:relative; z-index:1; }
        .radgen-nb .cuenta-card{
          max-width: 640px; margin:0 auto; text-align:center; position:relative;
          background: var(--red); border: var(--bw) solid var(--ink); border-radius:22px;
          padding: 26px 24px; box-shadow: 8px 8px 0 var(--blue);
          transform: rotate(-1deg);
        }
        .radgen-nb .cuenta-label{
          display:inline-flex; align-items:center; gap:6px;
          font-family:'Montserrat',sans-serif; font-weight:800; font-size:12px; text-transform:uppercase;
          letter-spacing:0.05em; color:var(--paper); opacity:0.9; margin-bottom:14px;
        }
        .radgen-nb .cuenta-clock{ animation: cuentaTick 1s steps(4) infinite; }
        .radgen-nb .cuenta-grid{ display:flex; gap:10px; justify-content:center; flex-wrap:wrap; align-items:center; }
        .radgen-nb .cuenta-box{
          background: var(--paper); border: 2.5px solid var(--ink); border-radius:12px;
          padding:10px 14px; min-width:64px;
        }
        .radgen-nb .cuenta-box b{
          display:block; font-family:'Montserrat',sans-serif; font-weight:900; font-size:26px; color:var(--ink);
          font-variant-numeric: tabular-nums; line-height:1.1;
        }
        .radgen-nb .cuenta-box span{ font-size:10px; font-weight:700; text-transform:uppercase; color:#6c6c6c; letter-spacing:0.04em; }
        .radgen-nb .cuenta-box.seg{
          background: var(--blue); border-color: var(--ink);
          animation: cuentaPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .radgen-nb .cuenta-box.seg b{ color: var(--paper); }
        .radgen-nb .cuenta-box.seg span{ color:#EAF0FF; }
        .radgen-nb .cuenta-lugar{ margin-top:14px; font-size:13px; font-weight:700; color:var(--paper); opacity:0.95; }

        @keyframes cuentaPop{
          0%{ transform: scale(1.28) rotate(-4deg); }
          60%{ transform: scale(0.94) rotate(2deg); }
          100%{ transform: scale(1) rotate(0deg); }
        }
        @keyframes cuentaTick{
          0%, 100%{ transform: rotate(0deg); }
          50%{ transform: rotate(-12deg); }
        }

        .radgen-nb .quiz-card{
          max-width: 560px; margin:0 auto;
          background: var(--paper); border: var(--bw) solid var(--ink); border-radius:24px;
          padding: 32px 5%; box-shadow: 10px 10px 0 var(--red); text-align:center;
        }
        .radgen-nb .quiz-progreso{ display:flex; gap:6px; justify-content:center; margin-bottom:22px; }
        .radgen-nb .quiz-punto{ width:24px; height:6px; border-radius:999px; background:#DAD9D2; border:1.5px solid var(--ink); }
        .radgen-nb .quiz-punto.activo{ background: var(--blue); }
        .radgen-nb .quiz-card h3{ color:var(--ink); font-size:18px; margin-bottom:20px; text-transform:none; font-weight:800; }
        .radgen-nb .quiz-opciones{ display:flex; flex-direction:column; gap:10px; }
        .radgen-nb .quiz-opcion{
          border: 2.5px solid var(--ink); border-radius:12px; padding:13px 16px; background:#fff;
          font-family:'Inter',sans-serif; font-weight:600; font-size:14px; color:var(--ink);
          cursor:pointer; text-align:left; display:flex; align-items:center; justify-content:space-between; gap:10px;
          transition: transform 0.12s ease, box-shadow 0.12s ease, background-color 0.12s ease;
        }
        .radgen-nb .quiz-opcion:hover{ background: var(--blue); color:var(--paper); transform: translate(-2px,-2px); box-shadow: 3px 3px 0 var(--ink); }
        .radgen-nb .quiz-resultado b{ display:block; font-family:'Montserrat',sans-serif; font-weight:900; font-size:22px; color:var(--ink); text-transform:uppercase; margin-bottom:10px; }
        .radgen-nb .quiz-resultado p{ color:#4c4c4c; font-size:14px; font-weight:600; margin-bottom:22px; }
        .radgen-nb .quiz-reiniciar{ background:none; border:none; color:#8a8a90; font-size:12px; font-weight:700; cursor:pointer; margin-top:14px; text-decoration:underline; }

        @keyframes radgenConfeti{
          to{ transform: translateY(105vh) rotate(540deg); opacity:0.2; }
        }

        .radgen-nb .logro-toast{
          position: fixed; left:50%; bottom:24px; transform: translateX(-50%);
          z-index: 200; display:flex; align-items:center; gap:14px;
          max-width: min(92vw, 420px);
          background: var(--blue); border: var(--bw) solid var(--ink); border-radius:18px;
          padding: 16px 40px 16px 16px; box-shadow: 7px 7px 0 var(--red);
          animation: logroEntrar 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .radgen-nb .logro-icono{
          width:44px; height:44px; border-radius:12px; flex-shrink:0;
          background: var(--paper); border: 2px solid var(--ink); color: var(--ink);
          display:flex; align-items:center; justify-content:center;
        }
        .radgen-nb .logro-toast b{
          display:block; font-family:'Montserrat',sans-serif; font-weight:900; font-size:13.5px;
          color: var(--paper); text-transform:uppercase; margin-bottom:4px; line-height:1.2;
        }
        .radgen-nb .logro-toast span{ font-size:12px; font-weight:600; color:#EAF0FF; line-height:1.4; }
        .radgen-nb .logro-cerrar{
          position:absolute; top:8px; right:8px; width:22px; height:22px; border-radius:50%;
          background: var(--paper); border: 2px solid var(--ink); color: var(--ink);
          display:flex; align-items:center; justify-content:center; cursor:pointer; padding:0;
        }
        @keyframes logroEntrar{
          0%{ transform: translateX(-50%) translateY(40px); opacity:0; }
          100%{ transform: translateX(-50%) translateY(0); opacity:1; }
        }
        @media (max-width:480px){
          .radgen-nb .logro-toast{ bottom:12px; }
        }

        .radgen-nb .footer-cta{
          text-align:center; padding: 80px 5% 50px; border-top: var(--bw) solid var(--paper);
        }
        .radgen-nb .footer-cta h2{ font-size: clamp(28px,3.8vw,44px); margin-bottom:20px; }
        .radgen-nb .footer-cta h2 span{ color:var(--blue-light); }
        .radgen-nb .footer-cta p{ color:#C9C8C4; margin-bottom:30px; font-size:15px; font-weight:500; }
        .radgen-nb .footer-brand{ margin-top:64px; display:flex; flex-direction:column; align-items:center; gap:10px; }
        .radgen-nb .footer-brand img{ height:30px; width:auto; opacity:0.9; }
        .radgen-nb .footer-brand-name{ font-family:'Montserrat',sans-serif; font-weight:900; font-size:15px; color:var(--paper); letter-spacing:0.03em; text-transform:uppercase; }
        .radgen-nb .footer-brand-copy{ font-size:11.5px; color:#8a8a90; font-weight:700; letter-spacing:0.02em; }
        .radgen-nb .footer-brand-legal a{ color:#b9b9bf; }
        .radgen-nb .registro-form .registro-consentimiento{
          display:flex; gap:10px; align-items:flex-start; margin:0; cursor:pointer;
          font-family:'Inter',sans-serif; font-size:13px; line-height:1.5; font-weight:600;
          text-transform:none; letter-spacing:0; color:#3a3a3a;
        }
        .radgen-nb .registro-form .registro-consentimiento input{
          width:18px; height:18px; padding:0; margin:2px 0 0; flex-shrink:0; accent-color:var(--blue);
        }
        .radgen-nb .registro-form .registro-consentimiento a{ color:var(--ink); text-decoration:underline; }

        @media (max-width:760px){
          .radgen-nb .nav-links{ display:none; }
          .radgen-nb .galeria-grid{ grid-template-columns:1fr 1fr; }
          .radgen-nb .vision-grid{ grid-template-columns:1fr; gap:32px; }
          .radgen-nb .edu-card{ flex-direction:column-reverse; text-align:center; padding:36px 7% 32px; gap:24px; }
          .radgen-nb .edu-texto{ text-align:center; }
          .radgen-nb .edu-logo{ height:100px; margin:0 auto 16px; }
          .radgen-nb .edu-card p{ max-width:360px; margin:0 auto 6px; }
          .radgen-nb .edu-features{ justify-content:center; }
          .radgen-nb .edu-sky{ height:170px; }
          .radgen-nb .edu-float-badge{ top:-10px; right:6px; }
        }
        @media (max-width:480px){
          .radgen-nb .nav-back span{ display:none; }
          .radgen-nb .nav-back{ padding:11px 13px; }
          .radgen-nb .pilar-list{ grid-template-columns:1fr; }
        }
      `}</style>

      <nav>
        <div className="logo">
          <img src="/radgen-logo.png" alt="Logo RadGen" />
        </div>
        <div className="nav-links">
          <a href="#proposito">Propósito</a>
          <a href="#vision">Visión</a>
          <a href="#pilares">Pilares</a>
          <a href="#galeria">Galería</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="nav-actions">
          <Link to="/" className="btn btn-outline nav-back">
            <ArrowLeft size={15} strokeWidth={2.5} />
            <span>Águilas CFC</span>
          </Link>
          <Link to="/radgen/education" className="btn btn-blue">Education</Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <span className="tag-pill">🔥 Ministerio de jóvenes</span>
          <h1>Una generación con <span>identidad</span> y propósito.</h1>
          <p>RadGen es tu lugar: fe real, amigos de verdad y un propósito que vale la pena.</p>
          <div className="hero-actions">
            <a href="#registro" className="btn btn-blue">Ya quiero ir</a>
            <a href="#proposito" className="btn btn-outline">Conoce el ministerio</a>
            <a href="https://www.instagram.com/radgen.mx/" target="_blank" rel="noopener noreferrer" className="btn btn-insta">
              <IconoInstagram size={15} /> Síguenos en Insta
            </a>
          </div>
        </div>

        <div className="hero-visual">
          <SkyInteractivo />
        </div>
      </section>

      <div className="cuenta-wrap">
        <ProximaReunion />
      </div>

      <section id="educacion">
        <div className="edu-card">
          <div className="edu-texto">
            <span className="edu-badge edu-badge-glow">✅ Ya disponible</span>
            <img src="/radgen-education-logo.png" alt="RadGen Education" className="edu-logo" />
            <h2>RadGen Education</h2>
            <p>Una plataforma para crecer en tu fe a tu ritmo. Entra con Google y empieza tus lecciones.</p>
            <div className="edu-features">
              <span className="edu-feature">🎓 Lecciones</span>
              <span className="edu-feature">🏆 Insignias</span>
              <span className="edu-feature">🔥 Rachas</span>
              <span className="edu-feature">👑 Rangos</span>
            </div>
            <Link to="/radgen/education" className="btn btn-outline edu-cta">
              Entrar a RadGen Education <span className="edu-cta-flecha">→</span>
            </Link>
          </div>
          <div className="edu-sky-wrap">
            <img src="/sky-estudiando.png" alt="Sky estudiando" className="edu-sky" />
            <div className="float-badge edu-float-badge">🔥 Rachas semanales</div>
          </div>
        </div>
      </section>

      <section id="proposito">
        <div className="section-head">
          <span className="eyebrow">Nuestro propósito</span>
          <h2>Esto queremos formar en ti</h2>
        </div>
        <div className="chip-row">
          {PROPOSITO.map(({ icon: Icon, titulo, color }) => (
            <div key={titulo} className={`chip ${color}`}>
              <div className="chip-icon"><Icon size={16} strokeWidth={2.5} /></div>
              {titulo}
            </div>
          ))}
        </div>
      </section>

      <section id="vision">
        <div className="section-head">
          <span className="eyebrow">Visión</span>
          <h2>Así nos gustaría verte</h2>
          <p>No buscamos solo llenar sillas, buscamos vidas que le den la vuelta a todo.</p>
        </div>
        <div className="vision-grid">
          <div>
            <span className="mini-label">Lo que soñamos</span>
            <VisionInteractiva onCompletar={() => { setVisionCompleta(true); celebrarSiListo(quizCompleto) }} />
          </div>
          <div>
            <span className="mini-label">¿Cómo?</span>
            <ul className="check-list">
              {COMO.map((item) => (
                <li key={item}>
                  <b>✓</b>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="pilares">
        <div className="pilares-head">
          <span className="pilar-tag">En esto nos ponemos las pilas</span>
          <h2>Nuestros pilares</h2>
        </div>
        <div className="pilar-list">
          {PILARES.map(({ icon: Icon, titulo, desc, color }) => (
            <div key={titulo} className="pilar-row">
              <div className={`pilar-icon ${color}`}><Icon size={18} strokeWidth={2.25} /></div>
              <div>
                <b>{titulo}</b>
                <span>{desc}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="quiz">
        <div className="section-head">
          <span className="eyebrow">Solo por diversión</span>
          <h2>¿Qué tan RadGen eres?</h2>
        </div>
        <QuizRadgen onCompletar={() => { setQuizCompleto(true); celebrarSiListo(visionCompleta) }} />
      </section>

      <section id="galeria">
        <div className="section-head">
          <span className="eyebrow">Nuestra gente</span>
          <h2>Así se ve esto 📸</h2>
        </div>
        <GaleriaRadgen />
        <div className="insta-strip">
          <div className="insta-strip-top">
            <span><IconoInstagram size={16} /> @radgen.mx</span>
            <a href="https://www.instagram.com/radgen.mx/" target="_blank" rel="noopener noreferrer" className="btn btn-blue">Seguir</a>
          </div>
          <div className="insta-tags">
            <span className="insta-tag">Reels</span>
            <span className="insta-tag">Historias</span>
            <span className="insta-tag">Detrás de cámaras</span>
          </div>
        </div>
      </section>

      <section id="registro">
        <div className="registro-card">
          <h2>Únete a RadGen</h2>
          <p>Déjanos tus datos y el equipo te contacta para que vengas a la próxima reunión.</p>
          <FormularioRegistro />
        </div>
      </section>

      <section id="faq">
        <div className="section-head">
          <span className="eyebrow">Preguntas frecuentes</span>
          <h2>Lo que más nos preguntan</h2>
        </div>
        <FaqAcordeon />
      </section>

      <section className="footer-cta">
        <h2>Tu lugar en esta <span>generación</span></h2>
        <p>Ven un sábado. Así de fácil.</p>
        <a href="#registro" className="btn btn-blue">Quiero unirme</a>
        <div className="footer-brand">
          <img src="/radgen-logo.png" alt="Logo RadGen" />
          <span className="footer-brand-name">Radical Generation México</span>
          <span className="footer-brand-copy">© 2026 Águilas Centro Familiar Cristiano Tizayuca</span>
          <span className="footer-brand-copy footer-brand-legal">
            <Link to="/privacidad">Aviso de privacidad</Link> · <Link to="/terminos">Términos de RadGen Education</Link>
          </span>
        </div>
      </section>
    </div>
  )
}

function LogroToast({ visible }) {
  const [cerrado, setCerrado] = useState(false)
  if (!visible || cerrado) return null

  return (
    <div className="logro-toast">
      <button className="logro-cerrar" onClick={() => setCerrado(true)} aria-label="Cerrar">
        <X size={14} strokeWidth={3} />
      </button>
      <div className="logro-icono"><Trophy size={22} strokeWidth={2.25} /></div>
      <div>
        <b>¡Desbloqueaste el modo RadGen! 🏆</b>
        <span>Completaste la Visión y el quiz. Eres pura generación radical.</span>
      </div>
    </div>
  )
}

function SkyInteractivo() {
  const [pose, setPose] = useState(0)
  const [frase, setFrase] = useState(SKY_FRASES[0])

  const tocar = () => {
    setPose((p) => (p + 1) % SKY_POSES.length)
    setFrase(SKY_FRASES[Math.floor(Math.random() * SKY_FRASES.length)])
    vibrar(10)
  }

  return (
    <div
      className="mascot-card"
      onClick={tocar}
      role="button"
      tabIndex={0}
      aria-label="Tocar a Sky"
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') tocar() }}
    >
      <img src={SKY_POSES[pose]} alt="Sky, mascota de RadGen" />
      <div className="float-badge badge-1">{frase}</div>
      <div className="float-badge badge-2">RADGEN MX</div>
      <span className="mascot-hint">👆 Toca a Sky</span>
    </div>
  )
}

function ProximaReunion() {
  const [config, setConfig] = useState(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'radgenConfig', 'proximaReunion'),
      (snap) => setConfig(snap.exists() ? snap.data() : null),
      () => setConfig(null)
    )
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!config?.fecha) return
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [config])

  if (!config?.fecha) return null

  const objetivo = new Date(config.fecha + 'T' + (config.hora || '00:00') + ':00')
  const diff = objetivo - new Date()
  if (diff <= 0) return null

  const pad = (n) => String(n).padStart(2, '0')
  const tiempo = {
    dias: Math.floor(diff / 86400000),
    horas: pad(Math.floor((diff / 3600000) % 24)),
    minutos: pad(Math.floor((diff / 60000) % 60)),
    segundos: pad(Math.floor((diff / 1000) % 60)),
  }

  return (
    <div className="cuenta-card">
      <span className="cuenta-label"><Clock size={14} strokeWidth={2.5} className="cuenta-clock" /> Próxima reunión</span>
      <div className="cuenta-grid">
        <div className="cuenta-box"><b>{tiempo.dias}</b><span>Días</span></div>
        <div className="cuenta-box"><b>{tiempo.horas}</b><span>Horas</span></div>
        <div className="cuenta-box"><b>{tiempo.minutos}</b><span>Min</span></div>
        <div className="cuenta-box seg" key={tiempo.segundos}><b>{tiempo.segundos}</b><span>Seg</span></div>
      </div>
      {config.lugar && <p className="cuenta-lugar">📍 {config.lugar}</p>}
    </div>
  )
}

function QuizRadgen({ onCompletar }) {
  const [paso, setPaso] = useState(0)
  const [puntos, setPuntos] = useState(0)
  const [terminado, setTerminado] = useState(false)

  const elegir = (pts) => {
    vibrar(10)
    const nuevosPuntos = puntos + pts
    if (paso + 1 < QUIZ.length) {
      setPuntos(nuevosPuntos)
      setPaso(paso + 1)
    } else {
      setPuntos(nuevosPuntos)
      setTerminado(true)
      onCompletar?.()
    }
  }

  const reiniciar = () => {
    setPaso(0)
    setPuntos(0)
    setTerminado(false)
  }

  if (terminado) {
    const resultado = resultadoQuiz(puntos)
    return (
      <div className="quiz-card quiz-resultado">
        <b>{resultado.titulo}</b>
        <p>{resultado.desc}</p>
        <a href="#registro" className="btn btn-blue">Quiero unirme</a>
        <div>
          <button className="quiz-reiniciar" onClick={reiniciar}>Volver a intentar</button>
        </div>
      </div>
    )
  }

  const actual = QUIZ[paso]

  return (
    <div className="quiz-card">
      <div className="quiz-progreso">
        {QUIZ.map((_, i) => (
          <div key={i} className={`quiz-punto${i <= paso ? ' activo' : ''}`} />
        ))}
      </div>
      <h3>{actual.q}</h3>
      <div className="quiz-opciones">
        {actual.opciones.map((op) => (
          <button key={op.texto} className="quiz-opcion" onClick={() => elegir(op.pts)}>
            {op.texto}
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        ))}
      </div>
    </div>
  )
}

function VisionInteractiva({ onCompletar }) {
  const [marcados, setMarcados] = useState(() => VISION.map(() => false))
  const total = marcados.filter(Boolean).length

  const alternar = (i) => {
    vibrar(10)
    setMarcados((prev) => {
      const siguiente = prev.map((v, idx) => (idx === i ? !v : v))
      if (siguiente.every(Boolean)) onCompletar?.()
      return siguiente
    })
  }

  return (
    <div>
      <div className="path-card">
        {VISION.map((item, i) => (
          <button
            key={item}
            type="button"
            className={`row-item${marcados[i] ? ' marcado' : ''}`}
            onClick={() => alternar(i)}
            aria-pressed={marcados[i]}
          >
            <div className="row-num">{marcados[i] ? <Check size={15} strokeWidth={3} /> : i + 1}</div>
            <span>{item}</span>
          </button>
        ))}
      </div>
      <p className="vision-hint">
        {total === 0 && 'Toca las que ya vives 👆'}
        {total > 0 && total < VISION.length && `Vas viviendo ${total} de ${VISION.length} 🔥`}
        {total === VISION.length && '¡Las vives todas! Eso es RadGen 🙌'}
      </p>
    </div>
  )
}

function GaleriaRadgen() {
  const [fotos, setFotos] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'galeria'),
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        const deRadgen = docs.filter((d) => d.seccion === 'radgen')
        deRadgen.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
        setFotos(deRadgen)
        setCargando(false)
      },
      () => setCargando(false)
    )
    return () => unsubscribe()
  }, [])

  if (cargando) return null

  if (fotos.length === 0) {
    return (
      <div className="galeria-empty">
        <ImageOff size={32} strokeWidth={1.75} />
        <p>Muy pronto compartiremos aquí fotos de nuestras reuniones.</p>
      </div>
    )
  }

  return (
    <div className="galeria-grid">
      {fotos.map((f, i) => (
        <div key={f.id} className="galeria-frame">
          <img src={f.imagenUrl} alt={`Momento RadGen ${i + 1}`} loading="lazy" />
        </div>
      ))}
    </div>
  )
}

function FaqAcordeon() {
  const [abierta, setAbierta] = useState(0)

  return (
    <div className="faq-list">
      {FAQS.map((item, i) => (
        <div key={item.q} className={`faq-item ${abierta === i ? 'open' : ''}`}>
          <button className="faq-question" onClick={() => setAbierta(abierta === i ? -1 : i)}>
            {item.q}
            <ChevronDown size={18} strokeWidth={2.5} />
          </button>
          <div className="faq-answer">
            <p>{item.a}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function FormularioRegistro() {
  const [form, setForm] = useState({ nombre: '', telefono: '', edad: '', mensaje: '' })
  const [acepto, setAcepto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const cambiar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  const enviar = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim() || !form.telefono.trim() || !acepto) return
    setEnviando(true)
    try {
      await addDoc(collection(db, 'radgenRegistros'), {
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim(),
        edad: form.edad.trim() || null,
        mensaje: form.mensaje.trim() || null,
        aceptoPrivacidad: true,
        versionAviso: VERSION_AVISO,
        atendido: false,
        creado: serverTimestamp(),
      })
      setEnviado(true)
      lanzarConfeti()
      vibrar([15, 40, 15])
    } catch (error) {
      console.error(error)
      alert('Hubo un error al enviar tus datos. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  if (enviado) {
    return (
      <div className="registro-ok">
        <b>¡Listo! 🎉</b>
        <span>Ya tenemos tus datos, el equipo de RadGen te va a contactar pronto.</span>
      </div>
    )
  }

  return (
    <form className="registro-form" onSubmit={enviar}>
      <div>
        <label htmlFor="rg-nombre">Nombre</label>
        <input id="rg-nombre" type="text" required value={form.nombre} onChange={cambiar('nombre')} placeholder="Tu nombre" />
      </div>
      <div>
        <label htmlFor="rg-telefono">Teléfono / WhatsApp</label>
        <input id="rg-telefono" type="tel" required value={form.telefono} onChange={cambiar('telefono')} placeholder="771 123 4567" />
      </div>
      <div>
        <label htmlFor="rg-edad">Edad (opcional)</label>
        <input id="rg-edad" type="number" min="10" max="30" value={form.edad} onChange={cambiar('edad')} placeholder="16" />
      </div>
      <div>
        <label htmlFor="rg-mensaje">Mensaje (opcional)</label>
        <textarea id="rg-mensaje" rows={3} value={form.mensaje} onChange={cambiar('mensaje')} placeholder="Cuéntanos algo, o pregúntanos lo que quieras" />
      </div>
      <label className="registro-consentimiento">
        <input type="checkbox" required checked={acepto} onChange={(e) => setAcepto(e.target.checked)} />
        <span>
          Acepto el <Link to="/privacidad" target="_blank">aviso de privacidad</Link> y que el equipo de RadGen me
          contacte por WhatsApp. Si soy menor de edad, tengo permiso de mi papá, mamá o tutor.
        </span>
      </label>
      <button type="submit" className="btn btn-blue registro-submit" disabled={enviando || !acepto}>
        {enviando ? 'Enviando...' : 'Quiero unirme'}
      </button>
    </form>
  )
}

export default RadGen
