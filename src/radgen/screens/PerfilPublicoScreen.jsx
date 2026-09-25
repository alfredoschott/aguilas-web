import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getPerfilPublico, crearDuelo } from '../store'
import CartaColeccionable from '../components/CartaColeccionable'
import BotonAccion from '../components/BotonAccion'
import { generarCartaPerfil } from '../utils/cartaPerfil'
import { numeroDeCarta } from '../utils/rarezaCarta'
import { compartirImagen } from '../utils/shareCard'
import Esqueleto from '../components/Esqueleto'

// Lo que un joven ve del perfil de OTRO joven — de solo lectura, y
// deliberadamente limitado a lo cosmético + lo que ya es público en el
// ranking (rango, racha). Nada de lo que solo le corresponde ver a la líder.
export default function PerfilPublicoScreen({ usuario }) {
  const { uid } = useParams()
  const navigate = useNavigate()
  const [perfil, setPerfil] = useState(undefined) // undefined = cargando
  const [error, setError] = useState(false)
  const [retando, setRetando] = useState(false)
  const [errorDuelo, setErrorDuelo] = useState('')

  useEffect(() => {
    getPerfilPublico(uid)
      .then(setPerfil)
      .catch(() => setError(true))
  }, [uid])

  if (perfil === undefined && !error) {
    return (
      <Esqueleto variante="perfil" />
    )
  }

  if (error) {
    return (
      <div className="re-shell">
        <div className="re-card">No pudimos cargar ese perfil justo ahora. Intenta de nuevo en un momento.</div>
        <button className="re-btn" onClick={() => navigate(-1)}>← Volver</button>
      </div>
    )
  }

  if (!perfil) {
    return (
      <div className="re-shell">
        <div className="re-card">Ese perfil no existe.</div>
        <button className="re-btn" onClick={() => navigate(-1)}>← Volver</button>
      </div>
    )
  }

  const { joven, nivelActual, racha, insigniasEspeciales, nivelXp, xpTotal, totalCompletadas } = perfil
  const esMiPropioPerfil = uid === usuario.uid
  const perfilEsLider = joven.rol === 'lider'
  // Jóvenes entre sí y jóvenes contra líderes; dos líderes no se retan.
  const puedeRetar = !esMiPropioPerfil && !(usuario.rol === 'lider' && perfilEsLider)

  async function retar() {
    setRetando(true)
    setErrorDuelo('')
    try {
      const r = await crearDuelo({ retadorUid: usuario.uid, retadoUid: uid })
      if (r.ok) navigate(`/radgen/education/duelo/${r.dueloId}`)
      else setErrorDuelo(r.error)
    } finally {
      setRetando(false)
    }
  }

  async function compartirCarta() {
    const dataUrl = await generarCartaPerfil({
      joven,
      nivelActual,
      racha,
      nivelXp,
      xpTotal,
      totalCompletadas,
      numero: numeroDeCarta(joven.uid),
    })
    await compartirImagen({
      dataUrl,
      nombreArchivo: 'mi-carta-radgen.png',
      titulo: 'Mi carta de RadGen Education',
      texto: 'Esta es mi carta en RadGen Education 🦅',
    })
  }

  return (
    <div className="re-shell">
      <button className="re-vinculo re-vinculo--volver" style={{ marginBottom: 16 }} onClick={() => navigate(-1)}>
        ← Volver
      </button>

      <CartaColeccionable
        joven={joven}
        nivelActual={nivelActual}
        racha={racha}
        nivelXp={nivelXp}
        xpTotal={xpTotal}
        totalCompletadas={totalCompletadas}
      />

      <div className="re-carta-acciones">
        {puedeRetar && (
          <button className="re-btn re-btn--lleno re-btn--duelo" onClick={retar} disabled={retando}>
            {retando ? 'Armando duelo…' : `⚔️ Retar a ${joven.apodo || joven.nombre.split(' ')[0]}`}
          </button>
        )}
        {esMiPropioPerfil && (
          <BotonAccion className="re-btn re-btn--lleno" onClick={compartirCarta} textoCargando="Generando…">
            📤 Compartir mi carta
          </BotonAccion>
        )}
      </div>
      {errorDuelo && <p className="re-duelo-error" style={{ textAlign: 'center' }}>{errorDuelo}</p>}

      {insigniasEspeciales?.length > 0 && (
        <div className="re-card">
          <h2 className="re-subtitulo">Insignias especiales</h2>
          <div className="re-medallas-grid">
            {insigniasEspeciales.map((r) => (
              <div key={r.id} className="re-medalla">
                <div className="re-medalla__icono">
                  <img src={r.imagen} alt="" className="re-medalla__imagen" />
                </div>
                <p className="re-medalla__nombre">{r.nombre}</p>
                {r.motivo && <p className="re-medalla__progreso">"{r.motivo}"</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {esMiPropioPerfil && (
        <div className="re-card" style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, opacity: 0.75 }}>Así te ven los demás. ¿Quieres cambiar algo?</p>
          <button className="re-btn re-btn--lleno" style={{ marginTop: 12 }} onClick={() => navigate('/radgen/education/perfil')}>
            Editar mi perfil
          </button>
        </div>
      )}
    </div>
  )
}
