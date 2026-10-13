import { useState } from 'react'
import { Plus, Trash2, Eye, EyeOff, X, ClipboardList, Users, ShoppingBag } from 'lucide-react'
import { CATEGORIAS_SUGERIDAS, nuevoId } from './posUtils'
import { Avatar } from './posUi'
import { categoriaInfo } from './posUiHelpers'

// Editor de la configuración de un POS en tres secciones: datos, vendedores y productos.
// `valor` = { nombre, fecha?, meta, fondoInicial, vendedores[], productos[] }
export default function FormConfigPos({ valor, onChange, mostrarFecha = false, etiquetaNombre = 'Nombre', pasoInicial = 1 }) {
  const [nuevoVendedor, setNuevoVendedor] = useState('')
  const set = (campo, v) => onChange({ ...valor, [campo]: v })

  const productos = valor.productos || []
  const vendedores = valor.vendedores || []
  const categorias = [...new Set([...CATEGORIAS_SUGERIDAS, ...productos.map((p) => p.categoria).filter(Boolean)])]

  const cambiarProducto = (id, campo, v) => set('productos', productos.map((p) => (p.id === id ? { ...p, [campo]: v } : p)))
  const quitarProducto = (id) => set('productos', productos.filter((p) => p.id !== id))
  const agregarProducto = () => set('productos', [...productos, { id: nuevoId(), nombre: '', precio: '', categoria: productos.at(-1)?.categoria || 'Comida', activo: true }])

  function agregarVendedor() {
    const n = nuevoVendedor.trim()
    if (n && !vendedores.some((v) => v.toLowerCase() === n.toLowerCase())) set('vendedores', [...vendedores, n])
    setNuevoVendedor('')
  }

  return (
    <div>
      <section className="pos-seccion">
        <h3 className="pos-seccion-titulo"><span className="pos-paso">{pasoInicial}</span><ClipboardList size={17} /> Datos de la venta</h3>
        <div className="pos-row">
          <div className="pos-field">
            <label className="pos-label" htmlFor="pos-f-nombre">{etiquetaNombre}</label>
            <input id="pos-f-nombre" className="pos-input" value={valor.nombre || ''} onChange={(e) => set('nombre', e.target.value)} placeholder="Ej. Comida del domingo" />
          </div>
          {mostrarFecha && (
            <div className="pos-field">
              <label className="pos-label" htmlFor="pos-f-fecha">Fecha</label>
              <input id="pos-f-fecha" className="pos-input" type="date" value={valor.fecha || ''} onChange={(e) => set('fecha', e.target.value)} />
            </div>
          )}
        </div>
        <div className="pos-row">
          <div className="pos-field" style={{ flex: 2 }}>
            <label className="pos-label" htmlFor="pos-f-meta">¿Para qué se junta? <span className="pos-muted">(opcional)</span></label>
            <input id="pos-f-meta" className="pos-input" value={valor.meta || ''} onChange={(e) => set('meta', e.target.value)} placeholder="Ej. Retiro de jóvenes, gastos del ministerio…" />
          </div>
          <div className="pos-field">
            <label className="pos-label" htmlFor="pos-f-fondo">Fondo de caja <span className="pos-muted">(para cambio)</span></label>
            <input id="pos-f-fondo" className="pos-input" type="number" inputMode="decimal" min="0" value={valor.fondoInicial ?? ''} onChange={(e) => set('fondoInicial', e.target.value)} placeholder="$ 0" />
          </div>
        </div>
      </section>

      <section className="pos-seccion">
        <h3 className="pos-seccion-titulo"><span className="pos-paso">{pasoInicial + 1}</span><Users size={17} /> ¿Quién vende?</h3>
        {vendedores.length > 0 && (
          <div className="pos-tags">
            {vendedores.map((v) => (
              <span key={v} className="pos-tag">
                <Avatar nombre={v} size={26} />{v}
                <button onClick={() => set('vendedores', vendedores.filter((x) => x !== v))} aria-label={`Quitar a ${v}`}><X size={14} /></button>
              </span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="pos-input" value={nuevoVendedor} onChange={(e) => setNuevoVendedor(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarVendedor() } }} placeholder="Nombre de quien vende" aria-label="Nombre del vendedor" />
          <button className="pos-btn" onClick={agregarVendedor}><Plus size={16} /> Agregar</button>
        </div>
      </section>

      <section className="pos-seccion">
        <h3 className="pos-seccion-titulo"><span className="pos-paso">{pasoInicial + 2}</span><ShoppingBag size={17} /> Productos y precios</h3>
        <datalist id="pos-categorias">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
        {productos.length === 0 && <p className="pos-muted" style={{ margin: '0 0 12px' }}>Aún no hay productos. Agrega el primero.</p>}
        {productos.map((p) => {
          const { Icono, color } = categoriaInfo(p.categoria)
          return (
            <div key={p.id} className="pos-prod-fila" data-inactivo={!p.activo}>
              <span className="pos-prod-icono" style={{ '--cat': color }}><Icono size={17} /></span>
              <input className="pos-input" value={p.nombre} onChange={(e) => cambiarProducto(p.id, 'nombre', e.target.value)} placeholder="Producto" aria-label="Nombre del producto" />
              <input className="pos-input" type="number" inputMode="decimal" min="0" value={p.precio} onChange={(e) => cambiarProducto(p.id, 'precio', e.target.value)} placeholder="$ Precio" aria-label="Precio" />
              <input className="pos-input" list="pos-categorias" value={p.categoria || ''} onChange={(e) => cambiarProducto(p.id, 'categoria', e.target.value)} placeholder="Categoría" aria-label="Categoría" />
              <div className="pos-prod-acc">
                <button className="pos-icon-btn" onClick={() => cambiarProducto(p.id, 'activo', !p.activo)} aria-label={p.activo ? 'Marcar como agotado' : 'Volver a mostrar'} title={p.activo ? 'Marcar como agotado' : 'Volver a mostrar'}>
                  {p.activo ? <Eye size={17} /> : <EyeOff size={17} />}
                </button>
                <button className="pos-icon-btn" onClick={() => quitarProducto(p.id)} aria-label="Eliminar producto"><Trash2 size={17} /></button>
              </div>
            </div>
          )
        })}
        <button className="pos-btn" onClick={agregarProducto}><Plus size={16} /> Agregar producto</button>
      </section>
    </div>
  )
}
