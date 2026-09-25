// Genera una tarjeta de insignia como imagen (Canvas) para compartir en
// una historia de Instagram — formato 9:16 exacto (1080x1920), sin
// dependencias externas.
import skyLogrado from '../../assets/sky-logrado.webp'

export function dibujarRectRedondeado(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function envolverTexto(ctx, texto, x, y, maxAncho, alturaLinea) {
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

export function cargarImagen(src) {
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
  const H = 1920
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  const ink = '#0F0F12'
  const paper = '#F5F3EE'
  const blue = '#3a7bff'
  const red = '#FF3B3B'
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

  // Franjas de color arriba/abajo — mismo acento que el certificado, para
  // que ambas imágenes se sientan de la misma familia visual.
  ctx.fillStyle = blue
  ctx.fillRect(0, 0, W, 14)
  ctx.fillStyle = red
  ctx.fillRect(0, H - 14, W, 14)

  // Marca
  ctx.textAlign = 'center'
  ctx.fillStyle = paper
  ctx.font = '900 38px Montserrat, sans-serif'
  ctx.fillText('RADGEN EDUCATION', W / 2, 130)

  // Tarjeta central
  const pad = 90
  const cardY = 200
  const cardH = 1160
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

  // Resplandor azul detrás de la insignia — le da más peso visual que
  // dejarla flotando sola sobre el papel.
  const resplandor = ctx.createRadialGradient(W / 2, cardY + 250, 20, W / 2, cardY + 250, 280)
  resplandor.addColorStop(0, 'rgba(58,123,255,0.22)')
  resplandor.addColorStop(1, 'rgba(58,123,255,0)')
  ctx.fillStyle = resplandor
  ctx.fillRect(W / 2 - 280, cardY - 30, 560, 560)

  // Ícono grande — la insignia real en PNG si viene, si no el emoji.
  if (imagenUrl) {
    try {
      const img = await cargarImagen(imagenUrl)
      const lado = 340
      ctx.drawImage(img, W / 2 - lado / 2, cardY + 90, lado, lado)
    } catch {
      ctx.font = '260px sans-serif'
      ctx.fillStyle = ink
      ctx.fillText(icono, W / 2, cardY + 340)
    }
  } else {
    ctx.font = '260px sans-serif'
    ctx.fillStyle = ink
    ctx.fillText(icono, W / 2, cardY + 340)
  }

  // Título
  ctx.fillStyle = ink
  ctx.font = '900 62px Montserrat, sans-serif'
  ctx.fillText('¡INSIGNIA', W / 2, cardY + 500)
  ctx.fillText('DESBLOQUEADA!', W / 2, cardY + 575)

  // Nombre de la insignia
  ctx.font = '700 42px Inter, sans-serif'
  ctx.fillStyle = blue
  envolverTexto(ctx, nombreInsignia, W / 2, cardY + 670, W - pad * 2 - 100, 52)

  // Joven
  ctx.font = '600 36px Inter, sans-serif'
  ctx.fillStyle = 'rgba(15,15,18,0.65)'
  ctx.fillText(nombreJoven, W / 2, cardY + cardH - 60)

  // Sky celebrando, grande — el mismo protagonista que ve el joven dentro
  // de la app, para que la imagen se sienta de RadGen incluso en IG.
  try {
    const sky = await cargarImagen(skyLogrado)
    const altoSky = 320
    const anchoSky = altoSky * (sky.width / sky.height)
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = 20
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 8
    ctx.drawImage(sky, W / 2 - anchoSky / 2, cardY + cardH + 40, anchoSky, altoSky)
    ctx.restore()
  } catch {
    // Sin Sky, la tarjeta se sigue viendo bien.
  }

  return canvas.toDataURL('image/png')
}

// Abre el share sheet nativo (en celular, esto es lo que deja elegir
// "Instagram" y mandarlo directo a una historia) — si el navegador no lo
// soporta, cae de vuelta a solo descargar la imagen.
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
