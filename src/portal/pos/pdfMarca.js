// Kit de marca para los PDF del POS: banda oscura con logo, barra de acento del
// ministerio, tarjetas de cifras, barra apilada, tablas y pie con paginación.
// Mismos colores que el portal (negro, verde #3DDC04, color del ministerio).

export const MARCA = {
  verde: [61, 220, 4],
  verdeOscuro: [30, 142, 14],
  negro: [10, 10, 10],
  texto: [28, 28, 28],
  gris: [112, 112, 112],
  grisClaro: [246, 246, 246],
  linea: [228, 228, 228],
  ambar: [245, 184, 61],
  ambarOscuro: [168, 108, 12],
  azul: [90, 176, 255],
  azulOscuro: [29, 106, 196],
}

export const PAGINA = { ancho: 210, alto: 297, margen: 14, util: 182, limite: 276 }

export function hexARgb(hex, respaldo = MARCA.verde) {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim())
  if (!m) return respaldo
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// Mezcla un color con blanco (t = 0..1) para fondos suaves.
export const aclarar = (rgb, t) => rgb.map((c) => Math.round(c + (255 - c) * t))

// Oscurece un color con tal de que el texto sea legible sobre blanco.
export const oscurecer = (rgb, t = 0.35) => rgb.map((c) => Math.round(c * (1 - t)))

export async function cargarLogo(px = 256) {
  try {
    const img = await new Promise((ok, fallo) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = fallo
      i.src = '/ACFC.png'
    })
    const lienzo = document.createElement('canvas')
    lienzo.width = px
    lienzo.height = px
    lienzo.getContext('2d').drawImage(img, 0, 0, px, px)
    return lienzo.toDataURL('image/png')
  } catch {
    return null
  }
}

const fill = (doc, c) => doc.setFillColor(c[0], c[1], c[2])
const draw = (doc, c) => doc.setDrawColor(c[0], c[1], c[2])
const ink = (doc, c) => doc.setTextColor(c[0], c[1], c[2])

