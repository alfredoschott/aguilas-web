// Exportación del corte de una venta del POS (Excel y PDF) y del reporte general.
import { dinero, fechaLegible, horaDe, nombreItem } from './posUtils'
import {
  MARCA, PAGINA, aclarar, barraApilada, cabeceraCompacta, cargarLogo, encabezado, estiloTabla, hexARgb, leyenda, pies, seccion, tarjetaKpi,
} from './pdfMarca'

const ETIQUETA_ESTADO = { pagado: 'Pagado', pendiente: 'Por cobrar', anulado: 'Anulado' }
const ETIQUETA_METODO = { efectivo: 'Efectivo', transferencia: 'Transferencia' }

const fechaLarga = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) }
const slug = (t) => (t || 'pos').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const nombreArchivo = (venta) => `venta-${venta.fecha}-${slug(venta.nombre)}`
const horaCorta = (ts) => { const f = ts?.toDate ? ts.toDate() : null; return f ? f.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }) : '' }
const textoPago = (p) => {
  if (p.estado === 'pendiente') return 'Por cobrar'
  if (p.estado === 'anulado') return 'Anulado'
  if (p.metodo === 'transferencia') return p.verificado ? 'Transferencia' : 'Transf. sin verificar'
  return 'Efectivo'
}
const resumenPedido = (p) => (p.items || []).map((i) => `${i.cantidad}× ${nombreItem(i)}`).join(', ')
const porcentaje = (v, total) => (total > 0 ? `${Math.round((v / total) * 100)}%` : '0%')

/* ============================== EXCEL ============================== */

const FORMATO_DINERO = '"$"#,##0.00'

function hojaDesdeFilas(XLSX, filas, { anchos, dinero: columnasDinero = [] } = {}) {
  const hoja = XLSX.utils.json_to_sheet(filas)
  if (filas.length) {
    const claves = Object.keys(filas[0])
    hoja['!cols'] = claves.map((k, i) => ({ wch: anchos?.[i] ?? Math.max(k.length + 2, 12) }))
    const rango = XLSX.utils.decode_range(hoja['!ref'])
    for (let r = rango.s.r + 1; r <= rango.e.r; r += 1) {
      claves.forEach((k, c) => {
        const celda = hoja[XLSX.utils.encode_cell({ r, c })]
        if (celda && columnasDinero.includes(k) && typeof celda.v === 'number') celda.z = FORMATO_DINERO
      })
    }
    hoja['!freeze'] = { xSplit: 0, ySplit: 1 }
  }
  return hoja
}

