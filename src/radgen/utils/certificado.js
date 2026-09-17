// Genera un certificado de logro (diploma) como imagen — para cuando un
// joven termina una serie completa, alcanza un rango, o recibe una
// insignia especial de su líder. Mismo enfoque de canvas que
// shareCard.js, en formato horizontal como un diploma de verdad.
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

// `icono` es un emoji (fallback simple); `imagenUrl` es la insignia real
// en PNG y, si viene, se dibuja en su lugar. `motivo` es opcional — el
// porqué que escribió la líder al otorgar una insignia especial.
export async function generarCertificado({ nombreJoven, logro, motivo, icono = '🏆', imagenUrl }) {
  if (document.fonts) {
    await Promise.all([
      document.fonts.load('900 80px Montserrat'),
      document.fonts.load('700 32px Inter'),
    ]).catch(() => {})
  }

  const W = 1600
  const H = 1131
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  const paper = '#F5F3EE'
  const oro = '#cf9a2e'
  const bg = '#101014'

  // Fondo con un leve degradado radial (en vez de negro plano) para que
  // no se sienta tan chato, más un escenario que un rectángulo de color.
  const fondo = ctx.createRadialGradient(W / 2, H * 0.4, 80, W / 2, H * 0.5, W * 0.75)
  fondo.addColorStop(0, '#1a1a20')
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

  const marco = 60
  ctx.strokeStyle = oro
  ctx.lineWidth = 6
  dibujarRectRedondeado(ctx, marco, marco, W - marco * 2, H - marco * 2, 24)
  ctx.stroke()
  ctx.lineWidth = 2
  dibujarRectRedondeado(ctx, marco + 16, marco + 16, W - (marco + 16) * 2, H - (marco + 16) * 2, 16)
  ctx.stroke()

  // Resplandor dorado detrás de la insignia — le da peso al centro de
  // atención en vez de que el ícono flote solo sobre el fondo.
  const resplandor = ctx.createRadialGradient(W / 2, 330, 20, W / 2, 330, 260)
  resplandor.addColorStop(0, 'rgba(207,154,46,0.45)')
  resplandor.addColorStop(1, 'rgba(207,154,46,0)')
  ctx.fillStyle = resplandor
  ctx.fillRect(W / 2 - 260, 70, 520, 520)

  ctx.textAlign = 'center'

  ctx.fillStyle = paper
  ctx.font = '900 34px Montserrat, sans-serif'
  ctx.fillText('RADGEN EDUCATION', W / 2, 160)

  if (imagenUrl) {
    try {
      const img = await cargarImagen(imagenUrl)
      const lado = 240
      ctx.drawImage(img, W / 2 - lado / 2, 210, lado, lado)
    } catch {
      ctx.font = '210px sans-serif'
      ctx.fillText(icono, W / 2, 400)
    }
  } else {
    ctx.font = '210px sans-serif'
    ctx.fillText(icono, W / 2, 400)
  }

  ctx.fillStyle = oro
  ctx.font = '900 64px Montserrat, sans-serif'
  ctx.fillText('CERTIFICADO DE LOGRO', W / 2, 500)

  // Línea divisoria angosta bajo el título, como listón de diploma.
  ctx.strokeStyle = oro
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(W / 2 - 90, 522)
  ctx.lineTo(W / 2 + 90, 522)
  ctx.stroke()

  ctx.fillStyle = paper
  ctx.font = '600 30px Inter, sans-serif'
  ctx.fillText('Se otorga a', W / 2, 590)

  ctx.font = '900 72px Montserrat, sans-serif'
  ctx.fillText(nombreJoven, W / 2, 680)

  ctx.fillStyle = oro
  ctx.font = '800 38px Montserrat, sans-serif'
  let cursorY = envolverTextoCentrado(ctx, logro, W / 2, 755, W - 460, 46, 2)

  if (motivo) {
    ctx.fillStyle = 'rgba(245,243,238,0.85)'
    ctx.font = 'italic 500 30px Inter, sans-serif'
    cursorY = envolverTextoCentrado(ctx, `"${motivo}"`, W / 2, cursorY + 34, W - 560, 40, 3)
  }

  const fecha = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
  ctx.font = '600 26px Inter, sans-serif'
  ctx.fillStyle = 'rgba(245,243,238,0.65)'
  ctx.fillText(fecha, W / 2, Math.max(cursorY + 40, H - 110))

  // Sky asomándose en la esquina — como si él también celebrara contigo.
  try {
    const sky = await cargarImagen(skyLogrado)
    const altoSky = 210
    const anchoSky = altoSky * (sky.width / sky.height)
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = 18
    ctx.shadowOffsetX = -4
    ctx.shadowOffsetY = 6
    ctx.drawImage(sky, W - anchoSky - 30, H - altoSky - 20, anchoSky, altoSky)
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
