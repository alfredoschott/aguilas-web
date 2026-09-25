import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { iniciarSesionConGoogle, completarRegistroJoven } from '../store'
import Sky from '../components/Sky'
import logo from '../../assets/radgen-education-logo.png'
import { tomarAsistenciaPendiente } from '../utils/asistenciaPendiente'

function destinoTrasEntrar(usuario) {
  if (usuario.rol === 'lider') return '/radgen/education/lider'
  const codigo = tomarAsistenciaPendiente()
  return codigo ? `/radgen/education/asistencia/${codigo}` : '/radgen/education/lecciones'
}

export default function LoginScreen({ onSesion }) {
  const navigate = useNavigate()
  const [rol, setRol] = useState('joven') // joven | lider
  const [paso, setPaso] = useState('inicio') // inicio | codigo
  const [perfilGoogle, setPerfilGoogle] = useState(null)
  const [codigo, setCodigo] = useState('')
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function continuarConGoogle() {
    setError('')
    setCargando(true)
    try {
      const resultado = await iniciarSesionConGoogle(rol)
      if (resultado.ok) {
        onSesion(resultado.usuario)
        navigate(destinoTrasEntrar(resultado.usuario))
        return
      }
      if (resultado.requiereCodigo) {
        setPerfilGoogle(resultado.perfilGoogle)
        setPaso('codigo')
        return
      }
      setError(resultado.error || 'No se pudo iniciar sesión. Intenta de nuevo.')
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('No se pudo iniciar sesión con Google. Intenta de nuevo.')
      }
    } finally {
      setCargando(false)
    }
  }

  async function enviarCodigo(e) {
    e.preventDefault()
    setError('')
    if (!aceptaTerminos) {
      setError('Para crear tu cuenta acepta los Términos de uso y el Aviso de privacidad.')
      return
    }
    setCargando(true)
    try {
      const resultado = await completarRegistroJoven({
        uid: perfilGoogle.uid,
        nombre: perfilGoogle.nombre,
        email: perfilGoogle.email,
        codigo,
      })
      if (!resultado.ok) {
        setError(resultado.error)
        return
      }
      onSesion(resultado.usuario)
      navigate(destinoTrasEntrar(resultado.usuario))
    } finally {
      setCargando(false)
    }
  }

  function cambiarRol(nuevoRol) {
    setRol(nuevoRol)
    setPaso('inicio')
    setError('')
  }

  const mensajeSky =
    paso === 'codigo'
      ? '¡Ya casi! Pide tu código a tu líder para crear tu cuenta.'
      : rol === 'lider'
        ? '¡Bienvenida de vuelta! Aquí puedes asignar y revisar el progreso.'
        : '¡Hola! Soy Sky. Entra con Google para ver tus lecciones.'

  const poseSky = paso === 'codigo' ? 'estudiando' : rol === 'lider' ? 'relajado' : 'saludando'

  return (
    <div className="re-shell">
      <div style={{ marginTop: '1.5rem', marginBottom: '2rem', textAlign: 'center' }}>
        <img src={logo} alt="RadGen Education" style={{ display: 'block', height: 120, width: 'auto', margin: '0 auto 1.2rem' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
          <Sky size={40} pose={poseSky} animado={false} />
          <span className="re-eyebrow" style={{ margin: 0 }}>Bienvenido</span>
        </div>
        <h1 className="re-titulo-pagina" style={{ marginBottom: 6 }}>RadGen Education</h1>
        <p style={{ margin: 0, opacity: 0.85, fontWeight: 600 }}>{mensajeSky}</p>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div className="re-tabs">
          <button
            type="button"
            className={`re-tab ${rol === 'joven' ? 'activo' : ''}`}
            onClick={() => cambiarRol('joven')}
          >
            Joven
          </button>
          <button
            type="button"
            className={`re-tab ${rol === 'lider' ? 'activo' : ''}`}
            onClick={() => cambiarRol('lider')}
          >
            Líder
          </button>
        </div>
      </div>

      <div className="re-card" style={{ textAlign: 'center' }}>
        {paso === 'inicio' && (
          <>
            <h2 className="re-subtitulo" style={{ textAlign: 'center' }}>
              {rol === 'lider' ? 'Acceso de líder' : 'Entra a tus lecciones'}
            </h2>

            <button
              className="re-btn re-btn--lleno re-btn--bloque re-btn--google"
              onClick={continuarConGoogle}
              disabled={cargando}
            >
              <span className="re-btn__google-g">G</span>
              {cargando ? 'Conectando…' : 'Continuar con Google'}
            </button>

            {error && <div className="re-error" style={{ marginTop: '1rem' }}>{error}</div>}

            {rol === 'joven' && (
              <p style={{ fontSize: '0.8rem', color: 'var(--rg-ink)', opacity: 0.65, marginTop: '1.2rem' }}>
                Necesitas el código de invitación que te compartió tu líder.
              </p>
            )}
          </>
        )}

        {paso === 'codigo' && (
          <form onSubmit={enviarCodigo} style={{ textAlign: 'left' }}>
            <p style={{ marginTop: 0, color: 'var(--rg-ink)', opacity: 0.75 }}>
              Hola <strong style={{ opacity: 1 }}>{perfilGoogle.nombre}</strong>. Es tu
              primera vez aquí — ingresa el código de invitación para crear tu cuenta.
            </p>
            <label className="re-label" htmlFor="codigo">Código de invitación</label>
            <input
              id="codigo"
              className="re-input"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Código de invitación"
              autoFocus
            />
            <label className="re-login-legal__check">
              <input type="checkbox" checked={aceptaTerminos} onChange={(e) => setAceptaTerminos(e.target.checked)} />
              <span>
                Acepto los{' '}
                <Link to="/terminos" target="_blank">
                  Términos de uso
                </Link>{' '}
                y el{' '}
                <Link to="/privacidad" target="_blank">
                  Aviso de privacidad
                </Link>
                . Si soy menor de edad, le pediré a mi papá, mamá o tutor que autorice mi cuenta.
              </span>
            </label>
            {error && <div className="re-error">{error}</div>}
            <button type="submit" className="re-btn re-btn--lleno re-btn--bloque" disabled={cargando || !aceptaTerminos}>
              {cargando ? 'Creando cuenta…' : 'Crear mi cuenta'}
            </button>
          </form>
        )}
      </div>

      <p className="re-login-legal">
        <Link to="/terminos">Términos de uso</Link> · <Link to="/privacidad">Aviso de privacidad</Link>
      </p>
    </div>
  )
}