export async function exportarVentaExcel(venta, pedidos, corte, ministerioNombre) {
  const XLSX = await import('xlsx')
  const libro = XLSX.utils.book_new()

  const filasResumen = [
    ['CORTE DE VENTA — Águilas Centro Familiar Cristiano'], [],
    ['Venta', venta.nombre], ['Ministerio', ministerioNombre || venta.ministerio], ['Fecha', fechaLegible(venta.fecha)],
    ['Para qué se junta', venta.meta || '—'], ['Estado', venta.estado === 'cerrada' ? 'Cerrada' : 'Abierta'], [],
    ['Pedidos', corte.pedidos], ['Vendido', corte.vendido], ['Cobrado', corte.cobrado], ['Por cobrar', corte.pendiente], [],
    ['Efectivo cobrado', corte.efectivo], ['Fondo de caja', venta.fondoInicial || 0],
    ['Efectivo que debe haber en caja', corte.efectivo + (venta.fondoInicial || 0)],
    ['Transferencias', corte.transferencia], ['Transferencias sin verificar', corte.transferenciaSinVerificar],
  ]
  const resumen = XLSX.utils.aoa_to_sheet(filasResumen)
  resumen['!cols'] = [{ wch: 34 }, { wch: 40 }]
  const monetarias = new Set(['Vendido', 'Cobrado', 'Por cobrar', 'Efectivo cobrado', 'Fondo de caja', 'Efectivo que debe haber en caja', 'Transferencias', 'Transferencias sin verificar'])
  filasResumen.forEach((f, r) => { if (monetarias.has(f[0])) resumen[XLSX.utils.encode_cell({ r, c: 1 })].z = FORMATO_DINERO })
  XLSX.utils.book_append_sheet(libro, resumen, 'Resumen')

  const pedidosFilas = [...pedidos].sort((a, b) => (a.folio || 0) - (b.folio || 0)).map((p) => ({
    Folio: p.folio, Hora: horaDe(p.creadoEn), Cliente: p.cliente, Pedido: resumenPedido(p), Total: p.total,
    Estado: ETIQUETA_ESTADO[p.estado] || p.estado, 'Forma de pago': ETIQUETA_METODO[p.metodo] || '',
    'Transferencia verificada': p.metodo === 'transferencia' ? (p.verificado ? 'Sí' : 'No') : '', Vendedor: p.vendedor || '',
  }))
  XLSX.utils.book_append_sheet(libro, hojaDesdeFilas(XLSX, pedidosFilas, { anchos: [8, 10, 24, 46, 12, 13, 16, 22, 16], dinero: ['Total'] }), 'Pedidos')
  XLSX.utils.book_append_sheet(libro, hojaDesdeFilas(XLSX, corte.porProducto.map(([Producto, v]) => ({ Producto, Cantidad: v.cantidad, Importe: v.importe })), { anchos: [30, 10, 14], dinero: ['Importe'] }), 'Productos')
  if (corte.porOpcion.length) XLSX.utils.book_append_sheet(libro, hojaDesdeFilas(XLSX, corte.porOpcion.flatMap(([Elección, ops]) => ops.map(([Opción, Cantidad]) => ({ Elección, Opción, Cantidad }))), { anchos: [22, 28, 10] }), 'Opciones')
  XLSX.utils.book_append_sheet(libro, hojaDesdeFilas(XLSX, corte.porVendedor.map(([Vendedor, v]) => ({ Vendedor, Pedidos: v.pedidos, Vendido: v.vendido, Cobrado: v.cobrado })), { anchos: [24, 10, 14, 14], dinero: ['Vendido', 'Cobrado'] }), 'Vendedores')
  XLSX.writeFile(libro, `${nombreArchivo(venta)}.xlsx`)
}

/* ============================== PDF: CORTE ============================== */

