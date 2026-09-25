import { useRef } from 'react'
import Avatar from './Avatar'
import { imagenDeInsignia } from '../store'
import { rarezaDe, numeroDeCarta, bioDeCarta } from '../utils/rarezaCarta'

// El perfil de un joven como carta coleccionable: nivel arriba como los
// puntos de vida, su avatar como ilustración, rango y estadísticas abajo, y
// un borde holográfico cuyo color depende de qué tan alto va. Con el mouse
// se inclina en 3D y el brillo sigue al cursor.
export default function CartaColeccionable({ joven, nivelActual, racha, nivelXp, xpTotal, totalCompletadas }) {
  const ref = useRef(null)
  const esLider = joven.rol === 'lider'
  const rareza = rarezaDe(nivelXp, esLider)
  const destacada = joven.insigniaDestacada
  const imagenDestacada = destacada ? imagenDeInsignia(destacada) : null

  function mover(e) {
    if (e.pointerType === 'touch' || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    ref.current.style.setProperty('--rx', `${(0.5 - y) * 14}deg`)
    ref.current.style.setProperty('--ry', `${(x - 0.5) * 18}deg`)
    ref.current.style.setProperty('--gx', `${x * 100}%`)
    ref.current.style.setProperty('--gy', `${y * 100}%`)
    ref.current.classList.add('re-carta--activa')
  }

  function soltar() {
    if (!ref.current) return
    ref.current.style.setProperty('--rx', '0deg')
    ref.current.style.setProperty('--ry', '0deg')
    ref.current.classList.remove('re-carta--activa')
  }

  return (
    <div className="re-carta-escena">
      <div
        ref={ref}
        className={`re-carta re-carta--${rareza.id}`}
        style={{ '--rareza': rareza.color }}
        onPointerMove={mover}
        onPointerLeave={soltar}
      >
        <div className="re-carta__interior">
          <header className="re-carta__cabecera">
            <span className="re-carta__nombre">{joven.apodo || joven.nombre}</span>
            <span className="re-carta__nivel">
              <small>NV</small>
              {esLider ? '♾️' : nivelXp}
            </span>
          </header>

          <div className={`re-carta__arte ${joven.fondoPerfil ? `re-fondo-perfil--${joven.fondoPerfil}` : ''}`}>
            <Avatar
              nombre={joven.nombre}
              uid={joven.uid}
              foto={joven.fotoPerfil}
              size={128}
              marco={joven.marcoAvatar || nivelActual?.id}
              colorAcento={joven.colorAcento}
            />
            {destacada && (
              <span className="re-carta__emblema" title={`Insignia destacada: ${destacada.nombre}`}>
                {imagenDestacada ? <img src={imagenDestacada} alt="" /> : destacada.icono}
              </span>
            )}
          </div>

          <div className="re-carta__tipo">
            <span>
              {esLider ? '👑 Líder' : nivelActual ? `${nivelActual.icono} ${nivelActual.nombre}` : '🌱 Sin rango aún'}
            </span>
            <span className="re-carta__rareza">★ {rareza.nombre}</span>
          </div>

          <dl className="re-carta__stats">
            <div>
              <dt>XP</dt>
              <dd>{esLider ? '♾️' : xpTotal}</dd>
            </div>
            <div>
              <dt>Racha</dt>
              <dd>🔥 {racha}</dd>
            </div>
            <div>
              <dt>Cápsulas</dt>
              <dd>{totalCompletadas}</dd>
            </div>
          </dl>

          <p className="re-carta__bio">{bioDeCarta(joven.bio)}</p>

          <footer className="re-carta__pie">
            <span>RadGen Education</span>
            <span>Nº {numeroDeCarta(joven.uid)}</span>
          </footer>
        </div>
        <span className="re-carta__holo" aria-hidden="true" />
        <span className="re-carta__brillo" aria-hidden="true" />
      </div>
    </div>
  )
}
