import { useState } from 'react'
import { X, Lock, HandHeart, AlertTriangle } from 'lucide-react'
import { calcularDiezmo, dinero, pctDiezmo, redondear } from './posUtils'

// Cierre de caja: resumen del dinero y el diezmo. El sistema sugiere el porcentaje configurado
// sobre lo cobrado, pero quien cierra decide cuánto aparta realmente.
export default function ModalCierreCaja({ venta, corte, efectivoCaja, onConfirmar, onCerrar, guardando }) {
  const pct = pctDiezmo(venta)
  const d = calcularDiezmo(corte, pct)
  const [apartado, setApartado] = useState(String(d.sugerido))
  const num = redondear(apartado)
  const valido = apartado !== '' && num >= 0 && num <= corte.cobrado
  const redondeado = Math.ceil(d.sugerido / 10) * 10
  const enCaja = redondear(efectivoCaja - num)

  function confirmar() {
    onConfirmar(pct > 0 ? { diezmoApartado: num, diezmoSugerido: d.sugerido, cierreCobrado: corte.cobrado } : {})
  }

  return (
    <div className="pos-modal-fondo" onClick={onCerrar}>
      <div className="pos-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Cierre de caja">
        <div className="pos-modal-cab">
          <div style={{ flex: 1 }}>
            <h3>Cierre de caja</h3>
            <p className="pos-sub" style={{ marginTop: 2 }}>{venta.nombre}</p>
          </div>
          <button className="pos-icon-btn" onClick={onCerrar} aria-label="Cerrar"><X size={18} /></button>
        </div>

        <div className="pos-cierre-resumen">
          <div><span>Vendido</span><b className="pos-num">{dinero(corte.vendido)}</b></div>
          <div><span>Cobrado</span><b className="pos-num" style={{ color: 'var(--pos-ef)' }}>{dinero(corte.cobrado)}</b></div>
          <div><span>Efectivo en caja <small>(con fondo)</small></span><b className="pos-num">{dinero(efectivoCaja)}</b></div>
          <div><span>Transferencias</span><b className="pos-num">{dinero(corte.transferencia)}</b></div>
        </div>

        {corte.pendientes > 0 && (
          <div className="pos-aviso" style={{ margin: '12px 0 0' }}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>Quedan {corte.pendientes} pedido{corte.pendientes > 1 ? 's' : ''} sin cobrar ({dinero(corte.pendiente)}). Seguirán en “Por cobrar”{pct > 0 ? `; su diezmo (${dinero(d.extraPendiente)}) se calcula cuando se cobren.` : '.'}</span>
          </div>
        )}

        {pct > 0 && (
          <section className="pos-diezmo-cierre">
            <div className="pos-diezmo-titulo"><HandHeart size={18} /> Diezmo</div>
            <div className="pos-diezmo-sugerido">
              <span>Sugerido ({pct}% de lo cobrado)</span>
              <b className="pos-num">{dinero(d.sugerido)}</b>
            </div>
            <label className="pos-label" htmlFor="pos-diezmo-apartado" style={{ marginTop: 14 }}>¿Cuánto van a apartar?</label>
            <input id="pos-diezmo-apartado" className="pos-input" style={{ fontSize: '1.3rem', fontWeight: 700, minHeight: 52 }} type="number" inputMode="decimal" min="0"
              value={apartado} onChange={(e) => setApartado(e.target.value)} />
            <div className="pos-rapidos">
              <button className="pos-chip" onClick={() => setApartado(String(d.sugerido))}>Sugerido {dinero(d.sugerido)}</button>
              {redondeado !== d.sugerido && <button className="pos-chip" onClick={() => setApartado(String(redondeado))}>Redondear {dinero(redondeado)}</button>}
              <button className="pos-chip" onClick={() => setApartado('0')}>Nada</button>
            </div>
            {!valido && <div className="pos-error" style={{ margin: '8px 0 0' }}>El diezmo no puede ser mayor a lo cobrado ({dinero(corte.cobrado)}).</div>}
            <div className="pos-diezmo-resultado">
              <div><span>Queda para el ministerio</span><b className="pos-num">{dinero(valido ? redondear(corte.cobrado - num) : 0)}</b></div>
              <div><span>Efectivo que debe quedar en caja</span><b className="pos-num">{dinero(valido ? Math.max(enCaja, 0) : 0)}</b></div>
            </div>
            {valido && enCaja < 0 && <p className="pos-muted" style={{ margin: '8px 0 0', fontSize: '.8rem' }}>El diezmo es mayor al efectivo: {dinero(-enCaja)} saldrían de las transferencias.</p>}
          </section>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button className="pos-btn" style={{ flex: 1 }} onClick={onCerrar}>Cancelar</button>
          <button className="pos-btn pos-btn-primary" style={{ flex: 1.4 }} disabled={guardando || (pct > 0 && !valido)} onClick={confirmar}><Lock size={16} /> Cerrar venta</button>
        </div>
      </div>
    </div>
  )
}
