import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import { Hourglass, QrCode, ShieldAlert, WifiOff } from 'lucide-react'
import { auth } from '../../firebase'
import { db, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from './posFirestore'
import { PosVentaNucleo } from './PosVenta'
import PosCabecera from './PosCabecera'
import '../portal.css'
import './pos.css'

const CLAVE_NOMBRE = 'pos_ayudante_nombre'

function Marco({ children, titulo = 'Cobrar' }) {
  return (
    <div className="pos-page"><div className="pos-wrap" style={{ maxWidth: 520 }}>
      <PosCabecera titulo={titulo} sub="Dispositivo de cobro" />
      {children}
    </div></div>
  )
}

// Entrada por QR de un dispositivo invitado: entra sin cuenta, pide acceso, espera la
// aprobación del líder y después puede vender y cobrar solo en esa venta.
export default function PosCobro() {
  const { ventaId, token } = useParams()
  const [usuario, setUsuario] = useState(undefined) // undefined = comprobando
  const [errorAuth, setErrorAuth] = useState('')
  const [dispositivo, setDispositivo] = useState(undefined) // undefined = cargando, null = no existe
  const [errorDisp, setErrorDisp] = useState('')
  const [nombre, setNombre] = useState(() => { try { return localStorage.getItem(CLAVE_NOMBRE) || '' } catch { return '' } })
  const [enviando, setEnviando] = useState(false)
  const [errorUnirse, setErrorUnirse] = useState('')

  useEffect(() => { document.title = 'Cobrar · Águilas CFC' }, [])

  useEffect(() => onAuthStateChanged(auth, (u) => {
    if (u) { setUsuario(u); return }
    setUsuario(null)
    signInAnonymously(auth).catch((e) => { console.error(e); setErrorAuth(e.code || 'error') })
  }), [])

  const uid = usuario?.uid
  const idDisp = uid ? `${ventaId}_${uid}` : null

  useEffect(() => {
    if (!idDisp || usuario?.isAnonymous === false) return undefined
    return onSnapshot(doc(db, 'pos_dispositivos', idDisp), (s) => { setDispositivo(s.exists() ? s.data() : null); setErrorDisp('') },
      (e) => { console.error(e); setErrorDisp(e.code || 'error') })
  }, [idDisp, usuario])

  async function pedirAcceso() {
    const limpio = nombre.trim()
    if (!limpio) { setErrorUnirse('Escribe tu nombre para que el líder sepa quién eres.'); return }
    setEnviando(true)
    setErrorUnirse('')
    try { localStorage.setItem(CLAVE_NOMBRE, limpio) } catch { /* sin storage */ }
    try {
      const ref = doc(db, 'pos_dispositivos', idDisp)
      if (dispositivo) await updateDoc(ref, { token, estado: 'pendiente', nombre: limpio })
      else await setDoc(ref, { ventaId, uid, nombre: limpio, token, estado: 'pendiente', creadoEn: serverTimestamp() })
    } catch (e) {
      console.error(e)
      setErrorUnirse(e.code === 'permission-denied' ? 'Este enlace ya no es válido: se apagó, venció o la venta se cerró. Pídele al líder un QR nuevo.' : 'No se pudo enviar la solicitud. Revisa tu conexión e intenta de nuevo.')
    } finally { setEnviando(false) }
  }

  if (errorAuth) {
    const apagado = ['auth/operation-not-allowed', 'auth/admin-restricted-operation'].includes(errorAuth)
    return (
      <Marco titulo="No se pudo entrar"><div className="pos-card pos-cobro-aviso"><WifiOff size={34} strokeWidth={1.6} />
        <p>{apagado ? 'El acceso por QR todavía no está habilitado en el sistema.' : 'No se pudo conectar. Revisa tu internet e intenta de nuevo.'}</p>
        <p className="pos-muted">{apagado ? 'Avísale al líder o a Primera Mesa.' : 'Si sigue igual, pide un QR nuevo.'}</p>
        <button className="pos-btn pos-btn-lg" onClick={() => window.location.reload()}>Reintentar</button></div></Marco>
    )
  }
  if (usuario === undefined || (usuario && usuario.isAnonymous && dispositivo === undefined && !errorDisp) || usuario === null) {
    return <Marco><p className="pos-muted">Conectando…</p></Marco>
  }
  if (!usuario.isAnonymous) {
    return (
      <Marco titulo="Ya tienes sesión"><div className="pos-card pos-cobro-aviso"><ShieldAlert size={34} strokeWidth={1.6} />
        <p>Entraste con tu cuenta del portal, así que no necesitas el QR.</p>
        <a className="pos-btn pos-btn-primary pos-btn-lg pos-btn-block" href={`/lideres/pos/${ventaId}`}>Abrir la venta</a></div></Marco>
    )
  }
  if (errorDisp) {
    return (
      <Marco titulo="No se pudo conectar"><div className="pos-card pos-cobro-aviso"><WifiOff size={34} strokeWidth={1.6} />
        <p>No se pudo abrir el acceso. Revisa tu conexión o pide un QR nuevo.</p>
        <button className="pos-btn pos-btn-lg" onClick={() => window.location.reload()}>Reintentar</button></div></Marco>
    )
  }

  // Aprobado con el QR vigente → pantalla de venta reducida.
  if (dispositivo?.estado === 'aprobado' && dispositivo.token === token) {
    return (
      <PosVentaNucleo id={ventaId} email={`disp_${uid}`} onReconectar={pedirAcceso}
        ayudante={{ uid, nombre: dispositivo.nombre, puedeEditar: !!dispositivo.puedeEditar }} />
    )
  }

  if (dispositivo?.estado === 'pendiente' && dispositivo.token === token) {
    return (
      <Marco titulo="Esperando al líder"><div className="pos-card pos-cobro-aviso">
        <div className="pos-espera"><Hourglass size={34} strokeWidth={1.8} /></div>
        <p><b>{dispositivo.nombre}</b>, ya avisamos al líder.</p>
        <p className="pos-muted">Cuando te apruebe, esta pantalla cambia sola. No la cierres.</p></div></Marco>
    )
  }

  const reconectando = !!dispositivo
  const quitado = dispositivo?.estado === 'revocado' && dispositivo.token === token
  return (
    <Marco titulo="Cobrar en la venta"><div className="pos-card pos-cobro-aviso">
      <QrCode size={34} strokeWidth={1.6} />
      {quitado
        ? <p>El líder te desconectó. Si fue un error, puedes pedir acceso de nuevo.</p>
        : reconectando ? <p>Este QR es nuevo: pide acceso otra vez.</p>
          : <p>Te invitaron a vender y cobrar. El líder tiene que aprobarte antes de empezar.</p>}
      <div className="pos-field" style={{ width: '100%', textAlign: 'left', marginTop: 10 }}>
        <label className="pos-label" htmlFor="pos-nombre-ayudante">¿Cómo te llamas?</label>
        <input id="pos-nombre-ayudante" className="pos-input" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40}
          placeholder="Tu nombre" autoCapitalize="words" autoComplete="given-name" enterKeyHint="go" onKeyDown={(e) => { if (e.key === 'Enter') pedirAcceso() }} />
      </div>
      {errorUnirse && <div className="pos-error" role="alert" style={{ width: '100%', textAlign: 'left' }}>{errorUnirse}</div>}
      <button className="pos-btn pos-btn-primary pos-btn-lg pos-btn-block" disabled={enviando} onClick={pedirAcceso}>{enviando ? 'Enviando…' : 'Pedir acceso'}</button>
    </div></Marco>
  )
}
