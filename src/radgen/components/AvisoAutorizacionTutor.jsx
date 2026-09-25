import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { pedirEnlaceAutorizacion, declararMayorDeEdad } from '../store'

function mensajeWhatsApp(nombre, enlace) {
  return (
    `Hola, soy ${nombre}. Para usar RadGen Education (la plataforma de los jóvenes de Águilas) ` +
    `necesito tu autorización porque soy menor de edad. Es rápido, solo abre este enlace: ${enlace}`
  )
}

// Aviso para el joven que todavía no tiene la autorización de su papá, mamá
// o tutor: le da el enlace listo para mandarlo por WhatsApp. El enlace se
// prepara al montar para que el botón sea un enlace normal (los navegadores
// de celular bloquean ventanas que se abren después de esperar al servidor).
export default function AvisoAutorizacionTutor({ usuario, onResuelto }) {
  const [enlace, setEnlace] = useState('')
  const [error, setError] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [confirmarMayor, setConfirmarMayor] = useState(false)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    pedirEnlaceAutorizacion()
      .then(setEnlace)
      .catch((e) => setError(e.message))
  }, [])

  // En el mensaje a sus papás va su nombre de registro, no su apodo.
  const primerNombre = (usuario.nombre || '').trim()

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      setError('No se pudo copiar. Mantén presionado el enlace para copiarlo.')
    }
  }

  async function soyMayor() {
    setGuardando(true)
    try {
      onResuelto?.(await declararMayorDeEdad())
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="re-autorizacion" aria-labelledby="re-autorizacion-titulo">
      <div className="re-autorizacion__icono" aria-hidden="true">
        <ShieldCheck size={26} strokeWidth={2.5} />
      </div>
      <div className="re-autorizacion__cuerpo">
        <h2 id="re-autorizacion-titulo" className="re-autorizacion__titulo">
          Falta la autorización de tu papá o mamá
        </h2>
        <p className="re-autorizacion__texto">
          Como eres menor de edad, uno de ellos tiene que autorizar tu cuenta. Mándales este enlace: les toma un
          minuto y no necesitan cuenta.
        </p>

        {confirmarMayor ? (
          <div className="re-autorizacion__acciones">
            <span className="re-autorizacion__pregunta">¿Confirmas que ya tienes 18 años o más?</span>
            <button type="button" className="re-btn re-btn--sm re-btn--lleno" onClick={soyMayor} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Sí, tengo 18 o más'}
            </button>
            <button type="button" className="re-btn re-btn--sm" onClick={() => setConfirmarMayor(false)}>
              Cancelar
            </button>
          </div>
        ) : (
          <div className="re-autorizacion__acciones">
            {enlace ? (
              <>
                <a
                  className="re-btn re-btn--sm re-btn--lleno re-autorizacion__whatsapp"
                  href={`https://wa.me/?text=${encodeURIComponent(mensajeWhatsApp(primerNombre, enlace))}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setEnviado(true)}
                >
                  📲 Mandar por WhatsApp
                </a>
                <button type="button" className="re-btn re-btn--sm" onClick={copiar}>
                  {copiado ? '✓ Copiado' : 'Copiar enlace'}
                </button>
              </>
            ) : (
              !error && <span className="re-autorizacion__pregunta">Preparando tu enlace…</span>
            )}
            <button type="button" className="re-vinculo re-autorizacion__mayor" onClick={() => setConfirmarMayor(true)}>
              Tengo 18 años o más
            </button>
          </div>
        )}

        {enviado && (
          <p className="re-autorizacion__nota">
            ¡Listo! En cuanto lo autoricen, este aviso desaparece solo.
          </p>
        )}
        {error && (
          <p className="re-autorizacion__error" role="alert">
            {error}
          </p>
        )}
        <p className="re-autorizacion__legal">
          <Link to="/privacidad" target="_blank">
            ¿Qué datos guardamos?
          </Link>
        </p>
      </div>
    </section>
  )
}
