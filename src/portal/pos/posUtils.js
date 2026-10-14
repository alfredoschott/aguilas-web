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
  const porOpcion = {}
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
      ;(it.elegido || []).forEach((e) => {
        porOpcion[e.grupo] ||= {}
        porOpcion[e.grupo][e.nombre] = (porOpcion[e.grupo][e.nombre] || 0) + it.cantidad
      })
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
    porOpcion: Object.entries(porOpcion).map(([grupo, o]) => [grupo, Object.entries(o).sort((a, b) => b[1] - a[1])]),
  }
}

export function resumenItems(items) {
  return (items || []).map((i) => `${i.cantidad}× ${nombreItem(i)}`).join(', ')
}

// Limpia y valida la configuración antes de guardarla. Devuelve { datos } o { error }.
// ---- Combos: un producto con precio propio formado por otros productos de la misma venta ----
// combo:  [{ productoId, nombre, cantidad }]            → lo que incluye siempre
// grupos: [{ id, nombre, cantidad, opciones: [{ productoId, nombre, extra }] }] → lo que el cliente elige
export const esCombo = (p) => Array.isArray(p?.combo)
export const tieneElecciones = (p) => esCombo(p) && (p.grupos || []).length > 0

const productoDe = (productos, id) => (productos || []).find((x) => x.id === id)

// Lo que costarían por separado los productos fijos del combo.
export function sumaComboSeparado(p, productos) {
  return redondear((p.combo || []).reduce((a, c) => a + (Number(productoDe(productos, c.productoId)?.precio) || 0) * (c.cantidad || 0), 0))
}

// Rango [mínimo, máximo] de lo que sumarían por separado las opciones a elegir.
export function rangoOpcionesSeparado(p, productos) {
  let min = 0
  let max = 0
  for (const g of p.grupos || []) {
    const precios = (g.opciones || []).map((o) => Number(productoDe(productos, o.productoId)?.precio) || 0).sort((x, y) => x - y)
    if (precios.length === 0) continue
    const n = g.cantidad || 1
    min += precios.slice(0, n).reduce((a, x) => a + x, 0)
    max += precios.slice(-n).reduce((a, x) => a + x, 0)
  }
  return [redondear(min), redondear(max)]
}

export const opcionDisponible = (o, productos) => { const x = productoDe(productos, o.productoId); return !!x && x.activo !== false }

// Un combo se puede vender solo si están sus productos fijos y le quedan opciones suficientes en cada grupo.
export const comboDisponible = (p, productos) =>
  (p.combo || []).every((c) => opcionDisponible(c, productos))
  && (p.grupos || []).every((g) => (g.opciones || []).filter((o) => opcionDisponible(o, productos)).length >= (g.cantidad || 1))

export const textoCombo = (combo) => (combo || []).map((c) => `${c.cantidad > 1 ? `${c.cantidad}× ` : ''}${c.nombre}`).join(' + ')
export const textoGrupos = (grupos) => (grupos || []).map((g) => `${g.nombre} a elegir`).join(' + ')

// Descripción corta de lo que incluye un combo (fijo + a elegir).
export const incluyeCombo = (p) => [textoCombo(p.combo), textoGrupos(p.grupos)].filter(Boolean).join(' + ')

// Clave de una línea del carrito: el producto y, si es combo a elegir, lo elegido en cada grupo.
export function claveLinea(productoId, elec) {
  const partes = Object.keys(elec || {}).sort().map((g) => `${g}:${[...elec[g]].sort().join('+')}`)
  return partes.length ? `${productoId}~${partes.join(';')}` : productoId
}
export function leerClave(clave) {
  const [productoId, resto] = String(clave).split('~')
  const elec = {}
  if (resto) resto.split(';').forEach((s) => { const [g, ids] = s.split(':'); elec[g] = ids.split('+') })
  return { productoId, elec }
}
export const idProductoDeClave = (clave) => String(clave).split('~')[0]