export async function exportarVentaPDF(venta, pedidos, corte, ministerioNombre, colorMinisterio) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const logo = await cargarLogo()
  const color = hexARgb(colorMinisterio)
  const ministerio = ministerioNombre || venta.ministerio
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const { margen, util, limite } = PAGINA

  const conCabecera = new Set([1])
  const compacta = () => cabeceraCompacta(doc, { logo, color, texto: `${venta.nombre} · ${ministerio}` })
  const nuevaPagina = () => { doc.addPage(); conCabecera.add(doc.getNumberOfPages()); compacta(); return 22 }
  const asegurar = (y, necesario) => (y + necesario > limite ? nuevaPagina() : y)
  const tabla = (opciones) => autoTable(doc, estiloTabla(color, {
    ...opciones,
    didDrawPage: (d) => { if (!conCabecera.has(d.pageNumber)) { conCabecera.add(d.pageNumber); compacta() } },
  }))

  let y = encabezado(doc, {
    logo, color, estado: venta.estado, etiqueta: 'Corte de venta', titulo: venta.nombre,
    subtitulo: `${ministerio}  ·  ${fechaLegible(venta.fecha)}${venta.meta ? `  ·  ${venta.meta}` : ''}`,
  })

  // Cifras principales
  const gap = 4
  const w = (util - gap * 3) / 4
  const kpis = [
    { etiqueta: 'Vendido', valor: dinero(corte.vendido), nota: `${corte.pedidos} pedido${corte.pedidos === 1 ? '' : 's'}`, color: MARCA.negro },
    { etiqueta: 'Cobrado', valor: dinero(corte.cobrado), nota: porcentaje(corte.cobrado, corte.vendido) + ' de lo vendido', color: MARCA.verde, valorColor: MARCA.verdeOscuro },
    { etiqueta: 'Por cobrar', valor: dinero(corte.pendiente), nota: `${corte.pendientes} pedido${corte.pendientes === 1 ? '' : 's'}`, color: MARCA.ambar, valorColor: corte.pendiente > 0 ? MARCA.ambarOscuro : MARCA.texto },
    { etiqueta: 'Ticket promedio', valor: dinero(corte.pedidos ? corte.vendido / corte.pedidos : 0), nota: corte.anulados ? `${corte.anulados} anulado${corte.anulados > 1 ? 's' : ''}` : 'por pedido', color: color },
  ]
  kpis.forEach((k, i) => tarjetaKpi(doc, margen + i * (w + gap), y, w, 23, k))
  y += 23 + 7

  // Efectivo en caja
  const caja = corte.efectivo + (venta.fondoInicial || 0)
  doc.setFillColor(...aclarar(MARCA.verde, 0.88))
  doc.setDrawColor(...aclarar(MARCA.verde, 0.45))
  doc.setLineWidth(0.3)
  doc.roundedRect(margen, y, util, 24, 2.6, 2.6, 'FD')
  doc.setFillColor(...MARCA.verde)
  doc.roundedRect(margen, y + 3, 1.5, 18, 0.7, 0.7, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...MARCA.verdeOscuro)
  doc.text('EFECTIVO QUE DEBE HABER EN CAJA', margen + 6, y + 8, { charSpace: 0.6 })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.2); doc.setTextColor(...MARCA.gris)
  doc.text(`Cobrado en efectivo ${dinero(corte.efectivo)}${venta.fondoInicial > 0 ? `   +   Fondo de caja ${dinero(venta.fondoInicial)}` : ''}`, margen + 6, y + 16.5)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(23); doc.setTextColor(...MARCA.verdeOscuro)
  doc.text(dinero(caja), margen + util - 6, y + 15.5, { align: 'right' })
  y += 24 + 9

  // ¿Cómo se pagó?
  y = seccion(doc, y, '¿Cómo se pagó?', color)
  y += 1
  barraApilada(doc, margen, y, util, 4.2, [
    { valor: corte.efectivo, color: MARCA.verde }, { valor: corte.transferencia, color: MARCA.azul }, { valor: corte.pendiente, color: MARCA.ambar },
  ])
  y += 10
  leyenda(doc, margen, y, [
    { color: MARCA.verde, texto: 'Efectivo', detalle: `  ${dinero(corte.efectivo)} (${porcentaje(corte.efectivo, corte.vendido)})` },
    { color: MARCA.azul, texto: 'Transferencia', detalle: `  ${dinero(corte.transferencia)} (${porcentaje(corte.transferencia, corte.vendido)})` },
    { color: MARCA.ambar, texto: 'Por cobrar', detalle: `  ${dinero(corte.pendiente)} (${porcentaje(corte.pendiente, corte.vendido)})` },
  ])
  y += 4
  if (corte.transferenciaSinVerificar > 0) {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(7.6); doc.setTextColor(...MARCA.ambarOscuro)
    doc.text(`Atención: ${dinero(corte.transferenciaSinVerificar)} en transferencias todavía sin verificar.`, margen, y + 3)
    y += 5
  }
  y += 8

  // Productos y vendedores, lado a lado
  y = asegurar(y, 105)
  const mitad = (util - 8) / 2
  seccion(doc, y, 'Lo más vendido', color, { x: margen, w: mitad })
  seccion(doc, y, 'Por vendedor', color, { x: margen + mitad + 8, w: mitad })
  const yTablas = y + 4
  const derecha = (d) => { if (d.section === 'head' && d.column.index > 0) d.cell.styles.halign = 'right' }
  tabla({
    startY: yTablas, tableWidth: mitad, margin: { left: margen, right: margen + mitad + 8, top: 20, bottom: 20 },
    head: [['Producto', 'Cant.', 'Importe', '%']],
    body: corte.porProducto.length ? corte.porProducto.slice(0, 12).map(([n, v]) => [n, String(v.cantidad), dinero(v.importe), porcentaje(v.importe, corte.vendido)]) : [['Sin ventas', '', '', '']],
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right', textColor: MARCA.gris } },
    didParseCell: derecha,
  })
  const finProductos = doc.lastAutoTable.finalY
  tabla({
    startY: yTablas, tableWidth: mitad, margin: { left: margen + mitad + 8, right: margen, top: 20, bottom: 20 },
    head: [['Vendedor', 'Pedidos', 'Vendió', 'Cobrado']],
    body: corte.porVendedor.length ? corte.porVendedor.map(([n, v]) => [n, String(v.pedidos), dinero(v.vendido), dinero(v.cobrado)]) : [['Sin ventas', '', '', '']],
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    didParseCell: derecha,
  })
  y = Math.max(finProductos, doc.lastAutoTable.finalY) + 10

  // Opciones elegidas en combos (si hay)
  if (corte.porOpcion.length) {
    const filasOpc = corte.porOpcion.flatMap(([grupo, ops]) => ops.map(([n, c]) => [grupo, n, String(c)]))
    y = asegurar(y, Math.min(16 + 8 * (filasOpc.length + 1), 100))
    y = seccion(doc, y, 'Opciones elegidas en los combos', color)
    tabla({
      startY: y + 1, tableWidth: 110,
      head: [['Elección', 'Opción', 'Cant.']], body: filasOpc,
      columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } },
      didParseCell: (d) => { if (d.section === 'head' && d.column.index === 2) d.cell.styles.halign = 'right' },
    })
    y = doc.lastAutoTable.finalY + 10
  }

  // Pendientes de cobro (si hay)
  const pendientes = pedidos.filter((p) => p.estado === 'pendiente').sort((a, b) => (a.cliente || '').localeCompare(b.cliente || ''))
  if (pendientes.length) {
    y = asegurar(y, Math.min(16 + 8.2 * (pendientes.length + 2), 120))
    y = seccion(doc, y, `Pendientes de cobro  ·  ${dinero(corte.pendiente)}`, MARCA.ambar)
    tabla({
      startY: y + 1,
      head: [['#', 'Cliente', 'Pedido', 'Debe']],
      body: pendientes.map((p) => [String(p.folio), p.cliente, resumenPedido(p), dinero(p.total)]),
      foot: [['', 'Total por cobrar', '', dinero(corte.pendiente)]],
      showFoot: 'lastPage',
      headStyles: { fillColor: MARCA.ambarOscuro },
      footStyles: { fillColor: aclarar(MARCA.ambar, 0.8), textColor: MARCA.texto, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 10, textColor: MARCA.gris }, 3: { halign: 'right', fontStyle: 'bold', cellWidth: 26 } },
      didParseCell: (d) => { if (d.column.index === 3 && d.section !== 'body') d.cell.styles.halign = 'right' },
    })
    y = doc.lastAutoTable.finalY + 10
  }

  // Detalle de pedidos
  y = asegurar(y, 30)
  y = seccion(doc, y, 'Detalle de pedidos', color)
  const ordenados = [...pedidos].sort((a, b) => (a.folio || 0) - (b.folio || 0))
  tabla({
    startY: y + 1,
    head: [['#', 'Hora', 'Cliente', 'Pedido', 'Total', 'Pago', 'Vendió']],
    body: ordenados.map((p) => [String(p.folio), horaCorta(p.creadoEn), p.cliente, resumenPedido(p), dinero(p.total), textoPago(p), p.vendedor || '']),
    styles: { fontSize: 7.9 },
    columnStyles: { 0: { cellWidth: 9, textColor: MARCA.gris }, 1: { cellWidth: 13, textColor: MARCA.gris }, 4: { halign: 'right', fontStyle: 'bold', cellWidth: 20 }, 5: { cellWidth: 33 }, 6: { cellWidth: 20 } },
    didParseCell: (d) => {
      if (d.section === 'head' && d.column.index === 4) d.cell.styles.halign = 'right'
      if (d.section !== 'body') return
      const p = ordenados[d.row.index]
      if (d.column.index === 5) {
        d.cell.styles.fontStyle = 'bold'
        d.cell.styles.textColor = p.estado === 'pagado' ? (p.metodo === 'transferencia' ? MARCA.azulOscuro : MARCA.verdeOscuro) : p.estado === 'pendiente' ? MARCA.ambarOscuro : MARCA.gris
      }
      if (p.estado === 'anulado') d.cell.styles.textColor = [160, 160, 160]
    },
  })

  pies(doc, { ministerio, color, textoIzquierdo: 'Corte de venta' })
  doc.save(`${nombreArchivo(venta)}.pdf`)
}

