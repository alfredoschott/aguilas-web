// Resumen de una serie terminada, estilo "Wrapped": una imagen 1080x1920
// para historias con los números de cómo le fue al joven en esa serie.
import skyLogrado from '../../assets/sky-logrado.webp'

function rect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function cargarImagen(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function ajustarTexto(ctx, texto, maxAncho, tamaño, peso = 900) {
  let t = tamaño
  ctx.font = `${peso} ${t}px Montserrat, sans-serif`
  while (ctx.measureText(texto).width > maxAncho && t > 36) {
    t -= 4
    ctx.font = `${peso} ${t}px Montserrat, sans-serif`
  }
}

export async function generarWrappedSerie({ nombreJoven, resumen }) {
  if (document.fonts) {
    await Promise.all([document.fonts.load('900 60px Montserrat'), document.fonts.load('700 40px Inter')]).catch(() => {})
  }

  const W = 1080
  const H = 1920
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  const ink = '#0F0F12'
  const paper = '#F5F3EE'
  const colores = ['#3a7bff', '#FF3B3B', '#e3a234', '#34a853', '#9333e3', '#14b8a6']

  // Fondo con degradado diagonal y círculos de color, más "fiesta" que las
  // tarjetas normales — es un resumen para presumir.
  const fondo = ctx.createLinearGradient(0, 0, W, H)
  fondo.addColorStop(0, '#1a1440')
  fondo.addColorStop(0.55, '#101014')
  fondo.addColorStop(1, '#2a0f18')
  ctx.fillStyle = fondo
  ctx.fillRect(0, 0, W, H)
  ;[
    [120, 260, 220, colores[0]],
    [960, 520, 180, colores[1]],
    [980, 1640, 260, colores[4]],
    [80, 1500, 160, colores[2]],
  ].forEach(([x, y, r, c]) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `${c}66`)
    g.addColorStop(1, `${c}00`)
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  })

  ctx.textAlign = 'center'
  ctx.fillStyle = paper
  ctx.font = '900 34px Montserrat, sans-serif'
  ctx.fillText('RADGEN EDUCATION · RESUMEN', W / 2, 120)

  ctx.font = '700 40px Inter, sans-serif'
  ctx.fillStyle = 'rgba(245,243,238,0.75)'
  ctx.fillText(`${nombreJoven} terminó`, W / 2, 230)

  ctx.fillStyle = paper
  ajustarTexto(ctx, resumen.serieTitulo.toUpperCase(), W - 140, 84)
  ctx.fillText(resumen.serieTitulo.toUpperCase(), W / 2, 330)

  const stats = [
    { valor: resumen.capsulas, etiqueta: resumen.capsulas === 1 ? 'cápsula' : 'cápsulas' },
    { valor: `${resumen.xp}`, etiqueta: 'XP ganada' },
    {
      valor: resumen.preguntas ? `${Math.round((resumen.correctas / resumen.preguntas) * 100)}%` : '—',
      etiqueta: 'aciertos en quiz',
    },
    { valor: `${resumen.aTiempo}/${resumen.capsulas}`, etiqueta: 'a tiempo' },
    { valor: resumen.dias, etiqueta: resumen.dias === 1 ? 'día' : 'días' },
    { valor: resumen.versiculos, etiqueta: resumen.versiculos === 1 ? 'versículo memorizado' : 'versículos memorizados' },
  ]

  const colW = 420
  const colH = 250
  const gapX = 40
  const gapY = 40
  const x0 = (W - colW * 2 - gapX) / 2
  const y0 = 430
  stats.forEach((s, i) => {
    const col = i % 2
    const fila = Math.floor(i / 2)
    const x = x0 + col * (colW + gapX)
    const y = y0 + fila * (colH + gapY)
    const color = colores[i % colores.length]
    ctx.fillStyle = color
    rect(ctx, x + 12, y + 12, colW, colH, 32)
    ctx.fill()
    ctx.fillStyle = paper
    ctx.strokeStyle = ink
    ctx.lineWidth = 8
    rect(ctx, x, y, colW, colH, 32)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = ink
    ajustarTexto(ctx, String(s.valor), colW - 60, 110)
    ctx.fillText(String(s.valor), x + colW / 2, y + 140)
    ctx.font = '700 30px Inter, sans-serif'
    ctx.fillStyle = 'rgba(15,15,18,0.7)'
    ctx.fillText(s.etiqueta, x + colW / 2, y + 200)
  })

  const puntaje = resumen.capsulas ? resumen.aTiempo / resumen.capsulas : 0
  const titulo = puntaje === 1 ? '¡100% PUNTUAL! ⚡' : puntaje >= 0.6 ? '¡BIEN CONSTANTE! 🔥' : '¡SERIE TERMINADA! 🙌'
  ctx.fillStyle = paper
  ctx.font = '900 64px Montserrat, sans-serif'
  ctx.fillText(titulo, W / 2, y0 + 3 * (colH + gapY) + 70)

  try {
    const sky = await cargarImagen(skyLogrado)
    const alto = 330
    const ancho = alto * (sky.width / sky.height)
    ctx.drawImage(sky, W / 2 - ancho / 2, H - alto - 90, ancho, alto)
  } catch {
    // Sin Sky se ve bien igual.
  }

  ctx.fillStyle = colores[0]
  ctx.fillRect(0, 0, W, 14)
  ctx.fillStyle = colores[1]
  ctx.fillRect(0, H - 14, W, 14)

  return canvas.toDataURL('image/png')
}
