import { Link, useLocation, useNavigate } from 'react-router-dom'
import { cerrarSesion } from '../store'
import Avatar from './Avatar'
import logo from '../../assets/radgen-education-logo.png'

// En producción, /radgen vive en el mismo dominio que esta app. En
// desarrollo local, cada una corre en su propio servidor (ver
// aguilas-web-iglesia, puerto 5180) — así que aquí apuntamos ahí.
const URL_RADGEN = import.meta.env.DEV ? 'http://localhost:5180/radgen' : '/radgen'

// Barra de navegación uniforme: se muestra igual en toda la plataforma,
// con o sin sesión iniciada. El logo siempre es el elemento con más presencia.
export default function TopBar({ usuario, onSesion, modoPreRegistro }) {
  const location = useLocation()
  const navigate = useNavigate()

  async function salir() {
    await cerrarSesion()
    onSesion(null)
    navigate('/radgen/education')
  }

  function esActivo(ruta) {
    return location.pathname === ruta
  }

  const preRegistro = usuario?.rol === 'joven' && modoPreRegistro
  const esAdmin = usuario?.email === 'schottalfredo@gmail.com'

  return (
    <header className="re-topbar">
      <Link
        to={
          !usuario
            ? '/radgen/education'
            : usuario.rol === 'lider'
              ? '/radgen/education/lider'
              : preRegistro
                ? '/radgen/education/pre-registro'
                : '/radgen/education/lecciones'
        }
        className="re-topbar__logo-link"
      >
        <img src={logo} alt="RadGen Education" className="re-topbar__logo" />
      </Link>

      <nav className="re-topbar__nav">
        {usuario && (
          <div className="re-topbar__links">
            {usuario.rol === 'joven' && !preRegistro && (
              <>
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
              </>
            )}
            <Link
              className={`re-navlink ${esActivo('/radgen/education/perfil') ? 'activo' : ''}`}
              to="/radgen/education/perfil"
            >
              Mi perfil
            </Link>
            {esAdmin && usuario.rol !== 'lider' && (
              <Link
                className={`re-navlink ${esActivo('/radgen/education/lider') ? 'activo' : ''}`}
                to="/radgen/education/lider"
              >
                Panel líder
              </Link>
            )}
          </div>
        )}
        <div className="re-topbar__cuenta">
          {usuario ? (
            <>
              <Avatar nombre={usuario.nombre} uid={usuario.uid} foto={usuario.fotoPerfil} size={32} />
              <span className="re-topbar__usuario">{usuario.nombre}</span>
              <button className="re-btn re-btn--sm" onClick={salir}>Salir</button>
            </>
          ) : (
            <a href={URL_RADGEN} className="re-btn re-btn--sm re-btn--fantasma">← RadGen</a>
          )}
        </div>
      </nav>
    </header>
  )
}
