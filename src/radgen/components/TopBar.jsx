import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Award, BookOpen, ChevronDown, LayoutDashboard, LogOut, Swords, UserRound } from 'lucide-react'
import { cerrarSesion } from '../store'
import Avatar from './Avatar'
import logo from '../../assets/radgen-education-logo.png'

// En producción, /radgen vive en el mismo dominio que esta app. En
// desarrollo local, cada una corre en su propio servidor (ver
// aguilas-web-iglesia, puerto 5180) — así que aquí apuntamos ahí.
const URL_RADGEN = import.meta.env.DEV ? 'http://localhost:5180/radgen' : '/radgen'

const BASE = '/radgen/education'

const SECCION_COMPANEROS = {
  ruta: `${BASE}/companeros`,
  etiqueta: 'Compañeros',
  Icono: Swords,
  tambien: [`${BASE}/duelo/`, `${BASE}/joven/`],
}

// Qué secciones ve cada quien. "Mi perfil" vive en el menú del avatar en
// computadora y como pestaña en celular.
function seccionesPara(usuario, bloqueado, esAdmin) {
  if (!usuario) return []
  const esLider = usuario.rol === 'lider'
  const lista = []
  if (esLider) {
    lista.push(
      { ruta: `${BASE}/lider`, etiqueta: 'Panel', Icono: LayoutDashboard, excepto: [`${BASE}/lider/vista-joven`] },
      { ruta: `${BASE}/lider/vista-joven`, etiqueta: 'Lecciones', Icono: BookOpen, tambien: [`${BASE}/lider/leccion/`] },
      SECCION_COMPANEROS,
    )
    return lista
  }
  if (!bloqueado) {
    lista.push(
      { ruta: `${BASE}/lecciones`, etiqueta: 'Lecciones', Icono: BookOpen, tambien: [`${BASE}/leccion/`] },
      { ruta: `${BASE}/insignias`, etiqueta: 'Insignias', Icono: Award },
      SECCION_COMPANEROS,
    )
  }
  if (esAdmin) {
    lista.push({ ruta: `${BASE}/lider`, etiqueta: 'Panel líder', corta: 'Líder', Icono: LayoutDashboard, excepto: [`${BASE}/lider/vista-joven`] })
  }
  return lista
}

function MenuCuenta({ usuario, onSalir }) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef(null)
  const location = useLocation()

  useEffect(() => {
    if (!abierto) return undefined
    function fuera(e) {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false)
    }
    function tecla(e) {
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('pointerdown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('pointerdown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierto])

  // Se cierra solo al navegar a otra pantalla.
  const [rutaAnterior, setRutaAnterior] = useState(location.pathname)
  if (rutaAnterior !== location.pathname) {
    setRutaAnterior(location.pathname)
    if (abierto) setAbierto(false)
  }

  return (
    <div className="re-cuenta" ref={ref}>
      <button
        type="button"
        className={`re-cuenta__boton ${abierto ? 'activo' : ''}`}
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={abierto}
      >
        <Avatar
          nombre={usuario.nombre}
          uid={usuario.uid}
          foto={usuario.fotoPerfil}
          size={32}
          marco={usuario.marcoAvatar}
          colorAcento={usuario.colorAcento}
        />
        <span className="re-cuenta__nombre">{usuario.apodo || usuario.nombre.split(' ')[0]}</span>
        <ChevronDown size={16} strokeWidth={3} className="re-cuenta__flecha" aria-hidden="true" />
      </button>

      {abierto && (
        <div className="re-cuenta__menu" role="menu">
          <div className="re-cuenta__cabecera">
            <span className="re-cuenta__nombre-completo">{usuario.nombre}</span>
            {usuario.email && <span className="re-cuenta__correo">{usuario.email}</span>}
          </div>
          <Link to={`${BASE}/perfil`} className="re-cuenta__opcion" role="menuitem">
            <UserRound size={18} aria-hidden="true" />
            Mi perfil
          </Link>
          <button
            type="button"
            className="re-cuenta__opcion re-cuenta__opcion--salir"
            role="menuitem"
            onClick={onSalir}
          >
            <LogOut size={18} aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

// Computadora: una sola fila (logo · secciones · cuenta). Celular y iPad:
// arriba logo y cuenta, y debajo una fila de pestañas con íconos — arriba y
// no abajo, porque varios navegadores de celular ponen su propia barra
// abajo y taparía la navegación.
export default function TopBar({ usuario, onSesion, pausado }) {
  const location = useLocation()
  const navigate = useNavigate()

  async function salir() {
    await cerrarSesion()
    onSesion(null)
    navigate(BASE)
  }

  function esActivo({ ruta, tambien = [], excepto = [] }) {
    const actual = location.pathname
    if (excepto.some((prefijo) => actual.startsWith(prefijo))) return false
    if (tambien.some((prefijo) => actual.startsWith(prefijo))) return true
    return actual === ruta || actual.startsWith(`${ruta}/`)
  }

  const bloqueado = usuario?.rol === 'joven' && pausado
  const esAdmin = usuario?.email === 'schottalfredo@gmail.com'
  const secciones = seccionesPara(usuario, bloqueado, esAdmin)
  const seccionesMovil = usuario ? [...secciones, { ruta: `${BASE}/perfil`, etiqueta: 'Perfil', Icono: UserRound }] : []

  const inicio = !usuario
    ? BASE
    : usuario.rol === 'lider'
      ? `${BASE}/lider`
      : bloqueado
        ? `${BASE}/pausado`
        : `${BASE}/lecciones`

  return (
    <header className="re-topbar">
      <Link to={inicio} className="re-topbar__logo-link" aria-label="Inicio">
        <img src={logo} alt="RadGen Education" className="re-topbar__logo" />
      </Link>

      {secciones.length > 0 && (
        <nav className="re-topbar__secciones" aria-label="Secciones">
          {secciones.map((seccion) => {
            const { ruta, etiqueta, Icono } = seccion
            return (
              <Link key={ruta} to={ruta} className={`re-navlink ${esActivo(seccion) ? 'activo' : ''}`}>
                <Icono size={16} strokeWidth={2.5} aria-hidden="true" />
                {etiqueta}
              </Link>
            )
          })}
        </nav>
      )}

      <div className="re-topbar__cuenta">
        {usuario ? (
          <MenuCuenta usuario={usuario} onSalir={salir} />
        ) : (
          <a href={URL_RADGEN} className="re-btn re-btn--sm re-btn--fantasma">
            ← RadGen
          </a>
        )}
      </div>

      {seccionesMovil.length > 1 && (
        <nav className="re-topbar__pestanas" aria-label="Secciones">
          {seccionesMovil.map((seccion) => {
            const { ruta, etiqueta, Icono } = seccion
            return (
              <Link key={ruta} to={ruta} className={`re-pestana ${esActivo(seccion) ? 'activo' : ''}`}>
                <span className="re-pestana__icono">
                  <Icono size={22} strokeWidth={2.4} aria-hidden="true" />
                </span>
                <span className="re-pestana__etiqueta">{seccion.corta || etiqueta}</span>
              </Link>
            )
          })}
        </nav>
      )}
    </header>
  )
}
