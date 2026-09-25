import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { RESPONSABLE } from './datosResponsable'
import { PUNTOS_AUTORIZACION, TEXTO_FOTOS } from './textoAutorizacion'
import './legal.css'

const PARENTESCOS = ['Mamá', 'Papá', 'Tutor legal']

// Página pública que abre el papá, mamá o tutor desde el enlace que le mandó
// su hijo(a) o la líder. No necesita cuenta: el token del enlace basta.
export default function AutorizacionTutor() {
  const { token } = useParams()
  const [info, setInfo] = useState(undefined) // undefined = cargando, null = enlace inválido
  const [errorCarga, setErrorCarga] = useState('')
  const [tutorNombre, setTutorNombre] = useState('')
  const [parentesco, setParentesco] = useState('')
  const [acepto, setAcepto] = useState(false)
  const [autorizaFotos, setAutorizaFotos] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)

  useEffect(() => {
    fetch(`/api/autorizacion-tutor?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const datos = await r.json().catch(() => ({}))
        if (r.ok) setInfo(datos)
        else {
          setInfo(null)
          setErrorCarga(datos.error || 'Este enlace no es válido.')
        }
      })
      .catch(() => {
        setInfo(null)
        setErrorCarga('No pudimos abrir el enlace. Revisa tu conexión e intenta de nuevo.')
      })
  }, [token])

  async function enviar(e) {
    e.preventDefault()
    setError('')
    if (tutorNombre.trim().length < 3 || !parentesco || !acepto) {
      setError('Escribe tu nombre completo, elige tu parentesco y marca la casilla de autorización.')
      return
    }
    setEnviando(true)
    try {
      const r = await fetch('/api/autorizacion-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'aceptar', token, tutorNombre, parentesco, autorizaFotos }),
      })
      const datos = await r.json().catch(() => ({}))
      if (r.ok) setListo(true)
      else setError(datos.error || 'No se pudo guardar. Intenta de nuevo.')
    } catch {
      setError('No se pudo guardar. Revisa tu conexión e intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  const nombre = info?.jovenNombre || 'tu hijo(a)'

  return (
    <main className="legal">
      <div className="legal__contenido">
        <p className="legal__eyebrow">RadGen Education · {RESPONSABLE.nombreCorto}</p>
        <h1>Autorización de papá, mamá o tutor</h1>

        {info === undefined && <p className="legal__fecha">Cargando…</p>}

        {info === null && (
          <div className="autorizacion__tarjeta">
            <p>{errorCarga}</p>
            <p style={{ marginTop: '0.8rem' }}>
              Si necesitas un enlace nuevo, pídeselo a tu hijo(a) o escríbenos por WhatsApp al{' '}
              <a href={RESPONSABLE.whatsappUrl}>{RESPONSABLE.whatsapp}</a>.
            </p>
          </div>
        )}

        {info && (info.estado !== 'pendiente' || listo) && (
          <div className="autorizacion__tarjeta autorizacion__ok">
            <p className="autorizacion__ok-icono" aria-hidden="true">
              ✅
            </p>
            <h2 style={{ marginTop: '0.5rem' }}>¡Gracias!</h2>
            <p>
              {info.estado === 'pendiente' || listo
                ? `La autorización para ${nombre} quedó registrada. Ya puede seguir usando RadGen Education.`
                : 'Esta autorización ya se había registrado. No tienes que hacer nada más.'}
            </p>
            <p style={{ marginTop: '0.8rem' }}>
              Si algún día quieres retirarla, escríbenos por WhatsApp al{' '}
              <a href={RESPONSABLE.whatsappUrl}>{RESPONSABLE.whatsapp}</a>.
            </p>
          </div>
        )}

        {info?.estado === 'pendiente' && !listo && (
          <>
            <p style={{ fontSize: '1.05rem' }}>
              <strong>{nombre}</strong> quiere usar <strong>RadGen Education</strong>, la plataforma de discipulado de
              los jóvenes de {RESPONSABLE.nombre}. Como es menor de edad, necesitamos tu permiso.
            </p>

            <div className="autorizacion__tarjeta">
              <p style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 700, color: 'var(--texto)' }}>
                <ShieldCheck size={20} color="var(--verde)" aria-hidden="true" /> Qué estás autorizando
              </p>
              <ul>
                {PUNTOS_AUTORIZACION.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <p style={{ marginTop: '0.8rem', fontSize: '0.9rem' }}>
                No vendemos ni compartimos sus datos para publicidad. Lee el{' '}
                <Link to="/privacidad" target="_blank">
                  Aviso de privacidad
                </Link>{' '}
                y los{' '}
                <Link to="/terminos" target="_blank">
                  Términos de uso
                </Link>
                .
              </p>
            </div>

            <form className="autorizacion__tarjeta" onSubmit={enviar} noValidate>
              <div className="autorizacion__campo">
                <label htmlFor="aut-nombre">Tu nombre completo</label>
                <input
                  id="aut-nombre"
                  type="text"
                  autoComplete="name"
                  value={tutorNombre}
                  onChange={(e) => setTutorNombre(e.target.value)}
                  required
                />
              </div>

              <fieldset className="autorizacion__campo" style={{ border: 'none' }}>
                <legend>Eres su…</legend>
                <div className="autorizacion__opciones">
                  {PARENTESCOS.map((p) => (
                    <label key={p} className="autorizacion__opcion">
                      <input
                        type="radio"
                        name="parentesco"
                        value={p}
                        checked={parentesco === p}
                        onChange={() => setParentesco(p)}
                      />
                      <span>{p}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="autorizacion__check">
                <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} />
                <span>
                  Soy papá, mamá o tutor legal de <strong>{nombre}</strong> y autorizo lo descrito arriba, conforme al
                  Aviso de privacidad.
                </span>
              </label>

              <label className="autorizacion__check">
                <input type="checkbox" checked={autorizaFotos} onChange={(e) => setAutorizaFotos(e.target.checked)} />
                <span>(Opcional) {TEXTO_FOTOS}</span>
              </label>

              <button type="submit" className="autorizacion__boton" disabled={enviando}>
                {enviando ? 'Guardando…' : 'Autorizar'}
              </button>
              {error && (
                <p className="autorizacion__error" role="alert">
                  {error}
                </p>
              )}
            </form>
          </>
        )}
      </div>
    </main>
  )
}
