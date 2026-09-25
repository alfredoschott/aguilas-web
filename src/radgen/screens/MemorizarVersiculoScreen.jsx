import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { getAsignacionesDe, getXpConfig, marcarVersiculoMemorizado, obtenerBloques } from '../store'
import Sky from '../components/Sky'
import MemorizarVersiculo from '../components/MemorizarVersiculo'
import Esqueleto from '../components/Esqueleto'

// Pantalla aparte a propósito: si el juego viviera en la misma página que
// el versículo (como estaba antes), el texto ya se ve arriba y memorizarlo
// no tiene chiste. Aquí el versículo nunca aparece completo hasta que lo
// vas llenando tú mismo.
export default function MemorizarVersiculoScreen({ usuario }) {
  const { asignacionId } = useParams()
  const navigate = useNavigate()
  const [asignacion, setAsignacion] = useState(undefined) // undefined = cargando
  const [xpCfg, setXpCfg] = useState(null)

  useEffect(() => {
    Promise.all([getAsignacionesDe(usuario.uid), getXpConfig()]).then(([lista, cfg]) => {
      setAsignacion(lista.find((a) => a.id === asignacionId) || null)
      setXpCfg(cfg)
    })
  }, [usuario.uid, asignacionId])

  if (asignacion === undefined || !xpCfg) {
    return (
      <Esqueleto variante="detalle" />
    )
  }

  if (!asignacion) {
    return (
      <div className="re-shell">
        <div className="re-card">Esta lección no existe o no está asignada a ti.</div>
        <button className="re-btn" onClick={() => navigate('/radgen/education/lecciones')}>
          ← Volver a mis lecciones
        </button>
      </div>
    )
  }

  const versiculo = obtenerBloques(asignacion.leccion).find((b) => b.tipo === 'versiculo')

  // Nada que memorizar todavía (falta completar la lección o no tiene
  // versículo) — de vuelta a la lección en vez de mostrar una pantalla vacía.
  if (asignacion.estado !== 'completado' || !versiculo?.texto) {
    return <Navigate to={`/radgen/education/leccion/${asignacionId}`} replace />
  }

  async function memorizado() {
    await marcarVersiculoMemorizado(asignacion.id)
    setAsignacion((prev) => ({ ...prev, versiculoMemorizado: true }))
  }

  return (
    <div className="re-shell">
      <button className="re-vinculo re-vinculo--volver" style={{ marginBottom: 16 }} onClick={() => navigate(-1)}>
        ← Volver a la lección
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1.2rem' }}>
        <h1 className="re-titulo-pagina" style={{ margin: 0 }}>{asignacion.leccion?.titulo}</h1>
        <Sky size={56} pose="estudiando" animado={false} />
      </div>

      <MemorizarVersiculo
        texto={versiculo.texto}
        referencia={versiculo.referencia}
        yaMemorizado={!!asignacion.versiculoMemorizado}
        xp={xpCfg.porVersiculoMemorizado}
        onCompletar={memorizado}
      />
    </div>
  )
}
