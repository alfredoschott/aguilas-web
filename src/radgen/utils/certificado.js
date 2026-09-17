// Genera un certificado de logro (diploma) como imagen — para cuando un
// joven termina una serie completa o alcanza un rango. Mismo enfoque de
// canvas que shareCard.js, en formato horizontal como un diploma de verdad.

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

// `icono` es un emoji (fallback simple); `imagenUrl` es la insignia real
// en PNG y, si viene, se dibuja en su lugar.
export async function generarCertificado({ nombreJoven, logro, icono = '🏆', imagenUrl }) {
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

  ctx.fillStyle = bg
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

  ctx.fillStyle = paper
  ctx.font = '600 30px Inter, sans-serif'
  ctx.fillText('Se otorga a', W / 2, 590)

  ctx.font = '900 72px Montserrat, sans-serif'
  ctx.fillText(nombreJoven, W / 2, 680)

  ctx.font = '600 34px Inter, sans-serif'
  ctx.fillText(logro, W / 2, 760)

  const fecha = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
  ctx.font = '600 26px Inter, sans-serif'
  ctx.fillStyle = 'rgba(245,243,238,0.65)'
  ctx.fillText(fecha, W / 2, H - 110)

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
