import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCompaneros, crearDuelo } from '../store'
import Avatar from '../components/Avatar'
import Sky from '../components/Sky'
import BotonAccion from '../components/BotonAccion'

function prioridad(c, uid) {
  if (c.dueloAbierto && !c.dueloAbierto.respuestas?.[uid]) return 0 // te toca jugar
  if (c.dueloAbierto) return 1 // esperando al otro
  if (c.puedeRetar) return 2
  return 3
}

function TarjetaCompanero({ companero, uid, onRetar, error }) {
  const { joven, dueloAbierto, puedeRetar, preguntasEnComun, victorias, derrotas } = companero
  const nombre = joven.apodo || joven.nombre
  const meToca = dueloAbierto && !dueloAbierto.respuestas?.[uid]

  return (
    <div className={`re-companero ${meToca ? 're-companero--turno' : ''}`}>
      <Link to={`/radgen/education/joven/${joven.uid}`} className="re-companero__identidad">
        <Avatar
          nombre={joven.nombre}
          foto={joven.fotoPerfil}
          uid={joven.uid}
          size={52}
          marco={joven.marcoAvatar}
          colorAcento={joven.colorAcento}
        />
        <span className="re-companero__texto">
          <span className="re-companero__nombre">{nombre}</span>
          {joven.apodo && <span className="re-companero__sub">{joven.nombre}</span>}
          {(victorias > 0 || derrotas > 0) && (
            <span className="re-companero__marcador">
              Tú {victorias} · {derrotas} {nombre.split(' ')[0]}
            </span>
          )}
        </span>
      </Link>

      <div className="re-companero__accion">
        {dueloAbierto ? (
          <Link
            to={`/radgen/education/duelo/${dueloAbierto.id}`}
            className={`re-btn re-btn--sm ${meToca ? 're-btn--lleno re-btn--duelo' : ''}`}
          >
            {meToca ? '⚔️ Jugar' : '⏳ Esperando'}
          </Link>
        ) : puedeRetar ? (
          <BotonAccion className="re-btn re-btn--sm re-btn--lleno re-btn--duelo" onClick={() => onRetar(joven.uid)} textoCargando="Armando…">
            ⚔️ Retar
          </BotonAccion>
        ) : (
          <span className="re-companero__bloqueado" title="Hace falta tener al menos 3 preguntas de quiz en común">
            {preguntasEnComun === 0 ? 'Sin cápsulas en común aún' : `${preguntasEnComun}/3 preguntas en común`}
          </span>
        )}
        {error && <p className="re-duelo-error">{error}</p>}
      </div>
    </div>
  )
}

// La puerta de entrada a los duelos: sin esta pantalla, un joven solo
// podía llegar al perfil de un compañero desde el ranking — y si la líder
// lo tiene oculto, no había forma de retar a nadie.
export default function CompanerosScreen({ usuario }) {
  const navigate = useNavigate()
  const [companeros, setCompaneros] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [errores, setErrores] = useState({})

  useEffect(() => {
    getCompaneros(usuario.uid).then(setCompaneros)
  }, [usuario.uid])

  const visibles = useMemo(() => {
    if (!companeros) return []
    const termino = busqueda.trim().toLowerCase()
    return companeros
      .filter((c) => !termino || `${c.joven.nombre} ${c.joven.apodo || ''}`.toLowerCase().includes(termino))
      .sort(
        (a, b) =>
          prioridad(a, usuario.uid) - prioridad(b, usuario.uid) ||
          (a.joven.apodo || a.joven.nombre).localeCompare(b.joven.apodo || b.joven.nombre),
      )
  }, [companeros, busqueda, usuario.uid])

  async function retar(retadoUid) {
    setErrores((prev) => ({ ...prev, [retadoUid]: null }))
    const r = await crearDuelo({ retadorUid: usuario.uid, retadoUid })
    if (r.ok) navigate(`/radgen/education/duelo/${r.dueloId}`)
    else setErrores((prev) => ({ ...prev, [retadoUid]: r.error }))
  }

  if (!companeros) {
    return (
      <div className="re-shell" style={{ textAlign: 'center' }}>
        <Sky size={72} pose="estudiando" animado />
      </div>
    )
  }

  const turnos = companeros.filter((c) => c.dueloAbierto && !c.dueloAbierto.respuestas?.[usuario.uid]).length

  return (
    <div className="re-shell re-shell--medio">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
        <h1 className="re-titulo-pagina" style={{ margin: 0 }}>Compañeros</h1>
        <Sky size={64} pose="saludando" animado={false} />
      </div>
      <p className="re-companeros__intro">
        Reta a alguien a un <strong>duelo de repaso</strong>: 5 preguntas de cápsulas que los dos ya hicieron. Gana
        quien acierte más; si empatan, el más rápido.
      </p>

      {turnos > 0 && (
        <div className="re-aviso re-aviso--duelo" style={{ animation: 'none' }}>
          <span className="re-aviso__icono">⚔️</span>
          <span>
            Tienes <strong>{turnos}</strong> duelo{turnos === 1 ? '' : 's'} esperando tu jugada.
          </span>
        </div>
      )}

      {companeros.length > 6 && (
        <input
          className="re-input"
          placeholder="Buscar compañero…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      )}

      {companeros.length === 0 ? (
        <div className="re-card" style={{ textAlign: 'center' }}>
          <Sky size={56} pose="relajado" animado={false} />
          <p style={{ margin: '12px 0 0' }}>Todavía no hay más jóvenes registrados. ¡Invita a tus amigos!</p>
        </div>
      ) : (
        <div className="re-companeros">
          {visibles.map((c) => (
            <TarjetaCompanero key={c.joven.uid} companero={c} uid={usuario.uid} onRetar={retar} error={errores[c.joven.uid]} />
          ))}
          {visibles.length === 0 && <p style={{ opacity: 0.7 }}>Nadie coincide con “{busqueda}”.</p>}
        </div>
      )}
    </div>
  )
}
