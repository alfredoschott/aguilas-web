import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { IconoMinisterio } from '../ministeriosConfig'

// Barra de acento + cabecera, igual que el dashboard del portal.
export default function PosCabecera({ titulo, sub, ministerioId, ministerioNombre, volverA, onVolver, children, conLogo = true }) {
  return (
    <>
      <div className="pos-accentbar pos-in" />
      <header className="pos-header pos-in" style={{ '--i': 1 }}>
        <div className="pos-header-left">
          {volverA ? (
            <Link to={volverA} className="pos-back" aria-label="Volver"><ArrowLeft size={18} /></Link>
          ) : onVolver ? (
            <button className="pos-back" onClick={onVolver} aria-label="Volver"><ArrowLeft size={18} /></button>
          ) : null}
          {conLogo && !volverA && !onVolver && <img src="/ACFC.png" alt="Águilas Centro Familiar Cristiano" />}
          <div style={{ minWidth: 0 }}>
            <h1 className="pos-title">{titulo}</h1>
            {(sub || ministerioNombre) && (
              <p className="pos-sub">
                {ministerioNombre && <><IconoMinisterio id={ministerioId} size={14} /> {ministerioNombre}</>}
                {ministerioNombre && sub && <span aria-hidden="true">·</span>}
                {sub}
              </p>
            )}
          </div>
        </div>
        {children && <div className="pos-actions">{children}</div>}
      </header>
    </>
  )
}
