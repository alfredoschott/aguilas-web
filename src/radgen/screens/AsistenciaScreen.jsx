import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { registrarAsistencia, getXpConfig } from '../store'
import Sky from '../components/Sky'
import Confetti from '../components/Confetti'
import { sonidoCompletar } from '../utils/sonidos'
import { guardarAsistenciaPendiente } from '../utils/asistenciaPendiente'

export default function AsistenciaScreen({ usuario }) {
  const { codigo } = useParams()
  const navigate = useNavigate()
  const [resultado, setResultado] = useState(null)
  const [xp, setXp] = useState(null)
  const yaIntento = useRef(false)

  useEffect(() => {
    if (!usuario) {
      guardarAsistenciaPendiente(codigo)
      navigate('/radgen/education', { replace: true })
      return
    }
    if (usuario.rol !== 'joven' || yaIntento.current) return
    yaIntento.current = true
    Promise.all([registrarAsistencia({ codigo, jovenUid: usuario.uid }), getXpConfig()]).then(([r, cfg]) => {
      setResultado(r)
      setXp(cfg.porAsistencia)
      if (r.ok && !r.yaRegistrada) sonidoCompletar()
    })
  }, [usuario, codigo, navigate])

  if (!usuario) return null

  if (usuario.rol !== 'joven') {
    return (
      <div className="re-shell">
        <div className="re-card" style={{ textAlign: 'center' }}>
          <Sky size={80} pose="relajado" animado={false} />
          <p style={{ fontWeight: 700 }}>Este código es para que los jóvenes registren su asistencia.</p>
          <Link to="/radgen/education/lider?tab=asistencia" className="re-btn re-btn--lleno">Ir a asistencia</Link>
        </div>
      </div>
    )
  }

  if (!resultado) {
    return (
      <div className="re-shell" style={{ textAlign: 'center' }}>
        <Sky size={72} pose="caminando" animado />
        <p style={{ fontWeight: 700 }}>Registrando tu asistencia…</p>
      </div>
    )
  }

  return (
    <div className="re-shell">
      <div className="re-card re-asistencia-resultado" style={{ position: 'relative', overflow: 'hidden' }}>
        {resultado.ok && !resultado.yaRegistrada && <Confetti piezas={30} contenida />}
        <Sky size={110} pose={resultado.ok ? 'logrado' : 'estudiando'} />
        {resultado.ok ? (
          <>
            <h1 className="re-asistencia-resultado__titulo">
              {resultado.yaRegistrada ? 'Ya estabas registrado ✓' : '¡Asistencia registrada!'}
            </h1>
            <p style={{ fontWeight: 600 }}>{resultado.reunion.titulo}</p>
            {!resultado.yaRegistrada && xp > 0 && <p className="re-overlay__bono">📍 +{xp} XP extra por venir</p>}
          </>
        ) : (
          <>
            <h1 className="re-asistencia-resultado__titulo">No se pudo registrar</h1>
            <p style={{ fontWeight: 600 }}>{resultado.error}</p>
          </>
        )}
        <Link to="/radgen/education/lecciones" className="re-btn re-btn--lleno re-btn--bloque">
          Ir a mis lecciones
        </Link>
      </div>
    </div>
  )
}
