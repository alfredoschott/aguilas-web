import { useState } from 'react'
import { Plus, Minus, Trash2, Eye, EyeOff, X, ClipboardList, Users, ShoppingBag, PackagePlus } from 'lucide-react'
import { CATEGORIAS_SUGERIDAS, dinero, esCombo, nuevoId, rangoOpcionesSeparado, sumaComboSeparado } from './posUtils'
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
  // Al quitar un producto también sale de los combos que lo usaban.
  const quitarProducto = (id) => set('productos', productos.filter((p) => p.id !== id).map((p) => (esCombo(p)
    ? { ...p, combo: p.combo.filter((c) => c.productoId !== id), ...(p.grupos ? { grupos: p.grupos.map((g) => ({ ...g, opciones: g.opciones.filter((o) => o.productoId !== id) })) } : {}) }
    : p)))
  const alternarCombo = (p) => onChange({ ...valor, productos: productos.map((x) => {
    if (x.id !== p.id) return x
    if (esCombo(x)) { const resto = { ...x }; delete resto.combo; delete resto.grupos; return resto }
    return { ...x, combo: [], categoria: !x.categoria || x.categoria === 'Comida' ? 'Combos' : x.categoria }
  }) })
  const cantidadEnCombo = (p, id) => p.combo.find((c) => c.productoId === id)?.cantidad || 0
  const grupoNuevo = (p) => cambiarProducto(p.id, 'grupos', [...(p.grupos || []), { id: nuevoId(), nombre: '', cantidad: 1, opciones: [] }])
  const cambiarGrupo = (p, gid, campo, v) => cambiarProducto(p.id, 'grupos', (p.grupos || []).map((g) => (g.id === gid ? { ...g, [campo]: v } : g)))
  const quitarGrupo = (p, gid) => cambiarProducto(p.id, 'grupos', (p.grupos || []).filter((g) => g.id !== gid))
  const opcionDe = (g, id) => g.opciones.find((o) => o.productoId === id)
  const alternarOpcion = (p, g, x) => cambiarGrupo(p, g.id, 'opciones', opcionDe(g, x.id) ? g.opciones.filter((o) => o.productoId !== x.id) : [...g.opciones, { productoId: x.id, nombre: x.nombre, extra: 0 }])
  const extraOpcion = (p, g, id, v) => cambiarGrupo(p, g.id, 'opciones', g.opciones.map((o) => (o.productoId === id ? { ...o, extra: v } : o)))
  const ponerEnCombo = (p, id, delta) => {
    const nueva = Math.max(0, cantidadEnCombo(p, id) + delta)
    const resto = p.combo.filter((c) => c.productoId !== id)
    cambiarProducto(p.id, 'combo', nueva > 0 ? [...resto, { productoId: id, cantidad: nueva }] : resto)
  }
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
          const combo = esCombo(p)
          const sueltos = productos.filter((x) => !esCombo(x) && x.id !== p.id && x.nombre)
          const [opMin, opMax] = combo ? rangoOpcionesSeparado(p, productos) : [0, 0]
          const sepMin = combo ? sumaComboSeparado(p, productos) + opMin : 0
          const sepMax = combo ? sumaComboSeparado(p, productos) + opMax : 0
          const precio = Number(p.precio) || 0
          return (
            <div key={p.id} className="pos-prod-bloque" data-combo={combo}>
              <div className="pos-prod-fila" data-inactivo={!p.activo}>
                <span className="pos-prod-icono" style={{ '--cat': color }}><Icono size={17} /></span>
                <input className="pos-input" value={p.nombre} onChange={(e) => cambiarProducto(p.id, 'nombre', e.target.value)} placeholder={combo ? 'Nombre del combo' : 'Producto'} aria-label="Nombre del producto" />
                <input className="pos-input" type="number" inputMode="decimal" min="0" value={p.precio} onChange={(e) => cambiarProducto(p.id, 'precio', e.target.value)} placeholder="$ Precio" aria-label="Precio" />
                <input className="pos-input" list="pos-categorias" value={p.categoria || ''} onChange={(e) => cambiarProducto(p.id, 'categoria', e.target.value)} placeholder="Categoría" aria-label="Categoría" />
                <div className="pos-prod-acc">
                  <button className="pos-icon-btn" data-activo={combo} onClick={() => alternarCombo(p)} aria-pressed={combo} aria-label={combo ? 'Quitar el modo combo' : 'Convertir en combo'} title={combo ? 'Es un combo (toca para quitar)' : 'Convertir en combo'}>
                    <PackagePlus size={17} />
                  </button>
                  <button className="pos-icon-btn" onClick={() => cambiarProducto(p.id, 'activo', !p.activo)} aria-label={p.activo ? 'Marcar como agotado' : 'Volver a mostrar'} title={p.activo ? 'Marcar como agotado' : 'Volver a mostrar'}>
                    {p.activo ? <Eye size={17} /> : <EyeOff size={17} />}
                  </button>
                  <button className="pos-icon-btn" onClick={() => quitarProducto(p.id)} aria-label="Eliminar producto"><Trash2 size={17} /></button>
                </div>
              </div>
              {combo && (
                <div className="pos-combo-editor">
                  <div className="pos-label" style={{ marginBottom: 8 }}>¿Qué incluye siempre?</div>
                  {sueltos.length === 0 ? <p className="pos-muted" style={{ margin: 0, fontSize: '.85rem' }}>Primero agrega los productos sueltos (con nombre) y luego elige cuáles forman el combo.</p> : (
                    <div className="pos-combo-lista">
                      {sueltos.map((x) => {
                        const n = cantidadEnCombo(p, x.id)
                        return (
                          <div key={x.id} className="pos-combo-item" data-en={n > 0}>
                            <span className="pos-combo-nombre">{x.nombre} <small>{dinero(x.precio)}</small></span>
                            <div className="pos-qty">
                              <button onClick={() => ponerEnCombo(p, x.id, -1)} aria-label={`Quitar ${x.nombre} del combo`} disabled={n === 0}><Minus size={14} /></button>
                              <span>{n}</span>
                              <button onClick={() => ponerEnCombo(p, x.id, 1)} aria-label={`Agregar ${x.nombre} al combo`}><Plus size={14} /></button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div className="pos-label" style={{ margin: '14px 0 8px' }}>Lo que el cliente elige <span className="pos-muted">(opcional)</span></div>
                  {(p.grupos || []).map((g) => (
                    <div key={g.id} className="pos-grupo-editor">
                      <div className="pos-grupo-cab">
                        <input className="pos-input" value={g.nombre} onChange={(e) => cambiarGrupo(p, g.id, 'nombre', e.target.value)} placeholder="¿Qué se elige? Ej. Bebida" aria-label="Nombre de lo que se elige" />
                        <label className="pos-grupo-cant">Elige <input className="pos-input" type="number" min="1" max="5" value={g.cantidad} onChange={(e) => cambiarGrupo(p, g.id, 'cantidad', e.target.value)} aria-label="Cuántas opciones se eligen" /></label>
                        <button className="pos-icon-btn" onClick={() => quitarGrupo(p, g.id)} aria-label="Quitar esta elección"><Trash2 size={16} /></button>
                      </div>
                      {sueltos.length === 0 ? <p className="pos-muted" style={{ margin: 0, fontSize: '.85rem' }}>Agrega productos sueltos para usarlos como opciones.</p> : (
                        <div className="pos-combo-lista">
                          {sueltos.map((x) => {
                            const o = opcionDe(g, x.id)
                            return (
                              <div key={x.id} className="pos-opcion-fila" data-en={!!o}>
                                <label><input type="checkbox" checked={!!o} onChange={() => alternarOpcion(p, g, x)} /> <span className="pos-combo-nombre">{x.nombre} <small>{dinero(x.precio)}</small></span></label>
                                {o && <label className="pos-opcion-extra">+$<input className="pos-input" type="number" inputMode="decimal" min="0" value={o.extra || ''} placeholder="extra" onChange={(e) => extraOpcion(p, g, x.id, e.target.value)} aria-label={`Costo extra de ${x.nombre}`} /></label>}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                  <button className="pos-btn pos-btn-sm" style={{ marginTop: 10 }} onClick={() => grupoNuevo(p)}><Plus size={14} /> Agregar algo a elegir</button>
                  {sepMin > 0 && (
                    <div className="pos-combo-resumen">
                      <span>Por separado <b>{sepMin === sepMax ? dinero(sepMin) : `${dinero(sepMin)} – ${dinero(sepMax)}`}</b></span>
                      <span>Precio del combo <b>{dinero(precio)}</b></span>
                      <span data-ahorro={sepMin - precio >= 0}>{sepMin - precio >= 0 ? <>El cliente ahorra {sepMin !== sepMax && 'desde '}<b>{dinero(sepMin - precio)}</b></> : <>Cuesta <b>{dinero(precio - sepMin)}</b> más que por separado</>}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        <button className="pos-btn" onClick={agregarProducto}><Plus size={16} /> Agregar producto</button>
      </section>
    </div>
  )
}
