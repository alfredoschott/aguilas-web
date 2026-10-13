import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  addDoc, arrayUnion, collection, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, db,
} from './posFirestore'
import { Settings, ShoppingCart, FileSpreadsheet, FileText, Lock, Unlock, X, Plus, Minus, User, Search, Check, Banknote, Landmark, ShoppingBag, ReceiptText, Undo2, Pencil, RotateCcw, QrCode, WifiOff } from 'lucide-react'
import { usePortalAuth } from '../PortalAuthContext'
import ModalCobro from './ModalCobro'
import ModalEditarPedido from './ModalEditarPedido'
import ModalAccesoCobro from './ModalAccesoCobro'
import FormConfigPos from './FormConfigPos'
import PosCabecera from './PosCabecera'
import { Avatar, BarraEstado, CheckAnimado, Dinero, Dona } from './posUi'
import { categoriaInfo } from './posUiHelpers'
import { exportarVentaExcel, exportarVentaPDF } from './exportarVenta'
import {
  POS_BASE, calcularCorte, dinero, fechaLegible, horaDe, normalizar, prepararConfig, puedeVerMinisterio, redondear, useMinisterios,
} from './posUtils'
import '../portal.css'
import './pos.css'

// Pantalla de la venta. La usan dos entradas: el líder (sesión normal del portal) y un
// dispositivo de cobro invitado por QR (`ayudante`: { uid, nombre, puedeEditar }), que
// solo puede vender, cobrar y ver los pedidos de ESTA venta.
export default function PosVenta() {
  const { id } = useParams()
  const { userData, user } = usePortalAuth()
  return <PosVentaNucleo id={id} userData={userData} email={user?.email?.toLowerCase() || ''} />
}

