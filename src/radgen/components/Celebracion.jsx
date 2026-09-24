import { useEffect, useState } from 'react'
import Confetti from './Confetti'
import Sky from './Sky'
import { generarTarjetaInsignia, compartirImagen } from '../utils/shareCard'
import { generarWrappedSerie } from '../utils/wrapped'
import { getResumenSerie } from '../store'
import { sonidoNivel, sonidoCompletar, sonidoBono } from '../utils/sonidos'

// Barra de nivel que se llena en vivo de la XP que tenías a la que tienes
// ahora — si subiste de nivel, se llena completa, "revienta" y arranca el
// nuevo nivel.
function BarraXpAnimada({ antes, despues }) {
  const subio = despues.nivel > antes.nivel
  const [fase, setFase] = useState('inicio') // inicio | llenando | nuevoNivel
  const [contador, setContador] = useState(antes.xpTotal)
  const ganada = despues.xpTotal - antes.xpTotal

  useEffect(() => {
    const t1 = setTimeout(() => setFase('llenando'), 250)
    const t2 = subio ? setTimeout(() => setFase('nuevoNivel'), 1150) : null
    const inicio = performance.now()
    let frame
    const paso = (ahora) => {
      const p = Math.min(1, (ahora - inicio) / 1100)
      setContador(Math.round(antes.xpTotal + ganada * p))
      if (p < 1) frame = requestAnimationFrame(paso)
    }
    frame = requestAnimationFrame(paso)
    return () => {
      clearTimeout(t1)
      if (t2) clearTimeout(t2)
      cancelAnimationFrame(frame)
    }
  }, [antes.xpTotal, ganada, subio])

  const pct = (x) => Math.round((x.xpEnNivelActual / x.xpPorNivel) * 100)
  let ancho = pct(antes)
  let nivelMostrado = antes.nivel
  if (fase === 'llenando') ancho = subio ? 100 : pct(despues)
  if (fase === 'nuevoNivel') {
    ancho = pct(despues)
    nivelMostrado = despues.nivel
  }

  return (
    <div className={`re-xp-anim ${fase === 'nuevoNivel' ? 're-xp-anim--subio' : ''}`}>
      <div className="re-xp-anim__cabecera">
        <span className="re-xp-anim__nivel">Nivel {nivelMostrado}</span>
        {ganada > 0 && <span className="re-xp-anim__ganada">+{ganada} XP</span>}
        <span className="re-xp-anim__total">{contador} XP</span>
      </div>
      <div className="re-barra re-barra--xp">
        <div
          className="re-barra__relleno"
          style={{ width: `${ancho}%`, transition: fase === 'nuevoNivel' ? 'none' : undefined }}
        />
      </div>
      {fase === 'nuevoNivel' && <p className="re-xp-anim__subio">⬆️ ¡Subiste al nivel {despues.nivel}!</p>}
    </div>
  )
}

// Overlay de celebración al completar una lección, desbloquear una
// insignia, o (el momento más grande) subir de rango — `tipo="rango"` le
// da su propia puesta en escena: más confeti, dorado, Sky más grande.
export default function Celebracion({
  tipo,
  titulo,
  detalle,
  onCerrar,
  textoBoton = 'Continuar',
  insignia,
  nombreJoven,
  bono,
  xp,
  factor = 1,
  serieCompletada,
  uid,
}) {
  const [compartiendo, setCompartiendo] = useState(false)
  const [generandoResumen, setGenerandoResumen] = useState(false)
  const esRango = tipo === 'rango'

  useEffect(() => {
    if (bono) {
      sonidoBono()
    } else if (esRango) {
      sonidoNivel()
    } else {
      sonidoCompletar()
    }
    // Solo al montar — es una celebración de un solo uso, no debe repetirse
    // si algún otro prop cambia mientras sigue abierta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function compartir() {
    setCompartiendo(true)
    try {
      const dataUrl = await generarTarjetaInsignia({
        nombreJoven: nombreJoven || '',
        nombreInsignia: insignia?.nombre || 'Nueva insignia',
        icono: insignia?.icono || '🏅',
        imagenUrl: insignia?.imagen,
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

  async function verResumen() {
    setGenerandoResumen(true)
    try {
      const resumen = await getResumenSerie(uid, serieCompletada.serieId)
      if (!resumen) return
      const dataUrl = await generarWrappedSerie({ nombreJoven: nombreJoven || '', resumen })
      await compartirImagen({
        dataUrl,
        nombreArchivo: 'resumen-serie-radgen.png',
        titulo: `Mi resumen de ${resumen.serieTitulo}`,
        texto: `Terminé "${resumen.serieTitulo}" en RadGen Education 🙌`,
      })
    } finally {
      setGenerandoResumen(false)
    }
  }

  return (
    <div className={`re-overlay ${esRango ? 're-overlay--rango' : ''}`} role="dialog" aria-modal="true">
      <Confetti piezas={esRango || serieCompletada ? 60 : 26} dorado={esRango} />
      <div className={`re-overlay__tarjeta ${esRango ? 're-overlay__tarjeta--rango' : ''}`}>
        {esRango && <div className="re-overlay__resplandor" aria-hidden="true" />}
        <Sky size={esRango ? 150 : 110} pose="logrado" />
        <h2 className="re-overlay__titulo">{titulo}</h2>
        {detalle && <p className="re-overlay__detalle">{detalle}</p>}

        {xp && <BarraXpAnimada antes={xp.antes} despues={xp.despues} />}

        {factor < 1 && (
          <p className="re-overlay__tarde">
            ⏰ La hiciste tarde, así que valió el {Math.round(factor * 100)}%. ¡La próxima a tiempo vale completa!
          </p>
        )}
        {bono > 0 && <p className="re-overlay__bono">🎁 ¡Bono sorpresa! +{bono} XP</p>}

        {serieCompletada && (
          <button className="re-btn re-btn--bloque re-btn--wrapped" style={{ marginBottom: 12 }} onClick={verResumen} disabled={generandoResumen}>
            {generandoResumen ? 'Armando tu resumen…' : `🎬 Tu resumen de "${serieCompletada.nombre}"`}
          </button>
        )}

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
