// Acepta una URL completa de YouTube (watch, youtu.be, embed, shorts, live)
// o un ID pegado directamente, y devuelve solo el ID de 11 caracteres —
// o '' si no se pudo reconocer, para que la lección caiga de vuelta al
// aviso de "video pendiente de subir" en vez de un embed roto.
export function extraerYoutubeId(entrada) {
  const valor = (entrada || '').trim()
  if (!valor) return ''

  const patrones = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/|youtu\.be\/)([\w-]{11})/,
  ]
  for (const patron of patrones) {
    const coincidencia = valor.match(patron)
    if (coincidencia) return coincidencia[1]
  }

  return /^[\w-]{11}$/.test(valor) ? valor : ''
}