export function PosVentaNucleo({ id, userData, email, ayudante, onReconectar }) {
  const esAyudante = !!ayudante
  const puedeEditarPedidos = !esAyudante || !!ayudante.puedeEditar
  const { ministerios, cargado: ministeriosListos } = useMinisterios()

  const [venta, setVenta] = useState(undefined) // undefined = cargando, null = no existe
  const [pedidos, setPedidos] = useState([])
  const [pendientesMin, setPendientesMin] = useState([])
  const [nombresGuardados, setNombresGuardados] = useState([])
  const [tab, setTab] = useState('vender')
  const [carrito, setCarrito] = useState({})
  const [nHist, setNHist] = useState(0)
  const [carritoAbierto, setCarritoAbierto] = useState(false)
  const [cliente, setCliente] = useState('')
  const [vendedor, setVendedor] = useState(() => { try { return localStorage.getItem(`pos_vendedor_${id}`) || '' } catch { return '' } })
  const [categoria, setCategoria] = useState('todas')
  const [pop, setPop] = useState(null)
  const [cobrando, setCobrando] = useState(null)
  const [editando, setEditando] = useState(null)
  const [exito, setExito] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null) // { m, fn }
  const [configDraft, setConfigDraft] = useState(null)
  const [sinAcceso, setSinAcceso] = useState(false)
  const [acceso, setAcceso] = useState(null)
  const [dispositivos, setDispositivos] = useState([])
  const [accesoAbierto, setAccesoAbierto] = useState(false)
  const conocidos = useRef(null)
  const [filtro, setFiltro] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const toastRef = useRef(null)
  const carritoRef = useRef({})
  const historialRef = useRef([])
  const popRef = useRef(null)
  const clienteRef = useRef(null)

  const accent = ministerios[venta?.ministerio]?.color || '#3DDC04'
  const ministerioId = venta?.ministerio

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'pos_ventas', id), (s) => setVenta(s.exists() ? { id: s.id, ...s.data() } : null), (e) => { console.error(e); if (esAyudante) setSinAcceso(true); else setVenta(null) })
    return () => unsub()
  }, [id, esAyudante])

  useEffect(() => {
    if (!ministerioId) return undefined
    const unsubPedidos = onSnapshot(query(collection(db, 'pos_pedidos'), where('ventaId', '==', id), where('ministerio', '==', ministerioId)),
      (s) => setPedidos(s.docs.map((d) => ({ id: d.id, ...d.data() }))), (e) => { console.error(e); if (esAyudante) setSinAcceso(true); else setError('No se pudieron cargar los pedidos.') })
    // Un dispositivo invitado solo ve los pedidos de esta venta (no deudas de otros días ni clientes).
    if (esAyudante) return () => unsubPedidos()
    const unsubPend = onSnapshot(query(collection(db, 'pos_pedidos'), where('ministerio', '==', ministerioId), where('estado', '==', 'pendiente')),
      (s) => setPendientesMin(s.docs.map((d) => ({ id: d.id, ...d.data() }))), (e) => console.error(e))
    const unsubNombres = onSnapshot(doc(db, 'pos_clientes', ministerioId), (s) => setNombresGuardados(s.data()?.nombres || []), () => {})
    // Acceso por QR (solo el líder): estado del acceso y dispositivos conectados.
    const unsubAcceso = onSnapshot(doc(db, 'pos_accesos', id), (s) => setAcceso(s.exists() ? s.data() : null), () => {})
    const unsubDisp = onSnapshot(query(collection(db, 'pos_dispositivos'), where('ventaId', '==', id)), (s) => {
      const lista = s.docs.map((d) => ({ id: d.id, ...d.data() }))
      setDispositivos(lista)
      const pendientes = new Set(lista.filter((d) => d.estado === 'pendiente').map((d) => d.id))
      if (conocidos.current) lista.filter((d) => pendientes.has(d.id) && !conocidos.current.has(d.id)).forEach((d) => avisar(`${d.nombre} quiere conectarse a cobrar`))
      conocidos.current = pendientes
    }, () => {})
    return () => { unsubPedidos(); unsubPend(); unsubNombres(); unsubAcceso(); unsubDisp() }
  }, [id, ministerioId, esAyudante])

  useEffect(() => () => { clearTimeout(toastRef.current); clearTimeout(popRef.current) }, [])

  // Aviso temporal; si trae `fn`, muestra el botón Deshacer (7 s para arrepentirse).
  // Al cerrar la confirmación, la opción de deshacer sigue unos segundos como aviso.
  function cerrarExito() {
    if (exito?.deshacer) avisar(`Pedido #${exito.folio} ${exito.estado === 'pendiente' ? 'guardado' : 'cobrado'}`, exito.deshacer)
    setExito(null)
  }

  const avisar = (m, fn) => {
    clearTimeout(toastRef.current)
    setToast({ m, fn })
    toastRef.current = setTimeout(() => setToast(null), fn ? 7000 : 3200)
  }

  // El éxito de cobro se cierra solo (más tarde si hay cambio que entregar).
  useEffect(() => {
    if (!exito) return undefined
    const t = setTimeout(() => { cerrarExito() }, exito.cambio > 0 ? 7000 : 2600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exito])

  const productos = useMemo(() => (venta?.productos || []).filter((p) => p.activo !== false), [venta])
  const categorias = useMemo(() => [...new Set(productos.map((p) => p.categoria || 'Otros'))], [productos])
  const porCategoria = useMemo(() => {
    const g = {}
    productos.filter((p) => categoria === 'todas' || (p.categoria || 'Otros') === categoria).forEach((p) => { (g[p.categoria || 'Otros'] ||= []).push(p) })
    return Object.entries(g)
  }, [productos, categoria])

  const lineas = useMemo(
    () => productos.filter((p) => carrito[p.id] > 0).map((p) => ({ productoId: p.id, nombre: p.nombre, precio: p.precio, cantidad: carrito[p.id] })),
    [productos, carrito],
  )
  const totalCarrito = redondear(lineas.reduce((a, l) => a + l.precio * l.cantidad, 0))
  const piezas = lineas.reduce((a, l) => a + l.cantidad, 0)

  const vendedores = esAyudante ? [ayudante.nombre] : venta?.vendedores || []
  const vendedorActual = esAyudante ? ayudante.nombre : vendedores.includes(vendedor) ? vendedor : vendedores[0] || userData?.nombre?.split(' ')[0] || ''
  const elegirVendedor = (v) => { setVendedor(v); try { localStorage.setItem(`pos_vendedor_${id}`, v) } catch { /* sin storage */ } }

  // Un dispositivo invitado solo conoce las deudas de esta venta; el líder, las de todo el ministerio.
  const pendientesBase = useMemo(() => (esAyudante ? pedidos.filter((p) => p.estado === 'pendiente') : pendientesMin), [esAyudante, pedidos, pendientesMin])

  const deudaCliente = useMemo(() => {
    const n = normalizar(cliente)
    if (!n) return null
    const deudas = pendientesBase.filter((p) => normalizar(p.cliente) === n)
    return deudas.length ? { n: deudas.length, total: redondear(deudas.reduce((a, p) => a + p.total, 0)) } : null
  }, [cliente, pendientesBase])

  const sugerencias = useMemo(() => {
    const todos = new Set(nombresGuardados)
    pedidos.forEach((p) => p.cliente && todos.add(p.cliente))
    pendientesBase.forEach((p) => p.cliente && todos.add(p.cliente))
    return [...todos].sort((a, b) => a.localeCompare(b))
  }, [nombresGuardados, pedidos, pendientesBase])

  const corte = useMemo(() => calcularCorte(pedidos), [pedidos])
  const cerrada = venta?.estado === 'cerrada'
  const siguienteFolio = pedidos.reduce((m, p) => Math.max(m, p.folio || 0), 0) + 1

  const fijarCarrito = (c) => { carritoRef.current = c; setCarrito(c) }
  const reiniciarHistorial = () => { historialRef.current = []; setNHist(0) }

  function agregar(pid, delta) {
    const base = carritoRef.current
    const n = Math.max(0, (base[pid] || 0) + delta)
    if (n === (base[pid] || 0)) return
    historialRef.current = [...historialRef.current.slice(-29), base]
    setNHist(historialRef.current.length)
    const siguiente = { ...base, [pid]: n }
    if (n === 0) delete siguiente[pid]
    fijarCarrito(siguiente)
    if (delta > 0) {
      setPop(pid)
      clearTimeout(popRef.current)
      popRef.current = setTimeout(() => setPop(null), 300)
      try { navigator.vibrate?.(8) } catch { /* sin vibración */ }
    }
  }

  function deshacerCarrito() {
    const previo = historialRef.current.at(-1)
    if (!previo) return
    historialRef.current = historialRef.current.slice(0, -1)
    setNHist(historialRef.current.length)
    fijarCarrito(previo)
  }

  function vaciarCarrito() {
    historialRef.current = [...historialRef.current.slice(-29), carritoRef.current]
    setNHist(historialRef.current.length)
    fijarCarrito({})
    setCarritoAbierto(false)
    avisar('Pedido vaciado', deshacerCarrito)
  }

  function intentarCobrar() {
    if (!cliente.trim()) {
      setCarritoAbierto(true)
      setTimeout(() => clienteRef.current?.focus(), 350)
      return
    }
    setCobrando({ tipo: 'nuevo' })
  }

  async function guardarPedido(pago) {
    const nombre = cliente.trim()
    setGuardando(true)
    setError('')
    try {
      const carritoPrevio = carritoRef.current
      const ref = await addDoc(collection(db, 'pos_pedidos'), {
        ventaId: id, ministerio: venta.ministerio, folio: siguienteFolio, cliente: nombre, items: lineas, total: totalCarrito,
        estado: pago.estado, metodo: pago.metodo, recibido: pago.recibido, cambio: pago.cambio, verificado: pago.verificado,
        vendedor: vendedorActual, creadoPor: email, creadoEn: serverTimestamp(), pagadoEn: pago.estado === 'pagado' ? serverTimestamp() : null,
        ...(esAyudante ? { dispositivoUid: ayudante.uid } : {}),
      })
      if (!esAyudante) setDoc(doc(db, 'pos_clientes', venta.ministerio), { nombres: arrayUnion(nombre) }, { merge: true }).catch(() => {})
      const deshacer = async () => {
        try {
          await updateDoc(doc(db, 'pos_pedidos', ref.id), { estado: 'anulado', anuladoPor: email, anuladoEn: serverTimestamp() })
          fijarCarrito(carritoPrevio); reiniciarHistorial(); setCliente(nombre); setExito(null)
          avisar('Pedido deshecho: volvió al carrito')
        } catch (e) { console.error(e); setError('No se pudo deshacer el pedido.') }
      }
      setExito({ folio: siguienteFolio, cliente: nombre, total: totalCarrito, estado: pago.estado, metodo: pago.metodo, cambio: pago.cambio, deshacer })
      fijarCarrito({}); reiniciarHistorial(); setCliente(''); setCarritoAbierto(false); setCobrando(null)
    } catch (e) {
      console.error(e)
      setError('No se pudo guardar el pedido. Revisa tu conexión e intenta de nuevo.')
    } finally { setGuardando(false) }
  }

  async function cobrarPendiente(pedido, pago) {
    setGuardando(true)
    setError('')
    try {
      await updateDoc(doc(db, 'pos_pedidos', pedido.id), { estado: 'pagado', metodo: pago.metodo, recibido: pago.recibido, cambio: pago.cambio, verificado: pago.verificado, pagadoEn: serverTimestamp(), cobradoPor: email })
      setCobrando(null)
      const deshacer = async () => {
        try {
          await updateDoc(doc(db, 'pos_pedidos', pedido.id), { estado: 'pendiente', metodo: null, recibido: 0, cambio: 0, verificado: false, pagadoEn: null, cobradoPor: null })
          setExito(null); avisar(`Cobro del pedido #${pedido.folio} deshecho`)
        } catch (e) { console.error(e); setError('No se pudo deshacer el cobro.') }
      }
      setExito({ folio: pedido.folio, cliente: pedido.cliente, total: pedido.total, estado: 'pagado', metodo: pago.metodo, cambio: pago.cambio, deshacer })
    } catch (e) { console.error(e); setError('No se pudo registrar el cobro.') } finally { setGuardando(false) }
  }

  async function anular(pedido) {
    if (!window.confirm(`¿Anular el pedido #${pedido.folio} de ${pedido.cliente} por ${dinero(pedido.total)}?`)) return
    try {
      await updateDoc(doc(db, 'pos_pedidos', pedido.id), { estado: 'anulado', estadoPrevio: pedido.estado, anuladoPor: email, anuladoEn: serverTimestamp() })
      avisar(`Pedido #${pedido.folio} anulado`, async () => {
        try {
          await updateDoc(doc(db, 'pos_pedidos', pedido.id), { estado: pedido.estado, anuladoPor: null, anuladoEn: null })
          avisar(`Pedido #${pedido.folio} restaurado`)
        } catch (e) { console.error(e); setError('No se pudo restaurar el pedido.') }
      })
    } catch (e) { console.error(e); setError('No se pudo anular el pedido.') }
  }

  async function restaurar(pedido) {
    try {
      await updateDoc(doc(db, 'pos_pedidos', pedido.id), { estado: pedido.estadoPrevio || 'pendiente', anuladoPor: null, anuladoEn: null })
      avisar(`Pedido #${pedido.folio} restaurado`)
    } catch (e) { console.error(e); setError('No se pudo restaurar el pedido.') }
  }

  // Guarda la corrección de un pedido y deja un aviso para deshacerla.
  async function guardarEdicion(pedido, cambios) {
    const claves = ['cliente', 'vendedor', 'items', 'total', 'estado', 'metodo', 'recibido', 'cambio', 'verificado', 'pagadoEn', 'cobradoPor', 'editadoEn', 'editadoPor']
    const previo = Object.fromEntries(claves.map((k) => [k, pedido[k] ?? null]))
    const extra = {}
    if (cambios.estado === 'pagado' && pedido.estado !== 'pagado') { extra.pagadoEn = serverTimestamp(); extra.cobradoPor = email }
    if (cambios.estado === 'pendiente') { extra.pagadoEn = null; extra.cobradoPor = null }
    setGuardando(true)
    try {
      await updateDoc(doc(db, 'pos_pedidos', pedido.id), { ...cambios, ...extra, editadoPor: email, editadoEn: serverTimestamp() })
      if (cambios.cliente !== pedido.cliente) setDoc(doc(db, 'pos_clientes', venta.ministerio), { nombres: arrayUnion(cambios.cliente) }, { merge: true }).catch(() => {})
      setEditando(null)
      avisar(`Pedido #${pedido.folio} actualizado`, async () => {
        try {
          await updateDoc(doc(db, 'pos_pedidos', pedido.id), previo)
          avisar(`Cambios del pedido #${pedido.folio} deshechos`)
        } catch (e) { console.error(e); setError('No se pudo deshacer la edición.') }
      })
    } catch (e) { console.error(e); setError('No se pudo guardar la edición.') } finally { setGuardando(false) }
  }

  async function alternarVerificado(pedido) {
    try { await updateDoc(doc(db, 'pos_pedidos', pedido.id), { verificado: !pedido.verificado }) } catch (e) { console.error(e) }
  }

  async function cambiarEstadoVenta(estado) {
    if (estado === 'cerrada' && corte.pendientes > 0 && !window.confirm(`Quedan ${corte.pendientes} pedido(s) sin cobrar (${dinero(corte.pendiente)}). Seguirán en “Por cobrar”. ¿Cerrar la venta?`)) return
    try {
      await updateDoc(doc(db, 'pos_ventas', id), { estado, ...(estado === 'cerrada' ? { cerradaEn: serverTimestamp() } : {}) })
      if (estado === 'cerrada') {
        if (acceso?.activo) updateDoc(doc(db, 'pos_accesos', id), { activo: false }).catch(() => {})
        avisar('Venta cerrada', () => cambiarEstadoVenta('abierta'))
      }
    } catch (e) { console.error(e); setError('No se pudo actualizar la venta.') }
  }

  async function guardarConfig() {
    const { datos, error: err } = prepararConfig(configDraft)
    if (err) { setError(err); return }
    try {
      await updateDoc(doc(db, 'pos_ventas', id), { ...datos, fecha: configDraft.fecha || venta.fecha })
      setConfigDraft(null); setError(''); avisar('Cambios guardados')
    } catch (e) { console.error(e); setError('No se pudieron guardar los cambios.') }
  }

  if (sinAcceso) {
    return (
      <div className="pos-page"><div className="pos-wrap" style={{ maxWidth: 520 }}>
        <PosCabecera titulo="Acceso terminado" />
        <div className="pos-card pos-cobro-aviso">
          <WifiOff size={34} strokeWidth={1.6} />
          <p>El líder apagó el acceso, venció el tiempo, cerraron la venta o se renovó el QR.</p>
          <p className="pos-muted">Pídele al líder que te muestre un QR nuevo.</p>
          {onReconectar && <button className="pos-btn pos-btn-primary pos-btn-lg pos-btn-block" onClick={onReconectar}>Volver a pedir acceso</button>}
        </div>
      </div></div>
    )
  }
  if (venta === undefined || !ministeriosListos) return <div className="pos-page"><div className="pos-wrap"><p className="pos-muted">Cargando venta…</p></div></div>
  if (venta === null || (!esAyudante && !puedeVerMinisterio(userData, venta.ministerio, ministerios))) {
    return (
      <div className="pos-page"><div className="pos-wrap">
        <PosCabecera titulo="Venta no disponible" volverA={esAyudante ? undefined : POS_BASE} />
        <p className="pos-empty">Esta venta no existe o no tienes acceso.</p>
      </div></div>
    )
  }

  const filtros = [['todos', 'Todos'], ['pendientes', 'Por cobrar'], ['pagados', 'Pagados'], ['anulados', 'Anulados']]
  const cuenta = (k) => pedidos.filter((p) => (k === 'pendientes' ? p.estado === 'pendiente' : k === 'pagados' ? p.estado === 'pagado' : k === 'anulados' ? p.estado === 'anulado' : true)).length
  const pedidosVisibles = pedidos
    .filter((p) => (filtro === 'pendientes' ? p.estado === 'pendiente' : filtro === 'pagados' ? p.estado === 'pagado' : filtro === 'anulados' ? p.estado === 'anulado' : true))
    .filter((p) => !busqueda || normalizar(p.cliente).includes(normalizar(busqueda)))
    .sort((a, b) => (b.folio || 0) - (a.folio || 0))

  const tabs = [['vender', 'Vender', null], ['pedidos', 'Pedidos', corte.pendientes || null], ...(esAyudante ? [] : [['corte', 'Corte', null]])]
  const pendientesDisp = dispositivos.filter((d) => d.estado === 'pendiente').length
  const maxProd = Math.max(1, ...corte.porProducto.map(([, v]) => v.cantidad))
  const maxVend = Math.max(1, ...corte.porVendedor.map(([, v]) => v.vendido))
  const efectivoCaja = corte.efectivo + (venta.fondoInicial || 0)

  return (
    <div className="pos-page" data-vender={tab === 'vender'} style={{ '--pos-accent': accent }}>
      <div className="pos-wrap">
        <PosCabecera titulo={venta.nombre} ministerioId={venta.ministerio} ministerioNombre={ministerios[venta.ministerio]?.nombre} sub={`${fechaLegible(venta.fecha)}${venta.meta ? ` · ${venta.meta}` : ''}`} volverA={esAyudante ? undefined : POS_BASE}>
          {cerrada ? <span className="pos-badge"><Lock size={12} /> Cerrada</span> : <span className="pos-badge pos-badge-ok"><span className="pos-vivo" /> Abierta</span>}
          {esAyudante && <span className="pos-badge pos-badge-info"><User size={12} /> {ayudante.nombre}</span>}
          {!esAyudante && (
            <>
              <button className="pos-btn" onClick={() => setAccesoAbierto(true)} aria-label="Invitar a cobrar con un código QR" style={{ position: 'relative' }}>
                <QrCode size={16} /> Invitar a cobrar
                {pendientesDisp > 0 && <span className="pos-tab-n" style={{ position: 'absolute', top: -7, right: -4 }}>{pendientesDisp}</span>}
              </button>
              <button className="pos-btn" onClick={() => setConfigDraft({ nombre: venta.nombre, fecha: venta.fecha, meta: venta.meta, fondoInicial: venta.fondoInicial || '', vendedores: venta.vendedores || [], productos: venta.productos || [] })}>
                <Settings size={16} /> Editar
              </button>
            </>
          )}
        </PosCabecera>

        {error && <div className="pos-error" role="alert">{error}</div>}

        {/* Mini tablero siempre visible */}
        <section className="pos-resumen pos-in" style={{ '--i': 2 }} aria-label="Resumen de la venta">
          <div className="pos-resumen-cifras">
            <div><div className="pos-cifra-label">Vendido</div><div className="pos-cifra pos-num"><Dinero valor={corte.vendido} /></div></div>
            <div><div className="pos-cifra-label">Cobrado</div><div className="pos-cifra pos-num" style={{ color: 'var(--pos-ef)' }}><Dinero valor={corte.cobrado} /></div></div>
            <div><div className="pos-cifra-label">Por cobrar</div><div className="pos-cifra pos-num" style={{ color: corte.pendiente > 0 ? 'var(--pos-pe)' : undefined }}><Dinero valor={corte.pendiente} /></div></div>
          </div>
          <div className="pos-resumen-barra">
            <BarraEstado efectivo={corte.efectivo} transferencia={corte.transferencia} pendiente={corte.pendiente} leyenda={false} />
            <div className="pos-sub" style={{ marginTop: 6 }}>{corte.pedidos} pedido{corte.pedidos === 1 ? '' : 's'}{corte.anulados ? ` · ${corte.anulados} anulado${corte.anulados > 1 ? 's' : ''}` : ''}</div>
          </div>
        </section>

        <div className="pos-tabs pos-in" style={{ '--i': 3, '--n': tabs.length, '--idx': tabs.findIndex(([k]) => k === tab) }} role="tablist">
          <span className="pos-tabs-ind" />
          {tabs.map(([k, label, n]) => (
            <button key={k} role="tab" className="pos-tab" aria-selected={tab === k} onClick={() => setTab(k)}>
              {label}{n ? <span className="pos-tab-n">{n}</span> : null}
            </button>
          ))}
        </div>

        {/* ---------------- VENDER ---------------- */}
        {tab === 'vender' && (
          <div className="pos-vender">
            <div>
              {categorias.length > 1 && (
                <div className="pos-chips pos-chips-scroll pos-cat-chips" role="group" aria-label="Categorías">
                  <button className="pos-chip" aria-pressed={categoria === 'todas'} onClick={() => setCategoria('todas')}>Todo</button>
                  {categorias.map((c) => {
                    const { Icono, color } = categoriaInfo(c)
                    return <button key={c} className="pos-chip" aria-pressed={categoria === c} onClick={() => setCategoria(c)}><Icono size={14} color={color} /> {c}</button>
                  })}
                </div>
              )}
              {productos.length === 0 && <p className="pos-empty">No hay productos activos. Agrégalos con “Editar”.</p>}
              {porCategoria.map(([cat, lista]) => {
                const { Icono, color } = categoriaInfo(cat)
                return (
                  <section key={cat}>
                    {categoria === 'todas' && categorias.length > 1 && <div className="pos-cat-titulo"><Icono size={15} color={color} /> {cat}</div>}
                    <div className="pos-productos">
                      {lista.map((p) => (
                        <button key={p.id} className="pos-prod" style={{ '--cat': color }} data-en-carrito={carrito[p.id] > 0} data-pop={pop === p.id} disabled={cerrada} onClick={() => agregar(p.id, 1)}>
                          {carrito[p.id] > 0 && <span className="pos-prod-qty" key={carrito[p.id]}>{carrito[p.id]}</span>}
                          <span className="pos-prod-icono"><Icono size={17} /></span>
                          <span className="pos-prod-nombre">{p.nombre}</span>
                          <span className="pos-prod-precio pos-num">{dinero(p.precio)}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>

            {carritoAbierto && <div className="pos-fondo-hoja" onClick={() => setCarritoAbierto(false)} />}
            <aside className="pos-card pos-carrito" data-abierto={carritoAbierto} aria-label="Pedido actual">
              <div className="pos-carrito-cab">
                <ShoppingBag size={18} color="var(--pos-accent)" />
                <strong>Pedido #{siguienteFolio}</strong>
                <span className="pos-spacer" />
                {piezas > 0 && <span className="pos-badge">{piezas} pieza{piezas > 1 ? 's' : ''}</span>}
                <button className="pos-icon-btn" onClick={deshacerCarrito} disabled={nHist === 0} aria-label="Deshacer último cambio" title="Deshacer último cambio" style={nHist === 0 ? { opacity: 0.35 } : undefined}><Undo2 size={18} /></button>
                <button className="pos-icon-btn pos-cerrar-hoja" onClick={() => setCarritoAbierto(false)} aria-label="Cerrar pedido"><X size={18} /></button>
              </div>
              <div className="pos-carrito-cuerpo">
                {lineas.length === 0 ? (
                  <div className="pos-carrito-vacio"><ShoppingCart size={30} strokeWidth={1.5} />Toca un producto para agregarlo al pedido.</div>
                ) : (
                  <div className="pos-carrito-lista">
                    {lineas.map((l) => (
                      <div key={l.productoId} className="pos-linea">
                        <div className="pos-linea-nombre">{l.nombre}<small>{dinero(l.precio)} c/u</small></div>
                        <div className="pos-qty">
                          <button onClick={() => agregar(l.productoId, -1)} aria-label={`Quitar un ${l.nombre}`}><Minus size={15} /></button>
                          <span>{l.cantidad}</span>
                          <button onClick={() => agregar(l.productoId, 1)} aria-label={`Agregar un ${l.nombre}`}><Plus size={15} /></button>
                        </div>
                        <strong className="pos-linea-monto pos-num">{dinero(l.precio * l.cantidad)}</strong>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pos-field">
                  <label className="pos-label" htmlFor="pos-cliente">¿Quién compra?</label>
                  <div className="pos-cliente">
                    {cliente.trim() ? <span className="pos-avatar-slot"><Avatar nombre={cliente} size={32} /></span> : <span className="pos-cliente-vacio"><User size={18} /></span>}
                    <input id="pos-cliente" ref={clienteRef} className="pos-input" list="pos-clientes" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre del cliente" autoComplete="off" autoCapitalize="words" enterKeyHint="done" />
                    <datalist id="pos-clientes">{sugerencias.map((n) => <option key={n} value={n} />)}</datalist>
                  </div>
                </div>
                {deudaCliente && <div className="pos-aviso" role="status">⚠ {cliente.trim()} ya debe {dinero(deudaCliente.total)} ({deudaCliente.n} pedido{deudaCliente.n > 1 ? 's' : ''} sin cobrar).</div>}

                {vendedores.length > 1 && (
                  <div className="pos-field">
                    <span className="pos-label">Vende</span>
                    <div className="pos-vendedores" role="group" aria-label="Vendedor">
                      {vendedores.map((v) => <button key={v} className="pos-chip" aria-pressed={vendedorActual === v} onClick={() => elegirVendedor(v)}>{v}</button>)}
                    </div>
                  </div>
                )}

                <div className="pos-total"><span>Total</span><span className="pos-num">{dinero(totalCarrito)}</span></div>
                <button className="pos-btn pos-btn-primary pos-btn-lg pos-btn-block" disabled={lineas.length === 0 || cerrada} onClick={intentarCobrar}>
                  {cerrada ? 'Venta cerrada' : lineas.length > 0 && !cliente.trim() ? 'Escribe el nombre para cobrar' : 'Cobrar'}
                </button>
                {lineas.length > 0 && <button className="pos-btn pos-btn-block" style={{ marginTop: 8 }} onClick={vaciarCarrito}>Vaciar pedido</button>}
              </div>
            </aside>

            <div className="pos-barra-movil" hidden={carritoAbierto}>
              <button className="pos-btn" style={{ position: 'relative' }} onClick={() => setCarritoAbierto((v) => !v)} aria-label="Ver pedido">
                <ShoppingCart size={19} />
                {piezas > 0 && <span className="pos-tab-n" style={{ position: 'absolute', top: -6, right: -4 }}>{piezas}</span>}
              </button>
              <button className="pos-btn pos-btn-primary pos-btn-lg" disabled={lineas.length === 0 || cerrada} onClick={intentarCobrar}>
                {lineas.length > 0 && !cliente.trim() ? 'Poner nombre' : 'Cobrar'} · {dinero(totalCarrito)}
              </button>
            </div>
          </div>
        )}

        {/* ---------------- PEDIDOS ---------------- */}
        {tab === 'pedidos' && (
          <>
            <div className="pos-chips pos-chips-scroll" style={{ marginBottom: 12 }}>
              {filtros.map(([k, l]) => <button key={k} className="pos-chip" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{l} <small>{cuenta(k)}</small></button>)}
            </div>
            <div className="pos-cliente" style={{ marginBottom: 14 }}>
              <span className="pos-cliente-vacio"><Search size={18} /></span>
              <input className="pos-input" style={{ paddingLeft: 40 }} type="search" placeholder="Buscar por nombre…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar pedido por nombre" />
            </div>
            {pedidosVisibles.length === 0 && <p className="pos-empty">{pedidos.length === 0 ? 'Todavía no hay pedidos en esta venta.' : 'Ningún pedido coincide.'}</p>}
            <div className="pos-pila">
              {pedidosVisibles.map((p, i) => (
                <article key={p.id} className="pos-card pos-pedido pos-in" data-estado={p.estado} data-metodo={p.metodo || ''} style={{ '--i': Math.min(i, 8) }}>
                  <Avatar nombre={p.cliente} />
                  <div className="pos-pedido-cuerpo">
                    <div className="pos-pedido-top">
                      <span className="pos-pedido-cliente">{p.cliente}<span className="pos-pedido-folio">#{p.folio}</span></span>
                      <strong className="pos-num">{dinero(p.total)}</strong>
                    </div>
                    <div className="pos-pedido-items">{(p.items || []).map((it) => <span key={it.productoId} className="pos-item-chip">{it.cantidad}× {it.nombre}</span>)}</div>
                    <div className="pos-pedido-meta">
                      {p.estado === 'pendiente' && <span className="pos-badge pos-badge-warn">Por cobrar</span>}
                      {p.estado === 'pagado' && p.metodo === 'efectivo' && <span className="pos-badge pos-badge-ok"><Banknote size={12} /> Efectivo{p.cambio > 0 ? ` · cambio ${dinero(p.cambio)}` : ''}</span>}
                      {p.estado === 'pagado' && p.metodo === 'transferencia' && <span className={`pos-badge ${p.verificado ? 'pos-badge-info' : 'pos-badge-warn'}`}><Landmark size={12} /> Transferencia{p.verificado ? ' ✓' : ' · sin verificar'}</span>}
                      {p.estado === 'anulado' && <span className="pos-badge pos-badge-off">Anulado</span>}
                      {p.editadoEn && p.estado !== 'anulado' && <span className="pos-badge">Editado</span>}
                      <span>{p.vendedor}{p.vendedor && horaDe(p.creadoEn) ? ' · ' : ''}{horaDe(p.creadoEn)}</span>
                    </div>
                    {p.estado === 'anulado' && puedeEditarPedidos && (
                      <div className="pos-pedido-acciones"><button className="pos-btn pos-btn-sm" onClick={() => restaurar(p)}><RotateCcw size={14} /> Restaurar pedido</button></div>
                    )}
                    {p.estado !== 'anulado' && (
                      <div className="pos-pedido-acciones">
                        {puedeEditarPedidos && <button className="pos-btn pos-btn-sm" onClick={() => setEditando(p)}><Pencil size={14} /> Editar</button>}
                        {p.estado === 'pendiente' && <button className="pos-btn pos-btn-primary pos-btn-sm" onClick={() => setCobrando({ tipo: 'pedido', pedido: p })}>Cobrar</button>}
                        {puedeEditarPedidos && p.estado === 'pagado' && p.metodo === 'transferencia' && <button className="pos-btn pos-btn-sm" onClick={() => alternarVerificado(p)}><Check size={14} /> {p.verificado ? 'Quitar verificado' : 'Marcar verificado'}</button>}
                        {puedeEditarPedidos && <button className="pos-btn pos-btn-danger pos-btn-sm" onClick={() => anular(p)}>Anular</button>}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {/* ---------------- CORTE ---------------- */}
        {tab === 'corte' && !esAyudante && (
          <div className="pos-pila">
            <section className="pos-caja pos-in">
              <div className="pos-cifra-label">Efectivo que debe haber en caja</div>
              <div className="pos-caja-valor pos-num"><Dinero valor={efectivoCaja} decimales /></div>
              <div className="pos-caja-desglose">
                <span>Cobrado en efectivo {dinero(corte.efectivo)}</span>
                {venta.fondoInicial > 0 && <span>+ Fondo {dinero(venta.fondoInicial)}</span>}
              </div>
            </section>

            <section className="pos-card pos-in" style={{ '--i': 1 }}>
              <h2 className="pos-card-titulo"><ReceiptText size={17} color="var(--pos-accent)" /> ¿Cómo se pagó?</h2>
              <div className="pos-corte-grid">
                <Dona segmentos={[{ label: 'Efectivo', valor: corte.efectivo, color: 'var(--pos-ef)' }, { label: 'Transferencia', valor: corte.transferencia, color: 'var(--pos-tr)' }, { label: 'Por cobrar', valor: corte.pendiente, color: 'var(--pos-pe)' }]}>
                  <span className="pos-cifra-label">Vendido</span>
                  <span className="pos-num" style={{ fontSize: '1.3rem' }}>{dinero(corte.vendido)}</span>
                </Dona>
                <div className="pos-dona-info">
                  <div className="pos-dona-fila"><i style={{ background: 'var(--pos-ef)' }} />Efectivo<b>{dinero(corte.efectivo)}</b></div>
                  <div className="pos-dona-fila"><i style={{ background: 'var(--pos-tr)' }} />Transferencia<b>{dinero(corte.transferencia)}</b></div>
                  {corte.transferenciaSinVerificar > 0 && <div className="pos-aviso" style={{ margin: 0 }}>{dinero(corte.transferenciaSinVerificar)} en transferencias sin verificar</div>}
                  <div className="pos-dona-fila"><i style={{ background: 'var(--pos-pe)' }} />Por cobrar<b>{dinero(corte.pendiente)}</b></div>
                </div>
              </div>
            </section>

            <div className="pos-dos-col">
              <section className="pos-card pos-in" style={{ '--i': 2 }}>
                <h2 className="pos-card-titulo">Por vendedor</h2>
                {corte.porVendedor.length === 0 && <p className="pos-muted">Sin ventas todavía.</p>}
                <div className="pos-ranking">
                  {corte.porVendedor.map(([n, v]) => (
                    <div key={n} className="pos-rank-fila">
                      <Avatar nombre={n} size={30} />
                      <span className="pos-rank-nombre">{n}<small>{v.pedidos} pedidos</small></span>
                      <strong className="pos-rank-monto pos-num">{dinero(v.vendido)}</strong>
                      <div className="pos-rank-barra"><span style={{ width: `${(v.vendido / maxVend) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              </section>
              <section className="pos-card pos-in" style={{ '--i': 3 }}>
                <h2 className="pos-card-titulo">Lo más vendido</h2>
                {corte.porProducto.length === 0 && <p className="pos-muted">Sin ventas todavía.</p>}
                <div className="pos-ranking">
                  {corte.porProducto.slice(0, 8).map(([n, v], i) => (
                    <div key={n} className="pos-rank-fila">
                      <span className="pos-rank-pos">{i + 1}</span>
                      <span className="pos-rank-nombre">{n}<small>{v.cantidad} pzas</small></span>
                      <strong className="pos-rank-monto pos-num">{dinero(v.importe)}</strong>
                      <div className="pos-rank-barra"><span style={{ width: `${(v.cantidad / maxProd) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              <button className="pos-btn" onClick={() => exportarVentaExcel(venta, pedidos, corte, ministerios[venta.ministerio]?.nombre)}><FileSpreadsheet size={16} /> Excel</button>
              <button className="pos-btn" onClick={() => exportarVentaPDF(venta, pedidos, corte, ministerios[venta.ministerio]?.nombre, ministerios[venta.ministerio]?.color)}><FileText size={16} /> PDF</button>
              <span className="pos-spacer" />
              {cerrada
                ? <button className="pos-btn" onClick={() => cambiarEstadoVenta('abierta')}><Unlock size={16} /> Reabrir venta</button>
                : <button className="pos-btn pos-btn-primary" onClick={() => cambiarEstadoVenta('cerrada')}><Lock size={16} /> Cerrar venta</button>}
            </div>
          </div>
        )}
      </div>

      {cobrando && (
        <ModalCobro
          total={cobrando.tipo === 'nuevo' ? totalCarrito : cobrando.pedido.total}
          titulo={cobrando.tipo === 'nuevo' ? `Cobrar a ${cliente.trim()}` : `Cobrar pedido #${cobrando.pedido.folio}`}
          subtitulo={cobrando.tipo === 'nuevo' ? `Pedido #${siguienteFolio} · ${piezas} pieza${piezas > 1 ? 's' : ''}` : cobrando.pedido.cliente}
          permitirPendiente={cobrando.tipo === 'nuevo'}
          guardando={guardando}
          onCerrar={() => setCobrando(null)}
          onConfirmar={(pago) => (cobrando.tipo === 'nuevo' ? guardarPedido(pago) : cobrarPendiente(cobrando.pedido, pago))}
        />
      )}

      {accesoAbierto && !esAyudante && (
        <ModalAccesoCobro venta={venta} ventaId={id} acceso={acceso} dispositivos={dispositivos} email={email} onCerrar={() => setAccesoAbierto(false)} avisar={avisar} />
      )}

      {editando && (
        <ModalEditarPedido pedido={editando} venta={venta} sugerencias={sugerencias} guardando={guardando}
          onCerrar={() => setEditando(null)} onGuardar={(cambios) => guardarEdicion(editando, cambios)} />
      )}

      {exito && (
        <div className="pos-modal-fondo" onClick={cerrarExito}>
          <div className="pos-modal pos-exito" onClick={(e) => e.stopPropagation()} role="status" style={{ '--pos-ef': exito.estado === 'pendiente' ? 'var(--pos-pe)' : undefined }}>
            <CheckAnimado />
            <h3>{exito.estado === 'pendiente' ? 'Pedido guardado' : 'Pedido cobrado'}</h3>
            <p className="pos-sub" style={{ justifyContent: 'center' }}>#{exito.folio} · {exito.cliente} · {dinero(exito.total)}{exito.estado === 'pendiente' ? ' · por cobrar' : exito.metodo === 'transferencia' ? ' · transferencia' : ''}</p>
            {exito.cambio > 0 && (
              <div className="pos-cambio"><div className="pos-cifra-label">Entrega de cambio</div><div className="pos-cambio-valor pos-num">{dinero(exito.cambio)}</div></div>
            )}
            <div className="pos-exito-botones">
              {exito.deshacer && <button className="pos-btn pos-btn-lg" onClick={exito.deshacer}><Undo2 size={17} /> Deshacer</button>}
              <button className="pos-btn pos-btn-primary pos-btn-lg" onClick={cerrarExito}>Siguiente pedido</button>
            </div>
            <div className="pos-exito-barra"><span style={{ '--dur': exito.cambio > 0 ? '7s' : '2.6s' }} /></div>
          </div>
        </div>
      )}

      {configDraft && (
        <div className="pos-modal-fondo" onClick={() => setConfigDraft(null)}>
          <div className="pos-modal pos-modal-ancho" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3>Editar venta</h3>
            <p className="pos-sub" style={{ marginBottom: 16 }}>Los cambios de precio aplican a los pedidos nuevos; los ya hechos conservan su precio.</p>
            <FormConfigPos valor={configDraft} onChange={setConfigDraft} mostrarFecha />
            {error && <div className="pos-error">{error}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="pos-btn" style={{ flex: 1 }} onClick={() => { setConfigDraft(null); setError('') }}>Cancelar</button>
              <button className="pos-btn pos-btn-primary" style={{ flex: 1 }} onClick={guardarConfig}>Guardar cambios</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="pos-toast" role="status">
          <Check size={16} /> {toast.m}
          {toast.fn && <button className="pos-toast-btn" onClick={() => { const f = toast.fn; clearTimeout(toastRef.current); setToast(null); f() }}><Undo2 size={14} /> Deshacer</button>}
        </div>
      )}
      
    </div>
  )
}
