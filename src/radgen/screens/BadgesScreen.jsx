import { useEffect, useState } from 'react'
import { getInsigniasDe, getMostrarElegibilidadAJovenes, getRachaSemanas } from '../store'
import Sky from '../components/Sky'

function Medalla({ nombre, icono, desbloqueada, progreso, delay = 0 }) {
  return (
    <div
      className={`re-medalla ${desbloqueada ? '' : 're-medalla--bloqueada'}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="re-medalla__icono">{desbloqueada ? icono : '🔒'}</div>
      <p className="re-medalla__nombre">{nombre}</p>
      {progreso && <p className="re-medalla__progreso">{progreso}</p>}
    </div>
  )
}

function TarjetaElegibilidad({ titulo, resultado }) {
  return (
    <div className={`re-card ${resultado.apto ? '' : 're-card--rojo'}`}>
      <h2 className="re-subtitulo">{titulo}</h2>
      {resultado.apto ? (
        <p style={{ fontWeight: 700 }}>✔ Cumples los requisitos.</p>
      ) : (
        <>
          <p style={{ fontWeight: 700, marginBottom: 10 }}>Te falta completar:</p>
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            {resultado.faltantes.map((f) => (
              <li key={f} style={{ marginBottom: 6 }}>{f}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export default function BadgesScreen({ usuario }) {
  const [insignias, setInsignias] = useState(null)
  const [mostrarElegibilidad, setMostrarElegibilidad] = useState(false)
  const [racha, setRacha] = useState(0)

  useEffect(() => {
    Promise.all([
      getInsigniasDe(usuario.uid),
      getMostrarElegibilidadAJovenes(),
      getRachaSemanas(usuario.uid),
    ]).then(([i, m, r]) => {
      setInsignias(i)
      setMostrarElegibilidad(m)
      setRacha(r)
    })
  }, [usuario.uid])

  if (!insignias) {
    return (
      <div className="re-shell re-shell--ancho" style={{ textAlign: 'center' }}>
        <Sky size={72} pose="estudiando" animado />
      </div>
    )
  }

  const porcentajeNivel = insignias.progresoNivel
    ? Math.min(100, Math.round((insignias.progresoNivel.actual / insignias.progresoNivel.meta) * 100))
    : 100

  const mensajeSky = insignias.nivelActual
    ? `¡Vas muy bien! Ya tienes rango ${insignias.nivelActual.nombre}.`
    : insignias.totalCompletadas === 0
      ? 'Completa tu primera cápsula para ganar tu primera insignia.'
      : '¡Vas por buen camino! Sigue completando cápsulas.'

  const poseSky = insignias.nivelActual ? 'logrado' : insignias.totalCompletadas === 0 ? 'saludando' : 'estudiando'

  return (
    <div className="re-shell re-shell--ancho">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
        <h1 className="re-titulo-pagina" style={{ margin: 0 }}>Mis insignias</h1>
        <Sky size={56} pose={poseSky} animado={false} />
      </div>
      <p style={{ fontWeight: 600, opacity: 0.85, marginBottom: '1rem' }}>{mensajeSky}</p>

      {racha > 0 && (
        <div className="re-racha" style={{ marginBottom: '1.5rem' }}>
          🔥 {racha} semana{racha === 1 ? '' : 's'} seguida{racha === 1 ? '' : 's'} activo
        </div>
      )}

      <div className="re-card">
        <h2 className="re-subtitulo">Rango</h2>
        {insignias.nivelActual ? (
          <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            {insignias.nivelActual.icono} {insignias.nivelActual.nombre}
          </p>
        ) : (
          <p style={{ fontWeight: 700 }}>Todavía sin rango — completa tu primera cápsula.</p>
        )}
        {insignias.progresoNivel && (
          <>
            <div className="re-barra">
              <div className="re-barra__relleno" style={{ width: `${porcentajeNivel}%` }} />
            </div>
            <p style={{ marginTop: 4 }}>
              {insignias.progresoNivel.actual} / {insignias.progresoNivel.meta} cápsulas para llegar a{' '}
              <strong>{insignias.siguienteNivel.nombre}</strong>
            </p>
          </>
        )}
      </div>

      <div className="re-card">
        <h2 className="re-subtitulo">Cápsulas</h2>
        <div className="re-medallas-grid">
          {insignias.porLeccion.map((b, i) => (
            <Medalla key={b.id} nombre={b.nombre} icono={b.icono} desbloqueada={b.desbloqueada} delay={i * 0.06} />
          ))}
        </div>
      </div>

      <div className="re-card">
        <h2 className="re-subtitulo">Series completas</h2>
        <div className="re-medallas-grid">
          {insignias.porSerie.map((b, i) => (
            <Medalla
              key={b.id}
              nombre={b.nombre}
              icono={b.icono}
              desbloqueada={b.desbloqueada}
              progreso={b.progreso}
              delay={i * 0.06}
            />
          ))}
        </div>
      </div>

      {mostrarElegibilidad && (
        <>
          <h2 className="re-subtitulo" style={{ color: 'var(--rg-paper)', margin: '2rem 0 1rem' }}>
            Elegibilidad para servir
          </h2>
          <TarjetaElegibilidad titulo="Voluntariado en la iglesia" resultado={insignias.elegibilidad.voluntariado} />
          <TarjetaElegibilidad titulo="Viajes misioneros" resultado={insignias.elegibilidad.misiones} />
        </>
      )}
    </div>
  )
}
