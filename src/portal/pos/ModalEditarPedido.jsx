import { useMemo, useState } from 'react'
import { X, Plus, Minus, Trash2, Banknote, Landmark, Clock, User } from 'lucide-react'
import { Avatar } from './posUi'
import { dinero, redondear } from './posUtils'

// Corrige un pedido ya registrado: cliente, productos, cantidades, precios,
// vendedor y forma de pago. onGuardar recibe los campos ya calculados.
export default function ModalEditarPedido({ pedido, venta, sugerencias = [], onGuardar, onCerrar, guardando }) {
  const [cliente, setCliente] = useState(pedido.cliente || '')
  const [vendedor, setVendedor] = useState(pedido.vendedor || '')
  const [items, setItems] = useState(() => (pedido.items || []).map((i) => ({ ...i })))
  const [pago, setPago] = useState(pedido.estado === 'pendiente' ? 'pendiente' : pedido.metodo || 'efectivo')
  const [recibido, setRecibido] = useState(pedido.estado === 'pagado' && pedido.metodo === 'efectivo' && pedido.recibido > pedido.total ? String(pedido.recibido) : '')
  const [verificado, setVerificado] = useState(!!pedido.verificado)
  const [error, setError] = useState('')

  const total = useMemo(() => redondear(items.reduce((a, i) => a + (Number(i.precio) || 0) * i.cantidad, 0)), [items])
  const recibidoNum = recibido === '' ? total : redondear(recibido)
  const cambio = redondear(recibidoNum - total)
  const vendedores = [...new Set([...(venta.vendedores || []), pedido.vendedor].filter(Boolean))]
  const productos = venta.productos || []

  const cambiarCantidad = (idx, d) => setItems((l) => l.map((it, i) => (i === idx ? { ...it, cantidad: Math.max(0, it.cantidad + d) } : it)).filter((it) => it.cantidad > 0))
  const cambiarPrecio = (idx, v) => setItems((l) => l.map((it, i) => (i === idx ? { ...it, precio: v } : it)))
  const quitar = (idx) => setItems((l) => l.filter((_, i) => i !== idx))
  function agregar(p) {
    setItems((l) => {
      const i = l.findIndex((it) => it.productoId === p.id)
      if (i >= 0) return l.map((it, k) => (k === i ? { ...it, cantidad: it.cantidad + 1 } : it))
      return [...l, { productoId: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1 }]
    })
  }

  function guardar() {
    if (!cliente.trim()) { setError('Pon el nombre del cliente.'); return }
    if (items.length === 0) { setError('El pedido debe tener al menos un producto.'); return }
    if (items.some((i) => Number.isNaN(Number(i.precio)) || Number(i.precio) < 0)) { setError('Hay un precio inválido.'); return }
    if (pago === 'efectivo' && recibidoNum < total) { setError('Lo recibido es menor al total.'); return }
    const limpios = items.map((i) => ({ productoId: i.productoId, nombre: i.nombre, precio: Number(i.precio), cantidad: i.cantidad }))
    const base = { cliente: cliente.trim(), vendedor, items: limpios, total }
    if (pago === 'pendiente') onGuardar({ ...base, estado: 'pendiente', metodo: null, recibido: 0, cambio: 0, verificado: false })
    else if (pago === 'transferencia') onGuardar({ ...base, estado: 'pagado', metodo: 'transferencia', recibido: total, cambio: 0, verificado })
    else onGuardar({ ...base, estado: 'pagado', metodo: 'efectivo', recibido: recibidoNum, cambio, verificado: true })
  }

  const metodos = [
    { id: 'efectivo', label: 'Efectivo', Icono: Banknote, color: 'var(--pos-ef)' },
    { id: 'transferencia', label: 'Transferencia', Icono: Landmark, color: 'var(--pos-tr)' },
    { id: 'pendiente', label: 'Por cobrar', Icono: Clock, color: 'var(--pos-pe)' },
  ]

  return (
    <div className="pos-modal-fondo" onClick={onCerrar}>
      <div className="pos-modal pos-modal-ancho" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Editar pedido ${pedido.folio}`}>
        <div className="pos-modal-cab">
          <div style={{ flex: 1 }}>
            <h3>Editar pedido #{pedido.folio}</h3>
            <p className="pos-sub" style={{ marginTop: 2 }}>Corrige lo que haga falta; el total y el cambio se recalculan solos.</p>
          </div>
          <button className="pos-icon-btn" onClick={onCerrar} aria-label="Cerrar"><X size={18} /></button>
        </div>

        <section className="pos-seccion" style={{ marginTop: 14 }}>
          <div className="pos-row">
            <div className="pos-field">
              <label className="pos-label" htmlFor="pos-e-cliente">Cliente</label>
              <div className="pos-cliente">
                {cliente.trim() ? <span className="pos-avatar-slot"><Avatar nombre={cliente} size={32} /></span> : <span className="pos-cliente-vacio"><User size={18} /></span>}
                <input id="pos-e-cliente" className="pos-input" list="pos-e-clientes" value={cliente} onChange={(e) => setCliente(e.target.value)} autoComplete="off" autoCapitalize="words" />
                <datalist id="pos-e-clientes">{sugerencias.map((n) => <option key={n} value={n} />)}</datalist>
              </div>
            </div>
            {vendedores.length > 1 && (
              <div className="pos-field">
                <span className="pos-label">Vendió</span>
                <div className="pos-vendedores">
                  {vendedores.map((v) => <button key={v} className="pos-chip" aria-pressed={vendedor === v} onClick={() => setVendedor(v)}>{v}</button>)}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="pos-seccion">
          <h4 className="pos-label" style={{ marginBottom: 8 }}>Productos</h4>
          {items.length === 0 && <p className="pos-muted" style={{ margin: '0 0 10px' }}>Sin productos. Agrega al menos uno.</p>}
          {items.map((it, idx) => (
            <div key={`${it.productoId}-${idx}`} className="pos-edit-linea">
              <div className="pos-linea-nombre">{it.nombre}</div>
              <label className="pos-edit-precio">
                <span aria-hidden="true">$</span>
                <input className="pos-input" type="number" inputMode="decimal" min="0" value={it.precio} onChange={(e) => cambiarPrecio(idx, e.target.value)} aria-label={`Precio de ${it.nombre}`} />
              </label>
              <div className="pos-qty">
                <button onClick={() => cambiarCantidad(idx, -1)} aria-label={`Quitar un ${it.nombre}`}><Minus size={15} /></button>
                <span>{it.cantidad}</span>
                <button onClick={() => cambiarCantidad(idx, 1)} aria-label={`Agregar un ${it.nombre}`}><Plus size={15} /></button>
              </div>
              <strong className="pos-linea-monto pos-num">{dinero((Number(it.precio) || 0) * it.cantidad)}</strong>
              <button className="pos-icon-btn" onClick={() => quitar(idx)} aria-label={`Quitar ${it.nombre}`}><Trash2 size={16} /></button>
            </div>
          ))}
          <div className="pos-label" style={{ margin: '12px 0 6px' }}>Agregar producto</div>
          <div className="pos-chips pos-chips-scroll">
            {productos.map((p) => <button key={p.id} className="pos-chip" onClick={() => agregar(p)}><Plus size={13} /> {p.nombre} <small>{dinero(p.precio)}</small></button>)}
          </div>
          <div className="pos-total" style={{ marginBottom: 0 }}><span>Total</span><span className="pos-num">{dinero(total)}</span></div>
        </section>

        <section className="pos-seccion">
          <h4 className="pos-label" style={{ marginBottom: 8 }}>Forma de pago</h4>
          <div className="pos-metodos" data-n="3" style={{ marginBottom: 12 }}>
            {metodos.map(({ id, label, Icono, color }) => (
              <button key={id} className="pos-metodo" style={{ '--c': color }} aria-pressed={pago === id} onClick={() => setPago(id)}><Icono size={22} /> {label}</button>
            ))}
          </div>
          {pago === 'efectivo' && (
            <>
              <label className="pos-label" htmlFor="pos-e-recibido">Recibido <span className="pos-muted">(déjalo vacío si pagó exacto)</span></label>
              <input id="pos-e-recibido" className="pos-input" type="number" inputMode="decimal" min="0" value={recibido} onChange={(e) => setRecibido(e.target.value)} placeholder={`$ ${total}`} />
              {cambio > 0 && <p className="pos-nota" style={{ margin: '10px 0 0' }}>Cambio entregado: <strong>{dinero(cambio)}</strong></p>}
            </>
          )}
          {pago === 'transferencia' && (
            <label className="pos-switch" style={{ marginBottom: 0 }}>
              <input type="checkbox" checked={verificado} onChange={(e) => setVerificado(e.target.checked)} /> Ya verifiqué que llegó el depósito
            </label>
          )}
          {pago === 'pendiente' && <p className="pos-nota" style={{ margin: 0 }}>Queda como “debe {dinero(total)}”.</p>}
        </section>

        {error && <div className="pos-error" role="alert">{error}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="pos-btn" style={{ flex: 1 }} onClick={onCerrar}>Cancelar</button>
          <button className="pos-btn pos-btn-primary" style={{ flex: 1 }} disabled={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
      </div>
    </div>
  )
}
