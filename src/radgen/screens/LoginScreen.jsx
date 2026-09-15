import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginConGoogleFalso, registrarJovenConCodigo, loginComoLider } from '../store'
import Sky from '../components/Sky'
import logo from '../../assets/radgen-education-logo.png'

export default function LoginScreen({ onSesion }) {
  const navigate = useNavigate()
  const [rol, setRol] = useState('joven') // joven | lider
  const [paso, setPaso] = useState('inicio') // inicio | codigo
  const [perfilGoogle, setPerfilGoogle] = useState(null)
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')

  function continuarConGoogle() {
    if (rol === 'lider') {
      const { usuario } = loginComoLider()
      onSesion(usuario)
      navigate('/radgen/education/lider')
      return
    }

    const perfil = { nombre: 'Diego Ramírez', email: 'diego.ramirez@gmail.com' }
    const { requiereCodigo, usuario } = loginConGoogleFalso(perfil)
    if (requiereCodigo) {
      setPerfilGoogle(perfil)
      setPaso('codigo')
      return
    }
    onSesion(usuario)
    navigate('/radgen/education/lecciones')
  }

  function enviarCodigo(e) {
    e.preventDefault()
    setError('')
    const resultado = registrarJovenConCodigo({
      nombre: perfilGoogle.nombre,
      email: perfilGoogle.email,
      codigo,
    })
    if (!resultado.ok) {
      setError(resultado.error)
      return
    }
    onSesion(resultado.usuario)
    navigate('/radgen/education/lecciones')
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

            <button className="re-btn re-btn--lleno re-btn--bloque re-btn--google" onClick={continuarConGoogle}>
              <span className="re-btn__google-g">G</span>
              Continuar con Google
            </button>

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
            {error && <div className="re-error">{error}</div>}
            <button type="submit" className="re-btn re-btn--lleno re-btn--bloque">
              Crear mi cuenta
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
