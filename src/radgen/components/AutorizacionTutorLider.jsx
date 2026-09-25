import { useState } from 'react'
import { pedirEnlaceAutorizacion, registrarAutorizacionEnPapel } from '../store'

const PARENTESCOS = ['Mamá', 'Papá', 'Tutor legal']

function fechaCorta(iso) {
  return iso ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
}

// Estado de la autorización de papá/mamá de un joven, visto por la líder, con
// las tres formas de conseguirla: mandar el enlace, registrar un formato
// firmado en papel o imprimir ese formato.
export default function AutorizacionTutorLider({ joven, onCambio }) {
  const autorizacion = joven.autorizacionTutor
  const [enlace, setEnlace] = useState('')
  const [modoPapel, setModoPapel] = useState(false)
  const [tutorNombre, setTutorNombre] = useState('')
  const [parentesco, setParentesco] = useState('')
  const [autorizaFotos, setAutorizaFotos] = useState(false)
  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState('')
  const [copiado, setCopiado] = useState(false)

  const primerNombre = (joven.nombre || '').split(' ')[0]

  async function generar() {
    setTrabajando(true)
    setError('')
    try {
      setEnlace(await pedirEnlaceAutorizacion(joven.uid))
      if (!autorizacion) onCambio?.({ estado: 'pendiente', fecha: new Date().toISOString() })
    } catch (e) {
      setError(e.message)
    } finally {
      setTrabajando(false)
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      setError('No se pudo copiar el enlace.')
    }
  }

  async function guardarPapel(e) {
    e.preventDefault()
    setTrabajando(true)
    setError('')
    try {
      const nueva = await registrarAutorizacionEnPapel({ jovenUid: joven.uid, tutorNombre, parentesco, autorizaFotos })
      setModoPapel(false)
      onCambio?.(nueva)
    } catch (err) {
      setError(err.message)
    } finally {
      setTrabajando(false)
    }
  }

  const aceptada = autorizacion?.estado === 'aceptada'
  const mensaje =
    `Hola, te escribimos de RadGen, el grupo de jóvenes de Águilas. Para que ${primerNombre} use RadGen Education necesitamos ` +
    `tu autorización como su papá/mamá. Es un minuto, solo abre este enlace: ${enlace}`

  return (
    <div className="re-card re-autorizacion-lider">
      <div className="re-seccion-header">
        <h2 className="re-subtitulo" style={{ margin: 0 }}>
          Autorización de papá o mamá
        </h2>
        <span
          className={`re-badge ${aceptada ? 're-badge--completado' : autorizacion?.estado === 'no-requerida' ? 're-badge--nuevo' : 're-badge--pendiente'}`}
        >
          {aceptada ? '✅ Autorizado' : autorizacion?.estado === 'no-requerida' ? '18+' : autorizacion?.estado === 'pendiente' ? 'Enlace enviado' : 'Sin autorización'}
        </span>
      </div>

      {aceptada ? (
        <p style={{ margin: 0 }}>
          Autorizó <strong>{autorizacion.tutorNombre}</strong> ({autorizacion.parentesco?.toLowerCase()}) el{' '}
          {fechaCorta(autorizacion.fecha)}, {autorizacion.via === 'papel' ? 'en formato de papel' : 'desde el enlace'}.{' '}
          Fotos en redes: <strong>{autorizacion.autorizaFotos ? 'sí' : 'no'}</strong>.
        </p>
      ) : (
        <>
          <p style={{ marginTop: 0, opacity: 0.8 }}>
            {autorizacion?.estado === 'no-requerida'
              ? `${primerNombre} declaró tener 18 años o más. Si no es así, pide la autorización igual.`
              : 'Mándale el enlace a su papá o mamá por WhatsApp, o registra aquí un formato firmado en papel.'}
          </p>

          {enlace ? (
            <div className="re-autorizacion-lider__enlace">
              <code>{enlace}</code>
              <div className="re-autorizacion-lider__botones">
                <a
                  className="re-btn re-btn--sm re-btn--lleno"
                  href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  📲 Enviar por WhatsApp
                </a>
                <button type="button" className="re-btn re-btn--sm" onClick={copiar}>
                  {copiado ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          ) : (
            !modoPapel && (
              <div className="re-autorizacion-lider__botones">
                <button type="button" className="re-btn re-btn--sm re-btn--lleno" onClick={generar} disabled={trabajando}>
                  {trabajando ? 'Generando…' : '🔗 Generar enlace para papás'}
                </button>
                <button type="button" className="re-btn re-btn--sm" onClick={() => setModoPapel(true)}>
                  📝 Registrar formato en papel
                </button>
                <a
                  className="re-btn re-btn--sm"
                  href={`/autorizacion/formato?joven=${encodeURIComponent(joven.nombre || '')}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  🖨 Imprimir formato
                </a>
              </div>
            )
          )}

          {modoPapel && (
            <form className="re-autorizacion-lider__papel" onSubmit={guardarPapel}>
              <label className="re-label" htmlFor="papel-nombre">
                Nombre de quien firmó
              </label>
              <input
                id="papel-nombre"
                className="re-input"
                value={tutorNombre}
                onChange={(e) => setTutorNombre(e.target.value)}
                required
              />
              <label className="re-label" htmlFor="papel-parentesco">
                Parentesco
              </label>
              <select
                id="papel-parentesco"
                className="re-input"
                value={parentesco}
                onChange={(e) => setParentesco(e.target.value)}
                required
              >
                <option value="">Elige…</option>
                {PARENTESCOS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
              <label className="re-autorizacion-lider__check">
                <input type="checkbox" checked={autorizaFotos} onChange={(e) => setAutorizaFotos(e.target.checked)} />
                También autorizó fotos en redes sociales
              </label>
              <div className="re-autorizacion-lider__botones">
                <button type="submit" className="re-btn re-btn--sm re-btn--lleno" disabled={trabajando}>
                  {trabajando ? 'Guardando…' : 'Guardar'}
                </button>
                <button type="button" className="re-btn re-btn--sm" onClick={() => setModoPapel(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </>
      )}
      {error && (
        <p className="re-error" role="alert" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}
    </div>
  )
}
