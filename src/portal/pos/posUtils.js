// Utilidades compartidas del POS de ventas.
import { useEffect, useState } from 'react'
import { collection, getDocs, db } from './posFirestore'

// Ruta base del POS dentro del portal de líderes.
export const POS_BASE = '/lideres/pos'

export const CATEGORIAS_SUGERIDAS = ['Comida', 'Bebidas', 'Postres']

const formatoMXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
export const dinero = (n) => formatoMXN.format(Number(n) || 0)

export const redondear = (n) => Math.round((Number(n) || 0) * 100) / 100

export const nuevoId = () => Math.random().toString(36).slice(2, 9)

export function hoyISO(fecha = new Date()) {
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fechaLegible(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  const f = new Date(y, m - 1, d)
  const texto = f.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export function horaDe(ts) {
  const f = ts?.toDate ? ts.toDate() : null
  return f ? f.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''
}

export const normalizar = (s) =>
  (s || '').toString().trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Los datos de `usuarios` no siempre vienen limpios ("Mujeres", "RadGen MX", "ninos ",
// "lider "), así que el rol y el ministerio se comparan sin mayúsculas, acentos ni espacios.
// Pastores y administrativos ven todos los ministerios; un líder solo el suyo.
export function accesoPos(userData) {
  const rol = normalizar(userData?.rol)
  const directivo = ['pastor', 'administrativo'].includes(rol)
  const lider = rol === 'lider' && !!normalizar(userData?.ministerio)
  return { directivo, lider, permitido: directivo || lider }
}

// Id del ministerio de un usuario: acepta el id ("mujeres") o el nombre ("RadGen MX").
export function idMinisterioUsuario(userData, ministerios) {
  const n = normalizar(userData?.ministerio)
  if (!n) return null
  const ids = Object.keys(ministerios || {})
  return ids.find((id) => normalizar(id) === n) || ids.find((id) => normalizar(ministerios[id]?.nombre) === n) || null
}

export function puedeVerMinisterio(userData, ministerioId, ministerios) {
  const { directivo, lider } = accesoPos(userData)
  return directivo || (lider && idMinisterioUsuario(userData, ministerios) === ministerioId)
}

export function useMinisterios() {
  const [ministerios, setMinisterios] = useState({})
  const [cargado, setCargado] = useState(false)
  useEffect(() => {
    let vivo = true
    getDocs(collection(db, 'ministerios'))
      .then((snap) => {
        if (!vivo) return
        const datos = {}
        snap.forEach((d) => { datos[d.id] = d.data() })
        setMinisterios(datos)
      })
      .catch((err) => console.error('Error cargando ministerios:', err))
      .finally(() => vivo && setCargado(true))
    return () => { vivo = false }
  }, [])
  return { ministerios, cargado }
}

// Resumen de dinero de un conjunto de pedidos (los anulados no cuentan).
export function calcularCorte(pedidos) {
  const vivos = pedidos.filter((p) => p.estado !== 'anulado')
  const suma = (lista) => redondear(lista.reduce((a, p) => a + (p.total || 0), 0))
  const pagados = vivos.filter((p) => p.estado === 'pagado')
  const efectivo = pagados.filter((p) => p.metodo === 'efectivo')
  const transferencia = pagados.filter((p) => p.metodo === 'transferencia')
  const pendientes = vivos.filter((p) => p.estado === 'pendiente')

  const porVendedor = {}
  const porProducto = {}
  vivos.forEach((p) => {
    const v = p.vendedor || 'Sin vendedor'
    porVendedor[v] ||= { pedidos: 0, vendido: 0, cobrado: 0 }
    porVendedor[v].pedidos += 1
    porVendedor[v].vendido = redondear(porVendedor[v].vendido + p.total)
    if (p.estado === 'pagado') porVendedor[v].cobrado = redondear(porVendedor[v].cobrado + p.total)
    ;(p.items || []).forEach((it) => {
      const k = it.nombre
      porProducto[k] ||= { cantidad: 0, importe: 0 }
      porProducto[k].cantidad += it.cantidad
      porProducto[k].importe = redondear(porProducto[k].importe + it.cantidad * it.precio)
    })
  })

  return {
    pedidos: vivos.length,
    anulados: pedidos.length - vivos.length,
    vendido: suma(vivos),
    cobrado: suma(pagados),
    efectivo: suma(efectivo),
    transferencia: suma(transferencia),
    transferenciaSinVerificar: suma(transferencia.filter((p) => !p.verificado)),
    pendiente: suma(pendientes),
    pendientes: pendientes.length,
    porVendedor: Object.entries(porVendedor).sort((a, b) => b[1].vendido - a[1].vendido),
    porProducto: Object.entries(porProducto).sort((a, b) => b[1].cantidad - a[1].cantidad),
  }
}

export function resumenItems(items) {
  return (items || []).map((i) => `${i.cantidad}× ${i.nombre}`).join(', ')
}

// Limpia y valida la configuración antes de guardarla. Devuelve { datos } o { error }.
// ---- Combos: un producto con precio propio formado por otros productos de la misma venta ----
export const esCombo = (p) => Array.isArray(p?.combo)

// Lo que costarían los productos del combo por separado.
export function sumaComboSeparado(p, productos) {
  return redondear((p.combo || []).reduce((a, c) => a + (Number(productos.find((x) => x.id === c.productoId)?.precio) || 0) * (c.cantidad || 0), 0))
}

// Un combo se puede vender solo si todos sus productos están disponibles.
export const comboDisponible = (p, productos) => (p.combo || []).every((c) => { const x = productos.find((y) => y.id === c.productoId); return x && x.activo !== false })

export const textoCombo = (combo) => (combo || []).map((c) => `${c.cantidad > 1 ? `${c.cantidad}× ` : ''}${c.nombre}`).join(' + ')

// Copia productos con ids nuevos, conservando las referencias de los combos.
export function copiarProductos(productos) {
  const ids = Object.fromEntries((productos || []).map((p) => [p.id, nuevoId()]))
  return (productos || []).map((p) => ({
    ...p, id: ids[p.id], activo: true,
    ...(esCombo(p) ? { combo: p.combo.filter((c) => ids[c.productoId]).map((c) => ({ ...c, productoId: ids[c.productoId] })) } : {}),
  }))
}

export function prepararConfig(valor) {
  const productos = (valor.productos || [])
    .map((p) => ({ id: p.id, nombre: (p.nombre || '').trim(), precio: Number(p.precio), categoria: (p.categoria || '').trim() || 'Otros', activo: p.activo !== false, ...(esCombo(p) ? { combo: p.combo } : {}) }))
    .filter((p) => p.nombre || !Number.isNaN(p.precio))
  if (!(valor.nombre || '').trim()) return { error: 'Ponle un nombre.' }
  if (productos.length === 0) return { error: 'Agrega al menos un producto.' }
  if (productos.some((p) => !p.nombre)) return { error: 'Hay un producto sin nombre.' }
  if (productos.some((p) => Number.isNaN(p.precio) || p.precio < 0 || valor.productos.find((x) => x.id === p.id)?.precio === '')) {
    return { error: 'Hay un producto sin precio válido.' }
  }
  // Combos: cada uno necesita al menos un producto, y solo productos sueltos de esta misma lista.
  for (const p of productos.filter(esCombo)) {
    const sueltos = p.combo.filter((c) => c.cantidad > 0 && productos.some((x) => x.id === c.productoId && !esCombo(x) && x.id !== p.id))
    if (sueltos.length === 0) return { error: `El combo “${p.nombre}” necesita al menos un producto.` }
    p.combo = sueltos.map((c) => ({ productoId: c.productoId, nombre: productos.find((x) => x.id === c.productoId).nombre, cantidad: c.cantidad }))
  }
  return {
    datos: {
      nombre: valor.nombre.trim(),
      meta: (valor.meta || '').trim(),
      fondoInicial: Number(valor.fondoInicial) || 0,
      vendedores: valor.vendedores || [],
      productos,
    },
  }
}
