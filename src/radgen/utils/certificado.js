// Genera un certificado de logro como imagen — pensado para subirse
// directo a una historia de Instagram: 1080x1920 (formato 9:16 exacto),
// vistoso y con la marca de RadGen, no un diploma plano para imprimir.
import skyLogrado from '../../assets/sky-logrado.png'

function dibujarRectRedondeado(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function hexARgba(hex, alpha) {
  const limpio = hex.replace('#', '')
  const r = parseInt(limpio.slice(0, 2), 16)
  const g = parseInt(limpio.slice(2, 4), 16)
  const b = parseInt(limpio.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
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

// Envuelve texto centrado en varias líneas si no cabe en `maxAncho` —
// para que un motivo largo nunca se salga del marco del certificado.
// Devuelve el Y donde terminó, para poder acomodar lo que sigue debajo.
function envolverTextoCentrado(ctx, texto, x, y, maxAncho, alturaLinea, maxLineas = 3) {
  const palabras = texto.split(' ')
  const lineas = []
  let linea = ''
  palabras.forEach((palabra) => {
    const prueba = linea ? `${linea} ${palabra}` : palabra
    if (ctx.measureText(prueba).width > maxAncho && linea) {
      lineas.push(linea)
      linea = palabra
    } else {
      linea = prueba
    }
  })
  if (linea) lineas.push(linea)

  const recortadas = lineas.slice(0, maxLineas)
  if (lineas.length > maxLineas) {
    recortadas[maxLineas - 1] = recortadas[maxLineas - 1].replace(/\s*\S*$/, '') + '…'
  }

  let lineaY = y
  recortadas.forEach((l) => {
    ctx.fillText(l, x, lineaY)
    lineaY += alturaLinea
  })
  return lineaY
}

// Unas cuantas estrellitas de confeti dispersas — sin ser tantas que
// distraigan del centro de atención, solo para que se sienta festivo.
function dibujarConfeti(ctx) {
  const puntos = [
    [120, 220, 10, '#3a7bff'], [960, 260, 8, '#FF3B3B'], [90, 520, 7, '#cf9a2e'],
    [990, 560, 9, '#3a7bff'], [140, 900, 8, '#FF3B3B'], [950, 940, 7, '#cf9a2e'],
    [110, 1240, 9, '#3a7bff'], [970, 1280, 8, '#FF3B3B'],
  ]
  puntos.forEach(([x, y, r, color]) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  })
}

// Cada tipo de logro tiene su propio color y su propio título, para que un
// certificado de cápsula, de serie, de rango o una insignia especial se
// sientan distintos entre sí de un vistazo, sin cambiar el layout general.
const TEMAS_CERTIFICADO = {
  leccion: { color: '#3a7bff', titulo1: 'CERTIFICADO', titulo2: 'DE CÁPSULA' },
  serie: { color: '#34a853', titulo1: 'CERTIFICADO', titulo2: 'DE SERIE' },
  rango: { color: '#9333e3', titulo1: 'CERTIFICADO', titulo2: 'DE RANGO' },
  especial: { color: '#cf9a2e', titulo1: 'RECONOCIMIENTO', titulo2: 'ESPECIAL' },
}

// `icono` es un emoji (fallback simple); `imagenUrl` es la insignia real
// en PNG y, si viene, se dibuja en su lugar. `motivo` es opcional — el
// porqué que escribió la líder al otorgar una insignia especial. `tipo`
// decide el color y el título ('leccion' | 'serie' | 'rango' | 'especial').
export async function generarCertificado({ nombreJoven, logro, motivo, icono = '🏆', imagenUrl, tipo = 'especial' }) {
  if (document.fonts) {
    await Promise.all([
      document.fonts.load('900 80px Montserrat'),
      document.fonts.load('700 32px Inter'),
    ]).catch(() => {})
  }

  const W = 1080
  const H = 1920
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  const paper = '#F5F3EE'
  const azul = '#3a7bff'
  const rojo = '#FF3B3B'
  const bg = '#101014'
  const tema = TEMAS_CERTIFICADO[tipo] || TEMAS_CERTIFICADO.especial
  const acento = tema.color

  // Fondo con degradado radial — más escenario que rectángulo plano.
  const fondo = ctx.createRadialGradient(W / 2, H * 0.32, 100, W / 2, H * 0.4, W * 1.1)
  fondo.addColorStop(0, '#1d1d24')
  fondo.addColorStop(1, bg)
  ctx.fillStyle = fondo
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = 'rgba(245,243,238,0.06)'
  for (let x = 30; x < W; x += 46) {
    for (let y = 30; y < H; y += 46) {
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  dibujarConfeti(ctx)

  // Franjas de color arriba y abajo — el mismo acento que usa el resto
  // del sitio, para que se note que es de RadGen desde el primer vistazo.
  ctx.fillStyle = rojo
  ctx.fillRect(0, 0, W, 14)
  ctx.fillStyle = azul
  ctx.fillRect(0, H - 14, W, 14)

  const marco = 46
  ctx.strokeStyle = acento
  ctx.lineWidth = 6
  dibujarRectRedondeado(ctx, marco, marco + 20, W - marco * 2, H - marco * 2 - 40, 28)
  ctx.stroke()
  ctx.lineWidth = 2
  dibujarRectRedondeado(ctx, marco + 16, marco + 36, W - (marco + 16) * 2, H - (marco + 16) * 2 - 40, 18)
  ctx.stroke()

  ctx.textAlign = 'center'

  ctx.fillStyle = paper
  ctx.font = '900 38px Montserrat, sans-serif'
  ctx.fillText('RADGEN EDUCATION', W / 2, 175)

  // Resplandor del color del tema detrás de la insignia — el centro de
  // atención de toda la imagen, pensado para ser lo primero que se ve en
  // una historia.
  const resplandor = ctx.createRadialGradient(W / 2, 470, 30, W / 2, 470, 320)
  resplandor.addColorStop(0, hexARgba(acento, 0.5))
  resplandor.addColorStop(1, hexARgba(acento, 0))
  ctx.fillStyle = resplandor
  ctx.fillRect(W / 2 - 320, 190, 640, 640)

  if (imagenUrl) {
    try {
      const img = await cargarImagen(imagenUrl)
      const lado = 360
      ctx.drawImage(img, W / 2 - lado / 2, 300, lado, lado)
    } catch {
      ctx.font = '260px sans-serif'
      ctx.fillText(icono, W / 2, 560)
    }
  } else {
    ctx.font = '260px sans-serif'
    ctx.fillText(icono, W / 2, 560)
  }

  ctx.fillStyle = acento
  ctx.font = '900 66px Montserrat, sans-serif'
  ctx.fillText(tema.titulo1, W / 2, 790)
  ctx.font = '900 44px Montserrat, sans-serif'
  ctx.fillText(tema.titulo2, W / 2, 845)

  ctx.strokeStyle = acento
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(W / 2 - 90, 875)
  ctx.lineTo(W / 2 + 90, 875)
  ctx.stroke()

  ctx.fillStyle = paper
  ctx.font = '600 32px Inter, sans-serif'
  ctx.fillText('Se otorga a', W / 2, 945)

  ctx.font = '900 76px Montserrat, sans-serif'
  ctx.fillText(nombreJoven, W / 2, 1040)

  ctx.fillStyle = acento
  ctx.font = '800 42px Montserrat, sans-serif'
  let cursorY = envolverTextoCentrado(ctx, logro, W / 2, 1120, W - 220, 50, 2)

  if (motivo) {
    ctx.fillStyle = 'rgba(245,243,238,0.85)'
    ctx.font = 'italic 500 32px Inter, sans-serif'
    cursorY = envolverTextoCentrado(ctx, `"${motivo}"`, W / 2, cursorY + 38, W - 300, 42, 3)
  }

  const fecha = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
  ctx.font = '600 28px Inter, sans-serif'
  ctx.fillStyle = 'rgba(245,243,238,0.65)'
  ctx.fillText(fecha, W / 2, Math.max(cursorY + 50, 1560))

  // Sky celebrando, grande — el protagonista visual de la parte de abajo.
  try {
    const sky = await cargarImagen(skyLogrado)
    const altoSky = 340
    const anchoSky = altoSky * (sky.width / sky.height)
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = 20
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 8
    ctx.drawImage(sky, W / 2 - anchoSky / 2, 1620, anchoSky, altoSky)
    ctx.restore()
  } catch {
    // Si no carga, el certificado se ve bien de todos modos sin Sky.
  }

  return canvas.toDataURL('image/png')
}

export function descargarImagen(dataUrl, nombreArchivo) {
  const enlace = document.createElement('a')
  enlace.href = dataUrl
  enlace.download = nombreArchivo
  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)
}

// Abre el share sheet nativo (en celular, esto es lo que deja elegir
// "Instagram" y mandarlo directo a una historia) — si el navegador no lo
// soporta, cae de vuelta a solo descargar la imagen.
export async function compartirCertificado({ dataUrl, nombreArchivo, titulo, texto }) {
  const blob = await (await fetch(dataUrl)).blob()
  const file = new File([blob], nombreArchivo, { type: 'image/png' })

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: titulo, text: texto })
      return true
    } catch {
      return false
    }
  }

  descargarImagen(dataUrl, nombreArchivo)
  return true
}
