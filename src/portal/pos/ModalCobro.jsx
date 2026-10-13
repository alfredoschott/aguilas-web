import { useState } from 'react'
import { Banknote, Landmark, Clock, X } from 'lucide-react'
import { dinero, redondear } from './posUtils'

const BILLETES = [20, 50, 100, 200, 500]

// Cobro de un pedido (o de varias deudas juntas). Calcula el cambio en efectivo.
// onConfirmar recibe { estado, metodo, recibido, cambio, verificado }.
export default function ModalCobro({ total, titulo = 'Cobrar', subtitulo, permitirPendiente = true, onConfirmar, onCerrar, guardando }) {
  const [opcion, setOpcion] = useState('efectivo') // efectivo | transferencia | pendiente
  const [recibido, setRecibido] = useState('')
  const [verificado, setVerificado] = useState(false)

  const recibidoNum = redondear(recibido)
  const cambio = redondear(recibidoNum - total)
  const falta = recibidoNum > 0 && cambio < 0
  const listo = opcion !== 'efectivo' || recibidoNum >= total

  function confirmar() {
    if (opcion === 'efectivo') onConfirmar({ estado: 'pagado', metodo: 'efectivo', recibido: recibidoNum, cambio, verificado: true })
    else if (opcion === 'transferencia') onConfirmar({ estado: 'pagado', metodo: 'transferencia', recibido: total, cambio: 0, verificado })
    else onConfirmar({ estado: 'pendiente', metodo: null, recibido: 0, cambio: 0, verificado: false })
  }

  const metodos = [
    { id: 'efectivo', label: 'Efectivo', Icono: Banknote, color: 'var(--pos-ef)' },
    { id: 'transferencia', label: 'Transferencia', Icono: Landmark, color: 'var(--pos-tr)' },
    ...(permitirPendiente ? [{ id: 'pendiente', label: 'Cobrar después', Icono: Clock, color: 'var(--pos-pe)' }] : []),
  ]

  return (
    <div className="pos-modal-fondo" onClick={onCerrar}>
      <div className="pos-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="pos-modal-cab">
          <div style={{ flex: 1 }}>
            <h3>{titulo}</h3>
            {subtitulo && <p className="pos-sub" style={{ marginTop: 2 }}>{subtitulo}</p>}
          </div>
          <button className="pos-icon-btn" onClick={onCerrar} aria-label="Cerrar"><X size={18} /></button>
        </div>

        <div className="pos-modal-total">
          <span className="pos-cifra-label">Total a cobrar</span>
          <span className="pos-num">{dinero(total)}</span>
        </div>

        <div className="pos-metodos" data-n={metodos.length}>
          {metodos.map(({ id, label, Icono, color }) => (
            <button key={id} className="pos-metodo" style={{ '--c': color }} aria-pressed={opcion === id} onClick={() => setOpcion(id)}>
              <Icono size={24} /> {label}
            </button>
          ))}
        </div>

        {opcion === 'efectivo' && (
          <>
            <label className="pos-label" htmlFor="pos-recibido">¿Con cuánto paga?</label>
            <input id="pos-recibido" className="pos-input" style={{ fontSize: '1.3rem', fontWeight: 700, minHeight: 52 }} type="number" inputMode="decimal" min="0" autoFocus
              value={recibido} onChange={(e) => setRecibido(e.target.value)} placeholder="$ 0.00" />
            <div className="pos-rapidos">
              <button className="pos-chip" onClick={() => setRecibido(String(total))}>Exacto</button>
              {BILLETES.filter((b) => b >= total || b === BILLETES.at(-1)).slice(0, 4).map((b) => (
                <button key={b} className="pos-chip" onClick={() => setRecibido(String(b))}>${b}</button>
              ))}
            </div>
            <div className="pos-cambio" data-falta={falta} aria-live="polite">
              <div className="pos-cifra-label">{falta ? 'Todavía falta' : 'Cambio a entregar'}</div>
              <div className="pos-cambio-valor pos-num">{dinero(falta ? -cambio : Math.max(cambio, 0))}</div>
            </div>
          </>
        )}

        {opcion === 'transferencia' && (
          <label className="pos-switch">
            <input type="checkbox" checked={verificado} onChange={(e) => setVerificado(e.target.checked)} />
            Ya verifiqué que llegó el depósito
          </label>
        )}

        {opcion === 'pendiente' && (
          <p className="pos-nota">Queda a nombre del cliente como “debe {dinero(total)}”. Lo cobras después desde <strong>Por cobrar</strong>.</p>
        )}

        <button className="pos-btn pos-btn-primary pos-btn-lg pos-btn-block" disabled={!listo || guardando} onClick={confirmar}>
          {guardando ? 'Guardando…' : opcion === 'pendiente' ? 'Guardar pedido' : 'Confirmar cobro'}
        </button>
      </div>
    </div>
  )
}