// Banda principal de la primera página. Devuelve la y donde empieza el contenido.
export function encabezado(doc, { logo, etiqueta, titulo, subtitulo, color, estado }) {
  const { ancho, margen } = PAGINA
  fill(doc, MARCA.negro)
  doc.rect(0, 0, ancho, 40, 'F')
  fill(doc, color)
  doc.rect(0, 40, ancho, 1.8, 'F')

  if (logo) doc.addImage(logo, 'PNG', margen, 8, 24, 24)

  const x = logo ? margen + 31 : margen
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  ink(doc, MARCA.verde)
  doc.text(etiqueta.toUpperCase(), x, 14, { charSpace: 0.9 })

  doc.setFontSize(18)
  ink(doc, [255, 255, 255])
  const lineas = doc.splitTextToSize(titulo, ancho - x - 52)
  doc.text(lineas.slice(0, 2), x, 22.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  ink(doc, [170, 170, 170])
  const yS = lineas.length > 1 ? 34 : 29.5
  doc.text(doc.splitTextToSize(subtitulo, ancho - x - 52).slice(0, 1), x, yS)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  ink(doc, [150, 150, 150])
  doc.text('ÁGUILAS', ancho - margen, 14, { align: 'right', charSpace: 1.2 })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.text('Centro Familiar Cristiano', ancho - margen, 18, { align: 'right' })

  if (estado) {
    const abierta = estado === 'abierta'
    const texto = abierta ? 'VENTA ABIERTA' : 'VENTA CERRADA'
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    const w = doc.getTextWidth(texto) + texto.length * 0.4 + 9
    fill(doc, abierta ? [20, 70, 8] : [50, 50, 50])
    doc.roundedRect(ancho - margen - w, 26, w, 6.4, 3.2, 3.2, 'F')
    ink(doc, abierta ? MARCA.verde : [190, 190, 190])
    doc.text(texto, ancho - margen - w / 2, 30.3, { align: 'center', charSpace: 0.4 })
  }
  return 50
}

// Banda delgada para las páginas siguientes.
export function cabeceraCompacta(doc, { logo, texto, color }) {
  const { ancho, margen } = PAGINA
  fill(doc, MARCA.negro)
  doc.rect(0, 0, ancho, 12, 'F')
  fill(doc, color)
  doc.rect(0, 12, ancho, 1, 'F')
  if (logo) doc.addImage(logo, 'PNG', margen, 2.2, 7.6, 7.6)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  ink(doc, [255, 255, 255])
  doc.text(texto, margen + (logo ? 11 : 0), 7.4)
}

// Título de sección con cuadrito de color y línea fina (ancho y posición opcionales).
export function seccion(doc, y, texto, color, { x = PAGINA.margen, w = PAGINA.util } = {}) {
  fill(doc, color)
  doc.roundedRect(x, y - 3.6, 2.2, 5.2, 0.8, 0.8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  ink(doc, MARCA.texto)
  doc.text(texto, x + 5, y + 0.4)
  draw(doc, MARCA.linea)
  doc.setLineWidth(0.25)
  const finTexto = x + 6 + doc.getTextWidth(texto)
  if (finTexto < x + w) doc.line(finTexto, y - 0.6, x + w, y - 0.6)
  return y + 5
}

export function tarjetaKpi(doc, x, y, w, h, { etiqueta, valor, nota, color, valorColor }) {
  fill(doc, MARCA.grisClaro)
  draw(doc, MARCA.linea)
  doc.setLineWidth(0.25)
  doc.roundedRect(x, y, w, h, 2.4, 2.4, 'FD')
  fill(doc, color)
  doc.roundedRect(x, y + 3, 1.3, h - 6, 0.6, 0.6, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  ink(doc, MARCA.gris)
  doc.text(etiqueta.toUpperCase(), x + 5, y + 6.4, { charSpace: 0.5 })
  doc.setFontSize(14.5)
  ink(doc, valorColor || MARCA.texto)
  doc.text(valor, x + 5, y + 14.6)
  if (nota) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.8)
    ink(doc, MARCA.gris)
    doc.text(nota, x + 5, y + h - 2.6)
  }
}

// Barra apilada [{ valor, color }] con pequeños separadores blancos.
export function barraApilada(doc, x, y, w, h, segmentos) {
  fill(doc, [235, 235, 235])
  doc.rect(x, y, w, h, 'F')
  const total = segmentos.reduce((a, s) => a + s.valor, 0)
  if (total <= 0) return
  let cursor = x
  segmentos.filter((s) => s.valor > 0).forEach((s, i) => {
    const ancho = (s.valor / total) * w
    fill(doc, s.color)
    doc.rect(cursor, y, ancho, h, 'F')
    if (i > 0) { fill(doc, [255, 255, 255]); doc.rect(cursor - 0.3, y, 0.6, h, 'F') }
    cursor += ancho
  })
}

export function leyenda(doc, x, y, items) {
  doc.setFontSize(7.8)
  let cursor = x
  items.forEach((it) => {
    fill(doc, it.color)
    doc.circle(cursor + 1.3, y - 1, 1.3, 'F')
    doc.setFont('helvetica', 'bold')
    ink(doc, MARCA.texto)
    doc.text(it.texto, cursor + 4.2, y)
    const w = doc.getTextWidth(it.texto)
    doc.setFont('helvetica', 'normal')
    ink(doc, MARCA.gris)
    doc.text(it.detalle, cursor + 5 + w, y)
    cursor += 5 + w + doc.getTextWidth(it.detalle) + 9
  })
}

// Opciones base de jspdf-autotable con el estilo de marca.
export function estiloTabla(color, extra = {}) {
  return {
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 8.4, cellPadding: { top: 2.3, bottom: 2.3, left: 2.6, right: 2.6 }, textColor: MARCA.texto, lineColor: MARCA.linea, lineWidth: { bottom: 0.2 }, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: MARCA.negro, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.2, lineWidth: 0, cellPadding: { top: 2.8, bottom: 2.8, left: 2.6, right: 2.6 } },
    footStyles: { fillColor: aclarar(color, 0.82), textColor: MARCA.texto, fontStyle: 'bold', lineWidth: 0 },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: PAGINA.margen, right: PAGINA.margen, top: 20, bottom: 20 },
    ...extra,
  }
}

// Pie de todas las páginas: línea de acento, institución y paginación.
export function pies(doc, { ministerio, color, textoIzquierdo }) {
  const total = doc.getNumberOfPages()
  const { ancho, alto, margen } = PAGINA
  const fecha = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })
  for (let p = 1; p <= total; p += 1) {
    doc.setPage(p)
    fill(doc, color)
    doc.rect(margen, alto - 15, 18, 0.9, 'F')
    draw(doc, MARCA.linea)
    doc.setLineWidth(0.25)
    doc.line(margen + 18, alto - 14.55, ancho - margen, alto - 14.55)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    ink(doc, MARCA.texto)
    doc.text('Águilas Centro Familiar Cristiano', margen, alto - 10)
    doc.setFont('helvetica', 'normal')
    ink(doc, MARCA.gris)
    doc.text(`${ministerio} · ${textoIzquierdo} · Generado el ${fecha}`, margen, alto - 6.4)
    doc.text(`Página ${p} de ${total}`, ancho - margen, alto - 6.4, { align: 'right' })
  }
}
