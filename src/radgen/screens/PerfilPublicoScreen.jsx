import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getPerfilPublico, crearDuelo } from '../store'
import Avatar from '../components/Avatar'
import Sky from '../components/Sky'

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
      <div className="re-shell" style={{ textAlign: 'center' }}>
        <Sky size={72} pose="estudiando" animado />
      </div>
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

  const { joven, nivelActual, racha, insigniasEspeciales } = perfil
  const esMiPropioPerfil = uid === usuario.uid
  const puedeRetar = !esMiPropioPerfil && usuario.rol === 'joven' && joven.rol === 'joven'

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

  return (
    <div className="re-shell">
      <button className="re-vinculo re-vinculo--volver" style={{ marginBottom: 16 }} onClick={() => navigate(-1)}>
        ← Volver
      </button>

      <div className={`re-perfil-hero ${joven.fondoPerfil ? `re-fondo-perfil--${joven.fondoPerfil}` : ''}`}>
        <Avatar
          nombre={joven.nombre}
          uid={joven.uid}
          foto={joven.fotoPerfil}
          size={110}
          marco={joven.marcoAvatar || nivelActual?.id}
          racha={racha}
          colorAcento={joven.colorAcento}
        />
        <h1 className="re-perfil-hero__nombre">{joven.nombre}</h1>
        {joven.apodo && <p className="re-perfil-apodo">{joven.apodo}</p>}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 14 }}>
          <span className={`re-badge ${nivelActual ? 're-badge--completado' : 're-badge--pendiente'}`}>
            {nivelActual ? `${nivelActual.icono} ${nivelActual.nombre}` : 'Sin rango aún'}
          </span>
          {racha > 0 && <span className="re-badge re-badge--completado">🔥 {racha} semana{racha === 1 ? '' : 's'}</span>}
        </div>

        {joven.bio && <p className="re-bio-card">"{joven.bio}"</p>}

        {puedeRetar && (
          <div style={{ marginTop: 18 }}>
            <button className="re-btn re-btn--lleno re-btn--duelo" onClick={retar} disabled={retando}>
              {retando ? 'Armando duelo…' : `⚔️ Retar a ${joven.apodo || joven.nombre.split(' ')[0]} a un duelo`}
            </button>
            {errorDuelo && <p className="re-duelo-error">{errorDuelo}</p>}
          </div>
        )}
      </div>

      {joven.insigniaDestacada && (
        <div className="re-card" style={{ textAlign: 'center' }}>
          <h2 className="re-subtitulo">Insignia destacada</h2>
          <div className="re-insignia-destacada">
            <span className="re-insignia-destacada__icono">
              {joven.insigniaDestacada.imagen ? (
                <img src={joven.insigniaDestacada.imagen} alt="" />
              ) : (
                joven.insigniaDestacada.icono
              )}
            </span>
            <span className="re-insignia-destacada__texto">{joven.insigniaDestacada.nombre}</span>
          </div>
        </div>
      )}

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
