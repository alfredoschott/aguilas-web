import { Link, useLocation, useNavigate } from 'react-router-dom'
import { cerrarSesion } from '../store'
import logo from '../../assets/radgen-education-logo.png'

// Barra de navegación uniforme: se muestra igual en toda la plataforma,
// con o sin sesión iniciada. El logo siempre es el elemento con más presencia.
export default function TopBar({ usuario, onSesion }) {
  const location = useLocation()
  const navigate = useNavigate()

  function salir() {
    cerrarSesion()
    onSesion(null)
    navigate('/radgen/education')
  }

  function esActivo(ruta) {
    return location.pathname === ruta
  }

  return (
    <header className="re-topbar">
      <Link to={usuario ? (usuario.rol === 'lider' ? '/radgen/education/lider' : '/radgen/education/lecciones') : '/radgen/education'} className="re-topbar__logo-link">
        <img src={logo} alt="RadGen Education" className="re-topbar__logo" />
      </Link>

      {usuario && (
        <nav className="re-topbar__nav">
          {usuario.rol === 'joven' && (
            <div className="re-topbar__links">
              <Link
                className={`re-navlink ${esActivo('/radgen/education/lecciones') ? 'activo' : ''}`}
                to="/radgen/education/lecciones"
              >
                Lecciones
              </Link>
              <Link
                className={`re-navlink ${esActivo('/radgen/education/insignias') ? 'activo' : ''}`}
                to="/radgen/education/insignias"
              >
                Insignias
              </Link>
            </div>
          )}
          <div className="re-topbar__cuenta">
            <span className="re-topbar__usuario">{usuario.nombre}</span>
            <button className="re-btn re-btn--sm" onClick={salir}>Salir</button>
          </div>
        </nav>
      )}
    </header>
  )
}
