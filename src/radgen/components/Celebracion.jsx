import { useState } from 'react'
import Confetti from './Confetti'
import Sky from './Sky'
import { generarTarjetaInsignia, compartirImagen } from '../utils/shareCard'

// Overlay de celebración al completar una lección o desbloquear una insignia.
export default function Celebracion({ titulo, detalle, onCerrar, textoBoton = 'Continuar', insignia, nombreJoven }) {
  const [compartiendo, setCompartiendo] = useState(false)

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
    <div className="re-overlay" role="dialog" aria-modal="true">
      <Confetti />
      <div className="re-overlay__tarjeta">
        <Sky size={110} pose="logrado" />
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