// Lo elegido, en el orden de los grupos del combo.
export function elegidoDe(p, elec) {
  return (p.grupos || []).flatMap((g) => (elec?.[g.id] || []).map((id) => {
    const o = (g.opciones || []).find((x) => x.productoId === id)
    return o ? { grupo: g.nombre, nombre: o.nombre, extra: Number(o.extra) || 0 } : null
  }).filter(Boolean))
}
export const precioConElecciones = (p, elegido) => redondear(Number(p.precio) + (elegido || []).reduce((a, e) => a + (e.extra || 0), 0))

// Nombre completo de una línea de pedido, con lo elegido: "Combo Taco + Bebida (Refresco)".
export const nombreItem = (it) => (it.elegido?.length ? `${it.nombre} (${it.elegido.map((e) => e.nombre).join(', ')})` : it.nombre)
// Dos líneas del mismo producto son la misma línea solo si eligieron lo mismo.
export const claveItem = (it) => `${it.productoId}|${(it.elegido || []).map((e) => `${e.grupo}:${e.nombre}`).sort().join(',')}`

// Copia productos con ids nuevos, conservando las referencias de los combos.
export function copiarProductos(productos) {
  const ids = Object.fromEntries((productos || []).map((p) => [p.id, nuevoId()]))
  return (productos || []).map((p) => ({
    ...p, id: ids[p.id], activo: true,
    ...(esCombo(p) ? { combo: p.combo.filter((c) => ids[c.productoId]).map((c) => ({ ...c, productoId: ids[c.productoId] })) } : {}),
    ...(p.grupos ? { grupos: p.grupos.map((g) => ({ ...g, opciones: (g.opciones || []).filter((o) => ids[o.productoId]).map((o) => ({ ...o, productoId: ids[o.productoId] })) })) } : {}),
  }))
}

export function prepararConfig(valor) {
  const productos = (valor.productos || [])
    .map((p) => ({
      id: p.id, nombre: (p.nombre || '').trim(), precio: Number(p.precio), categoria: (p.categoria || '').trim() || 'Otros', activo: p.activo !== false,
      ...(esCombo(p) ? { combo: p.combo, ...((p.grupos || []).length ? { grupos: p.grupos } : {}) } : {}),
    }))
    .filter((p) => p.nombre || !Number.isNaN(p.precio))
  if (!(valor.nombre || '').trim()) return { error: 'Ponle un nombre.' }
  if (productos.length === 0) return { error: 'Agrega al menos un producto.' }
  if (productos.some((p) => !p.nombre)) return { error: 'Hay un producto sin nombre.' }
  if (productos.some((p) => Number.isNaN(p.precio) || p.precio < 0 || valor.productos.find((x) => x.id === p.id)?.precio === '')) {
    return { error: 'Hay un producto sin precio válido.' }
  }
  const suelto = (id, yo) => productos.find((x) => x.id === id && !esCombo(x) && x.id !== yo)
  // Combos: cada uno necesita algo fijo o algo a elegir, y solo con productos sueltos de esta misma lista.
  for (const p of productos.filter(esCombo)) {
    const fijos = p.combo.filter((c) => c.cantidad > 0 && suelto(c.productoId, p.id))
    const grupos = (p.grupos || []).map((g) => ({
      id: g.id, nombre: (g.nombre || '').trim(), cantidad: Math.max(1, Number(g.cantidad) || 1),
      opciones: (g.opciones || []).filter((o) => suelto(o.productoId, p.id)).map((o) => ({ productoId: o.productoId, nombre: suelto(o.productoId, p.id).nombre, extra: Math.max(0, Number(o.extra) || 0) })),
    }))
    if (fijos.length === 0 && grupos.length === 0) return { error: `El combo “${p.nombre}” necesita al menos un producto.` }
    for (const g of grupos) {
      if (!g.nombre) return { error: `Ponle nombre a lo que se elige en “${p.nombre}” (por ejemplo, “Bebida”).` }
      if (g.opciones.length < g.cantidad) return { error: `En “${p.nombre}”, “${g.nombre}” necesita al menos ${g.cantidad} opción${g.cantidad > 1 ? 'es' : ''}.` }
    }
    p.combo = fijos.map((c) => ({ productoId: c.productoId, nombre: suelto(c.productoId, p.id).nombre, cantidad: c.cantidad }))
    if (grupos.length) p.grupos = grupos
    else delete p.grupos
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
