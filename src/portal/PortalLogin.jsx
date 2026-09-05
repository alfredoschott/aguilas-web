import { Navigate } from 'react-router-dom'
import { usePortalAuth } from './PortalAuthContext'
import './portal.css'
export default function PortalLogin() {
  const { user, userData, loading, error, loginConGoogle } = usePortalAuth()
  if (!loading && user && userData) {
    return <Navigate to="/lideres/dashboard" replace />
  }
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <img src="/ACFC.png" alt="Águilas Centro Familiar Cristiano" style={styles.logo} />
        <h1 style={styles.title}>Portal de Líderes</h1>
        <p style={styles.subtitle}>Águilas Centro Familiar Cristiano Tizayuca</p>
        {error && <p style={styles.error}>{error}</p>}
        <button onClick={loginConGoogle} disabled={loading} className="portal-button-primary" style={styles.button}>
          {loading ? 'Verificando...' : 'Iniciar sesión con Google'}
        </button>
      </div>
    </div>
  )
}
const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--portal-bg)',
    fontFamily: 'Inter, sans-serif',
    padding: '20px',
  },
  card: {
    background: 'var(--portal-card-bg)',
    border: '1px solid var(--portal-card-border)',
    borderRadius: '16px',
    padding: '48px 40px',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  logo: {
    width: '84px',
    height: '84px',
    marginBottom: '20px',
  },
  title: {
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 900,
    fontSize: '28px',
    margin: '0 0 8px',
    color: 'var(--portal-text)',
  },
  subtitle: { color: 'var(--portal-muted)', fontSize: '14px', margin: '0 0 32px' },
  error: {
    color: 'var(--portal-error-text)',
    fontSize: '14px',
    background: 'var(--portal-error-bg)',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  button: {
    width: '100%',
    padding: '14px 24px',
    fontSize: '16px',
  },
}
