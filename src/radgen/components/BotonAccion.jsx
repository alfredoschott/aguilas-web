import { useState } from 'react'

// Botón para acciones que tardan un momento (generar un certificado o una
// imagen para compartir): se desactiva y cambia su texto mientras trabaja,
// para que no parezca que el toque no hizo nada ni se dispare dos veces.
export default function BotonAccion({ onClick, className, textoCargando = 'Generando…', children, ...resto }) {
  const [cargando, setCargando] = useState(false)

  async function manejar(e) {
    if (cargando) return
    setCargando(true)
    try {
      await onClick(e)
    } finally {
      setCargando(false)
    }
  }

  return (
    <button type="button" className={className} onClick={manejar} disabled={cargando} aria-busy={cargando} {...resto}>
      {cargando ? textoCargando : children}
    </button>
  )
}
