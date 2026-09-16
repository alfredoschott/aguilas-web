import { useState } from 'react'
import Confetti from './Confetti'
import Sky from './Sky'
import { generarTarjetaInsignia, compartirImagen } from '../utils/shareCard'

// Overlay de celebración al completar una lección, desbloquear una
// insignia, o (el momento más grande) subir de rango — `tipo="rango"` le
// da su propia puesta en escena: más confeti, dorado, Sky más grande.
export default function Celebracion({ tipo, titulo, detalle, onCerrar, textoBoton = 'Continuar', insignia, nombreJoven }) {
  const [compartiendo, setCompartiendo] = useState(false)
  const esRango = tipo === 'rango'

  async function compartir() {
    setCompartiendo(true)
    try {
      const dataUrl = await generarTarjetaInsignia({
        nombreJoven: nombreJoven || '',
        nombreInsignia: insignia?.nombre || 'Nueva insignia',
        icono: insignia?.icono || '🏅',
      })
      await compartirImagen({
        dataUrl,
        nombreArchivo: 'insignia-radgen.png',
        titulo: '¡Nueva insignia en RadGen Education!',
        texto: `Desbloqueé ${insignia?.nombre || 'una insignia'} en RadGen Education 🙌`,
      })
    } finally {
      setCompartiendo(false)
    }
  }

  return (
    <div className={`re-overlay ${esRango ? 're-overlay--rango' : ''}`} role="dialog" aria-modal="true">
      <Confetti piezas={esRango ? 60 : 26} dorado={esRango} />
      <div className={`re-overlay__tarjeta ${esRango ? 're-overlay__tarjeta--rango' : ''}`}>
        {esRango && <div className="re-overlay__resplandor" aria-hidden="true" />}
        <Sky size={esRango ? 150 : 110} pose="logrado" />
        <h2 className="re-overlay__titulo">{titulo}</h2>
        {detalle && <p className="re-overlay__detalle">{detalle}</p>}

        {insignia && (
          <button
            className="re-btn re-btn--bloque"
            style={{ marginBottom: 12 }}
            onClick={compartir}
            disabled={compartiendo}
          >
            {compartiendo ? 'Generando…' : '📤 Compartir insignia'}
          </button>
        )}

        <button className="re-btn re-btn--lleno re-btn--bloque" onClick={onCerrar}>
          {textoBoton}
        </button>
      </div>
    </div>
  )
}
