import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, updateDoc, where, writeBatch, db,
} from './posFirestore'
import { Plus, Copy, Pencil, Trash2, FileSpreadsheet, FileText, ChevronRight, ChevronDown, Wallet, TrendingUp, Receipt, HandCoins, Store, ArrowRight, Sparkles, Undo2, Check, UserPen } from 'lucide-react'
import { usePortalAuth } from '../PortalAuthContext'
import ModalCobro from './ModalCobro'
import FormConfigPos from './FormConfigPos'
import PosCabecera from './PosCabecera'
import { Anillo, Avatar, BarraEstado, Cantidad, Dinero, GraficaVentas } from './posUi'
import { exportarReporteExcel, exportarReportePDF } from './exportarVenta'
import { POS_BASE, accesoPos, calcularCorte, dinero, fechaLegible, nuevoId, normalizar, prepararConfig, redondear, useMinisterios } from './posUtils'
import '../portal.css'
import './pos.css'

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const partes = (iso) => { const [y, m, d] = (iso || '').split('-').map(Number); return { y, m, d } }
const etiquetaCorta = (iso) => { const { m, d } = partes(iso); return `${d} ${MESES[m - 1] || ''}` }

export default function PosInicio() {
  const { userData, user } = usePortalAuth()
  const { ministerios } = useMinisterios()
  const acceso = accesoPos(userData)

  const [ministerio, setMinisterio] = useState(() => (acceso.directivo ? localStorage.getItem('pos_ministerio') || 'cocina' : userData?.ministerio || ''))
  const [tab, setTab] = useState('inicio')
  const [ventas, setVentas] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [plantillas, setPlantillas] = useState([])
  const [error, setError] = useState('')
  const [cobrando, setCobrando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [plantillaDraft, setPlantillaDraft] = useState(null)
  const [abiertos, setAbiertos] = useState({})
  const [toast, setToast] = useState(null)
  useEffect(() => { if (!toast) return undefined; const t = setTimeout(() => setToast(null), 8000); return () => clearTimeout(t) }, [toast])

  const accent = ministerios[ministerio]?.color || '#3DDC04'
  const email = user?.email?.toLowerCase() || ''

  useEffect(() => {
    if (!ministerio) return undefined
    const filtro = where('ministerio', '==', ministerio)
    const alErr = (e) => { console.error(e); setError('No se pudieron cargar los datos del POS. ¿Ya están publicadas las reglas de Firestore?') }
    const u1 = onSnapshot(query(collection(db, 'pos_ventas'), filtro), (s) => setVentas(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))), alErr)
    const u2 = onSnapshot(query(collection(db, 'pos_pedidos'), filtro), (s) => setPedidos(s.docs.map((d) => ({ id: d.id, ...d.data() }))), alErr)
    const u3 = onSnapshot(query(collection(db, 'pos_plantillas'), filtro), (s) => setPlantillas(s.docs.map((d) => ({ id: d.id, ...d.data() }))), alErr)
    return () => { u1(); u2(); u3() }
  }, [ministerio])

  const cortes = useMemo(() => {
    const por = {}
    pedidos.forEach((p) => { (por[p.ventaId] ||= []).push(p) })
    return Object.fromEntries(ventas.map((v) => [v.id, calcularCorte(por[v.id] || [])]))
  }, [pedidos, ventas])

  const pendientes = useMemo(() => pedidos.filter((p) => p.estado === 'pendiente'), [pedidos])
  const deudores = useMemo(() => {
    const g = {}
    pendientes.forEach((p) => {
      const k = normalizar(p.cliente)
      g[k] ||= { cliente: p.cliente, pedidos: [], total: 0 }
      g[k].pedidos.push(p)
      g[k].total = redondear(g[k].total + p.total)
    })
    return Object.values(g).sort((a, b) => b.total - a.total)
  }, [pendientes])
  const totalPorCobrar = redondear(deudores.reduce((a, d) => a + d.total, 0))

  const abierta = ventas.find((v) => v.estado !== 'cerrada')
  const foco = abierta || ventas[0]
  const corteFoco = foco ? cortes[foco.id] : null
  const pctCobrado = corteFoco && corteFoco.vendido > 0 ? corteFoco.cobrado / corteFoco.vendido : 0
  const ventaPorId = useMemo(() => Object.fromEntries(ventas.map((v) => [v.id, v])), [ventas])

  const resumenGlobal = useMemo(() => {
    const hoy = new Date()
    const mes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
    let vendidoMes = 0; let vendido = 0; let nPedidos = 0
    ventas.forEach((v) => {
      const c = cortes[v.id]
      if (!c) return
      vendido += c.vendido; nPedidos += c.pedidos
      if ((v.fecha || '').startsWith(mes)) vendidoMes += c.vendido
    })
    return { vendidoMes, ventas: ventas.length, ticket: nPedidos ? vendido / nPedidos : 0 }
  }, [ventas, cortes])

  const serie = useMemo(() => ventas.slice(0, 8).reverse().map((v) => ({
    id: v.id, etiqueta: etiquetaCorta(v.fecha), cobrado: cortes[v.id]?.cobrado || 0, pendiente: cortes[v.id]?.pendiente || 0, pedidos: cortes[v.id]?.pedidos || 0,
  })), [ventas, cortes])

  if (!acceso.permitido) {
    return <div className="pos-page"><p className="pos-empty">Tu cuenta no tiene acceso al POS de ventas. Es para líderes de ministerio, pastores y administrativos.</p></div>
  }

  async function cobrarDeudor(pago) {
    setGuardando(true)
    try {
      const lote = writeBatch(db)
      cobrando.pedidos.forEach((p) => {
        lote.update(doc(db, 'pos_pedidos', p.id), { estado: 'pagado', metodo: pago.metodo, recibido: p.total, cambio: 0, verificado: pago.verificado, pagadoEn: serverTimestamp(), cobradoPor: email })
      })
      await lote.commit()
      const deshecho = cobrando.pedidos
      setToast({ m: `${cobrando.cliente} pagó ${dinero(cobrando.total)}`, fn: async () => {
        try {
          const l = writeBatch(db)
          deshecho.forEach((p) => l.update(doc(db, 'pos_pedidos', p.id), { estado: 'pendiente', metodo: null, recibido: 0, cambio: 0, verificado: false, pagadoEn: null, cobradoPor: null }))
          await l.commit()
          setToast({ m: 'Cobro deshecho' })
        } catch (e) { console.error(e); setError('No se pudo deshacer el cobro.') }
      } })
      setCobrando(null)
    } catch (e) { console.error(e); setError('No se pudo registrar el cobro.') } finally { setGuardando(false) }
  }

  // Corrige el nombre de un deudor en todos sus pedidos pendientes.
  async function renombrarDeudor(d) {
    const nuevo = window.prompt(`Corregir el nombre de “${d.cliente}”:`, d.cliente)?.trim()
    if (!nuevo || nuevo === d.cliente) return
    try {
      const l = writeBatch(db)
      d.pedidos.forEach((p) => l.update(doc(db, 'pos_pedidos', p.id), { cliente: nuevo, editadoPor: email, editadoEn: serverTimestamp() }))
      await l.commit()
      setToast({ m: `Nombre corregido a ${nuevo}`, fn: async () => {
        try {
          const u = writeBatch(db)
          d.pedidos.forEach((p) => u.update(doc(db, 'pos_pedidos', p.id), { cliente: d.cliente }))
          await u.commit()
          setToast({ m: 'Nombre restaurado' })
        } catch (e) { console.error(e); setError('No se pudo deshacer el cambio de nombre.') }
      } })
    } catch (e) { console.error(e); setError('No se pudo corregir el nombre.') }
  }

  async function guardarPlantilla() {
    const { datos, error: err } = prepararConfig(plantillaDraft)
    if (err) { setError(err); return }
    try {
      if (plantillaDraft.id) await updateDoc(doc(db, 'pos_plantillas', plantillaDraft.id), datos)
      else await addDoc(collection(db, 'pos_plantillas'), { ...datos, ministerio, creadoPor: email, creadoEn: serverTimestamp() })
      setPlantillaDraft(null)
      setError('')
    } catch (e) { console.error(e); setError('No se pudo guardar la plantilla.') }
  }

  async function borrarPlantilla(p) {
    if (!window.confirm(`¿Eliminar la plantilla “${p.nombre}”? Las ventas ya hechas no se afectan.`)) return
    try { await deleteDoc(doc(db, 'pos_plantillas', p.id)) } catch (e) { console.error(e); setError('No se pudo eliminar la plantilla.') }
  }

  const datosReporte = () => ({ ministerioNombre: ministerios[ministerio]?.nombre || ministerio, colorMinisterio: ministerios[ministerio]?.color, ministerio, ventas, cortes, deudores })

  const nuevaPlantilla = () => setPlantillaDraft({ nombre: '', meta: '', fondoInicial: '', vendedores: [], productos: [{ id: nuevoId(), nombre: '', precio: '', categoria: 'Comida', activo: true }] })
  const urlNueva = (extra = '') => `${POS_BASE}/nueva?ministerio=${ministerio}${extra}`

  return (
    <div className="pos-page" style={{ '--pos-accent': accent }}>
      <div className="pos-wrap">
        <PosCabecera titulo="Ventas" ministerioId={ministerio} ministerioNombre={ministerios[ministerio]?.nombre || ministerio} sub="Punto de venta" volverA="/lideres/dashboard">
          {acceso.directivo && (
            <select className="pos-select" style={{ width: 'auto', borderRadius: 999 }} value={ministerio} aria-label="Ministerio"
              onChange={(e) => { setMinisterio(e.target.value); try { localStorage.setItem('pos_ministerio', e.target.value) } catch { /* sin storage */ } }}>
              {Object.keys(ministerios).sort((a, b) => (ministerios[a].nombre || a).localeCompare(ministerios[b].nombre || b)).map((id) => <option key={id} value={id}>{ministerios[id].nombre || id}</option>)}
            </select>
          )}
          <Link to={urlNueva()} className="pos-btn pos-btn-primary"><Plus size={17} /> Nueva venta</Link>
        </PosCabecera>

        {error && <div className="pos-error" role="alert">{error}</div>}

        <div className="pos-tabs pos-in" style={{ '--i': 2, '--n': 2, '--idx': tab === 'inicio' ? 0 : 1 }} role="tablist">
          <span className="pos-tabs-ind" />
          <button role="tab" className="pos-tab" aria-selected={tab === 'inicio'} onClick={() => setTab('inicio')}>Resumen</button>
          <button role="tab" className="pos-tab" aria-selected={tab === 'historial'} onClick={() => setTab('historial')}>Historial</button>
        </div>

        {tab === 'inicio' && (
          <div className="pos-inicio">
            <div className="pos-col">
              {/* Venta en foco */}
              {foco ? (
                <section className="pos-hero pos-in" style={{ '--i': 3 }}>
                  <Anillo pct={pctCobrado}>
                    <span className="pos-num" style={{ fontSize: '1.5rem' }}>{Math.round(pctCobrado * 100)}%</span>
                    <span className="pos-cifra-label">cobrado</span>
                  </Anillo>
                  <div className="pos-hero-cuerpo">
                    {abierta ? <span className="pos-badge pos-badge-ok"><span className="pos-vivo" /> Venta abierta</span> : <span className="pos-badge">Última venta · cerrada</span>}
                    <h2>{foco.nombre}</h2>
                    <p className="pos-sub" style={{ margin: 0 }}>{fechaLegible(foco.fecha)}{foco.meta ? ` · ${foco.meta}` : ''}</p>
                    <div className="pos-hero-cifras">
                      <div><div className="pos-cifra-label">Vendido</div><div className="pos-cifra pos-num"><Dinero valor={corteFoco?.vendido || 0} /></div></div>
                      <div><div className="pos-cifra-label">Por cobrar</div><div className="pos-cifra pos-num" style={{ color: corteFoco?.pendiente ? 'var(--pos-pe)' : undefined }}><Dinero valor={corteFoco?.pendiente || 0} /></div></div>
                      <div><div className="pos-cifra-label">Pedidos</div><div className="pos-cifra pos-num"><Cantidad valor={corteFoco?.pedidos || 0} /></div></div>
                    </div>
                    <div className="pos-hero-acciones">
                      <Link to={`${POS_BASE}/${foco.id}`} className="pos-btn pos-btn-primary">{abierta ? 'Seguir vendiendo' : 'Ver venta'} <ArrowRight size={16} /></Link>
                    </div>
                  </div>
                </section>
              ) : (
                <section className="pos-hero pos-in" style={{ '--i': 3 }}>
                  <div className="pos-plantilla-icono" style={{ width: 64, height: 64, borderRadius: 18 }}><Store size={30} /></div>
                  <div className="pos-hero-cuerpo">
                    <h2>Abre tu primera venta</h2>
                    <p className="pos-sub" style={{ margin: '0 0 14px' }}>Elige qué vendes, a qué precio y quién vende. Después se guarda como plantilla y la próxima vez es un toque.</p>
                    <Link to={urlNueva()} className="pos-btn pos-btn-primary"><Plus size={16} /> Crear venta</Link>
                  </div>
                </section>
              )}

              {/* Atajo cuando no hay venta abierta */}
              {!abierta && plantillas.length > 0 && (
                <section className="pos-card pos-in" style={{ '--i': 4 }}>
                  <h2 className="pos-card-titulo"><Sparkles size={17} color="var(--pos-accent)" /> Abrir la venta de hoy</h2>
                  <div className="pos-chips">
                    {plantillas.map((p) => <Link key={p.id} to={urlNueva(`&plantilla=${p.id}`)} className="pos-chip" style={{ textDecoration: 'none' }}><Copy size={13} /> {p.nombre}</Link>)}
                  </div>
                </section>
              )}

              {/* Mini tablero */}
              <div className="pos-stats">
                {[
                  { Icono: Wallet, color: 'var(--pos-accent)', valor: <Dinero valor={resumenGlobal.vendidoMes} />, label: 'Vendido este mes' },
                  { Icono: Receipt, color: 'var(--pos-tr)', valor: <Cantidad valor={resumenGlobal.ventas} />, label: 'Ventas realizadas' },
                  { Icono: TrendingUp, color: 'var(--pos-ef)', valor: <Dinero valor={resumenGlobal.ticket} />, label: 'Promedio por pedido' },
                  { Icono: HandCoins, color: 'var(--pos-pe)', valor: <Dinero valor={totalPorCobrar} />, label: 'Por cobrar en total' },
                ].map(({ Icono, color, valor, label }, i) => (
                  <div key={label} className="pos-stat pos-in" style={{ '--i': 5 + i }}>
                    <span className="pos-stat-icono" style={{ background: `color-mix(in srgb, ${color} 16%, #141414)`, color }}><Icono size={16} /></span>
                    <span className="pos-stat-valor pos-num">{valor}</span>
                    <span className="pos-stat-label">{label}</span>
                  </div>
                ))}
              </div>

              <section className="pos-card pos-in" style={{ '--i': 9 }}>
                <h2 className="pos-card-titulo">Últimas ventas <span className="pos-spacer" />
                  <span className="pos-leyenda" style={{ margin: 0 }}><span><i style={{ background: 'var(--pos-accent)' }} />Cobrado</span><span><i style={{ background: 'var(--pos-pe)' }} />Por cobrar</span></span>
                </h2>
                {serie.length === 0 ? <p className="pos-empty">Cuando haya ventas, aquí verás cómo van.</p> : <GraficaVentas filas={serie} />}
              </section>

              <section className="pos-in" style={{ '--i': 10 }}>
                <h2 className="pos-card-titulo">Plantillas <span className="pos-spacer" />
                  <button className="pos-btn pos-btn-sm" onClick={nuevaPlantilla}><Plus size={14} /> Nueva</button>
                </h2>
                {plantillas.length === 0 && <p className="pos-empty">Guarda una plantilla (por ejemplo “Domingo”) y abrir la venta de cada semana toma un toque.</p>}
                <div className="pos-pila">
                  {plantillas.map((p) => (
                    <div key={p.id} className="pos-card pos-plantilla">
                      <span className="pos-plantilla-icono"><Copy size={18} /></span>
                      <div style={{ flex: 1, minWidth: 140 }}><strong>{p.nombre}</strong><div className="pos-sub" style={{ marginTop: 2 }}>{(p.productos || []).length} productos · {(p.vendedores || []).length} vendedores</div></div>
                      <Link to={urlNueva(`&plantilla=${p.id}`)} className="pos-btn pos-btn-primary pos-btn-sm">Usar hoy</Link>
                      <button className="pos-icon-btn" onClick={() => setPlantillaDraft({ ...p, fondoInicial: p.fondoInicial || '' })} aria-label={`Editar ${p.nombre}`}><Pencil size={16} /></button>
                      <button className="pos-icon-btn" onClick={() => borrarPlantilla(p)} aria-label={`Eliminar ${p.nombre}`}><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <aside className="pos-card pos-in" style={{ '--i': 4 }}>
              <h2 className="pos-card-titulo"><HandCoins size={18} color="var(--pos-pe)" /> Por cobrar <span className="pos-spacer" />
                {totalPorCobrar > 0 && <span className="pos-badge pos-badge-warn">{dinero(totalPorCobrar)}</span>}
              </h2>
              {deudores.length === 0 && <p className="pos-empty" style={{ padding: '22px 10px' }}>Nadie debe nada 🎉<br /><small>Todo está al corriente.</small></p>}
              <div className="pos-pila">
                {deudores.map((d) => {
                  const abierto = abiertos[d.cliente]
                  return (
                    <div key={normalizar(d.cliente)} className="pos-deudor">
                      <div className="pos-deudor-fila">
                        <Avatar nombre={d.cliente} />
                        <button className="pos-deudor-info" onClick={() => setAbiertos((a) => ({ ...a, [d.cliente]: !a[d.cliente] }))} aria-expanded={!!abierto}>
                          <strong>{d.cliente}</strong>
                          <small>{d.pedidos.length} pedido{d.pedidos.length > 1 ? 's' : ''} {abierto ? <ChevronDown size={11} /> : <ChevronRight size={11} />}</small>
                        </button>
                        <strong className="pos-num" style={{ color: 'var(--pos-pe)' }}>{dinero(d.total)}</strong>
                        <button className="pos-icon-btn" style={{ width: 36, height: 36 }} onClick={() => renombrarDeudor(d)} aria-label={`Corregir nombre de ${d.cliente}`} title="Corregir nombre"><UserPen size={15} /></button>
                      </div>
                      {abierto && (
                        <div className="pos-deudor-detalle">
                          {d.pedidos.map((p) => (
                            <Link key={p.id} to={`${POS_BASE}/${p.ventaId}`} className="pos-linea" style={{ textDecoration: 'none', color: 'inherit' }}>
                              <div className="pos-linea-nombre">{(p.items || []).map((i) => `${i.cantidad}× ${i.nombre}`).join(', ')}<small>{ventaPorId[p.ventaId] ? `${etiquetaCorta(ventaPorId[p.ventaId].fecha)} · #${p.folio}` : `#${p.folio}`}</small></div>
                              <strong className="pos-linea-monto pos-num">{dinero(p.total)}</strong>
                            </Link>
                          ))}
                        </div>
                      )}
                      <button className="pos-btn pos-btn-primary pos-btn-sm pos-btn-block" style={{ marginTop: 10 }} onClick={() => setCobrando({ cliente: d.cliente, pedidos: d.pedidos, total: d.total })}>
                        Cobrar {dinero(d.total)}
                      </button>
                    </div>
                  )
                })}
              </div>
            </aside>
          </div>
        )}

        {tab === 'historial' && (
          <div className="pos-pila">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className="pos-muted" style={{ fontSize: '.88rem' }}>{ventas.length} venta{ventas.length === 1 ? '' : 's'} registradas</span>
              <span className="pos-spacer" />
              {ventas.length > 0 && (
                <>
                  <button className="pos-btn pos-btn-sm" onClick={() => exportarReporteExcel(datosReporte())}><FileSpreadsheet size={14} /> Excel</button>
                  <button className="pos-btn pos-btn-sm" onClick={() => exportarReportePDF(datosReporte())}><FileText size={14} /> PDF</button>
                </>
              )}
            </div>
            {ventas.length === 0 && <p className="pos-empty">Aún no hay ventas.</p>}
            {ventas.map((v, i) => {
              const c = cortes[v.id] || calcularCorte([])
              const { d, m } = partes(v.fecha)
              return (
                <Link key={v.id} to={`${POS_BASE}/${v.id}`} className="pos-card pos-card-link pos-hist pos-in" style={{ '--i': Math.min(i, 8) }}>
                  <div className="pos-fecha"><b>{d}</b><span>{MESES[m - 1]}</span></div>
                  <div className="pos-hist-cuerpo">
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <strong>{v.nombre}</strong>
                      {v.estado !== 'cerrada' && <span className="pos-badge pos-badge-ok">Abierta</span>}
                    </div>
                    <div className="pos-sub" style={{ marginTop: 2 }}>{c.pedidos} pedidos{v.meta ? ` · ${v.meta}` : ''}</div>
                    <BarraEstado efectivo={c.efectivo} transferencia={c.transferencia} pendiente={c.pendiente} leyenda={false} />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="pos-num" style={{ fontSize: '1.1rem' }}>{dinero(c.vendido)}</div>
                    {c.pendiente > 0 && <div className="pos-badge pos-badge-warn" style={{ marginTop: 4 }}>debe {dinero(c.pendiente)}</div>}
                  </div>
                  <ChevronRight size={18} className="pos-muted" />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {cobrando && (
        <ModalCobro
          total={cobrando.total}
          titulo={`Cobrar a ${cobrando.cliente}`}
          subtitulo={`${cobrando.pedidos.length} pedido${cobrando.pedidos.length > 1 ? 's' : ''} pendiente${cobrando.pedidos.length > 1 ? 's' : ''}`}
          permitirPendiente={false}
          guardando={guardando}
          onCerrar={() => setCobrando(null)}
          onConfirmar={cobrarDeudor}
        />
      )}

      {toast && (
        <div className="pos-toast" role="status">
          <Check size={16} /> {toast.m}
          {toast.fn && <button className="pos-toast-btn" onClick={() => { const f = toast.fn; setToast(null); f() }}><Undo2 size={14} /> Deshacer</button>}
        </div>
      )}

      {plantillaDraft && (
        <div className="pos-modal-fondo" onClick={() => setPlantillaDraft(null)}>
          <div className="pos-modal pos-modal-ancho" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3>{plantillaDraft.id ? 'Editar plantilla' : 'Nueva plantilla'}</h3>
            <p className="pos-sub" style={{ marginBottom: 16 }}>Es el punto de partida de cada venta: productos, precios y vendedores.</p>
            <FormConfigPos valor={plantillaDraft} onChange={setPlantillaDraft} etiquetaNombre="Nombre de la plantilla" />
            {error && <div className="pos-error">{error}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="pos-btn" style={{ flex: 1 }} onClick={() => { setPlantillaDraft(null); setError('') }}>Cancelar</button>
              <button className="pos-btn pos-btn-primary" style={{ flex: 1 }} onClick={guardarPlantilla}>Guardar plantilla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
