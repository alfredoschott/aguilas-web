// Genera una tarjeta de insignia como imagen (Canvas) para compartir en
// Instagram/WhatsApp — sin dependencias externas.

function dibujarRectRedondeado(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function envolverTexto(ctx, texto, x, y, maxAncho, alturaLinea) {
  const palabras = texto.split(' ')
  let linea = ''
  let lineaY = y
  const lineas = []
  palabras.forEach((palabra) => {
    const pruebaLinea = linea ? `${linea} ${palabra}` : palabra
    if (ctx.measureText(pruebaLinea).width > maxAncho && linea) {
      lineas.push(linea)
      linea = palabra
    } else {
      linea = pruebaLinea
    }
  })
  lineas.push(linea)
  lineas.forEach((l) => {
    ctx.fillText(l, x, lineaY)
    lineaY += alturaLinea
  })
  return lineaY
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

export async function generarTarjetaInsignia({ nombreJoven, nombreInsignia, icono = '🏅', imagenUrl }) {
  if (document.fonts) {
    await Promise.all([
      document.fonts.load('900 60px Montserrat'),
      document.fonts.load('700 40px Inter'),
    ]).catch(() => {})
  }

  const W = 1080
  const H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  const ink = '#0F0F12'
  const paper = '#F5F3EE'
  const blue = '#3a7bff'
  const bg = '#101014'

  // Fondo oscuro punteado
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(245,243,238,0.07)'
  for (let x = 30; x < W; x += 46) {
    for (let y = 30; y < H; y += 46) {
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Marca
  ctx.textAlign = 'center'
  ctx.fillStyle = paper
  ctx.font = '900 34px Montserrat, sans-serif'
  ctx.fillText('RADGEN EDUCATION', W / 2, 100)

  // Tarjeta central
  const pad = 90
  const cardY = 160
  const cardH = H - cardY - 120
  ctx.fillStyle = paper
  ctx.strokeStyle = ink
  ctx.lineWidth = 10
  dibujarRectRedondeado(ctx, pad, cardY, W - pad * 2, cardH, 40)
  ctx.fill()
  ctx.stroke()

  // Sombra dura estilo marca (offset azul detrás — dibujada antes normalmente,
  // aquí simulamos con un segundo trazo desplazado debajo/derecha)
  ctx.save()
  ctx.globalCompositeOperation = 'destination-over'
  ctx.fillStyle = blue
  dibujarRectRedondeado(ctx, pad + 14, cardY + 14, W - pad * 2, cardH, 40)
  ctx.fill()
  ctx.restore()

  // Ícono grande — la insignia real en PNG si viene, si no el emoji.
  if (imagenUrl) {
    try {
      const img = await cargarImagen(imagenUrl)
      const lado = 300
      ctx.drawImage(img, W / 2 - lado / 2, cardY + 60, lado, lado)
    } catch {
      ctx.font = '260px sans-serif'
      ctx.fillStyle = ink
      ctx.fillText(icono, W / 2, cardY + 300)
    }
  } else {
    ctx.font = '260px sans-serif'
    ctx.fillStyle = ink
    ctx.fillText(icono, W / 2, cardY + 300)
  }

  // Título
  ctx.fillStyle = ink
  ctx.font = '900 58px Montserrat, sans-serif'
  ctx.fillText('¡INSIGNIA', W / 2, cardY + 420)
  ctx.fillText('DESBLOQUEADA!', W / 2, cardY + 490)

  // Nombre de la insignia
  ctx.font = '700 40px Inter, sans-serif'
  ctx.fillStyle = blue
  envolverTexto(ctx, nombreInsignia, W / 2, cardY + 580, W - pad * 2 - 100, 50)

  // Joven
  ctx.font = '600 34px Inter, sans-serif'
  ctx.fillStyle = 'rgba(15,15,18,0.65)'
  ctx.fillText(nombreJoven, W / 2, cardY + cardH - 60)

  return canvas.toDataURL('image/png')
}

export async function compartirImagen({ dataUrl, nombreArchivo, titulo, texto }) {
  const blob = await (await fetch(dataUrl)).blob()
  const file = new File([blob], nombreArchivo, { type: 'image/png' })

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: titulo, text: texto })
      return true
    } catch {
      // el usuario canceló el share sheet — no hacemos nada más
      return false
    }
  }

  const enlace = document.createElement('a')
  enlace.href = dataUrl
  enlace.download = nombreArchivo
  enlace.click()
  return true
}
