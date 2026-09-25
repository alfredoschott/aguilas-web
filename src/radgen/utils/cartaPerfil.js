// La carta coleccionable del perfil como imagen 1080x1920 (historia de
// Instagram), dibujada en Canvas igual que la de insignias.
import skyLogrado from '../../assets/sky-logrado.webp'
import { dibujarRectRedondeado, envolverTexto, cargarImagen } from './shareCard'
import { rarezaDe, bioDeCarta, FONDOS_CARTA, FONDO_CARTA_POR_DEFECTO } from './rarezaCarta'

const INK = '#0F0F12'
const PAPER = '#F5F3EE'
const BG = '#101014'

function iniciales(nombre) {
  const partes = (nombre || '').trim().split(/\s+/).filter(Boolean)
  return partes.slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?'
}

function recortarTexto(ctx, texto, maxAncho) {
  if (ctx.measureText(texto).width <= maxAncho) return texto
  let t = texto
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxAncho) t = t.slice(0, -1)
  return `${t}…`
}

export async function generarCartaPerfil({ joven, nivelActual, racha, nivelXp, xpTotal, totalCompletadas, numero }) {
  if (document.fonts) {
    await Promise.all([document.fonts.load('900 60px Montserrat'), document.fonts.load('700 40px Inter')]).catch(() => {})
  }
  const esLider = joven.rol === 'lider'
  const rareza = rarezaDe(nivelXp, esLider)

  const W = 1080
  const H = 1920
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Fondo oscuro punteado con un halo del color de la rareza
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, H)
  const halo = ctx.createRadialGradient(W / 2, 860, 60, W / 2, 860, 760)
  halo.addColorStop(0, `${rareza.color}55`)
  halo.addColorStop(1, `${rareza.color}00`)
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(245,243,238,0.07)'
  for (let x = 30; x < W; x += 46) {
    for (let y = 30; y < H; y += 46) {
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.textAlign = 'center'
  ctx.fillStyle = PAPER
  ctx.font = '900 38px Montserrat, sans-serif'
  ctx.fillText('RADGEN EDUCATION', W / 2, 130)

  // Carta (proporción 5:7)
  const cw = 820
  const ch = 1148
  const cx = (W - cw) / 2
  const cy = 210

  // Sombra dura
  ctx.fillStyle = INK
  dibujarRectRedondeado(ctx, cx + 16, cy + 16, cw, ch, 44)
  ctx.fill()

  // Borde holográfico
  const foil = ctx.createLinearGradient(cx, cy, cx + cw, cy + ch)
  foil.addColorStop(0, rareza.color)
  foil.addColorStop(0.35, '#ffffff')
  foil.addColorStop(0.5, rareza.color)
  foil.addColorStop(0.75, '#ffe9a8')
  foil.addColorStop(1, rareza.color)
  ctx.fillStyle = foil
  dibujarRectRedondeado(ctx, cx, cy, cw, ch, 44)
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = 8
  ctx.stroke()

  // Interior
  const m = 30
  const ix = cx + m
  const iy = cy + m
  const iw = cw - m * 2
  const ih = ch - m * 2
  ctx.fillStyle = PAPER
  dibujarRectRedondeado(ctx, ix, iy, iw, ih, 26)
  ctx.fill()
  ctx.lineWidth = 6
  ctx.stroke()

  // Cabecera: nombre + nivel
  ctx.textAlign = 'left'
  ctx.fillStyle = INK
  ctx.font = '900 54px Montserrat, sans-serif'
  ctx.fillText(recortarTexto(ctx, (joven.apodo || joven.nombre).toUpperCase(), iw - 260), ix + 34, iy + 82)
  ctx.textAlign = 'right'
  ctx.font = '800 28px Montserrat, sans-serif'
  const textoNivel = esLider ? '∞' : String(nivelXp)
  ctx.font = '900 64px Montserrat, sans-serif'
  const anchoNivel = ctx.measureText(textoNivel).width
  ctx.fillStyle = rareza.id === 'comun' ? '#3a7bff' : rareza.color
  ctx.fillText(textoNivel, ix + iw - 34, iy + 86)
  ctx.fillStyle = INK
  ctx.font = '800 28px Montserrat, sans-serif'
  ctx.fillText('NV', ix + iw - 44 - anchoNivel, iy + 84)

  // Ilustración: degradado del fondo de perfil + avatar
  const ax = ix + 34
  const ay = iy + 118
  const aw = iw - 68
  const ah = 470
  const [c1, c2] = FONDOS_CARTA[joven.fondoPerfil] || FONDO_CARTA_POR_DEFECTO
  const grad = ctx.createLinearGradient(ax, ay, ax + aw, ay + ah)
  grad.addColorStop(0, c1)
  grad.addColorStop(1, c2)
  ctx.fillStyle = grad
  dibujarRectRedondeado(ctx, ax, ay, aw, ah, 20)
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = 6
  ctx.stroke()

  const r = 150
  const acx = W / 2
  const acy = ay + ah / 2
  ctx.save()
  ctx.beginPath()
  ctx.arc(acx, acy, r + 12, 0, Math.PI * 2)
  ctx.fillStyle = PAPER
  ctx.fill()
  ctx.lineWidth = 8
  ctx.strokeStyle = INK
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(acx, acy, r, 0, Math.PI * 2)
  ctx.clip()
  let dibujoFoto = false
  if (joven.fotoPerfil) {
    try {
      const foto = await cargarImagen(joven.fotoPerfil)
      const lado = Math.min(foto.width, foto.height)
      ctx.drawImage(foto, (foto.width - lado) / 2, (foto.height - lado) / 2, lado, lado, acx - r, acy - r, r * 2, r * 2)
      dibujoFoto = true
    } catch {
      // Si la foto no deja dibujarse (CORS), caen las iniciales.
    }
  }
  if (!dibujoFoto) {
    ctx.fillStyle = joven.colorAcento || '#3a7bff'
    ctx.fillRect(acx - r, acy - r, r * 2, r * 2)
    ctx.fillStyle = PAPER
    ctx.textAlign = 'center'
    ctx.font = '900 120px Montserrat, sans-serif'
    ctx.fillText(iniciales(joven.nombre), acx, acy + 42)
  }
  ctx.restore()

  // Línea de tipo: rango + rareza
  const ty = ay + ah + 26
  ctx.fillStyle = INK
  dibujarRectRedondeado(ctx, ax, ty, aw, 76, 16)
  ctx.fill()
  ctx.textAlign = 'left'
  ctx.fillStyle = PAPER
  ctx.font = '800 34px Montserrat, sans-serif'
  const tipo = esLider ? '👑 LÍDER' : nivelActual ? `${nivelActual.icono} ${nivelActual.nombre.toUpperCase()}` : '🌱 SIN RANGO AÚN'
  ctx.fillText(recortarTexto(ctx, tipo, aw - 290), ax + 26, ty + 50)
  ctx.textAlign = 'right'
  ctx.fillStyle = rareza.id === 'comun' ? '#8fb4ff' : rareza.color
  ctx.fillText(`★ ${rareza.nombre.toUpperCase()}`, ax + aw - 26, ty + 50)

  // Estadísticas
  const sy = ty + 104
  const stats = [
    ['XP', esLider ? '∞' : String(xpTotal)],
    ['RACHA', `🔥 ${racha}`],
    ['CÁPSULAS', String(totalCompletadas)],
  ]
  const sw = (aw - 32) / 3
  stats.forEach(([etiqueta, valor], i) => {
    const sx = ax + i * (sw + 16)
    ctx.fillStyle = 'rgba(15,15,18,0.06)'
    dibujarRectRedondeado(ctx, sx, sy, sw, 124, 16)
    ctx.fill()
    ctx.lineWidth = 4
    ctx.strokeStyle = INK
    ctx.stroke()
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(15,15,18,0.6)'
    ctx.font = '800 24px Montserrat, sans-serif'
    ctx.fillText(etiqueta, sx + sw / 2, sy + 42)
    ctx.fillStyle = INK
    ctx.font = '900 46px Montserrat, sans-serif'
    ctx.fillText(valor, sx + sw / 2, sy + 98)
  })

  // Bio como "texto de ambientación"
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(15,15,18,0.75)'
  ctx.font = 'italic 600 32px Inter, sans-serif'
  const bio = bioDeCarta(joven.bio, 110)
  envolverTexto(ctx, bio, W / 2, sy + 184, aw - 40, 42)

  // Pie
  ctx.fillStyle = 'rgba(15,15,18,0.55)'
  ctx.font = '800 24px Montserrat, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('RADGEN EDUCATION', ax, iy + ih - 30)
  ctx.textAlign = 'right'
  ctx.fillText(`Nº ${numero}`, ax + aw, iy + ih - 30)

  // Sky debajo de la carta
  try {
    const sky = await cargarImagen(skyLogrado)
    const altoSky = 300
    const anchoSky = altoSky * (sky.width / sky.height)
    ctx.drawImage(sky, W / 2 - anchoSky / 2, cy + ch + 70, anchoSky, altoSky)
  } catch {
    // Sin Sky la imagen se sigue viendo bien.
  }

  return canvas.toDataURL('image/png')
}
