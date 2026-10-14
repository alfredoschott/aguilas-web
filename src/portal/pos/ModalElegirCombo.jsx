import { useState } from 'react'
import { X, Check, PackagePlus } from 'lucide-react'
import { dinero, elegidoDe, opcionDisponible, precioConElecciones, textoCombo } from './posUtils'

// Se abre al tocar un combo "a elegir": el cliente escoge una (o varias) opción por cada grupo.
// onConfirmar recibe { [grupoId]: [productoId, ...] }.
export default function ModalElegirCombo({ producto, productos, inicial, textoBoton, onConfirmar, onCerrar }) {
  const [elec, setElec] = useState(() => ({ ...(inicial || {}) }))
  const grupos = producto.grupos || []

  function tocar(g, o) {
    const n = g.cantidad || 1
    const actuales = elec[g.id] || []
    let siguiente
    if (n === 1) siguiente = [o.productoId]
    else if (actuales.includes(o.productoId)) siguiente = actuales.filter((x) => x !== o.productoId)
    else siguiente = actuales.length < n ? [...actuales, o.productoId] : [...actuales.slice(1), o.productoId]
    setElec({ ...elec, [g.id]: siguiente })
  }

  const completo = grupos.every((g) => (elec[g.id] || []).length === (g.cantidad || 1))
  const precio = precioConElecciones(producto, elegidoDe(producto, elec))

  return (
    <div className="pos-modal-fondo" onClick={onCerrar}>
      <div className="pos-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Elegir opciones de ${producto.nombre}`}>
        <div className="pos-modal-cab">
          <span className="pos-prod-icono" style={{ '--cat': '#A78BFA', width: 40, height: 40, borderRadius: 12 }}><PackagePlus size={20} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3>{producto.nombre}</h3>
            {(producto.combo || []).length > 0 && <p className="pos-sub" style={{ marginTop: 2 }}>Incluye {textoCombo(producto.combo)}</p>}
          </div>
          <button className="pos-icon-btn" onClick={onCerrar} aria-label="Cerrar"><X size={18} /></button>
        </div>

        {grupos.map((g) => {
          const n = g.cantidad || 1
          const elegidas = elec[g.id] || []
          return (
            <section key={g.id} className="pos-elegir-grupo">
              <div className="pos-elegir-titulo">
                <b>Elige {n > 1 ? `${n} ` : 'la '}{g.nombre.toLowerCase()}</b>
                {n > 1 && <span className="pos-badge">{elegidas.length}/{n}</span>}
              </div>
              <div className="pos-elegir-opciones">
                {(g.opciones || []).map((o) => {
                  const ok = opcionDisponible(o, productos)
                  const marcada = elegidas.includes(o.productoId)
                  return (
                    <button key={o.productoId} className="pos-opcion" aria-pressed={marcada} disabled={!ok} onClick={() => tocar(g, o)}>
                      {marcada && <Check size={15} className="pos-opcion-check" />}
                      <span>{o.nombre}</span>
                      {!ok ? <small>Agotado</small> : o.extra > 0 ? <small>+{dinero(o.extra)}</small> : null}
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}

        <button className="pos-btn pos-btn-primary pos-btn-lg pos-btn-block" style={{ marginTop: 18 }} disabled={!completo} onClick={() => onConfirmar(elec)}>
          {completo ? `${textoBoton || 'Agregar al pedido'} · ${dinero(precio)}` : 'Elige una opción en cada grupo'}
        </button>
      </div>
    </div>
  )
}
