// Acepta una URL completa de YouTube (watch, youtu.be, embed) o un ID
// pegado directamente, y devuelve solo el ID de 11 caracteres.
export function extraerYoutubeId(entrada) {
  const valor = (entrada || '').trim()
  if (!valor) return ''

  const patrones = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([\w-]{11})/,
  ]
  for (const patron of patrones) {
    const coincidencia = valor.match(patron)
    if (coincidencia) return coincidencia[1]
  }

  return /^[\w-]{11}$/.test(valor) ? valor : valor
}