/* ============================== PDF: REPORTE GENERAL ============================== */

export async function exportarReportePDF({ ministerioNombre, colorMinisterio, ventas, cortes, deudores }) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const logo = await cargarLogo()
  const color = hexARgb(colorMinisterio)
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const { margen, util, limite } = PAGINA

  const filas = ventas.map((v) => ({ v, c: cortes[v.id] })).filter((f) => f.c)
  const total = filas.reduce((a, { c }) => ({ vendido: a.vendido + c.vendido, cobrado: a.cobrado + c.cobrado, pendiente: a.pendiente + c.pendiente, pedidos: a.pedidos + c.pedidos, efectivo: a.efectivo + c.efectivo, transferencia: a.transferencia + c.transferencia }), { vendido: 0, cobrado: 0, pendiente: 0, pedidos: 0, efectivo: 0, transferencia: 0 })
  const desde = filas.at(-1)?.v.fecha
  const hasta = filas[0]?.v.fecha

  const conCabecera = new Set([1])
  const compacta = () => cabeceraCompacta(doc, { logo, color, texto: `Reporte de ventas · ${ministerioNombre}` })
  const nuevaPagina = () => { doc.addPage(); conCabecera.add(doc.getNumberOfPages()); compacta(); return 22 }
  const asegurar = (y, n) => (y + n > limite ? nuevaPagina() : y)
  const tabla = (o) => autoTable(doc, estiloTabla(color, { ...o, didDrawPage: (d) => { if (!conCabecera.has(d.pageNumber)) { conCabecera.add(d.pageNumber); compacta() } } }))

  let y = encabezado(doc, {
    logo, color, etiqueta: 'Reporte de ventas', titulo: ministerioNombre,
    subtitulo: desde ? `Del ${fechaLarga(desde)} al ${fechaLarga(hasta)}  ·  ${filas.length} venta${filas.length === 1 ? '' : 's'}` : 'Sin ventas registradas',
  })

  const gap = 4
  const w = (util - gap * 3) / 4
  ;[
    { etiqueta: 'Total vendido', valor: dinero(total.vendido), nota: `${total.pedidos} pedidos`, color: MARCA.negro },
    { etiqueta: 'Cobrado', valor: dinero(total.cobrado), nota: porcentaje(total.cobrado, total.vendido) + ' de lo vendido', color: MARCA.verde, valorColor: MARCA.verdeOscuro },
    { etiqueta: 'Por cobrar', valor: dinero(total.pendiente), nota: `${deudores.length} persona${deudores.length === 1 ? '' : 's'}`, color: MARCA.ambar, valorColor: total.pendiente > 0 ? MARCA.ambarOscuro : MARCA.texto },
    { etiqueta: 'Promedio por venta', valor: dinero(filas.length ? total.vendido / filas.length : 0), nota: 'por jornada', color },
  ].forEach((k, i) => tarjetaKpi(doc, margen + i * (w + gap), y, w, 23, k))
  y += 23 + 9

  // Gráfica de barras de las últimas ventas
  const serie = filas.slice(0, 8).reverse()
  if (serie.length) {
    y = seccion(doc, y, 'Últimas ventas', color)
    const altoGrafica = 38
    const base = y + 3 + altoGrafica
    const max = Math.max(1, ...serie.map(({ c }) => c.cobrado + c.pendiente))
    const paso = util / serie.length
    const ancho = Math.min(16, paso * 0.58)
    doc.setDrawColor(...MARCA.linea); doc.setLineWidth(0.2)
    doc.line(margen, base, margen + util, base)
    serie.forEach(({ v, c }, i) => {
      const x = margen + i * paso + (paso - ancho) / 2
      const hCob = (c.cobrado / max) * altoGrafica
      const hPen = (c.pendiente / max) * altoGrafica
      doc.setFillColor(...color); doc.rect(x, base - hCob, ancho, hCob, 'F')
      if (hPen > 0) {
        doc.setFillColor(...aclarar(MARCA.ambar, 0.62)); doc.setDrawColor(...MARCA.ambarOscuro); doc.setLineWidth(0.35)
        doc.rect(x, base - hCob - hPen, ancho, hPen, 'FD')
      }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.8); doc.setTextColor(...MARCA.texto)
      doc.text(dinero(c.cobrado + c.pendiente), x + ancho / 2, base - hCob - hPen - 1.6, { align: 'center' })
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8); doc.setTextColor(...MARCA.gris)
      const [, m, d] = v.fecha.split('-')
      doc.text(`${Number(d)}/${m}`, x + ancho / 2, base + 4, { align: 'center' })
    })
    y = base + 13
    leyenda(doc, margen, y, [{ color, texto: 'Cobrado', detalle: '' }, { color: aclarar(MARCA.ambar, 0.62), texto: 'Por cobrar (parte sin cobrar de cada venta)', detalle: '' }])
    y += 10
  }

  y = asegurar(y, 30)
  y = seccion(doc, y, 'Todas las ventas', color)
  tabla({
    startY: y + 1,
    head: [['Fecha', 'Venta', 'Pedidos', 'Vendido', 'Efectivo', 'Transf.', 'Por cobrar']],
    body: filas.map(({ v, c }) => [v.fecha, v.estado === 'cerrada' ? v.nombre : `${v.nombre} (abierta)`, String(c.pedidos), dinero(c.vendido), dinero(c.efectivo), dinero(c.transferencia), dinero(c.pendiente)]),
    foot: [['', 'Total', String(total.pedidos), dinero(total.vendido), dinero(total.efectivo), dinero(total.transferencia), dinero(total.pendiente)]],
    showFoot: 'lastPage',
    styles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 21, textColor: MARCA.gris }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } },
    didParseCell: (d) => {
      if (d.column.index >= 2 && d.section !== 'body') d.cell.styles.halign = 'right'
      if (d.section === 'body' && d.column.index === 6 && d.cell.raw !== dinero(0)) d.cell.styles.textColor = MARCA.ambarOscuro
    },
  })
  y = doc.lastAutoTable.finalY + 10

  if (deudores.length) {
    y = asegurar(y, 30)
    y = seccion(doc, y, `Por cobrar por persona  ·  ${dinero(total.pendiente)}`, MARCA.ambar)
    tabla({
      startY: y + 1,
      head: [['Persona', 'Pedidos', 'Debe']],
      body: deudores.map((d) => [d.cliente, String(d.pedidos.length), dinero(d.total)]),
      headStyles: { fillColor: MARCA.ambarOscuro },
      columnStyles: { 1: { halign: 'right', cellWidth: 24 }, 2: { halign: 'right', fontStyle: 'bold', cellWidth: 32, textColor: MARCA.ambarOscuro } },
      didParseCell: (d) => { if (d.section === 'head' && d.column.index > 0) d.cell.styles.halign = 'right' },
    })
  }

  pies(doc, { ministerio: ministerioNombre, color, textoIzquierdo: 'Reporte de ventas' })
  doc.save(`reporte-ventas-${slug(ministerioNombre)}.pdf`)
}

/* ============================== EXCEL: REPORTE ============================== */

export async function exportarReporteExcel({ ventas, cortes, ministerio }) {
  const XLSX = await import('xlsx')
  const libro = XLSX.utils.book_new()
  const filas = ventas.map((v) => {
    const c = cortes[v.id]
    return { Fecha: v.fecha, Venta: v.nombre, Estado: v.estado === 'cerrada' ? 'Cerrada' : 'Abierta', Pedidos: c?.pedidos || 0, Vendido: c?.vendido || 0, Efectivo: c?.efectivo || 0, Transferencia: c?.transferencia || 0, 'Por cobrar': c?.pendiente || 0 }
  })
  XLSX.utils.book_append_sheet(libro, hojaDesdeFilas(XLSX, filas, { anchos: [12, 30, 10, 10, 14, 14, 15, 14], dinero: ['Vendido', 'Efectivo', 'Transferencia', 'Por cobrar'] }), 'Ventas')
  XLSX.writeFile(libro, `reporte-pos-${slug(ministerio)}.xlsx`)
}
