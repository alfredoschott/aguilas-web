import { useEffect, useState } from 'react'

const PARTES_XP = [
  ['capsulas', '📘', 'Cápsulas'],
  ['quiz', '✅', 'Aciertos de quiz'],
  ['racha', '🔥', 'Semanas constantes'],
  ['insignias', '🏅', 'Insignias especiales'],
  ['asistencia', '📍', 'Asistencia'],
  ['versiculos', '🧠', 'Versículos memorizados'],
  ['duelos', '⚔️', 'Duelos ganados'],
  ['bono', '🎁', 'Bonos sorpresa'],
]

// Nivel de experiencia — separado del rango (que depende solo de cápsulas
// completadas). Tocando la tarjeta se abre el desglose: de dónde sale cada
// punto, para que nadie tenga que adivinar por qué alguien va arriba.
export default function TarjetaExperiencia({ experiencia }) {
  const [abierta, setAbierta] = useState(false)
  const [relleno, setRelleno] = useState(0)
  const porcentaje = Math.round((experiencia.xpEnNivelActual / experiencia.xpPorNivel) * 100)

  useEffect(() => {
    const id = requestAnimationFrame(() => setRelleno(porcentaje))
    return () => cancelAnimationFrame(id)
  }, [porcentaje])

  const partes = PARTES_XP.filter(([clave]) => experiencia.desglose[clave] > 0)
  const maximo = Math.max(1, ...partes.map(([clave]) => experiencia.desglose[clave]))

  return (
    <div className="re-card re-card--xp">
      <button type="button" className="re-xp-card__toggle" onClick={() => setAbierta((v) => !v)} aria-expanded={abierta}>
        <span className="re-xp-card__nivel">
          <span className="re-xp-card__nivel-num">{experiencia.nivel}</span>
          <span className="re-xp-card__nivel-etq">nivel</span>
        </span>
        <span className="re-xp-card__cuerpo">
          <span className="re-seccion-header" style={{ marginBottom: 8 }}>
            <span className="re-subtitulo" style={{ margin: 0 }}>{experiencia.xpTotal} XP</span>
            <span className="re-xp-card__ver">{abierta ? 'Ocultar' : '¿De dónde salen?'} {abierta ? '▲' : '▼'}</span>
          </span>
          <span className="re-barra re-barra--xp">
            <span className="re-barra__relleno" style={{ width: `${relleno}%` }} />
          </span>
          <span className="re-xp-card__meta">
            {experiencia.xpPorNivel - experiencia.xpEnNivelActual} XP para el nivel {experiencia.nivel + 1}
          </span>
        </span>
      </button>

      {abierta && (
        <div className="re-xp-desglose">
          {partes.map(([clave, icono, etiqueta]) => (
            <div key={clave} className="re-xp-desglose__fila">
              <span className="re-xp-desglose__etiqueta">{icono} {etiqueta}</span>
              <span className="re-xp-desglose__barra">
                <span style={{ width: `${(experiencia.desglose[clave] / maximo) * 100}%` }} />
              </span>
              <span className="re-xp-desglose__valor">+{experiencia.desglose[clave]}</span>
            </div>
          ))}
          {partes.length === 0 && <p style={{ margin: 0, opacity: 0.7 }}>Completa tu primera cápsula para empezar a sumar.</p>}
          {experiencia.totalCompletadas > 0 && (
            <p className="re-xp-desglose__nota">
              ⚡ {experiencia.aTiempo} de {experiencia.totalCompletadas} cápsulas a tiempo
              {experiencia.perdidoPorTarde > 0 && ` · dejaste ir ${experiencia.perdidoPorTarde} XP por hacerlas tarde`}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
