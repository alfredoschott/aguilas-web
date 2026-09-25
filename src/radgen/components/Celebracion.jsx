import { useEffect, useState } from 'react'
import Confetti from './Confetti'
import Sky from './Sky'
import Avatar from './Avatar'
import { generarTarjetaInsignia, compartirImagen } from '../utils/shareCard'
import { generarWrappedSerie } from '../utils/wrapped'
import { getResumenSerie, MARCOS_AVATAR } from '../store'
import { sonidoNivel, sonidoCompletar, sonidoBono } from '../utils/sonidos'

// Chispas de XP que salen de Sky y vuelan a meterse en la barra, justo
// antes de que se llene — para que se "vea" de dónde sale la experiencia.
const CHISPAS = [
  { x0: 38, y0: -150, d: 0 },
  { x0: 52, y0: -170, d: 0.07 },
  { x0: 62, y0: -140, d: 0.14 },
  { x0: 45, y0: -120, d: 0.21 },
  { x0: 58, y0: -185, d: 0.28 },
  { x0: 48, y0: -160, d: 0.35 },
]

const INICIO_LLENADO = 750

// Barra de nivel que se llena en vivo de la XP que tenías a la que tienes
// ahora — si subiste de nivel, se llena completa, "revienta" y arranca el
// nuevo nivel.
function BarraXpAnimada({ antes, despues, onSubio }) {
  const subio = despues.nivel > antes.nivel
  const [fase, setFase] = useState('inicio') // inicio | llenando | nuevoNivel
  const [contador, setContador] = useState(antes.xpTotal)
  const ganada = despues.xpTotal - antes.xpTotal

  useEffect(() => {
    let frame
    const t1 = setTimeout(() => {
      setFase('llenando')
      const inicio = performance.now()
      const paso = (ahora) => {
        const p = Math.min(1, (ahora - inicio) / 1100)
        setContador(Math.round(antes.xpTotal + ganada * p))
        if (p < 1) frame = requestAnimationFrame(paso)
      }
      frame = requestAnimationFrame(paso)
    }, INICIO_LLENADO)
    const t2 = subio ? setTimeout(() => setFase('nuevoNivel'), INICIO_LLENADO + 900) : null
    const t3 = subio && onSubio ? setTimeout(onSubio, INICIO_LLENADO + 1700) : null
    return () => {
      clearTimeout(t1)
      if (t2) clearTimeout(t2)
      if (t3) clearTimeout(t3)
      cancelAnimationFrame(frame)
    }
    // onSubio es de un solo uso; no debe reiniciar la animación.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [antes.xpTotal, ganada, subio])

  const pct = (x) => Math.round((x.xpEnNivelActual / x.xpPorNivel) * 100)
  let ancho = pct(antes)
  let nivelMostrado = antes.nivel
  if (fase === 'llenando') ancho = subio ? 100 : pct(despues)
  if (fase === 'nuevoNivel') {
    ancho = pct(despues)
    nivelMostrado = despues.nivel
  }
  const meta = subio ? 100 : pct(despues)

  return (
    <div className={`re-xp-anim ${fase === 'nuevoNivel' ? 're-xp-anim--subio' : ''} ${fase !== 'inicio' ? 're-xp-anim--recibe' : ''}`}>
      {ganada > 0 && (
        <div className="re-xp-chispas" aria-hidden="true">
          {CHISPAS.map((c, i) => (
            <span
              key={i}
              className="re-xp-chispa"
              style={{
                '--x0': `${c.x0}%`,
                '--y0': `${c.y0}px`,
                '--x1': `${Math.max(4, meta)}%`,
                animationDelay: `${c.d}s`,
              }}
            >
              ⚡
            </span>
          ))}
        </div>
      )}
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

// El marco más alto que se desbloqueó al pasar de un nivel a otro (si hubo).
function marcoDesbloqueado(nivelAntes, nivelDespues) {
  const nuevos = MARCOS_AVATAR.filter((m) => m.nivel > nivelAntes && m.nivel <= nivelDespues)
  return nuevos[nuevos.length - 1] || null
}

// Pantalla completa de "¡subiste de nivel!": el número grande con rayos
// girando detrás y, si ese nivel desbloquea un marco, el avatar del joven
// ya puesto con él.
function SubidaNivel({ nivel, marco, perfil, onCerrar }) {
  return (
    <div className="re-subenivel" role="dialog" aria-modal="true" aria-label={`Subiste al nivel ${nivel}`}>
      <div className="re-subenivel__rayos" aria-hidden="true" />
      <Confetti piezas={70} dorado />
      <div className="re-subenivel__contenido">
        <p className="re-subenivel__eyebrow">¡Subiste de nivel!</p>
        <div className="re-subenivel__numero">
          <span className="re-subenivel__nivel-texto">Nivel</span>
          <span className="re-subenivel__nivel">{nivel}</span>
        </div>
        {marco && perfil ? (
          <div className="re-subenivel__marco">
            <Avatar
              nombre={perfil.nombre}
              uid={perfil.uid}
              foto={perfil.fotoPerfil}
              size={96}
              marco={marco.id}
              colorAcento={perfil.colorAcento}
            />
            <div>
              <p className="re-subenivel__marco-titulo">Marco desbloqueado: {marco.nombre}</p>
              <p className="re-subenivel__marco-texto">Póntelo cuando quieras desde tu perfil.</p>
            </div>
          </div>
        ) : (
          <p className="re-subenivel__texto">Cada nivel cuesta un poco más. ¡Vas con todo!</p>
        )}
        <button type="button" className="re-btn re-btn--lleno re-subenivel__boton" onClick={onCerrar} autoFocus>
          ¡Vamos! →
        </button>
      </div>
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
  perfil,
}) {
  const [compartiendo, setCompartiendo] = useState(false)
  const [generandoResumen, setGenerandoResumen] = useState(false)
  const esRango = tipo === 'rango'
  const [subidaNivel, setSubidaNivel] = useState(false)
  const marco = xp ? marcoDesbloqueado(xp.antes.nivel, xp.despues.nivel) : null

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

        {xp && <BarraXpAnimada antes={xp.antes} despues={xp.despues} onSubio={() => setSubidaNivel(true)} />}

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
      {subidaNivel && (
        <SubidaNivel nivel={xp.despues.nivel} marco={marco} perfil={perfil} onCerrar={() => setSubidaNivel(false)} />
      )}
    </div>
  )
}
